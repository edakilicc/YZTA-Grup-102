# PharmaGuardianAI — Backend (FastAPI)

Bu dizin, PharmaGuardianAI uygulamasının FastAPI tabanlı backend kodlarını barındırmaktadır.

## Kurulum ve Çalıştırma

### 1. Sanal Ortam Oluşturma ve Aktifleştirme
```bash
python3 -m venv venv
source venv/bin/activate  # macOS/Linux için
# veya
.\venv\Scripts\activate  # Windows için
```

### 2. Bağımlılıkların Kurulması
```bash
pip install -r requirements.txt
```

### 3. Çevre Değişkenlerinin Ayarlanması
`.env.example` dosyasını kopyalayarak `.env` dosyası oluşturun ve gerekli bilgileri girin:
```bash
cp .env.example .env
```

### 4. Uygulamayı Çalıştırma
Geliştirme sunucusunu başlatmak için:
```bash
uvicorn app.main:app --reload
```
Uygulama varsayılan olarak `http://localhost:8000` adresinde çalışacaktır.

## API Dokümantasyonu
Uygulama çalışırken otomatik oluşturulan Swagger dokümantasyonuna şu adresten erişebilirsiniz:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Sistem Gereksinimleri (OCR İçin)
Uygulamanın OCR (Reçete okuma) özelliğini kullanabilmesi için sisteminizde **Tesseract OCR** kurulmuş olmalıdır:
- **macOS**: `brew install tesseract tesseract-lang`
- **Ubuntu/Debian**: `sudo apt install tesseract-ocr tesseract-ocr-tur`
- **Windows**: Tesseract exe'sini indirip kurun ve PATH çevre değişkenine ekleyin.
