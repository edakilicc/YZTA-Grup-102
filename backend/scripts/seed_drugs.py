import asyncio
import sys
import os
import csv
import json

# Add backend directory to sys.path to allow imports from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import SessionLocal, engine, Base
from app.models.drug import Drug

# Başlangıç paketi olarak Türkiye'deki yaygın ilaçların örnek verisi (50 adet)
INITIAL_DRUGS = [
    {"name": "Parol 500 mg Tablet", "active_ingredient": "Parasetamol", "form": "Tablet", "category": "Ağrı Kesici / Ateş Düşürücü"},
    {"name": "Arveles 25 mg Film Tablet", "active_ingredient": "Deksketoprofen", "form": "Tablet", "category": "Ağrı Kesici"},
    {"name": "Majezik 100 mg Film Tablet", "active_ingredient": "Flurbiprofen", "form": "Tablet", "category": "Ağrı Kesici / Anti-enflamatuar"},
    {"name": "Augmentin 1000 mg Film Tablet", "active_ingredient": "Amoksisilin / Klavulanik Asit", "form": "Tablet", "category": "Antibiyotik"},
    {"name": "Calpol 120 mg/5 ml Süspansiyon", "active_ingredient": "Parasetamol", "form": "Şurup", "category": "Ağrı Kesici / Ateş Düşürücü"},
    {"name": "Nurofen Cold & Flu Tablet", "active_ingredient": "İbuprofen / Psödoefedrin", "form": "Tablet", "category": "Soğuk Algınlığı"},
    {"name": "Katarin Kapsül", "active_ingredient": "Parasetamol / Oksolamin / Klorfeniramin", "form": "Kapsül", "category": "Soğuk Algınlığı"},
    {"name": "Dolorex 50 mg Draje", "active_ingredient": "Diklofenak", "form": "Draje", "category": "Ağrı Kesici / Anti-enflamatuar"},
    {"name": "Lansor 30 mg Mikropellet Kapsül", "active_ingredient": "Lansoprazol", "form": "Kapsül", "category": "Mide Koruyucu"},
    {"name": "Nexium 40 mg Enterik Tablet", "active_ingredient": "Esomeprazol", "form": "Tablet", "category": "Mide Koruyucu"},
    {"name": "Theraflu Forte Film Tablet", "active_ingredient": "Parasetamol / Klorfeniramin / Psödoefedrin", "form": "Tablet", "category": "Soğuk Algınlığı"},
    {"name": "Tylolhot Tek Kullanımlık Toz", "active_ingredient": "Parasetamol / Klorfeniramin / Psödoefedrin", "form": "Toz / Granül", "category": "Soğuk Algınlığı"},
    {"name": "Aferin Kapsül", "active_ingredient": "Parasetamol / Klorfeniramin", "form": "Kapsül", "category": "Soğuk Algınlığı / Ağrı Kesici"},
    {"name": "Dikloron 50 mg Film Tablet", "active_ingredient": "Diklofenak Sodyum", "form": "Tablet", "category": "Ağrı Kesici / Kas Gevşetici"},
    {"name": "Muscoril 4 mg Kapsül", "active_ingredient": "Tiyokolşikosid", "form": "Kapsül", "category": "Kas Gevşetici"},
    {"name": "Cabral 400 mg Draje", "active_ingredient": "Feniramidol", "form": "Draje", "category": "Kas Gevşetici"},
    {"name": "Vermidon 500 mg Tablet", "active_ingredient": "Parasetamol / Kafein", "form": "Tablet", "category": "Ağrı Kesici"},
    {"name": "Novalgine 500 mg Tablet", "active_ingredient": "Metamizol Sodyum", "form": "Tablet", "category": "Ağrı Kesici / Ateş Düşürücü"},
    {"name": "Minoset 500 mg Tablet", "active_ingredient": "Parasetamol", "form": "Tablet", "category": "Ağrı Kesici / Ateş Düşürücü"},
    {"name": "Cipro 500 mg Film Tablet", "active_ingredient": "Siprofloksasin", "form": "Tablet", "category": "Antibiyotik"},
    {"name": "Macrol 500 mg Film Tablet", "active_ingredient": "Klaritromisin", "form": "Tablet", "category": "Antibiyotik"},
    {"name": "Amoklavin 1000 mg Film Tablet", "active_ingredient": "Amoksisilin / Klavulanik Asit", "form": "Tablet", "category": "Antibiyotik"},
    {"name": "Largopen 500 mg Tablet", "active_ingredient": "Amoksisilin", "form": "Tablet", "category": "Antibiyotik"},
    {"name": "Klamoks 1000 mg Film Tablet", "active_ingredient": "Amoksisilin / Klavulanik Asit", "form": "Tablet", "category": "Antibiyotik"},
    {"name": "Croxilex 1000 mg Film Tablet", "active_ingredient": "Amoksisilin / Klavulanik Asit", "form": "Tablet", "category": "Antibiyotik"},
    {"name": "Levotiron 50 mcg Tablet", "active_ingredient": "Levotiroksin Sodyum", "form": "Tablet", "category": "Tiroid Hormonu"},
    {"name": "Euthyrox 50 mcg Tablet", "active_ingredient": "Levotiroksin Sodyum", "form": "Tablet", "category": "Tiroid Hormonu"},
    {"name": "Glifor 1000 mg Film Tablet", "active_ingredient": "Metformin", "form": "Tablet", "category": "Diyabet (Tip 2)"},
    {"name": "Diaformin 1000 mg Film Tablet", "active_ingredient": "Metformin", "form": "Tablet", "category": "Diyabet (Tip 2)"},
    {"name": "Matofin 1000 mg XR Tablet", "active_ingredient": "Metformin", "form": "Tablet", "category": "Diyabet (Tip 2)"},
    {"name": "Coraspin 100 mg Enterik Tablet", "active_ingredient": "Asetilsalisilik Asit", "form": "Tablet", "category": "Kan Sulandırıcı"},
    {"name": "Ecopirin 100 mg Enterik Tablet", "active_ingredient": "Asetilsalisilik Asit", "form": "Tablet", "category": "Kan Sulandırıcı"},
    {"name": "Plavix 75 mg Film Tablet", "active_ingredient": "Klopidogrel", "form": "Tablet", "category": "Kan Sulandırıcı"},
    {"name": "Sanovel 75 mg Film Tablet", "active_ingredient": "Klopidogrel", "form": "Tablet", "category": "Kan Sulandırıcı"},
    {"name": "Deloday 5 mg Film Tablet", "active_ingredient": "Desloratadin", "form": "Tablet", "category": "Alerji / Antihistaminik"},
    {"name": "Aerius 5 mg Film Tablet", "active_ingredient": "Desloratadin", "form": "Tablet", "category": "Alerji / Antihistaminik"},
    {"name": "Zyrtec 10 mg Film Tablet", "active_ingredient": "Setirizin", "form": "Tablet", "category": "Alerji / Antihistaminik"},
    {"name": "Crebros 5 mg Film Tablet", "active_ingredient": "Levosetirizin", "form": "Tablet", "category": "Alerji / Antihistaminik"},
    {"name": "Tebokan Special 80 mg Film Tablet", "active_ingredient": "Ginkgo Biloba", "form": "Tablet", "category": "Bitkisel Destek / Dolaşım"},
    {"name": "Vasoserc BID 24 mg Tablet", "active_ingredient": "Betahistin", "form": "Tablet", "category": "Vertigo / Denge"},
    {"name": "Desyrel 50 mg Tablet", "active_ingredient": "Trazodon", "form": "Tablet", "category": "Antidepresan"},
    {"name": "Cipralex 10 mg Film Tablet", "active_ingredient": "Essitalopram", "form": "Tablet", "category": "Antidepresan"},
    {"name": "Lustral 50 mg Çentikli Tablet", "active_ingredient": "Sertralin", "form": "Tablet", "category": "Antidepresan"},
    {"name": "Prozac 20 mg Kapsül", "active_ingredient": "Fluoksetin", "form": "Kapsül", "category": "Antidepresan"},
    {"name": "Xanax 0.5 mg Tablet", "active_ingredient": "Alprazolam", "form": "Tablet", "category": "Anksiyolitik (Yeşil Reçete)"},
    {"name": "Beloc Zok 50 mg Kontrollü Salımlı Tablet", "active_ingredient": "Metoprolol", "form": "Tablet", "category": "Tansiyon / Kalp Ritmi"},
    {"name": "Concor 5 mg Film Tablet", "active_ingredient": "Bisoprolol", "form": "Tablet", "category": "Tansiyon / Kalp Ritmi"},
    {"name": "Tansiyon 10 mg Tablet", "active_ingredient": "Amlodipin", "form": "Tablet", "category": "Tansiyon"},
    {"name": "Co-Diovan 160/12.5 mg Film Tablet", "active_ingredient": "Valsartan / Hidroklorotiyazid", "form": "Tablet", "category": "Tansiyon"},
    {"name": "Ateş Düşürücü Fitil", "active_ingredient": "Parasetamol", "form": "Fitil", "category": "Ateş Düşürücü"}
]

