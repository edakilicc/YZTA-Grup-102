"""
PharmaGuard AI - Drug Reference Pydantic Schemas
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

class DrugBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=300)
    active_ingredient: str = Field(..., min_length=1, max_length=200)
    atc_code: Optional[str] = Field(None, max_length=10)
    form: Optional[str] = Field(None, max_length=50)
    manufacturer: Optional[str] = Field(None, max_length=200)
    prospectus_raw: Optional[str] = None
    prospectus_summary: Optional[str] = None
    interactions: List[str] = Field(default_factory=list)
    contraindications: List[str] = Field(default_factory=list)
    barcode: Optional[str] = Field(None, max_length=50)
    category: Optional[str] = Field(None, max_length=100)

class DrugCreate(DrugBase):
    pass

class DrugSearch(BaseModel):
    query: str = Field(..., min_length=1, max_length=100)

class DrugResponse(DrugBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
