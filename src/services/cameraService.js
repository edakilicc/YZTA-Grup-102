import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

export const cameraService = {
  // Kameradan fotoğraf çek
  async takePhoto() {
    const image = await Camera.getPhoto({
      quality: 85,
      resultType: CameraResultType.Base64,
      source: CameraSource.Camera,
      allowEditing: false,
      correctOrientation: true,
    });
    return image;
  },

  // Galeriden fotoğraf seç
  async pickFromGallery() {
    const image = await Camera.getPhoto({
      quality: 85,
      resultType: CameraResultType.Base64,
      source: CameraSource.Photos,
      allowEditing: false,
    });
    return image;
  },

  // Base64'ü File objesine çevir (API'ye göndermek için)
  base64ToFile(base64Data, format) {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const mimeType = `image/${format || 'jpeg'}`;
    return new File([byteArray], `prescription.${format || 'jpeg'}`, { type: mimeType });
  },

  // Platform kontrolü
  isNative() {
    return Capacitor.isNativePlatform();
  }
};
