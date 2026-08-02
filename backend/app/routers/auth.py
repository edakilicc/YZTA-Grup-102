"""
PharmaGuard AI - Authentication API Router
Bu router, kullanıcı kayıt, giriş ve profil yönetimi API uç noktalarını tanımlar.
"""

from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies import get_db, get_current_user
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.models.user import User
from app.services.auth_service import register_user, authenticate_user, update_user_profile, reset_user_password
from app.utils.security import create_access_token
from pydantic import BaseModel, EmailStr, Field

router = APIRouter()

# Swagger ve frontend uyumluluğu için basit Login Request şeması
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

# Login API Yanıt şeması
class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    new_password: str = Field(..., min_length=6)

@router.post("/register", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    """
    Yeni kullanıcı kaydı oluşturur ve doğrudan giriş yaparak bir access token üretir.
    """
    # 1. Kullanıcı kaydı yapılır
    new_user = await register_user(db, user_data)
    
    # 2. Kayıt sonrası otomatik token üretilir
    token_data = {"sub": str(new_user.id), "email": new_user.email}
    access_token = create_access_token(data=token_data)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": new_user
    }

@router.post("/login", response_model=LoginResponse, status_code=status.HTTP_200_OK)
async def login(login_data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Kullanıcı kimlik bilgilerini (email, password) doğrular ve access token döner.
    """
    # 1. Kullanıcı doğrulanır
    user = await authenticate_user(db, login_data.email, login_data.password)
    
    # 2. Token üretilir
    token_data = {"sub": str(user.id), "email": user.email}
    access_token = create_access_token(data=token_data)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Giriş yapmış olan güncel kullanıcının profil bilgilerini döner.
    """
    return current_user

@router.put("/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def update_me(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Giriş yapmış kullanıcının profil bilgilerini (şifre dahil) günceller.
    """
    updated_user = await update_user_profile(db, current_user.id, update_data)
    return updated_user

@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(reset_data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """
    Şifre sıfırlama işlemi (E-posta doğrulamasız doğrudan şifre değiştirme testi için).
    """
    await reset_user_password(db, reset_data.email, reset_data.new_password)
    return {"message": "Şifre başarıyla güncellendi."}
