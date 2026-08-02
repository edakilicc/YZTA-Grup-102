<div align="center">

# 💊 PharmaGuard AI

### AI-Powered Smart Medication & Treatment Management Platform


</div>

## Projenin Amacı

**PharmaGuard AI**, kronik hastalar, yaşlı bireyler ve düzenli ilaç kullanan kişilerin ilaç kullanım süreçlerini daha güvenli, düzenli ve takip edilebilir hale getirmeyi amaçlamaktadır. Kullanıcıların ilaçlarını zamanında kullanmalarını desteklerken, reçete ve prospektüs bilgilerinin anlaşılmasını kolaylaştırır ve yapay zekâ destekli analizlerle tedavi sürecini daha verimli yönetmelerine yardımcı olur. Ayrıca doktor kontrolleri öncesinde düzenli tedavi raporları oluşturarak hasta ve sağlık profesyonelleri arasındaki iletişimi güçlendirmeyi hedefler.

## Proje Mimarisi / Klasör Yapısı

```
PharmaGuardianAI_v3/
├── src/                        # React + Vite frontend
│   ├── pages/                    # Uygulama sayfaları (Dashboard, İlaçlarım, İlaç Ekle/Düzenle, Rapor, Profil vb.)
│   ├── components/                # Ortak/yeniden kullanılabilir arayüz bileşenleri
│   ├── stores/                     # Zustand global state (auth, ilaç, program/schedule, tema)
│   ├── services/                    # Backend API istemcileri (axios tabanlı)
│   ├── i18n/                         # Türkçe / İngilizce çeviri dosyaları
│   └── data/
├── backend/
│   ├── app/
│   │   ├── routers/                   # FastAPI uç noktaları (auth, medications, drugs, ai, ocr, schedules, reports)
│   │   ├── services/                   # İş mantığı (AI, OCR, PDF, program/dose-log, kimlik doğrulama)
│   │   ├── models/                      # SQLAlchemy veritabanı modelleri
│   │   ├── schemas/                      # Pydantic istek/yanıt şemaları
│   │   ├── assets/fonts/                  # PDF raporu için gömülü DejaVu Sans fontları
│   │   └── main.py                         # FastAPI giriş noktası
│   ├── alembic/                             # Veritabanı migration'ları
│   └── requirements.txt
├── android/                       # Capacitor ile üretilen native Android projesi
├── public/
├── index.html
└── package.json
```

## Sistem Gereksinimleri

