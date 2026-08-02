"""
PharmaGuard AI - PDF Tedavi Uyum Raporu Servisi
Bu servis, reportlab kullanarak kullanıcının aktif ilaç listesini, son 7 günlük tedavi
uyum geçmişini ve kayıtlara göre kaçırılan/işaretlenmeyen dozları içeren profesyonel bir
PDF tedavi uyum raporu oluşturur. Türkçe karakterler, repoya gömülü DejaVu Sans fontlarıyla
(app/assets/fonts/) işletim sisteminden bağımsız olarak PDF'ye gömülür.
"""

import io
import os
from datetime import datetime
from typing import List, Dict, Any

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.shapes import Drawing, Rect, String, Line


# Repoya gömülü, Türkçe/Unicode karakterleri tam destekleyen DejaVu Sans font dosyaları.
# İşletim sistemi font yollarına (macOS/Linux/Windows) bağımlı DEĞİLDİR.
_FONTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "fonts")
_FONT_REGULAR_PATH = os.path.join(_FONTS_DIR, "DejaVuSans.ttf")
_FONT_BOLD_PATH = os.path.join(_FONTS_DIR, "DejaVuSans-Bold.ttf")
_FONT_REGULAR_NAME = "DejaVuSans"
_FONT_BOLD_NAME = "DejaVuSans-Bold"


def _register_fonts():
    """
    PDF'ye Türkçe/Unicode karakterleri tam destekleyen, repoya gömülü DejaVu Sans
    fontlarını (Regular + Bold) kaydeder ve PDF içine gömülmelerini sağlar.

    Font dosyaları bulunamazsa veya reportlab'e kaydedilemezse, Türkçe karakterleri
    desteklemeyen Helvetica'ya sessizce düşüp bozuk bir PDF üretmek yerine anlaşılır
    bir hata fırlatır (bu hata, çağıran router'daki genel hata yakalayıcı tarafından
    kullanıcıya HTTP 500 + açıklayıcı mesaj olarak döner).

    Returns:
        (font_regular_name, font_bold_name) tuple'ı
    """
    if not os.path.exists(_FONT_REGULAR_PATH) or not os.path.exists(_FONT_BOLD_PATH):
        raise RuntimeError(
            "PDF raporu için gerekli DejaVu Sans font dosyaları bulunamadı "
            f"(beklenen konum: {_FONTS_DIR}). Türkçe karakterlerin doğru "
            "görüntülenebilmesi için bu fontlar zorunludur."
        )

    try:
        pdfmetrics.registerFont(TTFont(_FONT_REGULAR_NAME, _FONT_REGULAR_PATH))
        pdfmetrics.registerFont(TTFont(_FONT_BOLD_NAME, _FONT_BOLD_PATH))
    except Exception as e:
        raise RuntimeError(f"DejaVu Sans fontları PDF motoruna kaydedilemedi: {str(e)}")

    return _FONT_REGULAR_NAME, _FONT_BOLD_NAME


# Renk Paleti (Material Design 3 uyumlu)
PRIMARY = HexColor("#4355B9")
PRIMARY_LIGHT = HexColor("#E8EAFF")
SECONDARY = HexColor("#4CAF50")
ERROR = HexColor("#BA1A1A")
ERROR_LIGHT = HexColor("#FCE8E6")
TEXT_DARK = HexColor("#1B1B21")
TEXT_LIGHT = HexColor("#46464F")
BORDER = HexColor("#C7C5D0")
BG_LIGHT = HexColor("#F5F3FF")


