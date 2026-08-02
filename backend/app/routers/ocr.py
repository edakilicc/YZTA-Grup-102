"""
PharmaGuard AI - OCR API Router
Bu router, reçete/kutu görsellerini yükleyip üzerindeki ilaçları asenkron
olarak tespit eden API uç noktasını tanımlar.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, status, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.services.ocr_service import scan_prescription_image

router = APIRouter()

# Response Pydantic Şemaları
class DetectedMedication(BaseModel):
    name: str
    dosage: str
    frequency: str
    confidence: float
    matched_drug_id: Optional[int]
    quantity: Optional[int] = None
    form: Optional[str] = "Tablet"
    active_ingredient: Optional[str] = "Bilinmiyor"
    how_to_use: Optional[str] = ""
    side_effects: Optional[str] = ""
    warnings: Optional[str] = ""

class ScanResultResponse(BaseModel):
    raw_text: str
    detected_medications: List[DetectedMedication]

@router.post("/scan", response_model=ScanResultResponse, status_code=status.HTTP_200_OK)
async def scan_prescription(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Yüklenen reçete görselini analiz eder, metne döner ve ilaç veritabanıyla eşleştirir.
    Kabul edilen formatlar: JPEG, PNG, WEBP.
    """
    # 1. Dosya formatı kontrolü
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Geçersiz dosya formatı. Lütfen sadece JPEG, PNG veya WEBP görseli yükleyin."
        )
        
    try:
        # Görsel byte verisini oku
        image_bytes = await file.read()
        
        # OCR servisini çağır
        result = await scan_prescription_image(image_bytes, db, file.filename)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Reçete taranırken sistem hatası oluştu: {str(e)}"
        )
