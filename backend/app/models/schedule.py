"""
PharmaGuard AI - Medication Schedule Database Model
"""

from typing import Optional
from sqlalchemy import String, Integer, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class MedicationSchedule(Base):
    __tablename__ = "medication_schedules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    medication_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("medications.id", ondelete="CASCADE"), nullable=False
    )
    time: Mapped[str] = mapped_column(String(5), nullable=False) # e.g. "08:00"
    day_of_week: Mapped[Optional[str]] = mapped_column(String(10), nullable=True) # nullable, e.g. "Monday" (for weekly frequency)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    # Relationships
    medication: Mapped["Medication"] = relationship(back_populates="schedules")
