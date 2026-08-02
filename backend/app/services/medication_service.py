"""
PharmaGuard AI - Medication CRUD Service
Bu servis, kullanıcının ilaçlarını oluşturma, sorgulama, güncelleme, silme (soft delete)
ve ilaç saatlerine bağlı olarak otomatik kullanım programı (schedule) oluşturma işlemlerini yönetir.
"""

from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.medication import Medication
from app.models.schedule import MedicationSchedule
from app.models.drug import Drug
from app.schemas.medication import MedicationCreate, MedicationUpdate

async def get_medications(db: AsyncSession, user_id: int) -> List[Medication]:
    """
    Kullanıcıya ait tüm aktif (is_active=True) ilaçları programlarıyla (schedules) birlikte getirir.
    """
    stmt = (
        select(Medication)
        .where(Medication.user_id == user_id, Medication.is_active == True)
        .options(selectinload(Medication.schedules))
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())

async def get_medication(db: AsyncSession, medication_id: int, user_id: int) -> Optional[Medication]:
    """
    Belirli bir ilacı, kullanıcının kendi ilacı olması şartıyla getirir.
    Başka kullanıcının ilacı ise veya ilaç aktif değilse None döner.
    """
    stmt = (
        select(Medication)
        .where(
            Medication.id == medication_id,
            Medication.user_id == user_id,
            Medication.is_active == True
        )
        .options(selectinload(Medication.schedules))
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()

async def create_medication(db: AsyncSession, user_id: int, data: MedicationCreate) -> Medication:
    """
    Yeni bir ilaç kaydı oluşturur ve belirtilen 'times' listesindeki her bir saat için
    otomatik olarak 'medication_schedules' tablosunda program kayıtları oluşturur.
    """
    # 1. İlaç kaydının oluşturulması
    med_dict = data.model_dump(exclude={"times"})
    new_medication = Medication(
        user_id=user_id,
        times=data.times,
        **med_dict
    )
    
    db.add(new_medication)
    await db.flush()  # DB tarafında ID'nin oluşmasını sağlar
    
    # 2. İlaç saatlerine göre otomatik schedule (program) kayıtlarının eklenmesi
    for time_str in data.times:
        schedule = MedicationSchedule(
            medication_id=new_medication.id,
            time=time_str,
            is_active=True
        )
        db.add(schedule)
        
    await db.commit()
    await db.refresh(new_medication)
    
    # schedules ilişkisinin yüklenmesini tetikleyelim
    stmt = (
        select(Medication)
        .where(Medication.id == new_medication.id)
        .options(selectinload(Medication.schedules))
    )
    res = await db.execute(stmt)
    return res.scalar_one()

async def update_medication(
    db: AsyncSession, medication_id: int, user_id: int, data: MedicationUpdate
) -> Medication:
    """
    İlaç bilgilerini günceller. Eğer 'times' listesi güncellenmişse,
    mevcut programı (schedules) silip yeni saatlere göre yeniden oluşturur.
    """
    # 1. İlacı bulalım
    medication = await get_medication(db, medication_id, user_id)
    if not medication:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="İlaç bulunamadı."
        )
        
    update_dict = data.model_dump(exclude_unset=True)
    times_updated = "times" in update_dict
    new_times = update_dict.pop("times", None)
    
    # Temel alanları güncelle
    for key, value in update_dict.items():
        setattr(medication, key, value)
        
    # Eğer saatler güncellenmişse
    if times_updated and new_times is not None:
        medication.times = new_times
        
        # 1. Mevcut programları sil
        delete_stmt = select(MedicationSchedule).where(MedicationSchedule.medication_id == medication_id)
        existing_schedules = await db.execute(delete_stmt)
        for sched in existing_schedules.scalars().all():
            await db.delete(sched)
            
        # 2. Yeni saatlere göre programları oluştur
        for time_str in new_times:
            schedule = MedicationSchedule(
                medication_id=medication_id,
                time=time_str,
                is_active=True
            )
            db.add(schedule)
            
    await db.commit()
    
    # Session cache'ini boşaltarak ilişkilerin DB'den yeniden yüklenmesini zorluyoruz
    db.expire(medication)
    
    # Güncel halini schedules yüklü olarak geri dönelim
    stmt = (
        select(Medication)
        .where(Medication.id == medication_id)
        .options(selectinload(Medication.schedules))
    )
    res = await db.execute(stmt)
    return res.scalar_one()

