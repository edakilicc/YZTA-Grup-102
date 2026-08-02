"""
PharmaGuard AI - Medication API Router
Bu router, ilaç yönetimi (CRUD) API uç noktalarını tanımlar.
Tüm uç noktalar JWT kimlik doğrulaması gerektirir (Protected).
"""

from typing import List
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.medication import (
    MedicationCreate, MedicationUpdate, MedicationResponse,
    CheckInteractionsRequest, CheckInteractionsResponse
)
from app.services.medication_service import (
    get_medications, get_medication, create_medication, update_medication, delete_medication,
    check_drug_interactions
)
from app.services.ai_service import check_interactions
from app.config import settings

router = APIRouter()

@router.get("/", response_model=List[MedicationResponse], status_code=status.HTTP_200_OK)
async def list_medications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Giriş yapmış kullanıcının tüm aktif ilaçlarını programlarıyla (schedules) birlikte listeler.
    """
    meds = await get_medications(db, current_user.id)
    return meds

@router.get("/{medication_id}", response_model=MedicationResponse, status_code=status.HTTP_200_OK)
async def read_medication(
    medication_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Giriş yapmış kullanıcının kendi ilaçlarından belirtilen ID'li olanın detayını döner.
    İlaç bulunamazsa veya başka bir kullanıcıya aitse güvenlik gereği 404 Not Found döner.
    """
    med = await get_medication(db, medication_id, current_user.id)
    if not med:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="İlaç bulunamadı."
        )
    return med

@router.post("/", response_model=MedicationResponse, status_code=status.HTTP_201_CREATED)
async def add_medication(
    data: MedicationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Giriş yapmış kullanıcıya yeni bir ilaç kaydı ekler ve ilaç saatlerine göre otomatik program oluşturur.
    """
    new_med = await create_medication(db, current_user.id, data)
    return new_med

@router.put("/{medication_id}", response_model=MedicationResponse, status_code=status.HTTP_200_OK)
async def edit_medication(
    medication_id: int,
    data: MedicationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Giriş yapmış kullanıcının kendi ilacını günceller. Saatler (times) değişirse, eski programları silip yenilerini oluşturur.
    İlaç bulunamazsa veya kullanıcıya ait değilse 404 döner.
    """
    updated_med = await update_medication(db, medication_id, current_user.id, data)
    return updated_med

@router.delete("/{medication_id}", status_code=status.HTTP_200_OK)
async def remove_medication(
    medication_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Kullanıcının belirtilen ilacını yumuşak olarak siler (is_active=False).
    İlaç bulunamazsa veya kullanıcıya ait değilse 404 döner.
    """
    await delete_medication(db, medication_id, current_user.id)
    return {"message": "İlaç başarıyla silindi."}


@router.post("/check-interactions", response_model=CheckInteractionsResponse, status_code=status.HTTP_200_OK)
async def check_medication_interactions(
    req: CheckInteractionsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Yeni eklenmek istenen ilacın kullanıcının mevcut aktif ilaçlarıyla etkileşimini kontrol eder.
    Öncelikle veritabanı üzerinden hızlıca kontrol eder. Eğer orada bulunamazsa ve Gemini API
    aktifse Gemini AI ile etkileşim analizi yapar.
    """
    # 1. DB tabanlı kontrol
    db_result = await check_drug_interactions(db, current_user.id, req.drug_name)
    
    if db_result.get("has_interactions"):
        return {
            "has_interactions": True,
            "interactions": db_result.get("interactions", []),
            "source": "database"
        }
        
    # 2. DB'de etkileşim bulunamadıysa ve Gemini API aktifse AI ile analiz et
    if settings.GEMINI_API_KEY:
        try:
            user_meds = await get_medications(db, current_user.id)
            current_med_names = [m.name for m in user_meds]
            
            if current_med_names:
                ai_result = await check_interactions(req.drug_name, current_med_names)
                if ai_result.get("has_interaction"):
                    severity = ai_result.get("severity", "medium")
                    if severity not in ["high", "medium", "low", "none"]:
                        severity = "medium"
                        
                    return {
                        "has_interactions": True,
                        "interactions": [{
                            "drug1": req.drug_name,
                            "drug2": ", ".join(current_med_names),
                            "severity": severity,
                            "description": ai_result.get("details", "")
                        }],
                        "source": "ai"
                    }
        except Exception as e:
            print(f"Gemini check_interactions failed: {str(e)}")
            
    # Etkileşim bulunamadı
    return {
        "has_interactions": False,
        "interactions": [],
        "source": "database"
    }

