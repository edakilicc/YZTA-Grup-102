/**
 * PharmaGuard AI - Medication Schedules and Dose Logs State Store (Zustand)
 * Bu store, günlük ilaç programı, doz alım durumları ve uyum istatistiklerini yönetir.
 */

import { create } from 'zustand';
import { scheduleService } from '../services/scheduleService';

export const useScheduleStore = create((set, get) => ({
  todaySchedule: [],
  weeklyAdherence: [],
  stats: {
    totalMedications: 0,
    todayDoses: 0,
    takenToday: 0,
    weeklyAdherenceRate: 0,
    stockAlertsCount: 0
  },
  isLoading: false,
  isInitialized: false,
  error: null,

  /**
   * Bugünkü ilaç programını çeker.
   */
  fetchToday: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await scheduleService.getTodaySchedule();
      // data format: { date, total_doses, taken_doses, adherence_rate, schedule: [...] }
      set({ 
        todaySchedule: data.schedule || [],
        stats: {
          ...get().stats,
          todayDoses: data.total_doses || 0,
          takenToday: data.taken_doses || 0,
        },
        isLoading: false,
        isInitialized: true
      });
    } catch (err) {
      set({
        error: err.response?.data?.detail || 'Günlük program yüklenirken bir hata oluştu.',
        isLoading: false,
        isInitialized: true
      });
    }
  },

  /**
   * Doz durumunu (alındı/alınmadı) değiştirir.
   * Arayüzün yavaşlamaması için 'Optimistic Update' yaklaşımı kullanılır.
   * State anında güncellenir, API isteği arka planda atılır. Hata durumunda state eski haline döndürülür.
   */
  toggleDose: async (medicationId, scheduledTime, taken) => {
    const originalSchedule = [...get().todaySchedule];
    const originalStats = { ...get().stats };
    const now = new Date();
    const todayStr = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-');

    // 1. Optimistic Update: State'i hemen güncelle
    const updatedSchedule = originalSchedule.map((item) => {
      if (item.medication_id === medicationId && item.scheduled_time === scheduledTime) {
        return {
          ...item,
          taken: taken,
          taken_at: taken ? new Date().toISOString() : null,
        };
      }
      return item;
    });

    const takenCountDiff = taken ? 1 : -1;
    const newTakenToday = Math.max(0, originalStats.takenToday + takenCountDiff);

    set({
      todaySchedule: updatedSchedule,
      stats: {
        ...originalStats,
        takenToday: newTakenToday,
      }
    });

    // 2. API İstediğinin Arka Planda Gönderilmesi
    try {
      await scheduleService.toggleDoseLog({
        medication_id: medicationId,
        log_date: todayStr,
        scheduled_time: scheduledTime,
        taken: taken,
        notes: ""
      });
      // API başarılı ise bir şey yapmaya gerek yok, state zaten güncel.
    } catch (err) {
      // 3. Hata Durumunda State'i Eski Haline Geri Döndür (Rollback)
      set({
        todaySchedule: originalSchedule,
        stats: originalStats,
        error: err.response?.data?.detail || 'Doz durumu kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.'
      });
    }
  },

  /**
   * Son 7 günlük uyum verilerini grafik için çeker.
   */
  fetchWeekly: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await scheduleService.getWeeklyAdherence();
      set({ weeklyAdherence: data, isLoading: false });
    } catch (err) {
      set({
        error: err.response?.data?.detail || 'Haftalık uyum analizi yüklenirken bir hata oluştu.',
        isLoading: false,
      });
    }
  },

  /**
   * Dashboard özet istatistiklerini çeker.
   */
  fetchStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await scheduleService.getStats();
      set({ stats: data, isLoading: false });
    } catch (err) {
      set({
        error: err.response?.data?.detail || 'İstatistikler yüklenirken bir hata oluştu.',
        isLoading: false,
      });
    }
  },

  /**
   * Hata mesajını temizler.
   */
  clearError: () => set({ error: null }),
}));
