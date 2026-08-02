"""
PharmaGuard AI - Authentication Service
Bu servis, kullanıcı kaydı, girişi, JWT token yönetimi ve profil güncelleme işlemlerini yönetir.
"""

from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.utils.security import hash_password, verify_password, create_access_token

async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    """
    E-posta adresine göre veritabanından kullanıcıyı sorgular.
    """
    stmt = select(User).where(User.email == email)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()

async def get_user_by_id(db: AsyncSession, user_id: int) -> Optional[User]:
    """
    ID değerine göre veritabanından kullanıcıyı sorgular.
    """
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()

async def register_user(db: AsyncSession, user_data: UserCreate) -> User:
    """
    Yeni kullanıcı kaydı oluşturur. E-posta adresi kullanımda ise HTTP 409 hatası fırlatır.
    """
    # E-posta kullanımda mı kontrolü
    existing_user = await get_user_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bu e-posta adresi zaten kullanımda."
        )
    
    # Şifrenin hash'lenmesi
    hashed_pwd = hash_password(user_data.password)
    
    # Yeni kullanıcı nesnesinin oluşturulması
    new_user = User(
        email=user_data.email,
        hashed_password=hashed_pwd,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        age=user_data.age,
        gender=user_data.gender,
        avatar_url=user_data.avatar_url,
        chronic_conditions=user_data.chronic_conditions,
        notification_preferences=user_data.notification_preferences,
        language=user_data.language
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user

async def authenticate_user(db: AsyncSession, email: str, password: str) -> User:
    """
    Kullanıcı giriş bilgilerini doğrular. Hatalı ise HTTP 401 hatası fırlatır.
    """
    user = await get_user_by_email(db, email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-posta veya şifre hatalı."
        )
    
    if not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-posta veya şifre hatalı."
        )
        
    return user

async def update_user_profile(db: AsyncSession, user_id: int, update_data: UserUpdate) -> User:
    """
    Kullanıcı profili günceller. Şifre alanı doldurulmuşsa yeni şifreyi hashleyerek günceller.
    """
    user = await get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kullanıcı bulunamadı."
        )
        
    update_dict = update_data.model_dump(exclude_unset=True)
    
    # Eğer şifre de güncelleniyorsa hashle
    if "password" in update_dict and update_dict["password"]:
        update_dict["hashed_password"] = hash_password(update_dict.pop("password"))
        
    # Diğer alanları güncelle
    for key, value in update_dict.items():
        setattr(user, key, value)
        
    await db.commit()
    await db.refresh(user)
    return user

async def reset_user_password(db: AsyncSession, email: str, new_password: str) -> None:
    """
    Şifre sıfırlama işlemi.
    Kullanıcının e-posta adresi sistemde varsa şifresini yeni şifreyle günceller.
    """
    user = await get_user_by_email(db, email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bu e-posta adresi ile kayıtlı bir kullanıcı bulunamadı."
        )
    
    hashed_pwd = hash_password(new_password)
    user.hashed_password = hashed_pwd
    await db.commit()