async def seed_initial_data(session: AsyncSession):
    """Başlangıç paketini veritabanına ekler."""
    print("Veritabanına başlangıç ilaçları ekleniyor...")
    added_count = 0
    
    for item in INITIAL_DRUGS:
        # İlacın zaten olup olmadığını kontrol et
        stmt = select(Drug).where(Drug.name == item["name"])
        result = await session.execute(stmt)
        existing_drug = result.scalar_one_or_none()
        
        if not existing_drug:
            new_drug = Drug(
                name=item["name"],
                active_ingredient=item["active_ingredient"],
                form=item["form"],
                category=item["category"]
            )
            session.add(new_drug)
            added_count += 1
            
    if added_count > 0:
        await session.commit()
        print(f"Başarıyla {added_count} adet yeni ilaç eklendi.")
    else:
        print("Tüm başlangıç ilaçları zaten veritabanında mevcut.")

async def load_from_csv(session: AsyncSession, file_path: str):
    """
    TİTCK vb. kaynaklardan alınan CSV dosyasından ilaçları okur ve ekler.
    CSV yapısı: İlaç Adı, Etkin Madde, Form, Kategori, Barkod
    """
    if not os.path.exists(file_path):
        print(f"HATA: {file_path} bulunamadı.")
        return
        
    print(f"{file_path} dosyasından ilaçlar yükleniyor...")
    added_count = 0
    
    with open(file_path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            # Gerekli sütunların CSV'nizde nasıl isimlendirildiğine göre güncelleyebilirsiniz.
            name = row.get("İlaç Adı", "").strip()
            if not name:
                continue
                
            active_ingredient = row.get("Etkin Madde", "").strip()
            form = row.get("Form", "").strip()
            category = row.get("Kategori", "").strip()
            barcode = row.get("Barkod", "").strip()
            
            stmt = select(Drug).where(Drug.name == name)
            result = await session.execute(stmt)
            existing_drug = result.scalar_one_or_none()
            
            if not existing_drug:
                new_drug = Drug(
                    name=name,
                    active_ingredient=active_ingredient,
                    form=form,
                    category=category,
                    barcode=barcode
                )
                session.add(new_drug)
                added_count += 1
                
    if added_count > 0:
        await session.commit()
        print(f"Başarıyla {added_count} adet yeni ilaç CSV'den eklendi.")
    else:
        print("CSV'deki ilaçlar zaten mevcut.")

async def main():
    async with SessionLocal() as session:
        # Başlangıç verilerini yükle
        await seed_initial_data(session)
        
        # Eğer bir argüman olarak CSV verildiyse onu da yükle (python seed_drugs.py ilaclar.csv)
        if len(sys.argv) > 1:
            csv_path = sys.argv[1]
            await load_from_csv(session, csv_path)

if __name__ == "__main__":
    asyncio.run(main())
