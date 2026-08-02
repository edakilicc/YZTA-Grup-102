"""
PharmaGuard AI - Schedules & Dose Logs API Router
Bu router, günlük ilaç takip listesini, doz kaydetme,
haftalık uyum grafiği ve analitik istatistik API uç noktalarını tanımlar.
"""

from typing import List, Optional
from datetime import date, datetime
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.services.schedule_service import (
    get_today_schedule,
    toggle_dose,
    get_weekly_adherence,
    get_stats
)

router = APIRouter()

# Request / Response Pydantic Şemaları
class DoseToggleRequest(BaseModel):
    medication_id: int
    scheduled_time: str = Field(..., description="Doz saati (Örn: 08:00)")
    log_date: date = Field(default_factory=date.today, description="Doz tarihi")
    taken: bool = Field(..., description="Alındıysa true, alınmadıysa false")
    notes: Optional[str] = None

class DoseLogResponse(BaseModel):
    id: int
    medication_id: int
    log_date: date
    scheduled_time: str
    taken: bool
    taken_at: Optional[datetime]
    notes: Optional[str]

    class Config:
        from_attributes = True

class ScheduleItem(BaseModel):
    medication_id: int
    medication_name: str
    medication_image: Optional[str]
    scheduled_time: str
    taken: bool
    taken_at: Optional[datetime]

class TodayScheduleResponse(BaseModel):
    date: date
    total_doses: int
    taken_doses: int
    adherence_rate: float
    schedule: List[ScheduleItem]

class WeeklyAdherenceItem(BaseModel):
    day: str
    percentage: int
    taken_count: int
    total_count: int
    date: date

class StatsResponse(BaseModel):
    totalMedications: int
    todayDoses: int
    takenToday: int
    weeklyAdherenceRate: int
    stockAlertsCount: int

@router.get("/schedules/today", response_model=TodayScheduleResponse, status_code=status.HTTP_200_OK)
async def api_get_today_schedule(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Giriş yapmış olan kullanıcının bugünkü saat saat ilaç kullanım programını getirir.
    """
    return await get_today_schedule(db, current_user.id)

@router.post("/dose-logs", response_model=DoseLogResponse, status_code=status.HTTP_201_CREATED)
async def api_toggle_dose(
    req: DoseToggleRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Kullanıcının bir ilacı alıp almadığını (taken=true/false) kaydeder.
    Stok sayısı arka planda otomatik güncellenir.
    """
    return await toggle_dose(
        db=db,
        user_id=current_user.id,
        medication_id=req.medication_id,
        scheduled_time=req.scheduled_time,
        log_date=req.log_date,
        taken=req.taken,
        notes=req.notes
    )

@router.get("/dose-logs/weekly", response_model=List[WeeklyAdherenceItem], status_code=status.HTTP_200_OK)
async def api_get_weekly_adherence(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Kullanıcının son 7 günlük (Pazartesi-Pazar şeklinde) tedavi uyum yüzdelerini getirir.
    """
    return await get_weekly_adherence(db, current_user.id)

@router.get("/dose-logs/stats", response_model=StatsResponse, status_code=status.HTTP_200_OK)
async def api_get_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Dashboard istatistik kartları için genel tedavi analizlerini döner.
    """
    return await get_stats(db, current_user.id)