def _build_weekly_chart(weekly_adherence: List[Dict[str, Any]], font_name: str,
                         chart_width: float, chart_height: float) -> Drawing:
    """
    Son 7 günlük uyum yüzdelerini gösteren sade bir çubuk grafik çizer.
    Ekstra bir grafik kütüphanesi kullanılmaz; yalnızca reportlab.graphics.shapes
    (Drawing/Rect/String/Line) ile elle çizilir.

    O gün için planlanmış hiç doz yoksa (total_count == 0), yanıltıcı olmaması için
    bar %0 veya %100 olarak gösterilmez; "veri yok" ibaresiyle işaretlenir.
    """
    d = Drawing(chart_width, chart_height)
    n = len(weekly_adherence)
    if n == 0:
        return d

    gap = 4
    bar_width = (chart_width - gap * (n + 1)) / n
    max_bar_h = chart_height - 24
    baseline_y = 14

    d.add(Line(0, baseline_y, chart_width, baseline_y, strokeColor=BORDER, strokeWidth=0.5))

    for i, day in enumerate(weekly_adherence):
        x = gap + i * (bar_width + gap)
        total = day.get("total_count", 0) or 0
        pct = day.get("percentage", 0) or 0
        has_data = total > 0

        bar_h = max(2, (pct / 100.0) * max_bar_h) if has_data else 2
        bar_color = PRIMARY if has_data else BORDER

        d.add(Rect(x, baseline_y, bar_width, bar_h, fillColor=bar_color, strokeColor=None))

        top_label = f"%{int(pct)}" if has_data else "veri yok"
        d.add(String(
            x + bar_width / 2, baseline_y + bar_h + 3, top_label,
            fontName=font_name, fontSize=6.5, fillColor=TEXT_DARK, textAnchor="middle"
        ))

        d.add(String(
            x + bar_width / 2, 2, day.get("day", "-"),
            fontName=font_name, fontSize=7.5, fillColor=TEXT_LIGHT, textAnchor="middle"
        ))

    return d


