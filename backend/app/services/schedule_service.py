"""
PharmaGuard AI - Medication Schedules and Dose Logs Service
Bu servis, kullanıcının günlük ilaç listesini (today's schedule) derler,
doz alım durumlarını kaydeder (ve stok düşürür), haftalık uyum oranlarını
ve genel tedavi istatistiklerini hesaplar.
"""

from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.medication import Medication
from app.models.schedule import MedicationSchedule
from app.models.dose_log import DoseLog

async def get_today_schedule(db: AsyncSession, user_id: int) -> Dict[str, Any]:
    """
    Kullanıcının bugünkü ilaç kullanım listesini derler.
    Aktif ilaçların programlarını (schedules) bulur ve bugünkü dose_logs tablosunu
    sorgulayarak ilacın alınıp alınmadığını kontrol eder.
    """
    today_date = date.today()
    
    # 1. Kullanıcının bugün aktif olan ilaçlarını ve programlarını çek
    # İlaç bugün için aktif olmalı (start_date <= bugün ve end_date >= bugün)
    stmt = (
        select(Medication)
        .where(
            Medication.user_id == user_id,
            Medication.is_active == True,
            or_(Medication.start_date == None, Medication.start_date <= today_date),
            or_(Medication.end_date == None, Medication.end_date >= today_date)
        )
        .options(selectinload(Medication.schedules))
    )
    result = await db.execute(stmt)
    medications = result.scalars().all()
    
    # bugünkü dose_log'ları çek
    log_stmt = select(DoseLog).where(DoseLog.user_id == user_id, DoseLog.log_date == today_date)
    log_result = await db.execute(log_stmt)
    logs = log_result.scalars().all()
    
    # Kolay eşleştirme için logları bir sözlüğe (dict) dönüştür
    # Anahtar: (medication_id, scheduled_time)
    log_dict = {(log.medication_id, log.scheduled_time): log for log in logs}
    
    schedule_list = []
    total_doses = 0
    taken_doses = 0
    
    for med in medications:
        for sched in med.schedules:
            if not sched.is_active:
                continue
                
            total_doses += 1
            # Bu ilaç saati için log var mı?
            log = log_dict.get((med.id, sched.time))
            taken = log.taken if log else False
            taken_at = log.taken_at if log else None
            
            if taken:
                taken_doses += 1
                
            schedule_list.append({
                "medication_id": med.id,
                "medication_name": med.name,
                "medication_image": med.image_url,
                "scheduled_time": sched.time,
                "taken": taken,
                "taken_at": taken_at
            })
            
    # Saat bazlı sıralama yap (Örn: 08:00 önce, 20:00 sonra gelsin)
    schedule_list.sort(key=lambda x: x["scheduled_time"])
    
    adherence_rate = round((taken_doses / total_doses * 100), 1) if total_doses > 0 else 0.0
    
    return {
        "date": today_date,
        "total_doses": total_doses,
        "taken_doses": taken_doses,
        "adherence_rate": adherence_rate,
        "schedule": schedule_list
    }

async def toggle_dose(
    db: AsyncSession,
    user_id: int,
    medication_id: int,
    scheduled_time: str,
    log_date: date,
    taken: bool,
    notes: Optional[str] = None
) -> DoseLog:
    """
    Belirli bir ilacın doz alım durumunu (alındı/alınmadı) günceller veya yeni kayıt oluşturur.
    Eğer doz ALINDI (taken=True) olarak işaretlenirse, ilacın stok adedini 1 adet düşürür.
    Eğer işaret kaldırılırsa (taken=False), stoğu 1 adet geri artırır.
    """
    # 1. İlacın kullanıcıya ait olup olmadığını ve varlığını doğrula
    med_stmt = select(Medication).where(Medication.id == medication_id, Medication.user_id == user_id)
    med_res = await db.execute(med_stmt)
    medication = med_res.scalar_one_or_none()
    if not medication:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="İlaç bulunamadı veya yetkiniz yok."
        )
        
    # 2. Mevcut log kaydını ara
    log_stmt = select(DoseLog).where(
        DoseLog.medication_id == medication_id,
        DoseLog.user_id == user_id,
        DoseLog.log_date == log_date,
        DoseLog.scheduled_time == scheduled_time
    )
    log_res = await db.execute(log_stmt)
    dose_log = log_res.scalar_one_or_none()
    
    old_taken = False
    
    if dose_log:
        old_taken = dose_log.taken
        # Mevcut kaydı güncelle
        dose_log.taken = taken
        dose_log.taken_at = datetime.now() if taken else None
        if notes is not None:
            dose_log.notes = notes
    else:
        # Yeni log kaydı oluştur
        dose_log = DoseLog(
            medication_id=medication_id,
            user_id=user_id,
            log_date=log_date,
            scheduled_time=scheduled_time,
            taken=taken,
            taken_at=datetime.now() if taken else None,
            notes=notes
        )
        db.add(dose_log)
        
    # 3. Dinamik Stok Yönetimi
    # Eğer durum değiştiyse ve ilaç sayılabilir bir stok türündeyse (None değilse)
    if old_taken != taken and medication.stock_count is not None:
        if taken:
            # İlaç alındıysa stoku 1 eksilt
            medication.stock_count = max(0, medication.stock_count - 1)
        else:
            # İlaç alımı iptal edildiyse stoku geri ekle
            medication.stock_count += 1
            
    await db.commit()
    await db.refresh(dose_log)
    return dose_log

