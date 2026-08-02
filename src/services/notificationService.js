import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

// Web ortamı için mock/fallback timeout saklama
let activeTimeouts = {};

export const notificationService = {
  // İzin iste
  async requestPermission() {
    if (!Capacitor.isNativePlatform()) {
      if (!('Notification' in window)) return false;
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    try {
      const result = await LocalNotifications.requestPermissions();
      return result.display === 'granted';
    } catch (err) {
      console.error("Native notification permission request failed:", err);
      return false;
    }
  },

  // İzin durumunu kontrol et
  async checkPermission() {
    if (!Capacitor.isNativePlatform()) {
      return 'Notification' in window && Notification.permission === 'granted';
    }
    try {
      const result = await LocalNotifications.checkPermissions();
      return result.display === 'granted';
    } catch (err) {
      console.error("Native notification permission check failed:", err);
      return false;
    }
  },

  // Tek bir ilaç için bildirimleri planla
  async scheduleMedicationReminders(medication) {
    if (!Capacitor.isNativePlatform()) {
      // Web fallback
      if (medication.times) {
        medication.times.forEach(time => {
          this.scheduleWebNotification(medication.id, medication.name, time);
        });
      }
      return;
    }
    
    if (!medication.times || medication.times.length === 0) return;
    
    const hasPermission = await this.checkPermission();
    if (!hasPermission) return;

    // Önce notification channel oluştur (Android)
    try {
      await LocalNotifications.createChannel({
        id: 'medication-reminders',
        name: 'İlaç Hatırlatmaları',
        description: 'İlaç alma zamanı hatırlatmaları',
        importance: 5, // HIGH
        visibility: 1, // PUBLIC
        vibration: true,
        sound: 'notification_sound',
      });
    } catch (e) {
      // Channel zaten varsa hata verebilir, sorun değil
    }

    try {
      // Önce bu ilaç için var olan eski bildirimleri temizle
      const toCancel = [];
      for (let i = 0; i < 20; i++) {
        toCancel.push({ id: medication.id * 100 + i });
      }
      await LocalNotifications.cancel({ notifications: toCancel });
      
      // Yeni bildirimleri planla
      const notifications = medication.times.map((time, index) => {
        const [hours, minutes] = time.split(':').map(Number);
        const scheduleDate = new Date();
        scheduleDate.setHours(hours, minutes, 0, 0);
        
        // Eğer bugünkü saat geçmişse, yarına ayarla
        if (scheduleDate <= new Date()) {
          scheduleDate.setDate(scheduleDate.getDate() + 1);
        }

        return {
          id: medication.id * 100 + index,
          title: '💊 İlaç Hatırlatma',
          body: `${medication.name} ${medication.dosage || ''} - İlacınızı alma zamanı!`,
          schedule: {
            at: scheduleDate,
            every: 'day',
            allowWhileIdle: true,
          },
          channelId: 'medication-reminders',
          smallIcon: 'ic_notification',
          iconColor: '#006A60',
          extra: {
            medicationId: medication.id,
            time: time,
          },
        };
      });

      await LocalNotifications.schedule({ notifications });
    } catch (err) {
      console.error("Local notification scheduling failed:", err);
    }
  },

  // Tüm aktif ilaçlar için bildirimleri yeniden planla
  async rescheduleAll(medications) {
    if (!Capacitor.isNativePlatform()) {
      // Web fallback
      this.cancelAllWebNotifications();
      for (const med of medications) {
        if (med.is_active !== false) {
          if (med.times) {
            med.times.forEach(time => {
              this.scheduleWebNotification(med.id, med.name, time);
            });
          }
        }
      }
      return;
    }
    
    const hasPermission = await this.checkPermission();
    if (!hasPermission) return;

    try {
      // Tek tek yeniden yazıyoruz çünkü getPending veya cancel All yavaş olabilir.
      for (const med of medications) {
        if (med.is_active !== false) {
          await this.scheduleMedicationReminders(med);
        }
      }
    } catch (err) {
      console.error("Reschedule all failed:", err);
    }
  },

  // Stok kontrolü ve bildirim
  async checkStockAndNotify(medication) {
    if (medication.stock_count === undefined || medication.stock_count === null) return;
    
    let title = '';
    let body = '';
    let severityId = 0; // 0 for nothing, 1 for low, 2 for critical

    if (medication.stock_count <= 3) {
      title = '🚨 Kritik Stok Uyarısı!';
      body = `${medication.name} ilacınızın stoğu bitmek üzere (${medication.stock_count} adet kaldı). Lütfen en kısa sürede temin edin.`;
      severityId = 2;
    } else if (medication.stock_count <= 7) {
      title = '⚠️ Stok Azalıyor';
      body = `${medication.name} ilacınızın stoğu azalıyor (${medication.stock_count} adet kaldı).`;
      severityId = 1;
    }

    if (severityId > 0) {
      if (!Capacitor.isNativePlatform()) {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(title, { body });
        }
        return;
      }

      const hasPermission = await this.checkPermission();
      if (!hasPermission) return;

      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: medication.id * 1000 + 999, // Benzersiz bir ID
              title: title,
              body: body,
              schedule: { at: new Date(Date.now() + 1000) }, // Hemen göster
              channelId: 'medication-reminders',
              smallIcon: 'ic_notification',
              iconColor: severityId === 2 ? '#B3261E' : '#E6A23C',
              extra: { medicationId: medication.id },
            }
          ]
        });
      } catch (err) {
        console.error("Stock notification failed:", err);
      }
    }
  },

  // Tek bir ilacın bildirimlerini iptal et
  async cancelForMedication(medicationId) {
    if (!Capacitor.isNativePlatform()) {
      // Web fallback: clear timeout by prefix tags
      Object.keys(activeTimeouts).forEach((tag) => {
        if (tag.startsWith(`med-${medicationId}-`)) {
          clearTimeout(activeTimeouts[tag]);
          delete activeTimeouts[tag];
        }
      });
      return;
    }
    
    try {
      // getPending() aşırı yavaş çalıştığı için (15 saniye bekletiyor),
      // doğrudan oluşturduğumuz muhtemel tüm ID'leri verip iptal ediyoruz.
      const toCancel = [];
      
      // Saat bazlı bildirimler (0-20 arası)
      for (let i = 0; i < 20; i++) {
        toCancel.push({ id: medicationId * 100 + i });
      }
      
      // Stok bazlı bildirimler (medication.id * 1000 + 999)
      toCancel.push({ id: medicationId * 1000 + 999 });

      await LocalNotifications.cancel({ notifications: toCancel });
    } catch (err) {
      console.error("Cancel for medication failed:", err);
    }
  },

  // Bildirime tıklandığında tetiklenecek listener
  async addListeners(navigateCallback) {
    if (!Capacitor.isNativePlatform()) return;
    
    try {
      await LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
        const medicationId = notification.notification.extra?.medicationId;
        if (medicationId && navigateCallback) {
          navigateCallback(`/medications/${medicationId}`);
        }
      });
    } catch (err) {
      console.error("Error adding notification listener:", err);
    }
  },

  // Listener'ları kaldır
  async removeListeners() {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await LocalNotifications.removeAllListeners();
    } catch (err) {
      console.error("Error removing notification listener:", err);
    }
  },

  // Web Fallback: Tek bir bildirim oluştur
  scheduleWebNotification(medicationId, medicationName, timeStr) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    const tag = `med-${medicationId}-${timeStr}`;
    if (activeTimeouts[tag]) {
      clearTimeout(activeTimeouts[tag]);
    }

    const now = new Date();
    const [hours, minutes] = timeStr.split(':').map(Number);
    const target = new Date();
    target.setHours(hours, minutes, 0, 0);

    let delay = target.getTime() - now.getTime();

    // Geçmiş saatler için 60 saniye erteleme (demo/test için)
    if (delay < 0) {
      delay = 60 * 1000;
    }

    const timeoutId = setTimeout(() => {
      new Notification('💊 İlaç Saati!', {
        body: `${medicationName} - İlacınızı alma zamanınız geldi.`,
        tag: tag,
        requireInteraction: true
      });
      delete activeTimeouts[tag];
    }, delay);

    activeTimeouts[tag] = timeoutId;
  },

  // Web Fallback: Tüm web timeoutlarını temizle
  cancelAllWebNotifications() {
    Object.keys(activeTimeouts).forEach((tag) => {
      clearTimeout(activeTimeouts[tag]);
    });
    activeTimeouts = {};
  }
};
