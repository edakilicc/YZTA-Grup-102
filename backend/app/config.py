"""
PharmaGuard AI - Configuration Module
Bu modül, .env dosyasından ve çevre değişkenlerinden uygulama ayarlarını okur.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    # Veritabanı Bağlantı URL'i
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://user:password@localhost:5432/pharmaguard",
        validation_alias="DATABASE_URL"
    )

    # JWT Güvenlik Ayarları
    SECRET_KEY: str = Field(
        default="secret-key-change-me",
        validation_alias="SECRET_KEY"
    )
    ALGORITHM: str = Field(
        default="HS256",
        validation_alias="ALGORITHM"
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=1440,
        validation_alias="ACCESS_TOKEN_EXPIRE_MINUTES"
    )

    # Gemini API Anahtarı
    GEMINI_API_KEY: str = Field(
        default="",
        validation_alias="GEMINI_API_KEY"
    )

    # .env konfigürasyonu
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

# Singleton Settings Nesnesi
settings = Settings()
