import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import LoadingSpinner from '../components/common/LoadingSpinner';

// Giriş Formu Validasyon Şeması
const loginSchema = z.object({
  email: z.string().email({ message: "Geçerli bir e-posta adresi giriniz. / Please enter a valid email." }),
  password: z.string().min(6, { message: "Şifre en az 6 karakter olmalıdır. / Password must be at least 6 characters." }),
});

// Kayıt Formu Validasyon Şeması
const registerSchema = z.object({
  email: z.string().email({ message: "Geçerli bir e-posta adresi giriniz. / Please enter a valid email." }),
  password: z.string().min(6, { message: "Şifre en az 6 karakter olmalıdır. / Password must be at least 6 characters." }),
  first_name: z.string().min(1, { message: "Ad alanı zorunludur. / First name is required." }),
  last_name: z.string().min(1, { message: "Soyad alanı zorunludur. / Last name is required." }),
  age: z.preprocess((val) => Number(val), z.number().min(1, { message: "Geçerli bir yaş giriniz. / Please enter a valid age." }).max(120, { message: "Geçersiz yaş. / Invalid age." })),
  gender: z.enum(["male", "female", "other"], { message: "Cinsiyet seçimi zorunludur. / Gender is required." }),
});

export default function LoginPage() {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const { t } = useTranslation();
  
  const { login, register: registerUser, isLoading, error, clearError, token } = useAuthStore();

  // Eğer kullanıcı zaten giriş yapmışsa dashboard'a yönlendir
  useEffect(() => {
    if (token) {
      navigate('/dashboard');
    }
  }, [token, navigate]);

  // Mode değiştiğinde hataları temizle
  useEffect(() => {
    clearError();
  }, [isRegister, clearError]);

  // Giriş Formu Yönetimi
  const {
    register: loginRegister,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  // Kayıt Formu Yönetimi
  const {
    register: regRegister,
    handleSubmit: handleRegisterSubmit,
    formState: { errors: regErrors },
  } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const onLoginSubmit = async (data) => {
    try {
      await login(data.email, data.password);
      navigate('/dashboard');
    } catch (err) {
      // Hata store'da set ediliyor
    }
  };

  const onRegisterSubmit = async (data) => {
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        first_name: data.first_name,
        last_name: data.last_name,
        age: data.age,
        gender: data.gender,
        chronic_conditions: [],
        notification_preferences: { email: true, push: true, reminder: true },
        language: "tr"
      });
      navigate('/dashboard');
    } catch (err) {
      // Hata store'da set ediliyor
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Branding Header */}
      <div className="bg-background flex flex-col items-center justify-center px-8 pt-16 pb-6 text-on-surface">
        <div className="w-56 mb-4 flex items-center justify-center">
          <img src="/logo.png" alt="PharmaGuard AI Logo" className="w-full h-auto object-contain" />
        </div>
        <p className="font-body text-base text-on-surface-variant text-center">
          {isRegister ? t('auth.register') : t('auth.login')}
        </p>
      </div>

      {/* Form Section */}
      <div className="flex-1 flex flex-col px-6 pt-4 pb-10 bg-background relative z-10">
        
        {/* Tabs for Login / Register */}
        <div className="flex border-b border-outline-variant mb-6">
          <button
            type="button"
            onClick={() => setIsRegister(false)}
            className={`flex-1 pb-3 font-display text-lg font-bold text-center border-b-2 transition-all ${
              !isRegister ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant'
            }`}
          >
            {t('auth.login')}
          </button>
          <button
            type="button"
            onClick={() => setIsRegister(true)}
            className={`flex-1 pb-3 font-display text-lg font-bold text-center border-b-2 transition-all ${
              isRegister ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant'
            }`}
          >
            {t('auth.register')}
          </button>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mb-5 p-3 rounded-lg bg-error-container text-on-error-container text-sm font-body border border-error/20 flex items-center gap-2">
            <span className="material-symbols-outlined text-lg text-error">error</span>
            <span>{error}</span>
          </div>
        )}

        {!isRegister ? (
          /* GİRİŞ YAP FORMU */
          <form onSubmit={handleLoginSubmit(onLoginSubmit)} className="space-y-5 flex-1 flex flex-col">
            <div className="flex flex-col gap-1">
              <label className="font-body text-sm font-semibold text-on-surface-variant tracking-wider" htmlFor="email">
                {t('auth.email')}
              </label>
              <input
                id="email"
                type="email"
                placeholder="ornek@email.com"
                {...loginRegister("email")}
                className="h-[48px] px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface focus:ring-[3px] focus:ring-primary focus:border-primary transition-shadow font-body text-base w-full"
              />
              {loginErrors.email && (
                <span className="text-xs text-error font-body mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">info</span>
                  {loginErrors.email.message}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-body text-sm font-semibold text-on-surface-variant tracking-wider" htmlFor="password">
                {t('auth.password')}
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                {...loginRegister("password")}
                className="h-[48px] px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface focus:ring-[3px] focus:ring-primary focus:border-primary transition-shadow font-body text-base w-full"
              />
              {loginErrors.password && (
                <span className="text-xs text-error font-body mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">info</span>
                  {loginErrors.password.message}
                </span>
              )}
            </div>

            <div className="flex justify-between items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" />
                <span className="font-body text-sm text-on-surface-variant">{t('auth.rememberMe')}</span>
              </label>
              <button 
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-primary text-sm font-medium font-body hover:underline bg-transparent border-none p-0 cursor-pointer"
              >
                {t('auth.forgotPassword')}
              </button>
            </div>

            <div className="mt-auto pt-4 space-y-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-[52px] bg-primary text-on-primary rounded-full font-body font-semibold text-base tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all duration-200 hover:bg-primary-container hover:text-on-primary-container shadow-md disabled:opacity-75 disabled:pointer-events-none"
              >
                {isLoading ? (
                  <LoadingSpinner size="small" />
                ) : (
                  <>
                    <span className="material-symbols-outlined text-xl">login</span>
                    {t('auth.login')}
                  </>
                )}
              </button>

              <div className="flex items-center gap-4">
                <hr className="flex-1 border-outline-variant" />
                <span className="text-on-surface-variant text-sm font-body">veya</span>
                <hr className="flex-1 border-outline-variant" />
              </div>

              <p className="text-center font-body text-on-surface-variant">
                {t('auth.noAccount')}{' '}
                <button
                  type="button"
                  onClick={() => setIsRegister(true)}
                  className="text-primary font-semibold hover:underline"
                >
                  {t('auth.register')}
                </button>
              </p>
            </div>
          </form>
        ) : (
          /* KAYIT OL FORMU */
          <form onSubmit={handleRegisterSubmit(onRegisterSubmit)} className="space-y-4 flex-1 flex flex-col">
            <div className="flex gap-4">
              <div className="flex-1 flex flex-col gap-1">
                <label className="font-body text-sm font-semibold text-on-surface-variant tracking-wider" htmlFor="first_name">
                  {t('auth.firstName')}
                </label>
                <input
                  id="first_name"
                  type="text"
                  placeholder="Eylül"
                  {...regRegister("first_name")}
                  className="h-[48px] px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface focus:ring-[3px] focus:ring-primary focus:border-primary transition-shadow font-body text-base w-full"
                />
                {regErrors.first_name && (
                  <span className="text-xs text-error font-body mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">info</span>
                    {regErrors.first_name.message}
                  </span>
                )}
              </div>

              <div className="flex-1 flex flex-col gap-1">
                <label className="font-body text-sm font-semibold text-on-surface-variant tracking-wider" htmlFor="last_name">
                  {t('auth.lastName')}
                </label>
                <input
                  id="last_name"
                  type="text"
                  placeholder="Kalfa"
                  {...regRegister("last_name")}
                  className="h-[48px] px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface focus:ring-[3px] focus:ring-primary focus:border-primary transition-shadow font-body text-base w-full"
                />
                {regErrors.last_name && (
                  <span className="text-xs text-error font-body mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">info</span>
                    {regErrors.last_name.message}
                  </span>
                )}
              </div>
            </div>

            {/* Yaş ve Cinsiyet Bilgileri */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="font-body text-sm font-semibold text-on-surface-variant tracking-wider" htmlFor="age">
                  {t('auth.age')}
                </label>
                <input
                  id="age"
                  type="number"
                  placeholder="30"
                  defaultValue="30"
                  {...regRegister("age")}
                  className="h-[48px] px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface focus:ring-[3px] focus:ring-primary focus:border-primary transition-shadow font-body text-base w-full"
                />
                {regErrors.age && (
                  <span className="text-xs text-error font-body mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">info</span>
                    {regErrors.age.message}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-body text-sm font-semibold text-on-surface-variant tracking-wider" htmlFor="gender">
                  {t('auth.gender')}
                </label>
                <select
                  id="gender"
                  defaultValue="other"
                  {...regRegister("gender")}
                  className="h-[48px] px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface focus:ring-[3px] focus:ring-primary focus:border-primary transition-shadow font-body text-base w-full"
                >
                  <option value="male">{t('auth.male')}</option>
                  <option value="female">{t('auth.female')}</option>
                  <option value="other">{t('auth.other')}</option>
                </select>
                {regErrors.gender && (
                  <span className="text-xs text-error font-body mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">info</span>
                    {regErrors.gender.message}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-body text-sm font-semibold text-on-surface-variant tracking-wider" htmlFor="reg_email">
                {t('auth.email')}
              </label>
              <input
                id="reg_email"
                type="email"
                placeholder="ornek@email.com"
                {...regRegister("email")}
                className="h-[48px] px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface focus:ring-[3px] focus:ring-primary focus:border-primary transition-shadow font-body text-base w-full"
              />
              {regErrors.email && (
                <span className="text-xs text-error font-body mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">info</span>
                  {regErrors.email.message}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-body text-sm font-semibold text-on-surface-variant tracking-wider" htmlFor="reg_password">
                {t('auth.password')}
              </label>
              <input
                id="reg_password"
                type="password"
                placeholder="En az 6 karakter"
                {...regRegister("password")}
                className="h-[48px] px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface focus:ring-[3px] focus:ring-primary focus:border-primary transition-shadow font-body text-base w-full"
              />
              {regErrors.password && (
                <span className="text-xs text-error font-body mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">info</span>
                  {regErrors.password.message}
                </span>
              )}
            </div>

            <div className="mt-auto pt-4 space-y-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-[52px] bg-primary text-on-primary rounded-full font-body font-semibold text-base tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all duration-200 hover:bg-primary-container hover:text-on-primary-container shadow-md disabled:opacity-75 disabled:pointer-events-none"
              >
                {isLoading ? (
                  <LoadingSpinner size="small" />
                ) : (
                  <>
                    <span className="material-symbols-outlined text-xl">person_add</span>
                    {t('auth.register')}
                  </>
                )}
              </button>

              <div className="flex items-center gap-4">
                <hr className="flex-1 border-outline-variant" />
                <span className="text-on-surface-variant text-sm font-body">veya</span>
                <hr className="flex-1 border-outline-variant" />
              </div>

              <p className="text-center font-body text-on-surface-variant">
                {t('auth.hasAccount')}{' '}
                <button
                  type="button"
                  onClick={() => setIsRegister(false)}
                  className="text-primary font-semibold hover:underline"
                >
                  {t('auth.login')}
                </button>
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
