"""
PharmaGuard AI - API Dependencies
Bu modül, routers ve endpoint'ler tarafından kullanılan FastAPI bağımlılıklarını içerir.
"""

from typing import AsyncGenerator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import SessionLocal
from app.config import settings
from app.services.auth_service import get_user_by_id
from app.models.user import User

# Swagger dokümantasyonunda kilitleme / yetkilendirme (Authorize) butonunu aktifleştiren yapı
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Her istek için yeni bir asenkron veritabanı oturumu (Session) oluşturur
    ve istek tamamlandığında oturumu kapatır.
    """
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    HTTP Bearer token'ı doğrular ve isteği atan authenticated kullanıcıyı döner.
    Token geçersiz, süresi dolmuş veya kullanıcı silinmişse 401 Unauthorized fırlatır.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Geçersiz veya süresi dolmuş kimlik doğrulama token'ı.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Token decode edilir
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        user_id = int(user_id_str)
    except (JWTError, ValueError):
        raise credentials_exception
        
    # Veritabanından kullanıcı çekilir
    user = await get_user_by_id(db, user_id)
    if user is None:
        raise credentials_exception
        
    return user
