/**
 * PharmaGuard AI - Authentication API Services
 * Bu dosya, kullanıcı hesap yönetimi ve yetkilendirme isteklerini API'ye iletir.
 */

import api from './api';

export const authService = {
  /**
   * Yeni kullanıcı kaydı oluşturur.
   */
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  /**
   * E-posta ve şifreyle giriş yapar.
   */
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  /**
   * Giriş yapmış kullanıcının kendi profil bilgilerini getirir.
   */
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  /**
   * Kullanıcı profil bilgilerini günceller.
   */
  updateProfile: async (profileData) => {
    const response = await api.put('/auth/me', profileData);
    return response.data;
  },

  /**
   * Kullanıcının şifresini e-posta doğrulamasız sıfırlar (test/demo için).
   */
  resetPassword: async (email, new_password) => {
    const response = await api.post('/auth/reset-password', { email, new_password });
    return response.data;
  },
};
