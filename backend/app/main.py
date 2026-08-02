"""
PharmaGuard AI - Main FastAPI Application
Bu dosya uygulamayı başlatır, CORS ayarlarını yapar, veritabanı bağlantılarını yönetir ve router'ları dahil eder.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers.auth import router as auth_router
from app.routers.medications import router as medications_router
from app.routers.drugs import router as drugs_router
from app.routers.ai import router as ai_router
from app.routers.ocr import router as ocr_router
from app.routers.schedules import router as schedules_router
from app.routers.reports import router as reports_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI uygulamasının yaşam döngüsü yöneticisi.
    Uygulama başlarken ve kapanırken yapılacak işlemleri yönetir.
    """
    # Uygulama başlarken yapılacak işlemler (örn: veritabanı bağlantısını doğrulamak)
    yield
    # Uygulama kapanırken yapılacak işlemler

# FastAPI Uygulama Örneği
app = FastAPI(
    title="PharmaGuard AI API",
    description="Akıllı İlaç ve Tedavi Yönetim Asistanı Backend Servisi",
    version="1.0.0",
    lifespan=lifespan
)

# CORS (Cross-Origin Resource Sharing) Ayarları
# Frontend uygulamasının (Vite - localhost:5173 veya mobil webview) API'ye erişebilmesini sağlar.
origins = [
    "http://localhost",           # Capacitor Android mobil uygulama varsayılanı
    "http://localhost:5173",      # React yerel geliştirme sunucusu
    "http://localhost:3000",      # Alternatif geliştirme portu
    "http://127.0.0.1:5173",
    "http://192.168.1.104",       # Mevcut yerel ağ IP adresi
    "http://192.168.1.104:8000",
    "http://192.168.3.8",         # Eski ağ IP adresi (yedek)
    "http://192.168.3.8:8000",
    "*"                           # Canlı yayında veya mobil emülatörlerde gerekebilir (İleride kısıtlanabilir)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router'ların Dahil Edilmesi
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(medications_router, prefix="/api/medications", tags=["Medications"])
app.include_router(drugs_router, prefix="/api/drugs", tags=["Drugs Database"])
app.include_router(ai_router, prefix="/api/ai", tags=["AI Integration"])
app.include_router(ocr_router, prefix="/api/ocr", tags=["OCR Scanner"])
app.include_router(schedules_router, prefix="/api", tags=["Schedules & Dose Logs"])
app.include_router(reports_router, prefix="/api/reports", tags=["Reports"])

@app.get("/health", status_code=status.HTTP_200_OK, tags=["System"])
async def health_check():
    """
    Sistem durumu kontrolü (Liveness/Readiness Probe) için endpoint.
    """
    return {"status": "ok"}
