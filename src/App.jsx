import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import MedicationsPage from './pages/MedicationsPage';
import AddMedicationPage from './pages/AddMedicationPage';
import MedicationDetailPage from './pages/MedicationDetailPage';
import ReportsPage from './pages/ReportsPage';
import ProfilePage from './pages/ProfilePage';
import ProtectedRoute from './components/common/ProtectedRoute';
import { useThemeStore } from './stores/themeStore';
import { useAuthStore } from './stores/authStore';
import { notificationService } from './services/notificationService';
import { useEffect } from 'react';
import './i18n';
import i18n from './i18n';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

function AppInitializer() {
  const navigate = useNavigate();
  const initTheme = useThemeStore((state) => state.initTheme);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  // Kullanıcı diliyle i18n senkronizasyonu
  useEffect(() => {
    if (user && user.language) {
      i18n.changeLanguage(user.language);
    }
  }, [user]);

  // Notification listener
  useEffect(() => {
    notificationService.addListeners((path) => {
      navigate(path);
    });
    return () => {
      notificationService.removeListeners();
    };
  }, [navigate]);

  // Android Back Button listener
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const backButtonListener = CapApp.addListener('backButton', ({ canGoBack }) => {
      const path = window.location.pathname;
      if (path === '/dashboard' || path === '/login' || path === '/' || path === '/medications' || path === '/reports' || path === '/profile') {
        CapApp.exitApp();
      } else if (canGoBack) {
        window.history.back();
      }
    });

    return () => {
      backButtonListener.then(l => l.remove());
    };
  }, []);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <AppInitializer />
      <Routes>
        {/* Login - standalone, no layout */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Main app pages with shared layout (Protected) */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/medications" element={<MedicationsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        {/* Sub-pages with their own headers (no shared layout) (Protected) */}
        <Route path="/add-medication" element={<ProtectedRoute><AddMedicationPage /></ProtectedRoute>} />
        <Route path="/medications/:id" element={<ProtectedRoute><MedicationDetailPage /></ProtectedRoute>} />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
