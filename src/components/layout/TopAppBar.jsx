import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { notificationService } from '../../services/notificationService';

export default function TopAppBar() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [avatarSrc, setAvatarSrc] = useState(null);

  // Kullanıcı değiştiğinde ya da store güncellendiğinde avatarı oku
  useEffect(() => {
    if (user?.avatar_url) {
      setAvatarSrc(user.avatar_url);
    } else if (user?.id) {
      const stored = localStorage.getItem(`avatar_${user.id}`);
      setAvatarSrc(stored || null);
    } else {
      setAvatarSrc(null);
    }
  }, [user, user?.avatar_url]);

  const handleNotifIconClick = async () => {
    if ('Notification' in window) {
      if (Notification.permission !== 'granted') {
        const perm = await notificationService.requestPermission();
        if (perm === 'granted') {
          new Notification('🔔 PharmaGuard AI', {
            body: 'Bildirimler başarıyla etkinleştirildi! / Notifications successfully enabled!',
            icon: '/favicon.ico'
          });
        } else {
          alert("Bildirim izni engellenmiş. Lütfen tarayıcı ayarlarından bildirimlere izin verin. / Notification permission denied. Please allow notifications in browser settings.");
        }
      } else {
        new Notification('🔔 PharmaGuard AI', {
          body: 'Bildirim sisteminiz aktif ve sorunsuz çalışıyor! / Notification system is active and working fine!',
          icon: '/favicon.ico'
        });
      }
    } else {
      alert("Bu tarayıcı bildirimleri desteklemiyor. / This browser does not support notifications.");
    }
  };

  return (
    <header className="w-full top-0 sticky bg-surface shadow-sm z-50 pt-[env(safe-area-inset-top,32px)]">
      <div className="flex justify-between items-center px-4 py-1 w-full h-[64px]">
        <div className="flex items-center gap-3">
          {/* Avatar: fotoğraf varsa göster, yoksa baş harf */}
          {avatarSrc ? (
            <img
              className="w-9 h-9 rounded-full object-cover border-2 border-primary/20 shadow-sm shrink-0"
              src={avatarSrc}
              alt={user?.first_name || 'Profil'}
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-sm border border-primary/20 shrink-0">
              {user?.first_name?.charAt(0)?.toUpperCase() || 'P'}
            </div>
          )}
          <h1 className="font-display text-xl text-primary font-semibold">PharmaGuard AI</h1>
        </div>
        <button
          onClick={handleNotifIconClick}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors active:scale-95 duration-200"
        >
          <span className="material-symbols-outlined text-primary text-xl">notifications</span>
        </button>
      </div>
    </header>
  );
}
