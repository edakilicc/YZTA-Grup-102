"""
PharmaGuard AI - Database Connection Module
Bu modül, SQLAlchemy ile asenkron veritabanı bağlantısını ve session yönetimini sağlar.
"""

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

# Async PostgreSQL Engine oluşturulması
# echo=True geliştirme aşamasında SQL sorgularını loglamak için kullanılabilir
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True
)

# Async Session Fabrikası (Sessionmaker)
# expire_on_commit=False, session commit edildikten sonra nesnelerin attribute'larının geçerli kalmasını sağlar
SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

# Declarative Base Sınıfı - Tüm modeller bu sınıftan kalıtım alacaktır.
class Base(DeclarativeBase):
    pass
