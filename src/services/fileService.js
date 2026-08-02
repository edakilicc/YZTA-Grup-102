import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Toast } from '@capacitor/toast';
import { Capacitor } from '@capacitor/core';
import { FileOpener } from '@capacitor-community/file-opener';

export const fileService = {
  // PDF blob'unu kaydet
  async savePdf(blob, fileName) {
    if (Capacitor.isNativePlatform()) {
      const base64Data = await this.blobToBase64(blob);

      // Cache dizinine yaz (izin gerektirmez)
      const result = await Filesystem.writeFile({
        path: `PharmaGuardAI/${fileName}`,
        data: base64Data,
        directory: Directory.Cache,
        recursive: true,
      });

      await Toast.show({ 
        text: 'PDF raporu kaydedildi!', 
        duration: 'long',
        position: 'bottom'
      });
      
      return result.uri;
    } else {
      // Web fallback: mevcut blob download yöntemi
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return null;
    }
  },

  // PDF'i paylaş (Android Share Sheet)
  async sharePdf(fileUri, fileName) {
    if (!Capacitor.isNativePlatform() || !fileUri) return;

    await Share.share({
      title: 'PharmaGuard AI Tedavi Raporu',
      url: fileUri,
      dialogTitle: 'Raporu paylaş',
    });
  },

  // PDF'i telefonun varsayılan görüntüleyicisiyle aç
  async openPdf(fileUri) {
    if (!Capacitor.isNativePlatform() || !fileUri) return;

    await FileOpener.open({
      filePath: fileUri,
      contentType: 'application/pdf',
    });
  },

  // Yardımcı: Blob → Base64
  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  },
};
