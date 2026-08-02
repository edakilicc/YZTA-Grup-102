"""
PharmaGuard AI - Authentication API Integration Test Script
"""

import sys
from fastapi.testclient import TestClient

# Sunucunun veritabanı ayarını test aşamasında da SQLite yapalım
# (Normalde test_conn için .env dosyasında sqlite+aiosqlite tanımlamıştık)
from app.main import app

client = TestClient(app)

def run_tests():
    print("--- AUTHENTICATION API INTEGRATION TESTS START ---")
    
    # Test Kullanıcı Verisi
    test_user = {
        "email": "testuser@pharmaguard.com",
        "password": "secretPassword123",
        "first_name": "Test",
        "last_name": "User",
        "age": 30,
        "gender": "male",
        "avatar_url": "http://example.com/avatar.png",
        "chronic_conditions": ["hypertension"],
        "notification_preferences": {"email": True, "push": False, "reminder": True},
        "language": "tr"
    }

    # 1. Kayıt Testi (Register)
    print("1. Testing POST /api/auth/register...")
    response = client.post("/api/auth/register", json=test_user)
    assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == test_user["email"]
    assert "hashed_password" not in data["user"], "Password hash should not be exposed in user response!"
    print("   [OK] Register successful.")
    
    token = data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Mükerrer Kayıt Testi (Duplicate Email)
    print("2. Testing Duplicate POST /api/auth/register...")
    response = client.post("/api/auth/register", json=test_user)
    assert response.status_code == 409, f"Expected 409, got {response.status_code}"
    print("   [OK] Duplicate registration blocked with 409 Conflict.")

    # 3. Giriş Testi (Login - Success)
    print("3. Testing POST /api/auth/login (Success)...")
    login_data = {
        "email": test_user["email"],
        "password": test_user["password"]
    }
    response = client.post("/api/auth/login", json=login_data)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    login_resp = response.json()
    assert "access_token" in login_resp
    assert login_resp["user"]["email"] == test_user["email"]
    print("   [OK] Login successful with valid credentials.")

    # 4. Hatalı Giriş Testi (Login - Failure)
    print("4. Testing POST /api/auth/login (Failure)...")
    bad_login = {
        "email": test_user["email"],
        "password": "wrongPassword"
    }
    response = client.post("/api/auth/login", json=bad_login)
    assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    print("   [OK] Login rejected with 401 Unauthorized for bad password.")

    # 5. Token'lı Profil Getirme Testi (Get Me - Protected)
    print("5. Testing GET /api/auth/me (Protected - Success)...")
    response = client.get("/api/auth/me", headers=headers)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    me_data = response.json()
    assert me_data["email"] == test_user["email"]
    print("   [OK] Profile retrieved successfully with valid JWT.")

    # 6. Token'sız Profil Getirme Testi (Get Me - Unprotected Failure)
    print("6. Testing GET /api/auth/me (Protected - No Token)...")
    response = client.get("/api/auth/me")
    assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    print("   [OK] Access rejected with 401 without JWT.")

    # 7. Profil Güncelleme Testi (Update Me - Protected)
    print("7. Testing PUT /api/auth/me (Protected - Success)...")
    update_data = {
        "first_name": "UpdatedName",
        "age": 31,
        "chronic_conditions": ["hypertension", "diabetes"]
    }
    response = client.put("/api/auth/me", json=update_data, headers=headers)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    updated_resp = response.json()
    assert updated_resp["first_name"] == "UpdatedName"
    assert updated_resp["age"] == 31
    assert "diabetes" in updated_resp["chronic_conditions"]
    print("   [OK] Profile updated successfully with valid JWT.")

    print("\n--- ALL AUTHENTICATION API TESTS PASSED SUCCESSFULLY! ---")

if __name__ == "__main__":
    run_tests()