* **Node.js** 20 veya üzeri (bu projede test edilen sürüm: 26.x) ve npm
* **Python** 3.10 veya üzeri (bu projede test edilen sürüm: 3.12)
* **Google Gemini API Anahtarı** (yapay zekâ destekli özellikler için zorunlu) — [Google AI Studio](https://aistudio.google.com/) üzerinden ücretsiz alınabilir
* Android uygulamasını derlemek/çalıştırmak isteyenler için: **Android Studio** ve bir Android cihaz veya emülatör (minimum Android 7.0 / API 24)
* *(İsteğe bağlı)* **Tesseract OCR** — sistemde kurulu değilse OCR özelliği otomatik olarak Gemini Vision üzerinden çalışmaya devam eder, ekstra kurulum zorunlu değildir
* Varsayılan olarak ek bir veritabanı sunucusu **gerekmez** (SQLite kullanılır); isterseniz `.env` üzerinden PostgreSQL'e geçebilirsiniz

## Kurulum

Aşağıdaki adımlar Windows + PowerShell için yazılmıştır.

### 1. Repoyu klonlama

```powershell
git clone <repo-url>
cd PharmaGuardianAI_v3
```

### 2. Frontend bağımlılıklarını yükleme

```powershell
npm install
```

### 3. Python sanal ortamı oluşturma ve etkinleştirme

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### 4. Backend bağımlılıklarını yükleme

```powershell
pip install -r requirements.txt
```

### 5. `.env` dosyasını oluşturma

```powershell
Copy-Item .env.example .env
```

Ardından `backend\.env` dosyasını açıp **kendi Gemini API anahtarınızı** `GEMINI_API_KEY` alanına girin (bkz. [Ortam Değişkenleri](#ortam-değişkenleri)).

### 6. Veritabanı tablolarını oluşturma

```powershell
alembic upgrade head
```

## Ortam Değişkenleri

### Backend (`backend/.env`)

`backend/.env.example` dosyasındaki şablonu temel alır:

```env
# Veritabanı bağlantısı (Ek kurulum yapmadan yerelde Hızlı Başlangıç için SQLite önerilir):
DATABASE_URL=sqlite+aiosqlite:///./pharmaguard.db

# İsteğe bağlı PostgreSQL kullanmak isterseniz:
# DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/pharmaguard

# JWT Güvenlik Ayarları
SECRET_KEY=YOUR_SECRET_KEY
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Google Gemini API Anahtarı
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

> `SECRET_KEY` ve `GEMINI_API_KEY` değerlerini gerçek/gizli anahtarlarınızla kendiniz doldurun. Bu değerleri asla depoya (repo) eklemeyin veya paylaşmayın.

### Frontend (proje kök dizininde `.env`)

Varsayılan olarak `http://localhost:8000/api` adresi kullanılır:

```env
VITE_API_URL=http://localhost:8000/api
```

> 💡 **İpucu:** Fiziksel bir Android cihazdan USB kablosuyla test ederken `adb reverse tcp:8000 tcp:8000` komutunu çalıştırarak varsayılan `http://localhost:8000/api` adresini değiştirmeden doğrudan kullanabilirsiniz.

## Backend'i Çalıştırma

```powershell
cd backend
python -m venv venv
# Windows: .\venv\Scripts\Activate.ps1
# Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API varsayılan olarak `http://localhost:8000` adresinde çalışır. Otomatik oluşturulan Swagger dokümantasyonu: `http://localhost:8000/docs`.

## Frontend'i Çalıştırma

```powershell
npm run dev
```

Uygulama varsayılan olarak `http://localhost:5173` adresinde açılır.

## Android Uygulamasını Çalıştırma ve Sık Karşılaşılan Sorunların Çözümü

```powershell
npm run build:android
npm run android
```

`build:android` komutu web arayüzünü derleyip Android projesine ve eklentilerine senkronize eder (`vite build && cap sync android`).

### 🛠️ Sık Karşılaşılan Durumlar ve Çözümleri:

1. **`cordova.variables.gradle` veya Gradle Script Hatası:**
   - Projeyi klonladıktan sonra `android/capacitor-cordova-android-plugins` klasörünün oluşması için mutlaka ilk önce `npm install` ve `npm run build:android` komutlarını çalıştırın.

2. **Fiziksel Cihazda Giriş / Kayıt İşlemi ve Ağ Bağlantısı:**
   - Telefon mobil veride veya farklı bir ağdayken bilgisayardaki backend'e erişebilmesi için cihazı USB ile bağlayıp şu komutu çalıştırın:
     ```bash
     adb reverse tcp:8000 tcp:8000
     ```
   - Veritabanı dosyaları (`.db`) Git deposuna eklenmediği için yeni kurulan ortamlarda veritabanı boş başlar. İlk çalıştırmada **"Sign Up / Kayıt Ol"** sekmesinden yeni bir kullanıcı oluşturmanız gerekmektedir.

3. **Yapay Zeka & OCR Yapılandırması:**
   - OCR servisi ve prospektüs özetleme, Google Gemini'nin **her zaman güncel sürüme işaret eden `gemini-flash-latest` modeli** ile çalışmaktadır (model adı belirli bir sürüme sabitlenmemiştir, bu yüzden Google eski bir sürümü kaldırdığında otomatik olarak güncel modele yönlenir).
   - Kamera çekimlerinde mobil cihaz oryantasyon hatalarını önlemek amacıyla görsel işleme aşamasında EXIF yön düzeltmesi (`ImageOps.exif_transpose`) uygulanmıştır.
   - **429 hatası (`limit: 0`) alırsanız:** bu genelde "kota bitti" anlamına gelmez, kullandığınız Google hesabına/projeye hiç ücretsiz kota tanınmadığı anlamına gelir. Yeni bir `GEMINI_API_KEY` oluşturmak çoğu zaman sorunu çözmez; [Google Cloud Console → Billing](https://console.cloud.google.com/billing) üzerinden ilgili projeye bir ödeme yöntemi bağlamanız gerekebilir (ücretsiz kullanım sınırları genelde geçerli kalır, kart yalnızca hesap doğrulaması için istenir).
   - **404 "model no longer available" hatası alırsanız:** Google ilgili modeli tamamen kaldırmış demektir; `backend/app/services/ai_service.py` ve `backend/app/services/ocr_service.py` içindeki `GenerativeModel(...)` satırlarındaki model adını güncel bir modelle (ör. `gemini-flash-latest`) değiştirin.

4. **Mac/Windows Arası Taşınabilirlik Sorunları (projeyi zip/export olarak bir başkasından aldıysanız):**
   - **`backend/venv` klasörünü asla bir işletim sisteminden diğerine kopyalamayın.** Python sanal ortamları platforma özeldir; macOS'ta oluşturulan bir `venv`'de `Scripts` yerine `bin` klasörü bulunur ve Windows'ta çalışmaz. Farklı bir makineden gelen `venv` klasörünü silip yeniden oluşturun: `python -m venv venv` ardından `pip install -r requirements.txt`.
   - **`node_modules` klasörünü de kopyalamayın.** Vite'ın kullandığı bazı paketler (rolldown/oxc gibi) platforma özel derlenmiş native binary içerir; başka bir işletim sisteminden gelen `node_modules` eksik/hatalı çalışabilir. Her makinede `node_modules`'ü silip `npm install` çalıştırın.
   - **`android/local.properties` dosyasındaki `sdk.dir`** projeyi oluşturan kişinin bilgisayarına özel mutlak bir yoldur (ör. Mac'te `/Users/.../Library/Android/sdk`). Bu dosya normalde Git'e eklenmez ama export/zip ile paylaşılan projelerde kalabilir; Windows'ta kendi SDK yolunuzla güncelleyin (ör. `sdk.dir=C\:\\Users\\<kullanıcı_adı>\\AppData\\Local\\Android\\Sdk`) ya da dosyayı silip Android Studio'nun yeniden oluşturmasına izin verin.
   - **Android derlemesi (Capacitor Android 8.x) JDK 21 gerektirir.** `JAVA_HOME` değişkeniniz daha eski bir JDK'ya (ör. 17) işaret ediyorsa `compileDebugJavaWithJavac` aşamasında `invalid source release: 21` hatası alırsınız. Çözüm: `android/gradle.properties` dosyasına `org.gradle.java.home=<JDK 21 kurulum yolu>` satırını ekleyin ya da Android Studio'da Settings → Build Tools → Gradle → Gradle JDK'yı 21 olarak ayarlayın.


## Test ve Build Komutları

| Komut | Açıklama |
| --- | --- |
| `npm run build` | Frontend için production build oluşturur (`dist/`) |
| `npm run preview` | Production build'ini yerelde önizler |
| `npm run lint` | Frontend kodunu `oxlint` ile denetler |
| `npm run build:android` | Frontend'i derleyip Android projesine senkronize eder |

> Backend için şu anda otomatikleştirilmiş bir test paketi (pytest vb.) bulunmamaktadır. `backend/test_auth_api.py` ve `backend/test_medications_api.py`, gerçek veritabanına kayıt oluşturan/güncelleyen **manuel entegrasyon script'leridir**; yalnızca izole/test amaçlı bir veritabanına karşı, bilinçli olarak çalıştırılmalıdır.

## Güvenlik ve Sağlık Bilgilendirmesi

⚠️ **PharmaGuard AI**, ilaç kullanımını takip etmenize yardımcı olan bilgilendirici bir araçtır. Uygulama içindeki yapay zekâ destekli özetler, analizler ve raporlar; tıbbi teşhis, tedavi önerisi veya bir sağlık profesyonelinin görüşünün yerine geçmez. İlaç kullanımınızla, dozajınızla veya tedavinizle ilgili tüm kararları mutlaka doktorunuza veya eczacınıza danışarak alınız.

Kimlik bilgileriniz ve ilaç kayıtlarınız yalnızca kendi hesabınıza bağlı olarak saklanır. API anahtarlarınızı ve `.env` dosyalarınızı asla paylaşmayın veya bir sürüm kontrol sistemine (Git) eklemeyin.

