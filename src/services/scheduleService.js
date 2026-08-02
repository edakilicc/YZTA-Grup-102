/**
 * PharmaGuard AI - Medication Schedules and Dose Logs API Services
 * Bu dosya, günlük program takibi, doz loglama ve uyum analitiği isteklerini API'ye iletir.
 */

import api from './api';

export const scheduleService = {
  /**
   * Giriş yapmış kullanıcının bugünkü ilaç programını çeker.
   */
  getTodaySchedule: async () => {
    const response = await api.get('/schedules/today');
    return response.data;
  },

  /**
   * Belirtilen ilaç saati için doz durumunu (alındı/alınmadı) kaydeder.
   */
  toggleDoseLog: async (doseLogData) => {
    // doseLogData: { medication_id, log_date, scheduled_time, taken, notes? }
    const response = await api.post('/dose-logs', doseLogData);
    return response.data;
  },

  /**
   * Son 7 günlük uyum (adherence) grafiği verilerini getirir.
   */
  getWeeklyAdherence: async () => {
    const response = await api.get('/dose-logs/weekly');
    return response.data;
  },

  /**
   * Dashboard'da gösterilecek genel uyum, toplam ilaç ve stok uyarı istatistiklerini getirir.
   */
  getStats: async () => {
    const response = await api.get('/dose-logs/stats');
    return response.data;
  },

  /**
   * Backend'den PDF tedavi raporu oluşturur ve tarayıcıda dosya olarak indirir.
   */
  downloadPdfReport: async () => {
    const response = await api.get('/reports/pdf', {
      responseType: 'blob'
    });
    return response.data;
  },
};
