/**
 * PharmaGuard AI - Theme State Store (Zustand)
 * Bu store, açık/karanlık mod temasını ve kullanıcı tercihlerini yönetir.
 */

import { create } from 'zustand';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

const syncStatusBar = (isDark) => {
  if (Capacitor.isNativePlatform()) {
    try {
      StatusBar.setBackgroundColor({ color: isDark ? '#1C1B1F' : '#006A60' });
      StatusBar.setStyle({ style: Style.Dark });
    } catch (e) {
      console.error("Failed to sync StatusBar:", e);
    }
  }
};

export const useThemeStore = create((set, get) => ({
  isDark: false,

  /**
   * Temayı açık ve karanlık mod arasında değiştirir.
   */
  toggleTheme: () => {
    const newIsDark = !get().isDark;
    set({ isDark: newIsDark });
    localStorage.setItem('theme', newIsDark ? 'dark' : 'light');
    
    if (newIsDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    syncStatusBar(newIsDark);
  },

  /**
   * Sayfa ilk açıldığında localStorage'dan veya sistem tercihinden temayı yükler.
   */
  initTheme: () => {
    // Teşhis amaçlı açık modu zorla
    const shouldBeDark = false;
    
    set({ isDark: shouldBeDark });
    document.documentElement.classList.remove('dark');
    syncStatusBar(shouldBeDark);
  }
}));
