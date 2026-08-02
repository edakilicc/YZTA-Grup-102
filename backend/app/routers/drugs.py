"""
PharmaGuard AI - Drug Database API Router
Bu router, referans ilaç veritabanında arama yapma ve detay görüntüleme uç noktalarını içerir.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, status, HTTPException, Query
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.schemas.drug import DrugResponse
from app.models.drug import Drug

router = APIRouter()

@router.get("/", response_model=List[DrugResponse], status_code=status.HTTP_200_OK)
async def list_or_search_drugs(
    search: Optional[str] = Query(None, min_length=2, description="İlaç adı veya etken madde ile arama terimi"),
    db: AsyncSession = Depends(get_db)
):
    """
    Referans ilaç veritabanındaki tüm ilaçları listeler veya arama terimi girildiyse
    ilaç adı ya da etken maddeye göre kısmi eşleşmeli (ILIKE) arama gerçekleştirir.
    """
    stmt = select(Drug)
    
    if search:
        search_term = f"%{search}%"
        # SQLite'da ILIKE desteği olmadığı için case-insensitive arama amacıyla lower() kullanıyoruz
        # or_ yardımıyla hem isimde hem etken maddede arama yapılır
        stmt = stmt.where(
            or_(
                Drug.name.ilike(search_term),
                Drug.active_ingredient.ilike(search_term),
                Drug.category.ilike(search_term)
            )
        )
        
    result = await db.execute(stmt)
    drugs = result.scalars().all()
    return list(drugs)

@router.get("/{drug_id}", response_model=DrugResponse, status_code=status.HTTP_200_OK)
async def get_drug_detail(
    drug_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Referans veritabanındaki belirli bir ilacın detay bilgilerini (prospektüs, etkileşimler vb.) döner.
    """
    stmt = select(Drug).where(Drug.id == drug_id)
    result = await db.execute(stmt)
    drug = result.scalar_one_or_none()
    
    if not drug:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="İlaç referans veritabanında bulunamadı."
        )
        
    return drug
