"""
PharmaGuard AI - Reports API Router
Bu router, kullanıcının tedavi raporlarını PDF olarak indirmesini sağlayan API uç noktalarını tanımlar.
Tüm uç noktalar JWT kimlik doğrulaması gerektirir (Protected).
"""

from datetime import datetime
from fastapi import APIRouter, Depends, status, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
import io

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.services.medication_service import get_medications
from app.services.schedule_service import get_weekly_adherence, get_weekly_missed_doses
from app.services.pdf_service import generate_treatment_report

router = APIRouter()


@router.get("/pdf", status_code=status.HTTP_200_OK)
async def download_pdf_report(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Giriş yapmış kullanıcının aktif ilaç listesini, son 7 günlük tedavi uyum geçmişini
    ve genel istatistiklerini içeren profesyonel bir PDF tedavi raporu oluşturur ve indirir.
    """
    try:
        # 1. Kullanıcının aktif ilaçlarını çek
        medications_raw = await get_medications(db, current_user.id)
        medications = []
        for med in medications_raw:
            medications.append({
                "name": med.name,
                "dosage": med.dosage or "-",
                "form": med.form or "-",
                "frequency": med.frequency or "-",
                "times": med.times or [],
                "stock_count": med.stock_count or 0,
            })

        # 2. Son 7 günlük uyum verisini çek
        weekly_adherence = await get_weekly_adherence(db, current_user.id)

        # 3. Kayıtlara göre kaçırılan/işaretlenmeyen dozları çek (salt okunur)
        missed_doses = await get_weekly_missed_doses(db, current_user.id)

        # 4. Kullanıcı bilgilerini hazırla
        user_data = {
            "first_name": current_user.first_name,
            "last_name": current_user.last_name,
            "age": current_user.age,
            "gender": current_user.gender,
            "email": current_user.email,
        }

        # 5. PDF oluştur
        pdf_bytes = generate_treatment_report(
            user=user_data,
            medications=medications,
            weekly_adherence=weekly_adherence,
            missed_doses=missed_doses
        )

        # 6. PDF dosyasını StreamingResponse ile döndür
        today_str = datetime.now().strftime("%Y-%m-%d")
        filename = f"tedavi_raporu_{today_str}.pdf"

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PDF raporu oluşturulurken bir hata oluştu: {str(e)}"
        )
