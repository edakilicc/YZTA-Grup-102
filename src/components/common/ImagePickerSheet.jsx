import React from 'react';
import { useTranslation } from 'react-i18next';

export default function ImagePickerSheet({ isOpen, onClose, onCameraSelect, onGallerySelect }) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pb-6">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Sheet Content */}
      <div 
        className="relative bg-surface-container-lowest rounded-[28px] p-6 pb-8 shadow-2xl border border-outline-variant/20 animate-slide-up z-10 safe-area-bottom shrink-0"
        style={{ width: 'calc(100% - 32px)', maxWidth: '400px' }}
      >
        {/* Handle */}
        <div className="w-12 h-1 bg-outline-variant/60 rounded-full mx-auto mb-6" />

        <h3 className="font-display text-base font-bold text-on-surface mb-5 text-center">
          {t('ocr.select_image_source', 'Görsel Kaynağı Seç')}
        </h3>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Kamera ile Tara */}
          <button
            type="button"
            onClick={() => {
              onCameraSelect();
              onClose();
            }}
            className="flex flex-col items-center justify-center p-5 rounded-2xl bg-primary-container/10 border border-primary/10 hover:bg-primary-container/20 active:scale-95 transition-all text-primary font-body cursor-pointer"
          >
            <span className="material-symbols-outlined text-[36px] mb-2 text-primary" style={{ fontVariationSettings: "'FILL' 0" }}>photo_camera</span>
            <span className="text-xs sm:text-sm font-semibold text-center leading-tight">{t('ocr.camera_scan', 'Kamera ile Tara')}</span>
          </button>

          {/* Galeriden Seç */}
          <button
            type="button"
            onClick={() => {
              onGallerySelect();
              onClose();
            }}
            className="flex flex-col items-center justify-center p-5 rounded-2xl bg-secondary-container/15 border border-secondary/15 hover:bg-secondary-container/25 active:scale-95 transition-all text-secondary font-body cursor-pointer"
          >
            <span className="material-symbols-outlined text-[36px] mb-2 text-secondary" style={{ fontVariationSettings: "'FILL' 0" }}>photo_library</span>
            <span className="text-xs sm:text-sm font-semibold text-center leading-tight">{t('ocr.gallery_pick', 'Galeriden Seç')}</span>
          </button>
        </div>

        {/* İptal */}
        <button
          type="button"
          onClick={onClose}
          className="w-full h-12 rounded-full bg-surface-container-high text-on-surface-variant font-body font-semibold text-sm active:scale-95 transition-transform cursor-pointer"
        >
          {t('ocr.cancel', 'İptal')}
        </button>
      </div>
    </div>
  );
}