def generate_treatment_report(
    user: Dict[str, Any],
    medications: List[Dict[str, Any]],
    weekly_adherence: List[Dict[str, Any]],
    missed_doses: List[Dict[str, Any]]
) -> bytes:
    """
    Kullanıcının tedavi uyum bilgilerini içeren profesyonel bir PDF raporu oluşturur.

    Args:
        user: Kullanıcı bilgileri (first_name, last_name, age, gender, email)
        medications: Aktif ilaç listesi
        weekly_adherence: Son 7 günlük uyum verisi (get_weekly_adherence çıktısı)
        missed_doses: Kayıtlara göre kaçırılan/işaretlenmeyen dozlar (get_weekly_missed_doses çıktısı)

    Returns:
        PDF dosyasının byte içeriği
    """
    buffer = io.BytesIO()
    font_name, font_bold = _register_fonts()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=15 * mm,
        bottomMargin=20 * mm
    )

    elements = []

    # ─── Stiller ───
    styles = getSampleStyleSheet()

    style_title = ParagraphStyle(
        'ReportTitle',
        parent=styles['Heading1'],
        fontName=font_bold,
        fontSize=20,
        textColor=PRIMARY,
        alignment=TA_CENTER,
        spaceAfter=4 * mm
    )

    style_subtitle = ParagraphStyle(
        'ReportSubtitle',
        parent=styles['Normal'],
        fontName=font_name,
        fontSize=10,
        textColor=TEXT_LIGHT,
        alignment=TA_CENTER,
        spaceAfter=8 * mm
    )

    style_section = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontName=font_bold,
        fontSize=13,
        textColor=PRIMARY,
        spaceBefore=6 * mm,
        spaceAfter=3 * mm
    )

    style_body = ParagraphStyle(
        'BodyText',
        parent=styles['Normal'],
        fontName=font_name,
        fontSize=10,
        textColor=TEXT_DARK,
        leading=14
    )

    style_small = ParagraphStyle(
        'SmallText',
        parent=styles['Normal'],
        fontName=font_name,
        fontSize=8,
        textColor=TEXT_LIGHT,
        alignment=TA_CENTER,
        spaceBefore=8 * mm
    )

    style_card_header = ParagraphStyle(
        'CardHeader',
        parent=styles['Normal'],
        fontName=font_bold,
        fontSize=8,
        textColor=HexColor("#FFFFFF"),
        alignment=TA_CENTER,
        leading=10
    )

    style_card_value = ParagraphStyle(
        'CardValue',
        parent=styles['Normal'],
        fontName=font_bold,
        fontSize=15,
        textColor=PRIMARY,
        alignment=TA_CENTER
    )

    style_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName=font_name,
        fontSize=8,
        textColor=TEXT_DARK,
        leading=10
    )

    # ─── 1. Başlık ───
    elements.append(Paragraph("PharmaGuard AI", style_title))
    elements.append(Paragraph("Tedavi Uyum Raporu", style_subtitle))

    # ─── 2. Hasta Bilgileri ve Rapor Dönemi ───
    now = datetime.now()
    report_date = now.strftime("%d.%m.%Y %H:%M")

    if weekly_adherence:
        period_start = weekly_adherence[0]["date"]
        period_end = weekly_adherence[-1]["date"]
        period_str = f"{period_start.strftime('%d.%m.%Y')} - {period_end.strftime('%d.%m.%Y')}"
    else:
        period_str = "-"

    first_name = user.get("first_name", "")
    last_name = user.get("last_name", "")
    age = user.get("age", "-")
    gender_raw = user.get("gender", "other")
    gender_map = {"male": "Erkek", "female": "Kadın", "other": "Belirtilmemiş"}
    gender_display = gender_map.get(gender_raw, "Belirtilmemiş")
    email = user.get("email", "-")

    patient_data = [
        ["Hasta Adı:", f"{first_name} {last_name}", "Rapor Tarihi:", report_date],
        ["Yaş:", str(age), "Cinsiyet:", gender_display],
        ["E-posta:", email, "Rapor Dönemi:", period_str],
    ]

    patient_table = Table(patient_data, colWidths=[30 * mm, 55 * mm, 30 * mm, 55 * mm])
    patient_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), font_name),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (0, -1), TEXT_LIGHT),
        ('TEXTCOLOR', (2, 0), (2, -1), TEXT_LIGHT),
        ('TEXTCOLOR', (1, 0), (1, -1), TEXT_DARK),
        ('TEXTCOLOR', (3, 0), (3, -1), TEXT_DARK),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.25, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))

    elements.append(patient_table)
    elements.append(Spacer(1, 4 * mm))

    # ─── 3. Haftalık Özet ───
    elements.append(Paragraph("Haftalık Özet", style_section))

    active_med_count = len(medications)
    total_planned_week = sum(day.get("total_count", 0) or 0 for day in weekly_adherence)
    total_taken_week = sum(day.get("taken_count", 0) or 0 for day in weekly_adherence)
    total_missed_week = len(missed_doses)
    weekly_pct = round((total_taken_week / total_planned_week * 100)) if total_planned_week > 0 else 0

    summary_header = [
        Paragraph("Aktif İlaç", style_card_header),
        Paragraph("Haftalık Planlanan Doz", style_card_header),
        Paragraph("Haftalık Alınan Doz", style_card_header),
        Paragraph("Haftalık Kaçırılan / İşaretlenmeyen Doz", style_card_header),
        Paragraph("Haftalık Uyum", style_card_header),
    ]
    summary_values = [
        Paragraph(str(active_med_count), style_card_value),
        Paragraph(str(total_planned_week), style_card_value),
        Paragraph(str(total_taken_week), style_card_value),
        Paragraph(str(total_missed_week), style_card_value),
        Paragraph(f"%{weekly_pct}", style_card_value),
    ]

    summary_table = Table([summary_header, summary_values], colWidths=[34 * mm] * 5)
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('BACKGROUND', (0, 1), (-1, 1), PRIMARY_LIGHT),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.25, BORDER),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('TOPPADDING', (0, 1), (-1, 1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, 1), 8),
    ]))

    elements.append(summary_table)
    elements.append(Spacer(1, 5 * mm))

    # ─── 4. Son 7 Günlük Sade Uyum Grafiği ───
    elements.append(Paragraph("Son 7 Günlük Uyum Grafiği", style_section))

    if weekly_adherence:
        chart = _build_weekly_chart(weekly_adherence, font_name, chart_width=170 * mm, chart_height=42 * mm)
        elements.append(chart)
    else:
        elements.append(Paragraph("Henüz uyum verisi bulunmamaktadır.", style_body))

    elements.append(Spacer(1, 4 * mm))

    # ─── 5. Aktif İlaç Listesi ───
    elements.append(Paragraph("Aktif İlaç Listesi", style_section))

    if medications:
        med_header = ["#", "İlaç Adı", "Dozaj", "Form", "Sıklık", "Saatler", "Stok"]
        med_rows = [med_header]

        for idx, med in enumerate(medications, 1):
            name = Paragraph(med.get("name") or "-", style_cell)
            dosage = Paragraph(med.get("dosage") or "-", style_cell)
            form = Paragraph(med.get("form") or "-", style_cell)
            frequency = Paragraph(med.get("frequency") or "-", style_cell)
            times = Paragraph(", ".join(med.get("times", [])) or "-", style_cell)
            stock = str(med.get("stock_count", 0))
            med_rows.append([str(idx), name, dosage, form, frequency, times, stock])

        med_table = Table(med_rows, colWidths=[8 * mm, 42 * mm, 22 * mm, 22 * mm, 22 * mm, 30 * mm, 18 * mm])
        med_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), font_name),
            ('FONTNAME', (0, 0), (-1, 0), font_bold),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('TEXTCOLOR', (0, 0), (-1, 0), HexColor("#FFFFFF")),
            ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
            ('TEXTCOLOR', (0, 1), (-1, -1), TEXT_DARK),
            ('BACKGROUND', (0, 1), (-1, -1), HexColor("#FFFFFF")),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor("#FFFFFF"), BG_LIGHT]),
            ('BOX', (0, 0), (-1, -1), 0.5, BORDER),
            ('INNERGRID', (0, 0), (-1, -1), 0.25, BORDER),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),
            ('ALIGN', (6, 0), (6, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))

        elements.append(med_table)
    else:
        elements.append(Paragraph("Aktif ilaç kaydedilmemiş.", style_body))

    elements.append(Spacer(1, 4 * mm))

    # ─── 6. Kayıtlara Göre Kaçırılan/İşaretlenmeyen Dozlar ───
    elements.append(Paragraph("Kayıtlara Göre Kaçırılan/İşaretlenmeyen Dozlar", style_section))

    if missed_doses:
        missed_header = ["Gün", "Tarih", "İlaç", "Saat"]
        missed_rows = [missed_header]

        for item in missed_doses:
            item_date = item.get("date")
            date_str = item_date.strftime("%d.%m.%Y") if item_date else "-"
            missed_rows.append([
                item.get("day", "-"),
                date_str,
                Paragraph(item.get("medication_name") or "-", style_cell),
                item.get("scheduled_time", "-"),
            ])

        missed_table = Table(missed_rows, colWidths=[20 * mm, 25 * mm, 95 * mm, 30 * mm])
        missed_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), font_name),
            ('FONTNAME', (0, 0), (-1, 0), font_bold),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('TEXTCOLOR', (0, 0), (-1, 0), HexColor("#FFFFFF")),
            ('BACKGROUND', (0, 0), (-1, 0), ERROR),
            ('TEXTCOLOR', (0, 1), (-1, -1), TEXT_DARK),
            ('BACKGROUND', (0, 1), (-1, -1), HexColor("#FFFFFF")),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor("#FFFFFF"), ERROR_LIGHT]),
            ('BOX', (0, 0), (-1, -1), 0.5, BORDER),
            ('INNERGRID', (0, 0), (-1, -1), 0.25, BORDER),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('ALIGN', (0, 0), (1, -1), 'CENTER'),
            ('ALIGN', (3, 0), (3, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))

        elements.append(missed_table)
    else:
        elements.append(Paragraph(
            "Bu rapor döneminde kayıtlara göre kaçırılmış doz bulunmamaktadır.",
            style_body
        ))

    elements.append(Paragraph(
        "Bu liste, kullanıcının uygulama üzerinden yaptığı “alındı” işaretlemelerine dayanmaktadır.",
        style_small
    ))

    elements.append(Spacer(1, 4 * mm))

    # ─── 7. Doktor Görüşmesi İçin Notlar (boş şablon alanı) ───
    note_line_height = 8 * mm
    note_lines = [[""] for _ in range(4)]

    note_box = Table(note_lines, colWidths=[170 * mm], rowHeights=[note_line_height] * 4)
    note_box.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.75, BORDER),
        ('LINEBELOW', (0, 0), (-1, -2), 0.5, BORDER),
        ('BACKGROUND', (0, 0), (-1, -1), HexColor("#FFFFFF")),
    ]))

    # Başlık + kutu aynı sayfada kalsın diye birlikte gruplanır
    elements.append(KeepTogether([
        Paragraph("Doktor Görüşmesi İçin Notlar", style_section),
        note_box
    ]))

    # ─── 8. Bilgilendirme ve Tıbbi Sorumluluk Reddi ───
    elements.append(Spacer(1, 10 * mm))
    elements.append(Paragraph(
        f"Bu rapor PharmaGuard AI tarafından {report_date} tarihinde otomatik olarak oluşturulmuştur.",
        style_small
    ))
    elements.append(Paragraph(
        "Bu rapor bilgilendirme amaçlıdır, tıbbi tanı veya tedavi tavsiyesi yerine geçmez.",
        style_small
    ))

    # PDF'i olustur
    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()

    return pdf_bytes
