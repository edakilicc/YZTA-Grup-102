"""
PharmaGuard AI - OCR (Optical Character Recognition) Service
Bu servis, yüklenen reçete görsellerini Pillow ile önişlemeden geçirir,
pytesseract ile metne dönüştürür. Eğer Tesseract kurulu değilse veya okuyamazsa
Gemini 2.0 Flash Multimodal (Vizyon) modelini devreye sokarak görsel üzerindeki
ilaçları yapay zekayla gerçek zamanlı olarak okur. Son aşamada veritabanıyla eşleştirir.
"""

import io
import re
import json
from typing import List, Dict, Any, Tuple, Optional
from difflib import SequenceMatcher
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
import pytesseract
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import google.generativeai as genai

from app.config import settings
from app.models.drug import Drug

def preprocess_image(image_bytes: bytes) -> Image.Image:
    """
    OCR doğruluğunu artırmak için Pillow ile görseli önişlemeden geçirir.
    Grayscale yapar, kontrastı artırır ve threshold uygulayarak keskinleştirir.
    """
    image = Image.open(io.BytesIO(image_bytes))
    image = ImageOps.exif_transpose(image)
    
    # 1. Grayscale (Gri tonlama)
    image = image.convert('L')
    
    # 2. Kontrast Artırma
    enhancer = ImageEnhance.Contrast(image)
    image = enhancer.enhance(2.0)
    
    # 3. Gürültü Azaltma (Hafif Bulanıklaştırma ve Keskinleştirme)
    image = image.filter(ImageFilter.SHARPEN)
    
    return image

def extract_potential_medications(text: str) -> List[Tuple[str, str]]:
    """
    Regex yardımıyla OCR metninden olası ilaç isimlerini ve dozajlarını ayıklar.
    Dönen format: [(ilaç_adı, dozaj)]
    """
    # Basit bir eşleştirme kalıbı (Örn: Parol 500mg, Glifor 1000 mg)
    pattern = r"([A-ZÇĞİÖŞÜ][a-zçğıöşü]+(?:\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]+)*)\s+(\d+\s*(?:mg|mcg|g|ml|tab|draje))"
    matches = re.findall(pattern, text)
    
    # Eğer regex eşleşme bulamazsa, metni satır satır bölüp büyük harfle başlayan kelimeleri olası ilaç olarak alırız
    if not matches:
        lines = text.split('\n')
        for line in lines:
            line = line.strip()
            word_match = re.search(r"\b([A-ZÇĞİÖŞÜ][a-zA-ZçğıöşüÇĞİÖŞÜ]+)\b", line)
            if word_match:
                med_name = word_match.group(1)
                dose_match = re.search(r"(\d+\s*(?:mg|mcg|g|ml))", line, re.IGNORECASE)
                dosage = dose_match.group(1) if dose_match else "500mg"
                matches.append((med_name, dosage))
                
    return list(set(matches))

def calculate_similarity(s1: str, s2: str) -> float:
    """
    İki metin arasındaki benzerlik oranını hesaplar (0.0 - 1.0).
    """
    return SequenceMatcher(None, s1.lower(), s2.lower()).ratio()

