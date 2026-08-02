"""
PharmaGuard AI - Gemini AI Service
Bu servis, Google Gemini API'sini kullanarak prospektüs özetleme,
ilaç etkileşim analizi ve haftalık uyum yorumları oluşturma işlemlerini yönetir.
"""

import json
from typing import Dict, Any, List, Optional
import google.generativeai as genai
from fastapi import HTTPException, status
from app.config import settings

# Gemini API Yapılandırması
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)
else:
    # API Key tanımlı değilse uyarı verir, ancak sunucu çökmesin diye loglanır
    print("WARNING: GEMINI_API_KEY is not defined in environment!")

def get_gemini_model():
    """
    Gemini model nesnesini başlatır. API key yoksa 503 fırlatır.
    """
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Gemini API Anahtarı eksik. Lütfen .env dosyasını yapılandırın."
        )
    # Her zaman güncel flash modelini gösteren alias kullanılır
    return genai.GenerativeModel("gemini-flash-latest")

async def summarize_prospectus(medication_name: str, prospectus_text: str) -> Dict[str, Any]:
    """
    Gemini API kullanarak uzun prospektüs metnini Türkçe ve hasta dostu bir dilde özetler.
    Çıktı kesinlikle JSON formatındadır.
    """
    model = get_gemini_model()
    
    prompt = f"""
Sen bir eczacı asistanısın. Aşağıdaki ilaç prospektüsünü hasta dostu bir dilde ve Türkçe olarak özetle.

Özet şu bölümlerden oluşmalı:
1. "purpose": Ne için kullanılır (2-3 cümle)
2. "how_to_use": Nasıl kullanılır (dozaj ve zamanlama)
3. "side_effects": Yan etkileri (en yaygın 3-5 tanesi)
4. "warnings": Uyarılar (kritik uyarılar)
5. "interactions": Etkileşimler (dikkat edilmesi gereken ilaç/besin etkileşimleri)

Tıbbi jargondan kaçın. Kesinlikle geçerli bir JSON objesi formatında yanıt ver. JSON anahtarları yukarıdakilerle tamamen aynı olmalıdır.

İlaç: {medication_name}
Prospektüs: {prospectus_text}
"""
    
    try:
        # JSON yanıtı almak için response_mime_type kullanılır
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        
        # Yanıtı parse et
        result = json.loads(response.text)
        return result
    except json.JSONDecodeError:
        # JSON parse hatası durumunda fallback
        print("Failed to parse Gemini response as JSON. Dönen ham metin:", response.text)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Yapay zeka yanıtı geçerli bir JSON formatına dönüştürülemedi."
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gemini API hatası: {str(e)}"
        )

async def check_interactions(new_medication_name: str, current_medications: List[str]) -> Dict[str, Any]:
    """
    Yeni eklenen ilacın kullanıcının mevcut ilaçlarıyla bilinen etkileşimlerini analiz eder.
    """
    if not current_medications:
        return {"has_interaction": False, "details": "Mevcut kayıtlı ilacınız bulunmamaktadır."}
        
    model = get_gemini_model()
    
    prompt = f"""
Aşağıda hastanın yeni kullanmaya başlayacağı ilaç ve hali hazırda kullanmakta olduğu ilaçların listesi verilmiştir.
Bu ilaçlar arasında bilinen klinik olarak anlamlı bir ilaç-ilaç etkileşimi var mı analiz et.

Girdi:
Yeni İlaç: {new_medication_name}
Mevcut İlaçlar: {', '.join(current_medications)}

Analiz sonucunu şu JSON formatında dön:
{{
  "has_interaction": true/false (etkileşim varsa true, yoksa false),
  "severity": "high"/"medium"/"low"/"none" (etkileşimin ciddiyet derecesi),
  "details": "Etkileşimin açıklaması ve hasta için tavsiyeler (Türkçe)"
}}

Kesinlikle sadece geçerli bir JSON objesi döndür.
"""
    
    try:
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        result = json.loads(response.text)
        return result
    except Exception as e:
        # Hata durumunda güvenli default dön
        return {
            "has_interaction": False,
            "severity": "none",
            "details": f"Etkileşim analizi yapılırken hata oluştu: {str(e)}"
        }

async def generate_weekly_insight(adherence_data: List[Dict[str, Any]]) -> str:
    """
    Haftalık ilaç kullanım verilerine göre hastaya motive edici ve yol gösterici
    yapay zeka değerlendirme metni oluşturur.
    """
    model = get_gemini_model()
    
    prompt = f"""
Aşağıda bir hastanın son 7 günlük ilaç kullanım (doz uyum) istatistikleri verilmiştir.
Bu verilere dayanarak hastaya motive edici, tıbbi tavsiye içermeyen, durum değerlendirmesi yapan kısa ve öz bir yorum yaz (maksimum 3-4 cümle).

Haftalık Uyum Verileri:
{json.dumps(adherence_data, ensure_ascii=False)}

Yorum dili Türkçe, destekleyici ve hasta dostu olmalıdır.
"""
    
    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        return "Tedavi uyum verileriniz başarıyla kaydedildi. Düzenli kullanıma devam edin."
