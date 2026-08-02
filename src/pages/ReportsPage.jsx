import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useScheduleStore } from '../stores/scheduleStore';
import { scheduleService } from '../services/scheduleService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { fileService } from '../services/fileService';
import { Capacitor } from '@capacitor/core';

export default function ReportsPage() {
  const { t } = useTranslation();
  const { weeklyAdherence, isLoading, error, fetchWeekly } = useScheduleStore();
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);
  const [pdfError, setPdfError] = useState(null);
  const [savedPdfUri, setSavedPdfUri] = useState(null);

  // Sayfa yüklendiğinde haftalık analizi API'den çek
  useEffect(() => {
    fetchWeekly();
  }, [fetchWeekly]);

  // PDF Rapor oluşturma ve indirme işlemi
  const handlePdfGeneration = async () => {
    setPdfLoading(true);
    setPdfError(null);
    setPdfSuccess(false);
    setSavedPdfUri(null);
    try {
      const blob = await scheduleService.downloadPdfReport();
      const fileName = `PharmaGuardAI_Rapor_${new Date().toISOString().split('T')[0]}.pdf`;
      const uri = await fileService.savePdf(blob, fileName);
      if (uri) {
        setSavedPdfUri(uri);
      }
      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 4000);
    } catch (err) {
      setPdfError(`Hata: ${err.message || (err.response && err.response.data && err.response.data.detail)}`);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleSharePdf = async () => {
    if (savedPdfUri) {
      const fileName = `PharmaGuardAI_Rapor_${new Date().toISOString().split('T')[0]}.pdf`;
      await fileService.sharePdf(savedPdfUri, fileName);
    }
  };

  const handleOpenPdf = async () => {
    if (savedPdfUri) {
      try {
        await fileService.openPdf(savedPdfUri);
      } catch (err) {
        setPdfError('PDF açılamadı. Görüntülemek için bir PDF uygulaması gerekebilir.');
      }
    }
  };

  if (isLoading && weeklyAdherence.length === 0) {
    return <LoadingSpinner fullPage />;
  }

  // Uyum ortalamasını hesaplayalım
  const averageAdherence = weeklyAdherence.length > 0
    ? Math.round(weeklyAdherence.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / weeklyAdherence.length)
    : 0;

  // Gün adlarını çevirme haritası
  const dayMap = {
    'Pzt': t('days.mon'),
    'Sal': t('days.tue'),
    'Çar': t('days.wed'),
    'Per': t('days.thu'),
    'Cum': t('days.fri'),
    'Cmt': t('days.sat'),
    'Paz': t('days.sun')
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="font-display text-2xl font-bold text-on-surface">{t('reports.title')}</h2>
        <p className="font-body text-sm text-on-surface-variant mt-1">{t('reports.subtitle')}</p>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="p-3 rounded-lg bg-error-container text-on-error-container text-xs font-body border border-error/20 flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-error">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* AI Insight Card */}
      <div className="bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.08)] p-5 border-l-4 border-primary">
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
            auto_awesome
          </span>
          <h3 className="font-display text-base font-bold text-on-surface">{t('reports.aiInsight')}</h3>
        </div>
        <p className="font-body text-sm text-on-surface-variant leading-relaxed">
          {weeklyAdherence.length > 0 
            ? averageAdherence >= 90
              ? t('reports.aiInsightGood', { percentage: averageAdherence })
              : t('reports.aiInsightWarning', { percentage: averageAdherence })
            : t('reports.aiInsightNoData')}
        </p>
      </div>

      {/* Weekly Chart Card */}
      <div className="bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.08)] p-5">
        <h3 className="font-display text-base font-bold text-on-surface mb-6 text-center">{t('reports.weeklyAdherence')}</h3>
        
        {weeklyAdherence.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-on-surface-variant text-sm font-body">
            {t('common.noData')}
          </div>
        ) : (
          <div className="flex justify-between items-end h-48 px-2 relative border-b border-outline-variant/30">
            {weeklyAdherence.map((day, idx) => {
              const barHeight = day.percentage || 0;
              let barColorClass = 'bg-secondary'; // Yeşil
              if (barHeight < 100 && barHeight > 0) {
                barColorClass = 'bg-error'; // Kırmızı (aksama var)
              } else if (barHeight === 0) {
                barColorClass = 'bg-outline-variant'; // Gri
              }

              return (
                <div key={idx} className="flex flex-col items-center flex-1 group">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-8 bg-inverse-surface text-inverse-on-surface text-[10px] font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    %{barHeight} ({day.taken_count || 0}/{day.total_count || 0} Doz)
                  </div>
                  
                  {/* Bar */}
                  <div className="w-6 sm:w-8 rounded-t relative overflow-hidden flex items-end justify-center bg-surface-container-high h-36">
                    <div
                      className={`${barColorClass} w-full rounded-t transition-all duration-500`}
                      style={{ height: `${barHeight}%` }}
                    />
                  </div>
                  
                  {/* Day label */}
                  <span className="font-display text-xs font-semibold text-on-surface-variant mt-2">
                    {dayMap[day.day] || day.day}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="flex justify-center gap-6 mt-6">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-secondary" />
            <span className="font-body text-xs text-on-surface-variant">{t('reports.fullAdherence')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-error" />
            <span className="font-body text-xs text-on-surface-variant">{t('reports.missedDose')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-outline-variant" />
            <span className="font-body text-xs text-on-surface-variant">{t('reports.noData')}</span>
          </div>
        </div>
      </div>

      {/* PDF Success Banner */}
      {pdfSuccess && (
        <div className="p-3 rounded-lg bg-secondary/15 text-secondary text-xs font-body border border-secondary/20 flex items-center gap-2">
          <span className="material-symbols-outlined text-base">check_circle</span>
          <span>PDF tedavi raporu başarıyla indirildi!</span>
        </div>
      )}

      {/* PDF Error Banner */}
      {pdfError && (
        <div className="p-3 rounded-lg bg-error-container text-on-error-container text-xs font-body border border-error/20 flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-error">error</span>
          <span>{pdfError}</span>
        </div>
      )}

      {/* PDF Button */}
      <div className="pt-2 space-y-3">
        <button
          type="button"
          onClick={handlePdfGeneration}
          disabled={pdfLoading}
          className="w-full h-[48px] bg-primary text-on-primary rounded-full font-body font-semibold text-sm tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all duration-200 shadow-md disabled:opacity-75 disabled:pointer-events-none"
        >
          {pdfLoading ? (
            <>
              <LoadingSpinner size="small" />
              <span>{t('reports.downloading', 'İndiriliyor...')}</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-xl">picture_as_pdf</span>
              {t('reports.generatePdf')}
            </>
          )}
        </button>

        {savedPdfUri && Capacitor.isNativePlatform() && (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleOpenPdf}
              className="flex-1 h-[48px] border-2 border-primary text-primary rounded-full font-body font-semibold text-sm tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all duration-200 shadow-sm"
            >
              <span className="material-symbols-outlined text-xl">open_in_new</span>
              {t('reports.open_report', 'Aç')}
            </button>
            <button
              type="button"
              onClick={handleSharePdf}
              className="flex-1 h-[48px] border-2 border-primary text-primary rounded-full font-body font-semibold text-sm tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all duration-200 shadow-sm"
            >
              <span className="material-symbols-outlined text-xl">share</span>
              {t('reports.share_report', 'Raporu Paylaş')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
