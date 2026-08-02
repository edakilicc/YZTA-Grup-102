"""
PharmaGuard AI - Drug Database Model (Reference Database)
"""

from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Integer, DateTime, Text, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class Drug(Base):
    __tablename__ = "drug_database"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(300), nullable=False, index=True)
    active_ingredient: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    atc_code: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    form: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    manufacturer: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    prospectus_raw: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    prospectus_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # List of drug names or ingredients this drug interacts with
    interactions: Mapped[list] = mapped_column(JSON, default=list, server_default='[]')
    
    # List of conditions/diseases where this drug is contraindicated
    contraindications: Mapped[list] = mapped_column(JSON, default=list, server_default='[]')
    
    barcode: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # Relationships
    user_medications: Mapped[List["Medication"]] = relationship(
        back_populates="drug_ref"
    )
