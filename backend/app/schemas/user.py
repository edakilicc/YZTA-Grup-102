"""
PharmaGuard AI - User Pydantic Schemas
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field

class UserBase(BaseModel):
    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    age: Optional[int] = Field(None, ge=0, le=150)
    gender: Optional[str] = Field(None, max_length=20) # "male", "female", "other"
    avatar_url: Optional[str] = Field(None, max_length=500)
    chronic_conditions: List[str] = Field(default_factory=list)
    notification_preferences: dict = Field(
        default={"email": True, "push": True, "reminder": True}
    )
    language: str = Field(default="tr", max_length=5)

class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=100)

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    age: Optional[int] = Field(None, ge=0, le=150)
    gender: Optional[str] = Field(None, max_length=20)
    avatar_url: Optional[str] = Field(None, max_length=500)
    chronic_conditions: Optional[List[str]] = None
    notification_preferences: Optional[dict] = None
    language: Optional[str] = Field(None, max_length=5)
    password: Optional[str] = Field(None, min_length=6, max_length=100)

class UserResponse(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
