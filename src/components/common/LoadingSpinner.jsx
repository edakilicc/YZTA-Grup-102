/**
 * PharmaGuard AI - Loading Spinner Component
 * Veri yükleme durumlarında arayüzde gösterilen Tailwind CSS tabanlı estetik spinner.
 */

import React from 'react';

export default function LoadingSpinner({ size = 'medium', fullPage = false }) {
  // Boyut sınıflarının belirlenmesi
  const sizeClasses = {
    small: 'w-5 h-5 border-2',
    medium: 'w-10 h-10 border-4',
    large: 'w-16 h-16 border-4',
  };

  const spinner = (
    <div
      className={`${sizeClasses[size] || sizeClasses.medium} border-primary/20 border-t-primary rounded-full animate-spin`}
      role="status"
    >
      <span className="sr-only">Yükleniyor...</span>
    </div>
  );

  // Tüm ekranı kaplayacak biçimde ortalanmış yükleme ekranı
  if (fullPage) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
        {spinner}
      </div>
    );
  }

  // Normal inline spinner
  return <div className="flex items-center justify-center p-5">{spinner}</div>;
}
