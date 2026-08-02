/**
 * PharmaGuard AI - Authentication State Store (Zustand)
 * Bu store, kullanıcı oturum durumunu, JWT token yönetimini ve profil güncellemelerini yönetir.
 */

import { create } from 'zustand';
import { authService } from '../services/authService';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('access_token'),
  isLoading: false,
  error: null,

  /**
   * Kullanıcı giriş işlemini başlatır.
   * Başarılı olursa token'ı localStorage'a kaydeder ve state'i günceller.
   */
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authService.login(email, password);
      localStorage.setItem('access_token', data.access_token);
      set({
        user: data.user,
        token: data.access_token,
        isLoading: false,
        error: null,
      });
      return data;
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'Giriş işlemi başarısız oldu.';
      set({ error: errMsg, isLoading: false });
      throw err;
    }
  },

  /**
   * Yeni kullanıcı kaydı oluşturur. Otomatik olarak sisteme giriş yapılmasını sağlar.
   */
  register: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authService.register(userData);
      localStorage.setItem('access_token', data.access_token);
      set({
        user: data.user,
        token: data.access_token,
        isLoading: false,
        error: null,
      });
      return data;
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'Kayıt işlemi başarısız oldu.';
      set({ error: errMsg, isLoading: false });
      throw err;
    }
  },

  /**
   * Oturumu kapatır. State'i sıfırlar ve token'ı temizler.
   */
  logout: () => {
    localStorage.removeItem('access_token');
    set({ user: null, token: null, error: null });
  },

  /**
   * Mevcut token ile veritabanından güncel kullanıcı bilgilerini çeker.
   */
  fetchUser: async () => {
    // Eğer local'de token yoksa hiç istek atma
    if (!get().token) return;
    
    set({ isLoading: true, error: null });
    try {
      const user = await authService.getMe();
      set({ user, isLoading: false });
    } catch (err) {
      // Token geçersizleşmişse logout yap
      localStorage.removeItem('access_token');
      set({ user: null, token: null, isLoading: false });
    }
  },

  /**
   * Kullanıcı profil bilgilerini günceller.
   */
  updateProfile: async (profileData) => {
    set({ isLoading: true, error: null });
    try {
      const updatedUser = await authService.updateProfile(profileData);
      set({ user: updatedUser, isLoading: false, error: null });
      return updatedUser;
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'Profil güncelleme işlemi başarısız oldu.';
      set({ error: errMsg, isLoading: false });
      throw err;
    }
  },

  /**
   * Hata durumunu temizler.
   */
  clearError: () => set({ error: null }),
}));