async def scan_with_gemini_vision(image_bytes: bytes) -> Optional[List[Dict[str, Any]]]:
    """
    Tesseract olmadığında veya yetersiz kaldığında, görseli doğrudan Gemini 2.0 Flash modeline
    göndererek görsel üzerindeki reçete/ilaç metinlerini multimodal olarak analiz eder.
    """
    if not settings.GEMINI_API_KEY:
        print("GEMINI_API_KEY missing, cannot run Gemini Vision OCR.")
        return None
        
    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-flash-latest")
        
        # Görseli Pillow ile aç, telefon kamerasının EXIF oryantasyonunu düzelt ve RGB'ye çevir
        img = Image.open(io.BytesIO(image_bytes))
        img = ImageOps.exif_transpose(img)
        if img.mode != 'RGB':
            img = img.convert('RGB')
        # Boyutu optimize et
        img.thumbnail((1600, 1600))
        
        prompt = """
        Sen uzman bir tıbbi görsel analiz asistanısın. Sana sunulan bu görseli (ilaç kutusu, ilaç şişesi, ambalaj, prospektüs veya reçete) çok dikkatli incele.
        
        Görsel üzerindeki tüm ilaç veya etken madde isimlerini, dozajlarını ve formlarını tespit et.
        Eğer dozaj yazmıyorsa varsayılan tıbbi dozajı (örn. 500mg veya 100mg) ekle.
        Ayrıca ilaç bilginize dayanarak ilacın "Nasıl Kullanılır", "Olası Yan Etkiler" ve "Uyarılar" bilgilerini Türkçe olarak tamamla.

        Kutunun üzerinde kaç adet/tablet/kapsül içerdiğini belirten bir sayı varsa (Örn: "20 Tablet", "30 Kapsül", "14 Film Tablet")
        bunu da tespit edip SADECE sayı olarak "quantity" alanına yaz. Böyle bir bilgi görselde net şekilde yazmıyorsa "quantity" alanını null bırak, tahmin etme.

        Çıktıyı KESİNLİKLE ve SADECE geçerli bir JSON listesi olarak ver. Başka hiçbir açıklama yazma.
        JSON Şeması:
        [
          {
            "name": "İlaç Adı (Örn: Parol, Arveles, Majezik vb.)",
            "dosage": "Dozaj (Örn: 500mg, 25mg, %1 vb.)",
            "frequency": "günde 1" veya "günde 2" veya "günde 3",
            "form": "Tablet" veya "Kapsül" veya "Şurup" veya "Krem" veya "Merhem" veya "Damla",
            "quantity": 20,
            "how_to_use": "Kullanım açıklaması (Türkçe)",
            "side_effects": "Olası yan etkiler (Türkçe)",
            "warnings": "Önemli uyarılar (Türkçe)"
          }
        ]

        Eğer fotoğrafta belirgin bir ilaç ismi veya kutusu görünüyor fakat yazılar hafif flu ise bile ilacın adını tahmin edip ekle. Sadece tamamen ilgisiz veya bomboş bir fotoğrafta boş liste [] döndür.
        """
        
        # Gemini'ye görsel ve promptu gönder
        response = model.generate_content(
            [prompt, img],
            generation_config={"response_mime_type": "application/json"}
        )
        
        # JSON yanıtını temizle ve ayrıştır
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
        
        try:
            detected = json.loads(text)
            print("Gemini Vision OCR successfully parsed drugs (JSON):", detected)
            return detected
        except json.JSONDecodeError as json_err:
            print(f"JSON Decode Error: {str(json_err)}. Attempting regex parsing on: {text}")
            # Eğer model JSON'ı hatalı üretirse (eksik virgül vb.), regex ile manuel çıkartım yapalım
            import re
            detected = []
            names = re.findall(r'"name"\s*:\s*"([^"]+)"', text)
            dosages = re.findall(r'"dosage"\s*:\s*"([^"]+)"', text)
            frequencies = re.findall(r'"frequency"\s*:\s*"([^"]+)"', text)
            forms = re.findall(r'"form"\s*:\s*"([^"]+)"', text)
            how_to_uses = re.findall(r'"how_to_use"\s*:\s*"([^"]+)"', text)
            side_effects_list = re.findall(r'"side_effects"\s*:\s*"([^"]+)"', text)
            warnings_list = re.findall(r'"warnings"\s*:\s*"([^"]+)"', text)
            
            for i in range(len(names)):
                detected.append({
                    "name": names[i],
                    "dosage": dosages[i] if i < len(dosages) else "500mg",
                    "frequency": frequencies[i] if i < len(frequencies) else "günde 1",
                    "form": forms[i] if i < len(forms) else "Tablet",
                    "how_to_use": how_to_uses[i] if i < len(how_to_uses) else "",
                    "side_effects": side_effects_list[i] if i < len(side_effects_list) else "",
                    "warnings": warnings_list[i] if i < len(warnings_list) else ""
                })
                
            if detected:
                print("Gemini Vision OCR successfully parsed drugs (Regex Fallback):", detected)
                return detected
            else:
                return None
                
    except Exception as e:
        print(f"Gemini Vision OCR API Error: {str(e)}")
        if "429" in str(e) or "Quota exceeded" in str(e) or "ResourceExhausted" in str(e):
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Google Gemini API ücretsiz kullanım kotası (Rate Limit 429) doldu. Lütfen 1 dakika sonra tekrar deneyin veya aistudio.google.com adresinden yeni bir API key tanımlayın."
            )
        return None

