/**
 * PharmaGuard AI - Axios API Instance Configuration
 * Bu dosya, backend API sunucusuna atılacak tüm HTTP istekleri için ortak yapılandırmaları içerir.
 */

import axios from 'axios';

// Vite çevre değişkenlerinden API base URL'i alınır, yoksa varsayılan local adrese bağlanır
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Her istek atılmadan önce localStorage'daki JWT access token'ı alır
// ve isteğin 'Authorization' başlığına 'Bearer <token>' olarak ekler.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: API'den dönen yanıtları izler.
// Eğer HTTP 401 Unauthorized hatası alınırsa, bu token'ın geçersiz olduğunu veya süresinin
// dolduğunu gösterir. Bu durumda localStorage temizlenir ve kullanıcı giriş sayfasına yönlendirilir.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('access_token');
      // Döngüsel yönlendirmeyi önlemek için zaten login sayfasında değilsek yönlendiririz
      if (!window.location.pathname.includes('/login') && window.location.pathname !== '/') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
