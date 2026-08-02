"""
PharmaGuard AI - Medication Database Model
"""

from datetime import datetime, date
from typing import List, Optional
from sqlalchemy import String, Integer, DateTime, Text, JSON, Boolean, ForeignKey, Date
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class Medication(Base):
    __tablename__ = "medications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    dosage: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    form: Mapped[Optional[str]] = mapped_column(String(50), nullable=True) # "tablet", "kapsül", "şurup" vb.
    frequency: Mapped[Optional[str]] = mapped_column(String(50), nullable=True) # "günde 1", "günde 2" vb.
    
    # List of scheduled times, e.g. ["08:00", "20:00"]
    times: Mapped[list] = mapped_column(JSON, default=list, server_default='[]')
    
    purpose: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    how_to_use: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    side_effects: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    warnings: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    active_ingredient: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    stock_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    
    # Reference to the central drug database
    drug_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("drug_database.id", ondelete="SET NULL"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    user: Mapped["User"] = relationship(back_populates="medications")
    drug_ref: Mapped[Optional["Drug"]] = relationship(back_populates="user_medications")
    schedules: Mapped[List["MedicationSchedule"]] = relationship(
        back_populates="medication", cascade="all, delete-orphan"
    )
    dose_logs: Mapped[List["DoseLog"]] = relationship(
        back_populates="medication", cascade="all, delete-orphan"
    )