async def get_weekly_adherence(db: AsyncSession, user_id: int) -> List[Dict[str, Any]]:
    """
    Son 7 güne ait (bugün dahil) günlük ilaç kullanım uyum oranlarını hesaplar.
    Dönen format: [{"day": "Pzt", "percentage": 85, "taken_count": 5, "total_count": 6}]
    """
    days_tr = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"]
    adherence_list = []
    
    # Bugünden geriye doğru 7 günü hesapla (Sırayla Pzt, Sal vb. göstermek için kronolojik sıralayalım)
    today = date.today()
    dates_to_calculate = [today - timedelta(days=i) for i in range(6, -1, -1)]
    
    for log_date in dates_to_calculate:
        # Bu tarihte aktif olan ilaçları ve programları çek
        stmt = (
            select(Medication)
            .where(
                Medication.user_id == user_id,
                Medication.is_active == True,
                or_(Medication.start_date == None, Medication.start_date <= log_date),
                or_(Medication.end_date == None, Medication.end_date >= log_date)
            )
            .options(selectinload(Medication.schedules))
        )
        med_res = await db.execute(stmt)
        medications = med_res.scalars().all()
        
        # O günkü toplam aktif doz sayısı
        total_count = 0
        for med in medications:
            for sched in med.schedules:
                if sched.is_active:
                    total_count += 1
                    
        # O günkü alınan doz sayısı
        # Not: sadece hâlâ aktif olan ilaçların dozları sayılır; aksi halde silinmiş
        # (is_active=False) bir ilacın geçmişteki "alındı" kayıtları paydaki (total_count)
        # düşüşe rağmen sayılmaya devam eder ve oran %100'ü aşabilir.
        log_stmt = (
            select(func.count(DoseLog.id))
            .select_from(DoseLog)
            .join(Medication, DoseLog.medication_id == Medication.id)
            .where(
                DoseLog.user_id == user_id,
                DoseLog.log_date == log_date,
                DoseLog.taken == True,
                Medication.is_active == True
            )
        )
        log_res = await db.execute(log_stmt)
        taken_count = log_res.scalar() or 0
        
        # Uyum Yüzdesi
        percentage = round((taken_count / total_count * 100), 0) if total_count > 0 else 0.0
        
        # Gün adının Türkçe kısaltmasını al (log_date.strftime ile yerel dille de alınabilir
        # ama platform bağımsızlığı için diziden çekiyoruz)
        # weekday(): Pazartesi=0, Pazar=6. Dizimiz Pazartesi=1 yapmak için kaydırılabilir
        # python weekday: Pazartesi 0, Salı 1... Pazar 6'dır.
        # tr gün dizisi: ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"]
        days_tr_map = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"]
        day_name = days_tr_map[log_date.weekday()]
        
        adherence_list.append({
            "day": day_name,
            "percentage": int(percentage),
            "taken_count": taken_count,
            "total_count": total_count,
            "date": log_date
        })
        
    return adherence_list

