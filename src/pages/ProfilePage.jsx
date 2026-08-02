import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import { notificationService } from '../services/notificationService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

// Profil Güncelleme Validasyon Şeması
const profileSchema = z.object({
  first_name: z.string().min(1, { message: "Ad alanı zorunludur. / First name is required." }),
  last_name: z.string().min(1, { message: "Soyad alanı zorunludur. / Last name is required." }),
  age: z.preprocess((val) => Number(val), z.number().min(0).max(120)),
  gender: z.string().min(1),
  language: z.string().min(2),
});

export default function ProfilePage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user, fetchUser, updateProfile, logout, isLoading, error, clearError } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();

  // Avatar (profil fotoğrafı) state
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Sayfa yüklendiğinde güncel kullanıcı verisini çek
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Kullanıcı yüklenince localStorage'dan fotoğrafı oku
  useEffect(() => {
    if (user) {
      const stored = localStorage.getItem(`avatar_${user.id}`);
      if (stored) setAvatarPreview(stored);
    }
  }, [user]);

  // Profil fotoğrafı seçme/çekme
  const handleAvatarPick = async () => {
    try {
      setAvatarLoading(true);
      if (Capacitor.isNativePlatform()) {
        // Native: Kamera veya galeri
        const image = await Camera.getPhoto({
          quality: 85,
          allowEditing: true,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Prompt,
          promptLabelHeader: 'Profil Fotoğrafı',
          promptLabelPhoto: 'Galeriden Seç',
          promptLabelPicture: 'Fotoğraf Çek',
        });
        saveAvatar(image.dataUrl);
      } else {
        // Web: dosya seçici
        fileInputRef.current?.click();
      }
    } catch (e) {
      // kullanıcı iptal etti
    } finally {
      setAvatarLoading(false);
    }
  };

  // Web dosya seçici değiştiğinde
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => saveAvatar(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Fotoğrafı kaydet: localStorage + store
  const saveAvatar = (dataUrl) => {
    if (!user) return;
    localStorage.setItem(`avatar_${user.id}`, dataUrl);
    setAvatarPreview(dataUrl);
    // authStore'daki user nesnesini de güncelle (TopAppBar anında görsün)
    useAuthStore.setState((s) => ({
      user: s.user ? { ...s.user, avatar_url: dataUrl } : s.user,
    }));
  };

  // Notification Preferences States
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [reminderNotif, setReminderNotif] = useState(true);

  const handlePushToggle = async (checked) => {
    if (checked) {
      const permissionGranted = await notificationService.requestPermission();
      if (permissionGranted) {
        setPushNotif(true);
      } else {
        setPushNotif(false);
        alert(t('profile.notification_permission_desc', 'Bildirim izni engellenmiş. Lütfen telefon ayarlardan bildirimlere izin verin.'));
      }
    } else {
      if (Capacitor.isNativePlatform()) {
        notificationService.rescheduleAll([]);
      } else {
        notificationService.cancelAllWebNotifications();
      }
      setPushNotif(false);
    }
  };

  // Form Yöneticisi
  const {
    register,
    handleSubmit,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(profileSchema),
  });

  // Kullanıcı bilgileri geldikçe formu doldur
  useEffect(() => {
    if (user) {
      setValue('first_name', user.first_name);
      setValue('last_name', user.last_name);
      setValue('age', user.age || 30);
      setValue('gender', user.gender || 'other');
      setValue('language', user.language || 'tr');

      if (user.notification_preferences) {
        setEmailNotif(!!user.notification_preferences.email);
        setPushNotif(!!user.notification_preferences.push);
        setReminderNotif(!!user.notification_preferences.reminder);
      }
    }
    clearErrors();
    clearError();
  }, [user, setValue, clearErrors, clearError]);

  const onSubmit = async (data) => {
    try {
      await updateProfile({
        first_name: data.first_name,
        last_name: data.last_name,
        age: Number(data.age),
        gender: data.gender,
        chronic_conditions: user.chronic_conditions || [],
        notification_preferences: {
          email: emailNotif,
          push: pushNotif,
          reminder: reminderNotif
        },
        language: data.language
      });
      // i18n dilini güncelle
      i18n.changeLanguage(data.language);
      alert(t('profile.saveSuccess'));
    } catch (err) {
      // Hata store'da set ediliyor
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (isLoading && !user) {
    return <LoadingSpinner fullPage />;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="font-display text-2xl font-bold text-on-surface">{t('profile.title')}</h2>
        <p className="font-body text-sm text-on-surface-variant mt-1">{t('profile.subtitle')}</p>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="p-3 rounded-lg bg-error-container text-on-error-container text-xs font-body border border-error/20 flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-error">error</span>
          <span>{error}</span>
        </div>
      )}

      {user && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Kişisel Bilgiler Kartı */}
          <div className="bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.08)] p-5 space-y-4">
            <h3 className="font-display text-base font-bold text-on-surface border-b border-outline-variant/30 pb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">person</span>
              {t('profile.personalInfo')}
            </h3>

            {/* Profil Fotoğrafı */}
            <div className="flex flex-col items-center gap-3 py-2">
              {/* Gizli dosya input (web için) */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              {/* Avatar dairesel alan */}
              <div className="relative">
                <button
                  type="button"
                  onClick={handleAvatarPick}
                  disabled={avatarLoading}
                  className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary/20 shadow-lg relative group focus:outline-none active:scale-95 transition-transform"
                  aria-label="Profil fotoğrafı değiştir"
                >
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Profil fotoğrafı"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                      <span className="font-display text-4xl font-bold text-primary">
                        {user?.first_name?.charAt(0).toUpperCase() || 'P'}
                      </span>
                    </div>
                  )}
                  {/* Hover/tap overlay */}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity rounded-full">
                    {avatarLoading ? (
                      <span className="material-symbols-outlined text-white text-2xl animate-spin">progress_activity</span>
                    ) : (
                      <span className="material-symbols-outlined text-white text-2xl">photo_camera</span>
                    )}
                  </div>
                </button>

                {/* Küçük kamera badge */}
                <button
                  type="button"
                  onClick={handleAvatarPick}
                  disabled={avatarLoading}
                  className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md border-2 border-surface-container-lowest active:scale-95 transition-transform"
                  aria-label="Fotoğraf yükle"
                >
                  <span className="material-symbols-outlined text-sm" style={{ fontSize: '16px' }}>edit</span>
                </button>
              </div>

              <p className="font-body text-xs text-on-surface-variant">
                Fotoğrafı değiştirmek için üstüne dokun
              </p>
            </div>

            {/* Ad & Soyad */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="font-body text-xs font-semibold text-on-surface-variant" htmlFor="first_name">
                  {t('auth.firstName')}
                </label>
                <input
                  id="first_name"
                  type="text"
                  {...register("first_name")}
                  className="h-[44px] px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface focus:ring-2 focus:ring-primary focus:border-primary transition-shadow font-body text-sm w-full"
                />
                {errors.first_name && (
                  <span className="text-xs text-error font-body mt-1">{errors.first_name.message}</span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-body text-xs font-semibold text-on-surface-variant" htmlFor="last_name">
                  {t('auth.lastName')}
                </label>
                <input
                  id="last_name"
                  type="text"
                  {...register("last_name")}
                  className="h-[44px] px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface focus:ring-2 focus:ring-primary focus:border-primary transition-shadow font-body text-sm w-full"
                />
                {errors.last_name && (
                  <span className="text-xs text-error font-body mt-1">{errors.last_name.message}</span>
                )}
              </div>
            </div>

            {/* Yaş & Cinsiyet */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="font-body text-xs font-semibold text-on-surface-variant" htmlFor="age">
                  {t('auth.age')}
                </label>
                <input
                  id="age"
                  type="number"
                  {...register("age")}
                  className="h-[44px] px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface focus:ring-2 focus:ring-primary focus:border-primary transition-shadow font-body text-sm w-full"
                />
                {errors.age && (
                  <span className="text-xs text-error font-body mt-1">{errors.age.message}</span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-body text-xs font-semibold text-on-surface-variant" htmlFor="gender">
                  {t('auth.gender')}
                </label>
                <select
                  id="gender"
                  {...register("gender")}
                  className="h-[44px] px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface focus:ring-2 focus:ring-primary focus:border-primary transition-shadow font-body text-sm w-full"
                >
                  <option value="male">{t('auth.male')}</option>
                  <option value="female">{t('auth.female')}</option>
                  <option value="other">{t('auth.other')}</option>
                </select>
              </div>
            </div>

            {/* Dil Tercihi */}
            <div className="flex flex-col gap-1">
              <label className="font-body text-xs font-semibold text-on-surface-variant" htmlFor="language">
                {t('profile.language')}
              </label>
              <select
                id="language"
                {...register("language")}
                className="h-[44px] px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface focus:ring-2 focus:ring-primary focus:border-primary transition-shadow font-body text-sm w-full"
              >
                <option value="tr">Türkçe</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          {/* Bildirim Tercihleri Kartı */}
          <div className="bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.08)] p-5 space-y-4">
            <h3 className="font-display text-base font-bold text-on-surface border-b border-outline-variant/30 pb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">notifications</span>
              {t('profile.notifications')}
            </h3>

            <div className="flex items-center justify-between">
              <div>
                <span className="font-body text-sm font-semibold text-on-surface">{t('profile.emailNotif')}</span>
                <p className="font-body text-[11px] text-on-surface-variant">{t('profile.emailNotifDesc')}</p>
              </div>
              <input
                type="checkbox"
                checked={emailNotif}
                onChange={(e) => setEmailNotif(e.target.checked)}
                className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="font-body text-sm font-semibold text-on-surface">{t('profile.pushNotif')}</span>
                <p className="font-body text-[11px] text-on-surface-variant">{t('profile.pushNotifDesc')}</p>
              </div>
              <input
                type="checkbox"
                checked={pushNotif}
                onChange={(e) => handlePushToggle(e.target.checked)}
                className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="font-body text-sm font-semibold text-on-surface">{t('profile.stockAlerts')}</span>
                <p className="font-body text-[11px] text-on-surface-variant">{t('profile.stockAlertsDesc')}</p>
              </div>
              <input
                type="checkbox"
                checked={reminderNotif}
                onChange={(e) => setReminderNotif(e.target.checked)}
                className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer"
              />
            </div>
          </div>

          <hr className="border-outline-variant/30 my-4" />

          {/* Görünüm Tercihleri */}
          <div className="space-y-3">
            <h4 className="font-display text-base font-bold text-on-surface">{t('profile.appearance')}</h4>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-on-surface-variant text-xl">
                  {isDark ? 'dark_mode' : 'light_mode'}
                </span>
                <div>
                  <span className="font-body text-sm font-semibold text-on-surface">{t('profile.darkMode')}</span>
                  <p className="font-body text-[11px] text-on-surface-variant">{t('profile.darkModeDesc')}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isDark ? 'bg-primary' : 'bg-outline-variant/50'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isDark ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 space-y-3">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-[48px] bg-primary text-on-primary rounded-full font-body font-semibold text-sm tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all duration-200 shadow-md disabled:opacity-75 disabled:pointer-events-none"
            >
              {isLoading ? (
                <LoadingSpinner size="small" />
              ) : (
                <>
                  <span className="material-symbols-outlined text-xl">save</span>
                  {t('profile.saveChanges')}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full h-[48px] border-2 border-error text-error bg-surface-container-lowest hover:bg-error-container/10 rounded-full font-body font-semibold text-sm tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all duration-200"
            >
              <span className="material-symbols-outlined text-xl">logout</span>
              {t('profile.logout')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
