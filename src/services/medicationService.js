/**
 * PharmaGuard AI - Medication API Services
 * Bu dosya, ilaç CRUD (Oluşturma, Okuma, Güncelleme, Silme) isteklerini API'ye iletir.
 */

import api from './api';

export const medicationService = {
  /**
   * Giriş yapmış kullanıcının tüm aktif ilaçlarını listeler.
   */
  getAll: async () => {
    const response = await api.get('/medications/');
    return response.data;
  },

  /**
   * Belirtilen ID'li ilacın detayını getirir.
   */
  getById: async (id) => {
    const response = await api.get(`/medications/${id}`);
    return response.data;
  },

  /**
   * Yeni bir ilaç kaydı oluşturur.
   */
  create: async (medicationData) => {
    const response = await api.post('/medications/', medicationData);
    return response.data;
  },

  /**
   * İlaç bilgilerini günceller.
   */
  update: async (id, medicationData) => {
    const response = await api.put(`/medications/${id}`, medicationData);
    return response.data;
  },

  /**
   * İlacı siler (Soft Delete).
   */
  remove: async (id) => {
    const response = await api.delete(`/medications/${id}`);
    return response.data;
  },
};
