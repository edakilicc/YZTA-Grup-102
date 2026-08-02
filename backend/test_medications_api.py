"""
PharmaGuard AI - Medication API Integration Test Script
"""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def run_tests():
    print("--- MEDICATION CRUD API INTEGRATION TESTS START ---")

    # 1. Test Kullanıcılarının Oluşturulması ve Token Alınması
    user_1 = {
        "email": "user1@pharmaguard.com",
        "password": "user1Password",
        "first_name": "User",
        "last_name": "One"
    }
    user_2 = {
        "email": "user2@pharmaguard.com",
        "password": "user2Password",
        "first_name": "User",
        "last_name": "Two"
    }

    # User 1 Register & Get Token
    response = client.post("/api/auth/register", json=user_1)
    assert response.status_code in [201, 409] # 409 duplicate de olabilir
    
    # Login User 1
    response = client.post("/api/auth/login", json={"email": user_1["email"], "password": user_1["password"]})
    token_1 = response.json()["access_token"]
    headers_1 = {"Authorization": f"Bearer {token_1}"}

    # User 2 Register & Get Token
    response = client.post("/api/auth/register", json=user_2)
    assert response.status_code in [201, 409]
    
    # Login User 2
    response = client.post("/api/auth/login", json={"email": user_2["email"], "password": user_2["password"]})
    token_2 = response.json()["access_token"]
    headers_2 = {"Authorization": f"Bearer {token_2}"}

    # 2. İlaç Ekleme Testi (POST /api/medications) - User 1
    print("1. Testing POST /api/medications (Create)...")
    medication_data = {
        "name": "Metformin",
        "dosage": "1000mg",
        "form": "tablet",
        "frequency": "günde 2",
        "times": ["08:00", "20:00"],
        "purpose": "Kan şekerini düzenler",
        "stock_count": 30
    }
    response = client.post("/api/medications/", json=medication_data, headers=headers_1)
    assert response.status_code == 201, f"Expected 201, got {response.status_code}"
    med_resp = response.json()
    assert med_resp["name"] == medication_data["name"]
    assert med_resp["user_id"] is not None
    assert len(med_resp["schedules"]) == 2, "Automatic schedules generation failed!"
    assert med_resp["schedules"][0]["time"] == "08:00"
    assert med_resp["schedules"][1]["time"] == "20:00"
    print("   [OK] Medication and automatic schedules created successfully.")
    
    medication_id = med_resp["id"]

    # 3. İlaç Listeleme Testi (GET /api/medications) - User 1
    print("2. Testing GET /api/medications (List)...")
    response = client.get("/api/medications/", headers=headers_1)
    assert response.status_code == 200
    meds_list = response.json()
    assert len(meds_list) >= 1
    assert any(m["id"] == medication_id for m in meds_list)
    print("   [OK] Active medications listed successfully.")

    # 4. Tek İlaç Detay Testi (GET /api/medications/{id}) - User 1
    print("3. Testing GET /api/medications/{id} (Read)...")
    response = client.get(f"/api/medications/{medication_id}", headers=headers_1)
    assert response.status_code == 200
    assert response.json()["name"] == "Metformin"
    print("   [OK] Medication detail retrieved successfully.")

    # 5. Yetkilendirme Testi (Giriş Yapmış Ama Başkasının İlacına Erişim Engeli) - User 2
    print("4. Testing GET /api/medications/{id} (Authorization check)...")
    response = client.get(f"/api/medications/{medication_id}", headers=headers_2)
    assert response.status_code == 404, f"Expected 404, got {response.status_code} (User 2 should not see User 1's med)"
    print("   [OK] Authorization successfully blocked cross-user reading (Returned 404).")

    # 6. İlaç Güncelleme ve Program Güncelleme Testi (PUT /api/medications/{id}) - User 1
    print("5. Testing PUT /api/medications/{id} (Update name & times)...")
    update_data = {
        "name": "Metformin Fort",
        "times": ["09:00", "15:00", "21:00"] # 3 doza çıkarıyoruz, saatler değişiyor
    }
    response = client.put(f"/api/medications/{medication_id}", json=update_data, headers=headers_1)
    assert response.status_code == 200
    updated_resp = response.json()
    assert updated_resp["name"] == "Metformin Fort"
    assert len(updated_resp["schedules"]) == 3, "Rescheduling failed on update!"
    times_set = {s["time"] for s in updated_resp["schedules"]}
    assert times_set == {"09:00", "15:00", "21:00"}
    print("   [OK] Medication and schedules updated successfully.")

    # 7. İlaç Silme (Soft Delete) Testi (DELETE /api/medications/{id}) - User 1
    print("6. Testing DELETE /api/medications/{id} (Soft Delete)...")
    response = client.delete(f"/api/medications/{medication_id}", headers=headers_1)
    assert response.status_code == 200
    
    # Silinen ilacı listelediğimizde gelmemeli (is_active=False filtre kontrolü)
    response = client.get("/api/medications/", headers=headers_1)
    meds_list_after_delete = response.json()
    assert not any(m["id"] == medication_id for m in meds_list_after_delete)
    
    # Silinen ilaca doğrudan id ile erişmeye çalışınca 404 dönmeli
    response = client.get(f"/api/medications/{medication_id}", headers=headers_1)
    assert response.status_code == 404
    print("   [OK] Soft-delete executed and successfully filtered from active queries.")

    print("\n--- ALL MEDICATION CRUD API TESTS PASSED SUCCESSFULLY! ---")

if __name__ == "__main__":
    run_tests()
