import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { authService } from '../services/authService';
import LoadingSpinner from '../components/common/LoadingSpinner';

const resetSchema = z.object({
  email: z.string().email({ message: "Geçerli bir e-posta adresi giriniz." }),
  new_password: z.string().min(6, { message: "Şifre en az 6 karakter olmalıdır." }),
  confirm_password: z.string().min(6, { message: "Şifre doğrulama en az 6 karakter olmalıdır." }),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Şifreler eşleşmiyor.",
  path: ["confirm_password"],
});

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError(null);
    try {
      await authService.resetPassword(data.email, data.new_password);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.detail || "Şifre sıfırlanırken bir hata oluştu. E-posta sistemde bulunmuyor olabilir.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center px-4 pt-12 pb-4 bg-background">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface hover:bg-surface-variant transition-colors"
        >
          <span className="material-symbols-outlined text-[24px]">arrow_back</span>
        </button>
      </div>

      <div className="flex flex-col items-center justify-center px-8 pb-6 text-on-surface">
        <div className="w-48 mb-4 flex items-center justify-center">
          <img src="/logo.png" alt="PharmaGuard AI Logo" className="w-full h-auto object-contain" />
        </div>
        <h1 className="font-display text-2xl font-bold mb-2 text-center text-primary">Şifremi Unuttum</h1>
        <p className="font-body text-base text-on-surface-variant text-center">
          Kayıtlı e-posta adresinizi ve yeni şifrenizi girerek şifrenizi sıfırlayabilirsiniz.
        </p>
      </div>

      {/* Form Section */}
      <div className="flex-1 flex flex-col px-6 pt-4 pb-10 bg-background relative z-10">
        
        {error && (
          <div className="mb-5 p-3 rounded-lg bg-error-container text-on-error-container text-sm font-body border border-error/20 flex items-center gap-2">
            <span className="material-symbols-outlined text-lg text-error">error</span>
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <span className="material-symbols-outlined text-6xl text-primary">check_circle</span>
            <p className="font-body text-lg text-center text-on-surface">
              Şifreniz başarıyla güncellendi! Giriş sayfasına yönlendiriliyorsunuz...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 flex-1 flex flex-col">
            <div className="flex flex-col gap-1">
              <label className="font-body text-sm font-semibold text-on-surface-variant tracking-wider" htmlFor="email">
                E-posta Adresi
              </label>
              <input
                id="email"
                type="email"
                placeholder="ornek@email.com"
                {...register("email")}
                className="h-[48px] px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface focus:ring-[3px] focus:ring-primary focus:border-primary transition-shadow font-body text-base w-full"
              />
              {errors.email && (
                <span className="text-xs text-error font-body mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">info</span>
                  {errors.email.message}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-body text-sm font-semibold text-on-surface-variant tracking-wider" htmlFor="new_password">
                Yeni Şifre
              </label>
              <input
                id="new_password"
                type="password"
                placeholder="••••••••"
                {...register("new_password")}
                className="h-[48px] px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface focus:ring-[3px] focus:ring-primary focus:border-primary transition-shadow font-body text-base w-full"
              />
              {errors.new_password && (
                <span className="text-xs text-error font-body mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">info</span>
                  {errors.new_password.message}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-body text-sm font-semibold text-on-surface-variant tracking-wider" htmlFor="confirm_password">
                Yeni Şifre (Tekrar)
              </label>
              <input
                id="confirm_password"
                type="password"
                placeholder="••••••••"
                {...register("confirm_password")}
                className="h-[48px] px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface focus:ring-[3px] focus:ring-primary focus:border-primary transition-shadow font-body text-base w-full"
              />
              {errors.confirm_password && (
                <span className="text-xs text-error font-body mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">info</span>
                  {errors.confirm_password.message}
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
                    <span className="material-symbols-outlined text-xl">lock_reset</span>
                    Şifreyi Sıfırla
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
