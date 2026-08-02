import asyncio
from app.database import AsyncSessionLocal
from app.services.auth_service import create_access_token
from app.models.user import User
from sqlalchemy.future import select
import httpx

async def main():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == 'eylulkalfa28500@gmail.com'))
        user = result.scalar_one_or_none()
        token = create_access_token(data={"sub": str(user.id)})
        
    async with httpx.AsyncClient() as client:
        resp = await client.post("http://127.0.0.1:8000/api/medications/", headers={"Authorization": f"Bearer {token}"}, json={
            "name": "Silverdin",
            "dosage": "%1",
            "form": "Krem",
            "frequency": "günde 1 veya 2",
            "times": ["09:00", "21:00"],
            "purpose": "Reçeteli Tedavi",
            "active_ingredient": "Bilinmiyor",
            "how_to_use": "Yaralı veya yanık bölge...",
            "side_effects": "Yanma",
            "warnings": "Gözle temastan kaçının",
            "stock_count": 30,
            "start_date": "2024-07-19",
            "is_active": True
        })
        print(resp.status_code)
        print(resp.text)

asyncio.run(main())
