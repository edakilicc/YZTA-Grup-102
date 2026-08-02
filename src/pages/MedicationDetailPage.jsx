import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMedicationStore } from '../stores/medicationStore';
import { aiService } from '../services/aiService';
import SubPageHeader from '../components/layout/SubPageHeader';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { notificationService } from '../services/notificationService';

export default function MedicationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  
  // AI Özetleme Arayüzü Durumları
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [prospectusText, setProspectusText] = useState('');
  const [showAiInput, setShowAiInput] = useState(false);
  const [aiError, setAiError] = useState(null);

  // İlaç Etkileşim Durumları
  const [interactionsLoading, setInteractionsLoading] = useState(false);
  const [interactionsResult, setInteractionsResult] = useState(null);
  const [interactionsError, setInteractionsError] = useState(null);

  const { 
    selectedMedication: med, 
    isLoading, 
    error, 
    fetchById, 
    remove,
    update
  } = useMedicationStore();

  // İlacı API'den çek
  useEffect(() => {
    fetchById(Number(id)).catch(() => {
      // Hata durumunda detail page'de hata gösterilir
    });
  }, [id, fetchById]);

  // Otomatik etkileşim kontrolü yap
  useEffect(() => {
    if (med && med.name) {
      const checkInteractions = async () => {
        setInteractionsLoading(true);
        setInteractionsError(null);
        try {
          const res = await aiService.checkInteractions(med.name);
          setInteractionsResult(res);
        } catch (err) {
          console.error("Etkileşim sorgulama hatası:", err);
          setInteractionsError("Etkileşim analizi yapılırken bir hata oluştu.");
        } finally {
          setInteractionsLoading(false);
        }
      };
      checkInteractions();
    }
  }, [med]);

  const handleDelete = async () => {
    try {
      await notificationService.cancelForMedication(Number(id));
      await remove(Number(id));
      navigate('/medications');
    } catch (err) {
      setShowConfirmDelete(false);
    }
  };

  const handleAiSummarize = async (e) => {
    e.preventDefault();
    if (!prospectusText.trim()) return;

    setIsAiLoading(true);
    setAiError(null);

    try {
      // 1. Gemini API yardımıyla özet oluşturulur
      const summary = await aiService.summarizeProspectus(med.name, prospectusText);
      
      // 2. Özet veriler, mevcut ilaca update edilerek DB'ye kaydedilir
      await update(med.id, {
        purpose: summary.purpose,
        how_to_use: summary.how_to_use,
        side_effects: summary.side_effects,
        warnings: summary.warnings,
        active_ingredient: med.active_ingredient || "Gemini AI"
      });

      setShowAiInput(false);
      setProspectusText('');
    } catch (err) {
      setAiError(err.response?.data?.detail || "Prospektüs özetlenirken bir yapay zeka hatası oluştu.");
    } finally {
      setIsAiLoading(false);
    }
  };

  if (isLoading && !med) {
    return <LoadingSpinner fullPage />;
  }

  if (error || !med) {
    return (
      <div className="min-h-screen bg-background">
        <SubPageHeader title="PharmaGuard AI" />
        <div className="px-5 py-10 text-center font-body">
          <span className="material-symbols-outlined text-5xl text-error mb-2">error</span>
          <h3 className="text-lg font-bold text-on-surface mb-2">{t('common.error')}</h3>
          <p className="text-sm text-on-surface-variant mb-5">
            Aradığınız ilaç silinmiş veya bu hesaba ait olmayabilir.
          </p>
          <Link
            to="/medications"
            className="inline-flex h-10 items-center justify-center px-6 rounded-full bg-primary text-on-primary font-semibold text-sm"
          >
            {t('common.back')}
          </Link>
        </div>
      </div>
    );
  }

  // Yapay Zeka Özeti Var mı kontrolü
  const hasAiSummary = !!(med.purpose || med.side_effects);

  return (
    <div className="min-h-screen bg-background">
      <SubPageHeader title="PharmaGuard AI" />

      <main className="px-5 py-6 pb-10 space-y-6">
        {/* Medication Hero Card */}
        <div className="bg-surface-container-lowest rounded-[20px] shadow-[0px_4px_20px_rgba(0,0,0,0.08)] p-5 border-l-4 border-primary flex items-center gap-4">
          {localStorage.getItem(`med_img_${med.id}`) || med.image_url ? (
            <img
              src={localStorage.getItem(`med_img_${med.id}`) || med.image_url}
              alt={med.name}
              className="w-20 h-20 rounded-full object-cover border-2 border-surface-container shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary-container text-primary flex items-center justify-center font-display font-bold text-3xl shrink-0">
              {med.name.charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-grow">
            <h2 className="font-display text-xl font-bold text-on-surface truncate">{med.name}</h2>
            <p className="font-body text-base text-on-surface-variant truncate">
              {med.dosage} · {med.form}
            </p>
            <p className="font-body text-sm text-on-surface-variant mt-0.5">{med.frequency}</p>
            <span className="inline-block mt-2 px-3 py-0.5 text-xs font-semibold rounded-full bg-secondary-container text-on-secondary-container">
              {med.is_active ? 'Düzenli' : 'Aktif Değil'}
            </span>
          </div>
        </div>

        {/* Stock & Info Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface-container-lowest rounded-[20px] shadow-[0px_4px_20px_rgba(0,0,0,0.08)] p-4 flex flex-col justify-between h-24">
            <h4 className="font-display text-sm font-semibold text-on-surface-variant">{t('medications.stock')}</h4>
            <div className="flex justify-between items-baseline">
              <span className="font-display text-2xl font-bold text-on-surface">{med.stock_count} adet</span>
              <button
                onClick={() => navigate(`/add-medication?edit=${med.id}`)}
                className="text-xs text-primary font-bold hover:underline"
              >
                Yenile
              </button>
            </div>
          </div>
          
          <div className="bg-surface-container-lowest rounded-[20px] shadow-[0px_4px_20px_rgba(0,0,0,0.08)] p-4 flex flex-col justify-between h-24">
            <h4 className="font-display text-sm font-semibold text-on-surface-variant">{t('medications.times')}</h4>
            <div className="flex flex-wrap gap-1 mt-1">
              {med.times && med.times.map((time) => (
                <span key={time} className="px-2 py-0.5 rounded bg-surface-variant text-on-surface text-xs font-bold font-body">
                  {time}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* AI Prospectus Summary Section */}
        <div className="bg-surface-container-lowest rounded-[20px] shadow-[0px_4px_20px_rgba(0,0,0,0.08)] p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-outline-variant/30">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                auto_awesome
              </span>
              <h3 className="font-display text-base font-bold text-on-surface">Yapay Zeka Prospektüs Özeti</h3>
            </div>
            {hasAiSummary && !showAiInput && (
              <button
                onClick={() => setShowAiInput(true)}
                className="text-xs text-primary font-semibold flex items-center gap-0.5 hover:underline"
              >
                <span className="material-symbols-outlined text-sm">refresh</span> Yeniden Özetle
              </button>
            )}
          </div>

          {/* AI Error Display */}
          {aiError && (
            <div className="p-3 rounded-lg bg-error-container text-on-error-container text-xs font-body border border-error/20 flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-error">error</span>
              <span>{aiError}</span>
            </div>
          )}

          {isAiLoading ? (
            <div className="py-10 flex flex-col items-center justify-center space-y-3">
              <LoadingSpinner size="medium" />
              <p className="font-body text-sm text-on-surface-variant text-center animate-pulse">
                Gemini API prospektüsü analiz ediyor, lütfen bekleyin...
              </p>
            </div>
          ) : showAiInput || !hasAiSummary ? (
            /* Prospektüs Metni Yapıştırma Arayüzü */
            <form onSubmit={handleAiSummarize} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-body text-xs font-bold text-on-surface-variant" htmlFor="prospectus">
                  İlaç Prospektüs Metni
                </label>
                <textarea
                  id="prospectus"
                  rows={6}
                  value={prospectusText}
                  onChange={(e) => setProspectusText(e.target.value)}
                  placeholder="İlaç kutusundaki veya internetteki prospektüs metnini buraya yapıştırın..."
                  className="p-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm font-body w-full focus:ring-2 focus:ring-primary focus:border-primary transition-shadow resize-none"
                  required
                />
              </div>
              <div className="flex gap-2">
                {hasAiSummary && (
                  <button
                    type="button"
                    onClick={() => setShowAiInput(false)}
                    className="flex-1 h-[40px] rounded-full bg-surface-container-high text-on-surface-variant font-body font-semibold text-xs active:scale-95 transition-transform"
                  >
                    {t('common.cancel')}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!prospectusText.trim()}
                  className="flex-1 h-[40px] rounded-full bg-primary text-on-primary font-body font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-sm disabled:opacity-50 disabled:pointer-events-none"
                >
                  <span className="material-symbols-outlined text-base">auto_awesome</span>
                  Özet Oluştur (AI)
                </button>
              </div>
            </form>
          ) : (
            /* Özet Sonucu Kartları */
            <div className="space-y-4">
              {/* Ne İçin Kullanılır */}
              <div className="p-3.5 rounded-xl bg-primary/5 space-y-1">
                <h4 className="font-display text-sm font-bold text-primary">{t('medications.purpose')}</h4>
                <p className="font-body text-sm text-on-surface-variant leading-relaxed">
                  {med.purpose}
                </p>
              </div>

              {/* Nasıl Kullanılır */}
              <div className="p-3.5 rounded-xl bg-secondary/5 space-y-1">
                <h4 className="font-display text-sm font-bold text-secondary">Nasıl Kullanılır?</h4>
                <p className="font-body text-sm text-on-surface-variant leading-relaxed">
                  {med.how_to_use}
                </p>
              </div>

              {/* Yan Etkiler */}
              <div className="p-3.5 rounded-xl bg-error/5 space-y-1">
                <h4 className="font-display text-sm font-bold text-error">Olası Yan Etkiler</h4>
                <p className="font-body text-sm text-on-surface-variant leading-relaxed">
                  {med.side_effects}
                </p>
              </div>

              {/* Uyarılar */}
              <div className="p-3.5 rounded-xl bg-tertiary/5 space-y-1">
                <h4 className="font-display text-sm font-bold text-tertiary-container">Kritik Uyarılar</h4>
                <p className="font-body text-sm text-on-surface-variant leading-relaxed">
                  {med.warnings}
                </p>
              </div>
              
              <p className="font-body text-[11px] text-on-surface-variant text-center opacity-85 pt-2">
                ⚠️ Bu özet yapay zeka tarafından hazırlanmıştır. Tıbbi tavsiye yerine geçmez.
              </p>
            </div>
          )}
        </div>

        {/* İlaç Etkileşimleri Kartı */}
        <div className="bg-surface-container-lowest rounded-[20px] shadow-[0px_4px_20px_rgba(0,0,0,0.08)] p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-outline-variant/30">
            <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              warning
            </span>
            <h3 className="font-display text-base font-bold text-on-surface">İlaç Etkileşimleri</h3>
          </div>

          {interactionsLoading ? (
            <div className="py-6 flex flex-col items-center justify-center space-y-2">
              <LoadingSpinner size="small" />
              <p className="font-body text-xs text-on-surface-variant animate-pulse">
                Olası etkileşimler kontrol ediliyor...
              </p>
            </div>
          ) : interactionsError ? (
            <div className="p-3 rounded-lg bg-error-container text-on-error-container text-xs font-body border border-error/20 flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-error">error</span>
              <span>{interactionsError}</span>
            </div>
          ) : interactionsResult ? (
            interactionsResult.has_interactions && interactionsResult.interactions && interactionsResult.interactions.length > 0 ? (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-error/5 text-error text-xs font-body border border-error/20 flex items-center gap-2">
                  <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                  <span>Dikkat! Bu ilaç, kullandığınız diğer ilaçlarla etkileşime girebilir.</span>
                </div>
                
                <div className="space-y-2">
                  {interactionsResult.interactions.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border-l-4 ${
                        item.severity === 'high' ? 'border-error bg-error/5 text-error' : 'border-tertiary bg-tertiary/5 text-tertiary'
                      } border border-outline-variant/30`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-display text-xs font-bold text-on-surface">
                          {item.drug1} ↔️ {item.drug2}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          item.severity === 'high' ? 'bg-error/15 text-error' : 'bg-tertiary/15 text-tertiary'
                        }`}>
                          {item.severity === 'high' ? 'Ciddi' : 'Orta'}
                        </span>
                      </div>
                      <p className="font-body text-xs text-on-surface-variant leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-secondary/15 text-secondary border border-secondary/20 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">check_circle</span>
                <span className="font-body text-sm font-semibold">Etkileşim bulunmadı ✓</span>
              </div>
            )
          ) : (
            <p className="font-body text-xs text-on-surface-variant">Kontrol edilemedi.</p>
          )}
        </div>

        {/* Actions Buttons */}
        <div className="pt-2 flex gap-4">
          <button
            type="button"
            onClick={() => navigate(`/add-medication?edit=${med.id}`)}
            className="flex-1 h-[48px] rounded-full border-2 border-primary text-primary font-body font-semibold text-sm tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-lg">edit</span>
            {t('common.edit')}
          </button>
          
          <button
            type="button"
            onClick={() => setShowConfirmDelete(true)}
            className="flex-1 h-[48px] rounded-full bg-error text-on-error font-body font-semibold text-sm tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-md"
          >
            <span className="material-symbols-outlined text-lg">delete</span>
            {t('common.delete')}
          </button>
        </div>
      </main>

      {/* Confirm Delete Modal Dialog */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 z-50 animate-fade-in">
          <div className="bg-surface-container-lowest rounded-2xl p-6 w-[calc(100%-32px)] max-w-[380px] min-w-[280px] space-y-4 shadow-xl border border-outline-variant/30">
            <h3 className="font-display text-lg font-bold text-on-surface">{t('common.delete')}</h3>
            <p className="font-body text-sm text-on-surface-variant">
              <strong>{med.name}</strong> ilacını silmek istediğinize emin misiniz? Bu işlem tedavi geçmişinizi etkileyebilir.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmDelete(false)}
                className="flex-1 h-[40px] rounded-full bg-surface-container-high text-on-surface-variant font-body font-semibold text-xs active:scale-95 transition-transform"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 h-[40px] rounded-full bg-error text-on-error font-body font-semibold text-xs active:scale-95 transition-transform shadow-sm"
              >
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
