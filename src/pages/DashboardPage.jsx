import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { useScheduleStore } from '../stores/scheduleStore';
import { useMedicationStore } from '../stores/medicationStore';
import { notificationService } from '../services/notificationService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { 
    todaySchedule, 
    stats, 
    isLoading, 
    error,
    fetchToday, 
    fetchStats,
    toggleDose,
    isInitialized
  } = useScheduleStore();
  const { medications, fetchAll: fetchAllMeds, update: updateMedication } = useMedicationStore();

  const [showPermissionBanner, setShowPermissionBanner] = useState(false);

  // İlk yüklemede ve store state'i boşsa bugünkü programı ve istatistikleri API'den çek
  useEffect(() => {
    fetchToday();
    fetchStats();
    fetchAllMeds();
  }, [fetchToday, fetchStats, fetchAllMeds]);

  // Bildirim planlama ve izin banner'ı yönetimi
  useEffect(() => {
    const checkNotificationPermission = async () => {
      const hasPermission = await notificationService.checkPermission();
      const bannerShown = localStorage.getItem('permission_banner_shown');
      if (!hasPermission && !bannerShown) {
        setShowPermissionBanner(true);
      } else if (hasPermission && medications.length > 0) {
        notificationService.rescheduleAll(medications);
      }
    };
    checkNotificationPermission();
  }, [medications]);

  const handleAllowNotifications = async () => {
    const permission = await notificationService.requestPermission();
    localStorage.setItem('permission_banner_shown', 'true');
    setShowPermissionBanner(false);
    if (permission && medications.length > 0) {
      notificationService.rescheduleAll(medications);
    }
  };

  const handleDismissBanner = () => {
    localStorage.setItem('permission_banner_shown', 'true');
    setShowPermissionBanner(false);
  };

  // Cinsiyete göre dinamik hitap belirleme
  const getHonorific = () => {
    if (!user) return '';
    if (user.gender === 'male') return t('dashboard.greetingSuffixMale');
    if (user.gender === 'female') return t('dashboard.greetingSuffixFemale');
    return '';
  };

  // Günlük uyum yüzdesi hesaplama (sıfıra bölünme hatasına karşı korumalı)
  const adherencePercentage = stats.todayDoses > 0 
    ? Math.round((stats.takenToday / stats.todayDoses) * 100) 
    : 0;

  // İlacın checkboxes durumunu değiştirme
  const handleDoseToggle = async (item) => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } catch (e) {
        console.error(e);
      }
    }
    
    const willTake = !item.taken;
    toggleDose(item.medication_id, item.scheduled_time, willTake);
    
    // Eğer ilaç "alındı" olarak işaretleniyorsa stoku 1 düşür
    if (willTake) {
      const med = medications.find(m => m.id === item.medication_id);
      if (med && med.stock_count > 0) {
        // Optimistic ve background stok güncellemesi
        updateMedication(med.id, { stock_count: med.stock_count - 1 }).catch(() => {});
      }
    }
  };

  if (isLoading && !isInitialized) {
    return <LoadingSpinner fullPage />;
  }

  const honorific = getHonorific();

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <section>
        <h2 className="font-display text-2xl font-bold text-on-surface mb-1">
          {t('dashboard.greeting')} {user?.first_name}{honorific ? ` ${honorific}` : ''}!
        </h2>
        <p className="font-body text-sm text-on-surface-variant">
          {t('dashboard.subGreeting')}
        </p>
      </section>

      {/* İzin İsteme Banner'ı */}
      {showPermissionBanner && (
        <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-lg">notifications</span>
            </div>
            <div className="min-w-0">
              <h4 className="font-display text-sm font-bold text-on-surface">Bildirimleri Etkinleştirin</h4>
              <p className="font-body text-[11px] text-on-surface-variant">İlaç saatleriniz yaklaştığında tarayıcı üzerinden hatırlatıcı bildirimler alın.</p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={handleDismissBanner}
              className="flex-grow sm:flex-grow-0 px-4 h-9 bg-surface-container-high text-on-surface-variant rounded-full font-body font-semibold text-xs active:scale-95 transition-transform"
            >
              Şimdi Değil
            </button>
            <button
              type="button"
              onClick={handleAllowNotifications}
              className="flex-grow sm:flex-grow-0 px-4 h-9 bg-primary text-on-primary rounded-full font-body font-semibold text-xs active:scale-95 transition-transform shadow-sm"
            >
              İzin Ver
            </button>
          </div>
        </div>
      )}

      {/* Global Error Banner */}
      {error && (
        <div className="p-3 rounded-lg bg-error-container text-on-error-container text-xs font-body border border-error/20 flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-error">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Daily Adherence Circle */}
      <div className="bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.08)] p-5 flex flex-col items-center">
        <h3 className="font-display text-lg font-semibold text-on-surface mb-3 text-center">{t('dashboard.adherence')}</h3>
        <div className="relative w-36 h-36">
          <svg className="circular-chart text-secondary" viewBox="0 0 36 36">
            <path
              className="circle-bg"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="circle stroke-current"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              strokeDasharray={`${adherencePercentage}, 100`}
            />
            <text className="percentage" x="18" y="17">
              %{adherencePercentage}
            </text>
            <text className="status-text" x="18" y="25">
              {stats.takenToday}/{stats.todayDoses} {t('dashboard.doseUnit')}
            </text>
          </svg>
        </div>
      </div>

      {/* Stats Summary (2x2 Grid) */}
      <section className="grid grid-cols-2 gap-4">
        {/* Total Medications */}
        <div className="bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.08)] p-4 flex flex-col justify-between h-28">
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined text-primary text-2xl">pill</span>
            <span className="font-display text-2xl font-bold text-on-surface">{stats.totalMedications || 0}</span>
          </div>
          <div>
            <h4 className="font-display text-sm font-semibold text-on-surface">{t('medications.title')}</h4>
            <p className="font-body text-xs text-on-surface-variant">{t('dashboard.activeMedSubtitle')}</p>
          </div>
        </div>

        {/* Today's Doses */}
        <div className="bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.08)] p-4 flex flex-col justify-between h-28">
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined text-secondary text-2xl">event_note</span>
            <span className="font-display text-2xl font-bold text-on-surface">{stats.todayDoses}</span>
          </div>
          <div>
            <h4 className="font-display text-sm font-semibold text-on-surface">{t('dashboard.todayDoseTitle')}</h4>
            <p className="font-body text-xs text-on-surface-variant">{t('dashboard.todayDoseSubtitle')}</p>
          </div>
        </div>

        {/* Weekly Adherence Rate */}
        <div className="bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.08)] p-4 flex flex-col justify-between h-28">
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined text-tertiary text-2xl">monitoring</span>
            <span className="font-display text-2xl font-bold text-on-surface">%{stats.weeklyAdherenceRate || 0}</span>
          </div>
          <div>
            <h4 className="font-display text-sm font-semibold text-on-surface">{t('dashboard.adherence')}</h4>
            <p className="font-body text-xs text-on-surface-variant">{t('dashboard.weeklyAdherenceSubtitle')}</p>
          </div>
        </div>

        {/* Stock Warnings */}
        <div className="bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.08)] p-4 flex flex-col justify-between h-28">
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined text-error text-2xl">inventory_2</span>
            <span className="font-display text-2xl font-bold text-on-surface">{stats.stockAlertsCount || 0}</span>
          </div>
          <div>
            <h4 className="font-display text-sm font-semibold text-on-surface">{t('profile.stockAlerts')}</h4>
            <p className="font-body text-xs text-on-surface-variant">{t('dashboard.stockWarningSubtitle')}</p>
          </div>
        </div>
      </section>

      {/* Today's Schedule */}
      <section className="space-y-3">
        <h3 className="font-display text-lg font-semibold text-on-surface">{t('dashboard.dailyProgram')}</h3>
        <div className="space-y-2">
          {todaySchedule.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.08)] p-5 text-center text-on-surface-variant font-body text-sm">
              {t('dashboard.noMedications')}
            </div>
          ) : (
            todaySchedule.map((item, index) => (
              <div
                key={`${item.medication_id}-${item.scheduled_time}-${index}`}
                onClick={() => handleDoseToggle(item)}
                className={`bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.08)] p-4 flex items-center justify-between border-l-4 transition-all duration-200 cursor-pointer ${
                  item.taken ? 'border-secondary opacity-80' : 'border-primary'
                }`}
              >
                <div className="flex items-center gap-4">
                  {item.medication_image ? (
                    <img
                      src={item.medication_image}
                      alt={item.medication_name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-surface-container shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary-container text-primary flex items-center justify-center font-display font-bold shrink-0">
                      {item.medication_name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h4 className="font-display text-base font-semibold text-on-surface">
                      {item.medication_name}
                    </h4>
                    <p className="font-body text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
                      <span className="material-symbols-outlined text-xs">schedule</span>
                      {t('dashboard.hour')}: {item.scheduled_time} {item.taken && item.taken_at && `· ${t('dashboard.takenAt')}: ${new Date(item.taken_at).toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {item.taken ? (
                    <div className="bg-secondary text-on-secondary rounded-full w-8 h-8 flex items-center justify-center">
                      <span className="material-symbols-outlined text-lg">check</span>
                    </div>
                  ) : (
                    <div className="bg-surface-variant text-on-surface-variant rounded-full w-8 h-8 flex items-center justify-center">
                      <span className="material-symbols-outlined text-lg">schedule</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Quick Actions */}
      <div className="space-y-3">
        <Link
          to="/add-medication"
          className="w-full h-[48px] rounded-full bg-primary text-on-primary font-body font-semibold text-sm tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all duration-200 shadow-sm"
        >
          <span className="material-symbols-outlined text-xl">add_circle</span>
          {t('dashboard.addMedication')}
        </Link>
        <div className="flex gap-3">
          <Link
            to="/add-medication?scan=true"
            className="flex-1 h-[44px] rounded-full border-2 border-primary text-primary font-body font-semibold text-xs tracking-wider flex items-center justify-center gap-1 active:scale-95 transition-all duration-200"
          >
            <span className="material-symbols-outlined text-lg">document_scanner</span>
            {t('dashboard.scanPrescription')}
          </Link>
          <Link
            to="/reports"
            className="flex-1 h-[44px] rounded-full border-2 border-primary text-primary font-body font-semibold text-xs tracking-wider flex items-center justify-center gap-1 active:scale-95 transition-all duration-200"
          >
            <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
            {t('reports.reportButton')}
          </Link>
        </div>
      </div>
    </div>
  );
}