async def get_weekly_missed_doses(db: AsyncSession, user_id: int) -> List[Dict[str, Any]]:
    """
    Son 7 günde (bugün dahil) planlanmış ama 'taken=True' olarak işaretlenmemiş dozları
    listeler. Salt okunurdur; veritabanına hiçbir kayıt yazmaz veya değiştirmez.

    Kural:
    - Geçmiş (bugünden önceki) günler için planlanan tüm dozlar değerlendirilir.
    - Bugün için yalnızca şu anki yerel saatten ÖNCEKİ (saati geçmiş) dozlar değerlendirilir;
      bugün henüz saati gelmemiş dozlar kaçırılmış sayılmaz.
    - İlaç aktiflik/başlangıç/bitiş kuralları get_weekly_adherence ile aynıdır.
    """
    days_tr_map = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"]
    missed: List[Dict[str, Any]] = []

    today = date.today()
    now_time_str = datetime.now().strftime("%H:%M")
    dates_to_check = [today - timedelta(days=i) for i in range(6, -1, -1)]

    for log_date in dates_to_check:
        is_today = (log_date == today)

        stmt = (
            select(Medication)
            .where(
                Medication.user_id == user_id,
                Medication.is_active == True,
                or_(Medication.start_date == None, Medication.start_date <= log_date),
                or_(Medication.end_date == None, Medication.end_date >= log_date)
            )
            .options(selectinload(Medication.schedules))
        )
        med_res = await db.execute(stmt)
        day_medications = med_res.scalars().all()

        # O günkü dose_log kayıtlarını çek (yalnızca 'taken=True' olanların anahtarına ihtiyacımız var)
        log_stmt = select(DoseLog).where(
            DoseLog.user_id == user_id,
            DoseLog.log_date == log_date
        )
        log_res = await db.execute(log_stmt)
        taken_keys = {
            (log.medication_id, log.scheduled_time)
            for log in log_res.scalars().all()
            if log.taken
        }

        for med in day_medications:
            for sched in med.schedules:
                if not sched.is_active:
                    continue
                # Bugünse ve saati henüz gelmediyse kaçırılmış sayma
                if is_today and sched.time > now_time_str:
                    continue
                if (med.id, sched.time) in taken_keys:
                    continue
                missed.append({
                    "day": days_tr_map[log_date.weekday()],
                    "date": log_date,
                    "medication_name": med.name,
                    "scheduled_time": sched.time,
                })

    missed.sort(key=lambda item: (item["date"], item["scheduled_time"]))
    return missed


async def get_stats(db: AsyncSession, user_id: int) -> Dict[str, Any]:
    """
    Dashboard özeti için genel tedavi analitiğini derler.
    - Toplam aktif ilaç sayısı
    - Bugün alınması gereken toplam doz sayısı
    - Bugün alınan doz sayısı
    - Haftalık ortalama uyum yüzdesi
    - Stok adedi azalan (5 veya daha az) ilaçların sayısı
    """
    today_date = date.today()
    
    # 1. Toplam Aktif İlaç Sayısı
    total_meds_stmt = select(func.count(Medication.id)).where(
        Medication.user_id == user_id,
        Medication.is_active == True
    )
    total_meds_res = await db.execute(total_meds_stmt)
    total_medications = total_meds_res.scalar() or 0
    
    # 2. Stok Uyarı Sayısı (stok <= 5 olan aktif ilaçlar)
    stock_alert_stmt = select(func.count(Medication.id)).where(
        Medication.user_id == user_id,
        Medication.is_active == True,
        Medication.stock_count <= 5
    )
    stock_alert_res = await db.execute(stock_alert_stmt)
    stock_alerts_count = stock_alert_res.scalar() or 0
    
    # 3. Bugünkü doz durumları
    today_schedule_data = await get_today_schedule(db, user_id)
    today_doses = today_schedule_data["total_doses"]
    taken_today = today_schedule_data["taken_doses"]
    
    # 4. Haftalık ortalama uyum yüzdesi
    weekly_adherence_data = await get_weekly_adherence(db, user_id)
    total_percentage = sum(day["percentage"] for day in weekly_adherence_data)
    # Sadece doz olan günlerin ortalamasını alırsak daha gerçekçi olur
    days_with_doses = sum(1 for day in weekly_adherence_data if day["total_count"] > 0)
    
    if days_with_doses > 0:
        weekly_adherence_rate = int(total_percentage / days_with_doses)
    else:
        # Eğer hiç ilaç doz günü yoksa
        weekly_adherence_rate = 0
        
    return {
        "totalMedications": total_medications,
        "todayDoses": today_doses,
        "takenToday": taken_today,
        "weeklyAdherenceRate": weekly_adherence_rate,
        "stockAlertsCount": stock_alerts_count
    }


