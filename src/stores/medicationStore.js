/**
 * PharmaGuard AI - Medication State Store (Zustand)
 * Bu store, aktif ilaç listesi ve tekil ilaç detayları ile CRUD durumunu yönetir.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { medicationService } from '../services/medicationService';
import { notificationService } from '../services/notificationService';

export const useMedicationStore = create(
  persist(
    (set) => ({
      medications: [],
      selectedMedication: null,
      isLoading: false,
      isInitialized: false,
      error: null,

  /**
   * Giriş yapmış kullanıcının tüm aktif ilaçlarını API'den çeker.
   */
  fetchAll: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await medicationService.getAll();
      set({ medications: data, isLoading: false, isInitialized: true });
      
      // Tüm ilaçlar için stok kontrolü yap
      if (data && Array.isArray(data)) {
        data.forEach(med => notificationService.checkStockAndNotify(med));
      }
    } catch (err) {
      set({
        error: err.response?.data?.detail || 'İlaçlar yüklenirken bir hata oluştu.',
        isLoading: false,
        isInitialized: true
      });
    }
  },

  /**
   * Belirtilen ID'ye sahip ilacı ve onun detaylarını API'den çeker.
   */
  fetchById: async (id) => {
    set({ isLoading: true, error: null, selectedMedication: null });
    try {
      const data = await medicationService.getById(id);
      set({ selectedMedication: data, isLoading: false });
      return data;
    } catch (err) {
      set({
        error: err.response?.data?.detail || 'İlaç detayı yüklenirken bir hata oluştu.',
        isLoading: false,
      });
      throw err;
    }
  },

  /**
   * Yeni bir ilaç ekler ve listeyi günceller.
   */
  add: async (medicationData) => {
    set({ isLoading: true, error: null });
    try {
      const newMed = await medicationService.create(medicationData);
      set((state) => ({
        medications: [...state.medications, newMed],
        isLoading: false,
      }));
      return newMed;
    } catch (err) {
      set({
        error: err.response?.data?.detail || 'İlaç kaydedilirken bir hata oluştu.',
        isLoading: false,
      });
      throw err;
    }
  },

  /**
   * Mevcut bir ilacı günceller.
   */
  update: async (id, medicationData) => {
    set({ isLoading: true, error: null });
    try {
      const updatedMed = await medicationService.update(id, medicationData);
      set((state) => ({
        medications: state.medications.map((m) => (m.id === id ? updatedMed : m)),
        selectedMedication: state.selectedMedication?.id === id ? updatedMed : state.selectedMedication,
        isLoading: false,
      }));
      
      // Stok kontrolü yap
      notificationService.checkStockAndNotify(updatedMed);
      
      return updatedMed;
    } catch (err) {
      set({
        error: err.response?.data?.detail || 'İlaç güncellenirken bir hata oluştu.',
        isLoading: false,
      });
      throw err;
    }
  },

  /**
   * İlacı siler ve listeden kaldırır.
   */
  remove: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await medicationService.remove(id);
      set((state) => ({
        medications: state.medications.filter((m) => m.id !== id),
        selectedMedication: state.selectedMedication?.id === id ? null : state.selectedMedication,
        isLoading: false,
      }));
    } catch (err) {
      set({
        error: err.response?.data?.detail || 'İlaç silinirken bir hata oluştu.',
        isLoading: false,
      });
      throw err;
    }
  },

  /**
   * Hata mesajını temizler.
   */
  clearError: () => set({ error: null }),
    }),
    {
      name: 'medication-store', // localStorage key
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ medications: state.medications }), // Sadece ilaçları kaydet
    }
  )
);
