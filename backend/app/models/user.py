"""
PharmaGuard AI - User Database Model
"""

from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Integer, DateTime, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    age: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String(20), nullable=True) # "male", "female", "other"
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    # JSON list of chronic conditions (e.g. ["diabetes", "hypertension"])
    chronic_conditions: Mapped[list] = mapped_column(JSON, default=list, server_default='[]')
    
    # JSON dictionary for user notification settings
    notification_preferences: Mapped[dict] = mapped_column(
        JSON, 
        default=lambda: {"email": True, "push": True, "reminder": True},
        server_default='{"email": true, "push": true, "reminder": true}'
    )
    
    language: Mapped[str] = mapped_column(String(5), default="tr", server_default="tr")
    
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    medications: Mapped[List["Medication"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    dose_logs: Mapped[List["DoseLog"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