async def delete_medication(db: AsyncSession, medication_id: int, user_id: int) -> bool:
    """
    İlacı fiziksel olarak silmek yerine yumuşak silme (soft delete - is_active=False) yapar.
    İlişkili programları (schedules) ise deaktif (is_active=False) hale getirir.
    """
    medication = await get_medication(db, medication_id, user_id)
    if not medication:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="İlaç bulunamadı."
        )
        
    medication.is_active = False
    
    # İlişkili programları da deaktif et
    for schedule in medication.schedules:
        schedule.is_active = False
        
    await db.commit()
    return True


async def check_drug_interactions(db: AsyncSession, user_id: int, new_drug_name: str) -> dict:
    """
    Yeni eklenmek istenen ilacın kullanıcının mevcut aktif ilaçlarıyla olan etkileşimini
    referans veritabanı (drug_database) üzerinden hızlıca kontrol eder.
    """
    # 1. Kullanıcının mevcut aktif ilaçlarını çek
    user_meds = await get_medications(db, user_id)
    if not user_meds:
        return {"has_interactions": False, "interactions": []}
        
    # 2. drug_database tablosundan yeni ilacın kaydını bulmaya çalış
    new_drug_name_clean = new_drug_name.strip()
    stmt = select(Drug).where(Drug.name.ilike(f"%{new_drug_name_clean}%"))
    result = await db.execute(stmt)
    new_drugs = result.scalars().all()
    
    new_drug = None
    if new_drugs:
        new_drug = new_drugs[0]
        for d in new_drugs:
            if d.name.lower() == new_drug_name_clean.lower():
                new_drug = d
                break
                
    if not new_drug:
        return {"has_interactions": False, "interactions": []}
        
    found_interactions = []
    new_drug_interactions = new_drug.interactions or []
    new_active_ing = new_drug.active_ingredient or ""
    
    # 3. Mevcut ilaçlar ile etkileşimleri karşılaştır
    for med in user_meds:
        med_db_drug = None
        if med.drug_id:
            med_db_drug = await db.get(Drug, med.drug_id)
        else:
            stmt = select(Drug).where(Drug.name.ilike(f"%{med.name}%"))
            res = await db.execute(stmt)
            med_db_drug = res.scalars().first()
            
        med_interactions = med_db_drug.interactions if med_db_drug else []
        med_active_ing = med.active_ingredient or (med_db_drug.active_ingredient if med_db_drug else "")
        
        interacts_a = False
        desc_a = ""
        for inter in new_drug_interactions:
            inter_lower = inter.lower()
            med_name_lower = med.name.lower()
            med_ing_lower = med_active_ing.lower() if med_active_ing else ""
            if (inter_lower in med_name_lower or 
                inter_lower in med_ing_lower or 
                med_name_lower in inter_lower or 
                (med_ing_lower and med_ing_lower in inter_lower)):
                interacts_a = True
                desc_a = f"{new_drug.name} ilacının prospektüsünde {inter} ile etkileşim uyarısı bulunuyor."
                break
                
        interacts_b = False
        desc_b = ""
        for inter in med_interactions:
            inter_lower = inter.lower()
            new_name_lower = new_drug.name.lower()
            new_ing_lower = new_active_ing.lower() if new_active_ing else ""
            if (inter_lower in new_name_lower or 
                inter_lower in new_ing_lower or 
                new_name_lower in inter_lower or 
                (new_ing_lower and new_ing_lower in inter_lower)):
                interacts_b = True
                desc_b = f"{med.name} ilacının prospektüsünde {inter} ile etkileşim uyarısı bulunuyor."
                break
                
        if interacts_a or interacts_b:
            description = desc_a if interacts_a else desc_b
            if interacts_a and interacts_b:
                description = f"{desc_a} Ayrıca {desc_b}"
            
            # Ciddiyet derecesini belirle
            severity = "medium"
            high_risk_keywords = ["warfarin", "antikoagülan", "kan sulandırıcı", "mao inhibitörü", "lityum", "aspirin", "heparin"]
            med_name_l = med.name.lower()
            new_name_l = new_drug.name.lower()
            med_ing_l = med_active_ing.lower() if med_active_ing else ""
            new_ing_l = new_active_ing.lower() if new_active_ing else ""
            
            if any(k in med_name_l or k in new_name_l or k in med_ing_l or k in new_ing_l for k in high_risk_keywords):
                severity = "high"
                
            found_interactions.append({
                "drug1": new_drug.name,
                "drug2": med.name,
                "severity": severity,
                "description": description
            })
            
    return {
        "has_interactions": len(found_interactions) > 0,
        "interactions": found_interactions
    }
