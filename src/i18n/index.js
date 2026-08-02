/**
 * PharmaGuard AI - Internationalization (i18n) Configuration
 * Bu dosya, react-i18next ile Türkçe ve İngilizce dil desteklerini yapılandırır.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import trTranslations from './locales/tr.json';
import enTranslations from './locales/en.json';

i18n
  // Dil algılama eklentisi
  .use(LanguageDetector)
  // react-i18next entegrasyonu
  .use(initReactI18next)
  // i18next ayarları
  .init({
    resources: {
      tr: {
        translation: trTranslations
      },
      en: {
        translation: enTranslations
      }
    },
    fallbackLng: 'tr',
    debug: false,
    
    // Dil algılama öncelik sırası ve ayarları
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng'
    },
    
    interpolation: {
      escapeValue: false // React zaten XSS korumalı olduğu için false
    }
  });

export default i18n;
