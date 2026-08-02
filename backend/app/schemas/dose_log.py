"""
PharmaGuard AI - Dose Log Pydantic Schemas
"""

from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, Field

class DoseLogBase(BaseModel):
    medication_id: int
    log_date: date
    scheduled_time: str = Field(..., max_length=5)
    taken: bool = False
    taken_at: Optional[datetime] = None
    notes: Optional[str] = None

class DoseLogCreate(DoseLogBase):
    pass

class DoseLogResponse(DoseLogBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True
