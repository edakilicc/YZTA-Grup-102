"""
PharmaGuard AI - AI API Router
Bu router, prospektüs özetleme, etkileşim kontrolü ve haftalık değerlendirme
API uç noktalarını tanımlar. Rate limiting ve DB caching mekanizmalarını barındırır.
"""

import time
from typing import List, Optional
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.drug import Drug
from app.services.ai_service import summarize_prospectus, check_interactions

router = APIRouter()

# In-Memory Rate Limiting Yapısı (Maksimum 10 istek / dakika)
AI_REQUEST_TIMESTAMPS = []

def apply_rate_limit():
    """
    Basit in-memory rate limiter. Son 60 saniye içindeki istek sayısını kontrol eder.
    Sınır aşılırsa 429 Too Many Requests döndürür.
    """
    now = time.time()
    global AI_REQUEST_TIMESTAMPS
    # 60 saniyeden eski kayıtları temizle
    AI_REQUEST_TIMESTAMPS = [t for t in AI_REQUEST_TIMESTAMPS if now - t < 60]
    
    if len(AI_REQUEST_TIMESTAMPS) >= 10:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Çok fazla istek gönderdiniz. Yapay zeka servisleri dakikada maksimum 10 istek ile sınırlıdır."
        )
    AI_REQUEST_TIMESTAMPS.append(now)

# Request / Response Pydantic Şemaları
class SummarizeRequest(BaseModel):
    medication_name: str = Field(..., min_length=1, max_length=200)
    prospectus_text: str = Field(..., min_length=10)

class SummarizeResponse(BaseModel):
    purpose: str
    how_to_use: str
    side_effects: str
    warnings: str
    interactions: str

class InteractionRequest(BaseModel):
    new_medication_name: str = Field(..., min_length=1, max_length=200)
    current_medications: List[str] = Field(default_factory=list)

class InteractionResponse(BaseModel):
    has_interaction: bool
    severity: str
    details: str

@router.post("/summarize-prospectus", response_model=SummarizeResponse, status_code=status.HTTP_200_OK)
async def api_summarize_prospectus(
    req: SummarizeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Gönderilen prospektüs metnini özetler.
    CACHING: Eğer referans ilaç veritabanında aynı isimde bir ilaç varsa ve özeti hazırsa doğrudan DB'den döndürür.
    Yeni özetlenen ilaçları da referans veritabanına veya önbelleğe kaydeder.
    """
    apply_rate_limit()

    # 1. Caching Kontrolü: İlaç adına göre drug_database tablosuna bakılır
    # ILIKE / case-insensitive kontrolü yapılır
    search_name = req.medication_name.strip()
    stmt = select(Drug).where(Drug.name.ilike(search_name))
    result = await db.execute(stmt)
    db_drug = result.scalar_one_or_none()
    
    # Eğer ilaç veritabanında kayıtlıysa ve zaten bir özeti varsa doğrudan cache'den döndür
    if db_drug and db_drug.prospectus_summary:
        try:
            summary_json = json.loads(db_drug.prospectus_summary)
            # İstenen schema formatına uygun mu kontrol et
            return {
                "purpose": summary_json.get("purpose", ""),
                "how_to_use": summary_json.get("how_to_use", ""),
                "side_effects": summary_json.get("side_effects", ""),
                "warnings": summary_json.get("warnings", ""),
                "interactions": summary_json.get("interactions", "") if isinstance(summary_json.get("interactions"), str) else ", ".join(summary_json.get("interactions", []))
            }
        except Exception:
            # Parse edemezsek yeniden AI çağıracağız
            pass

    # 2. Cache Yoksa: Gemini API çağrılır
    ai_result = await summarize_prospectus(req.medication_name, req.prospectus_text)
    
    # Uyumsuz tipler (liste vb.) varsa stringe çevirelim
    formatted_result = {
        "purpose": ai_result.get("purpose", ""),
        "how_to_use": ai_result.get("how_to_use", ""),
        "side_effects": ai_result.get("side_effects", "") if isinstance(ai_result.get("side_effects"), str) else ", ".join(ai_result.get("side_effects", [])),
        "warnings": ai_result.get("warnings", ""),
        "interactions": ai_result.get("interactions", "") if isinstance(ai_result.get("interactions"), str) else ", ".join(ai_result.get("interactions", []))
    }

    # 3. Sonucu Cache'e Yazma (Veritabanına kaydetme)
    if db_drug:
        # İlaç DB'de var ama özeti yoksa güncelle
        db_drug.prospectus_raw = req.prospectus_text
        db_drug.prospectus_summary = json.dumps(formatted_result, ensure_ascii=False)
        await db.commit()
    else:
        # İlaç DB'de hiç yoksa yeni bir referans ilaç oluştur
        new_drug = Drug(
            name=req.medication_name,
            active_ingredient="Bilinmiyor (AI)",
            prospectus_raw=req.prospectus_text,
            prospectus_summary=json.dumps(formatted_result, ensure_ascii=False),
            interactions=ai_result.get("interactions", []) if isinstance(ai_result.get("interactions"), list) else [ai_result.get("interactions", "")],
            contraindications=[ai_result.get("warnings", "")]
        )
        db.add(new_drug)
        await db.commit()

    return formatted_result

# JSON helper import
import json

@router.post("/check-interactions", response_model=InteractionResponse, status_code=status.HTTP_200_OK)
async def api_check_interactions(
    req: InteractionRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Yeni eklenen ilacın, hastanın aktif ilaçlarıyla olan etkileşim analizini döner.
    """
    apply_rate_limit()
    
    # Gemini analizi
    analysis = await check_interactions(req.new_medication_name, req.current_medications)
    return analysis