async def scan_prescription_image(
    image_bytes: bytes, db: AsyncSession, filename: Optional[str] = None
) -> Dict[str, Any]:
    """
    Görseli okur, metne dönüştürür ve referans veritabanındaki (drug_database) ilaçlarla eşleştirir.
    Öncelikle Tesseract OCR dener. Tesseract yoksa veya başarısız olursa Gemini Vision API'yi çağırır.
    Her ikisi de başarısız olursa en son çare olarak mock fallback yapar.
    """
    raw_text = ""
    detected_meds = []
    gemini_meds = None
    
    # 1. Aşama: Tesseract OCR Denemesi
    try:
        processed_img = preprocess_image(image_bytes)
        raw_text = pytesseract.image_to_string(processed_img, lang='tur')
    except Exception as e:
        print(f"Tesseract OCR failed (possibly not installed): {str(e)}")
        raw_text = ""

    # Ensure raw_text is a string
    raw_text = raw_text or ""

    # 2. Aşama: Tesseract metin çıkaramadıysa veya boşsa Gemini Vision'ı tetikle
    if not raw_text.strip() or len(raw_text.strip()) < 5:
        print("Tesseract raw text empty or too short. Launching Gemini Vision OCR...")
        gemini_meds = await scan_with_gemini_vision(image_bytes)
        if gemini_meds:
            raw_text = f"Gemini Vision OCR Analizi:\n" + "\n".join(
                [f"- {m.get('name')} {m.get('dosage')}" for m in gemini_meds if m]
            )

    # Tüm referans ilaçları DB'den çekelim
    stmt = select(Drug)
    result = await db.execute(stmt)
    db_drugs = result.scalars().all()

    # 3. Aşama: İlaç Listesi Eşleme ve Filtreleme
    if gemini_meds:
        # Gemini ile vizyon tespiti başarılı olduysa doğrudan verileri eşleştir
        for gem_med in gemini_meds:
            if not gem_med:
                continue
            ext_name = gem_med.get("name")
            ext_name = ext_name.strip() if ext_name else ""
            
            ext_dosage = gem_med.get("dosage")
            ext_dosage = ext_dosage.strip() if ext_dosage else "500mg"
            
            ext_freq = gem_med.get("frequency")
            ext_freq = ext_freq.strip() if ext_freq else "günde 1"

            ext_quantity = gem_med.get("quantity")
            try:
                ext_quantity = int(ext_quantity) if ext_quantity is not None else None
            except (TypeError, ValueError):
                ext_quantity = None

            best_match = None
            best_score = 0.0
            
            for db_drug in db_drugs:
                score = calculate_similarity(ext_name, db_drug.name)
                if db_drug.name.lower().startswith(ext_name.lower()) or ext_name.lower() in db_drug.name.lower():
                    score = max(score, 0.85)
                if score > best_score:
                    best_score = score
                    best_match = db_drug
                    
            if best_score > 0.45 and best_match:
                detected_meds.append({
                    "name": best_match.name,
                    "dosage": ext_dosage,
                    "frequency": ext_freq,
                    "confidence": round(best_score * 100, 1),
                    "matched_drug_id": best_match.id,
                    "form": gem_med.get("form") or best_match.form or "Tablet",
                    "active_ingredient": best_match.active_ingredient or "Bilinmiyor",
                    "quantity": ext_quantity,
                    "how_to_use": gem_med.get("how_to_use", ""),
                    "side_effects": gem_med.get("side_effects", ""),
                    "warnings": gem_med.get("warnings", "")
                })
            else:
                # DB'de yoksa bile algılanan haliyle listeye ekle
                detected_meds.append({
                    "name": ext_name,
                    "dosage": ext_dosage,
                    "frequency": ext_freq,
                    "confidence": 75.0,
                    "matched_drug_id": None,
                    "form": gem_med.get("form") or "Tablet",
                    "active_ingredient": "Bilinmiyor",
                    "quantity": ext_quantity,
                    "how_to_use": gem_med.get("how_to_use", ""),
                    "side_effects": gem_med.get("side_effects", ""),
                    "warnings": gem_med.get("warnings", "")
                })
    else:
        # Tesseract metninden parse et
        extracted_meds = extract_potential_medications(raw_text)
        for ext_name, ext_dosage in extracted_meds:
            best_match = None
            best_score = 0.0
            
            for db_drug in db_drugs:
                score = calculate_similarity(ext_name, db_drug.name)
                if db_drug.name.lower().startswith(ext_name.lower()) or ext_name.lower() in db_drug.name.lower():
                    score = max(score, 0.85)
                if score > best_score:
                    best_score = score
                    best_match = db_drug
                    
            if best_score > 0.45 and best_match:
                detected_meds.append({
                    "name": best_match.name,
                    "dosage": ext_dosage or best_match.form,
                    "frequency": "günde 1",
                    "confidence": round(best_score * 100, 1),
                    "matched_drug_id": best_match.id,
                    "form": best_match.form or "Tablet",
                    "active_ingredient": best_match.active_ingredient or "Bilinmiyor",
                    "quantity": None
                })
            else:
                detected_meds.append({
                    "name": ext_name,
                    "dosage": ext_dosage,
                    "frequency": "günde 1",
                    "confidence": 40.0,
                    "matched_drug_id": None,
                    "form": "Tablet",
                    "active_ingredient": "Bilinmiyor",
                    "quantity": None
                })

    # 4. Aşama: Her iki yöntem de hiçbir şey bulamadıysa (Fallback)
    if not detected_meds:
        print("No medications detected by either Tesseract or Gemini.")
        raw_text = "Reçete veya ilaç kutusu tam okunamadı."
        # Sahte veri dönmek yerine boş liste dönüyoruz ki önyüzde "İlaç bulunamadı" uyarısı çıksın.
        detected_meds = []

    return {
        "raw_text": raw_text,
        "detected_medications": detected_meds
    }
