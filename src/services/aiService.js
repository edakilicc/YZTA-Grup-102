/**
 * PharmaGuard AI - AI Integration API Services
 * Bu dosya, prospektüs özetleme ve ilaç etkileşim analizi gibi yapay zeka isteklerini API'ye iletir.
 */

import api from './api';

export const aiService = {
  /**
   * Gönderilen prospektüs metnini Gemini API kullanarak Türkçe özetler.
   */
  summarizeProspectus: async (medicationName, prospectusText) => {
    const response = await api.post('/ai/summarize-prospectus', {
      medication_name: medicationName,
      prospectus_text: prospectusText
    });
    return response.data;
  },

  /**
   * Yeni ilacın mevcut aktif ilaçlarla olan etkileşimini kontrol eder.
   */
  checkInteractions: async (drugName) => {
    const response = await api.post('/medications/check-interactions', {
      drug_name: drugName
    });
    return response.data;
  }
};
