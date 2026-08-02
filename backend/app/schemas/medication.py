"""
PharmaGuard AI - Medication Pydantic Schemas
"""

from datetime import datetime, date
from typing import List, Optional
from pydantic import BaseModel, Field

# Nested Schedule Schema
class MedicationScheduleBase(BaseModel):
    time: str = Field(..., description="Doz saati, e.g. 08:00")
    day_of_week: Optional[str] = Field(None, description="Haftalık kullanım için gün")
    is_active: bool = True

class MedicationScheduleResponse(MedicationScheduleBase):
    id: int
    medication_id: int

    class Config:
        from_attributes = True

# Main Medication Schemas
class MedicationBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    dosage: Optional[str] = Field(None, max_length=50)
    form: Optional[str] = Field(None, max_length=50) # "tablet", "kapsül" vb.
    frequency: Optional[str] = Field(None, max_length=50) # "günde 1", "günde 2" vb.
    times: List[str] = Field(default_factory=list, description="İlaç saatleri listesi, e.g. ['08:00', '20:00']")
    purpose: Optional[str] = None
    how_to_use: Optional[str] = None
    side_effects: Optional[str] = None
    warnings: Optional[str] = None
    active_ingredient: Optional[str] = Field(None, max_length=200)
    stock_count: int = Field(0, ge=0)
    image_url: Optional[str] = Field(None, max_length=500)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: bool = True
    drug_id: Optional[int] = None

class MedicationCreate(MedicationBase):
    pass

class MedicationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    dosage: Optional[str] = Field(None, max_length=50)
    form: Optional[str] = Field(None, max_length=50)
    frequency: Optional[str] = Field(None, max_length=50)
    times: Optional[List[str]] = None
    purpose: Optional[str] = None
    how_to_use: Optional[str] = None
    side_effects: Optional[str] = None
    warnings: Optional[str] = None
    active_ingredient: Optional[str] = Field(None, max_length=200)
    stock_count: Optional[int] = Field(None, ge=0)
    image_url: Optional[str] = Field(None, max_length=500)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None
    drug_id: Optional[int] = None

class MedicationResponse(MedicationBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    schedules: List[MedicationScheduleResponse] = []

    class Config:
        from_attributes = True


class CheckInteractionsRequest(BaseModel):
    drug_name: str = Field(..., min_length=1, max_length=200)


class InteractionDetail(BaseModel):
    drug1: str
    drug2: str
    severity: str
    description: str


class CheckInteractionsResponse(BaseModel):
    has_interactions: bool
    interactions: List[InteractionDetail] = []
    source: str
