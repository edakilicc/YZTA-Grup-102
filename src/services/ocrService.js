/**
 * PharmaGuard AI - OCR API Services
 * Bu dosya, reçete fotoğrafı yükleme ve görselden ilaç tanıma isteklerini API'ye iletir.
 */

import api from './api';

export const ocrService = {
  /**
   * Reçete/kutu görselini multipart form-data olarak API'ye gönderir.
   */
  scanPrescription: async (imageFile) => {
    const formData = new FormData();
    formData.append('file', imageFile);

    const response = await api.post('/ocr/scan', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};
