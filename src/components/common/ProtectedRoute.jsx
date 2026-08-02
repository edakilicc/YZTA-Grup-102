/**
 * PharmaGuard AI - Protected Route Component
 * Bu bileşen, JWT token'ı olmayan kullanıcıların korumalı sayfalara erişmesini engeller
 * ve onları otomatik olarak giriş sayfasına yönlendirir.
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export default function ProtectedRoute({ children }) {
  const token = useAuthStore((state) => state.token);

  // Eğer local'de veya store'da token yoksa kullanıcıyı login sayfasına yönlendir
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Token varsa korumalı içeriği göster
  return children;
}
