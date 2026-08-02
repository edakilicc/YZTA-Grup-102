import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { useMedicationStore } from '../stores/medicationStore';
import { ocrService } from '../services/ocrService';
import { aiService } from '../services/aiService';
import SubPageHeader from '../components/layout/SubPageHeader';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Capacitor } from '@capacitor/core';
import { cameraService } from '../services/cameraService';
import ImagePickerSheet from '../components/common/ImagePickerSheet';
import { notificationService } from '../services/notificationService';

// Validasyon Şeması
const medicationSchema = z.object({
  name: z.string().min(1, { message: "İlaç adı alanı zorunludur. / Medication name is required." }),
  dosage: z.string().min(1, { message: "Dozaj alanı zorunludur. / Dosage is required." }),
  form: z.string().min(1, { message: "Form seçimi zorunludur. / Form is required." }),
  frequency: z.string().min(1, { message: "Sıklık seçimi zorunludur. / Frequency is required." }),
  purpose: z.string().optional(),
  how_to_use: z.string().optional(),
  side_effects: z.string().optional(),
  warnings: z.string().optional(),
  active_ingredient: z.string().optional(),
  stock_count: z.preprocess((val) => (val === '' || val === null || isNaN(Number(val))) ? null : Number(val), z.number().nullable().optional()),
  start_date: z.string().min(1, { message: "Başlangıç tarihi zorunludur. / Start date is required." }),
  end_date: z.string().optional(),
});

export default function AddMedicationPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const editId = searchParams.get('edit');
  const isEditMode = !!editId;
  
  // Mod ayrımı: scan=true gelirse sadece tarama alanı, gelmezse sadece form alanı gösterilecek.
  const isScanMode = searchParams.get('scan') === 'true' && !isEditMode;

  const { add, update, medications, isLoading: storeLoading, error: storeError, clearError } = useMedicationStore();
  const [times, setTimes] = useState(['08:00']);
  const [newTime, setNewTime] = useState('');

  // OCR Durumları
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState(null);
  const [ocrResults, setOcrResults] = useState([]);
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [selectedOcrMeds, setSelectedOcrMeds] = useState({}); // { index: true/false }
  const [ocrTimes, setOcrTimes] = useState([]); // OCR ile eklenecek ilaçlar için kullanıcının elle girdiği saatler
  const [ocrNewTime, setOcrNewTime] = useState('');
  const [ocrTimesError, setOcrTimesError] = useState(null);
  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);

  const fileInputRef = useRef(null);

  // Form Özel Durumları
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [medPhotoPreview, setMedPhotoPreview] = useState(null);
  const [medPhotoLoading, setMedPhotoLoading] = useState(false);
  const medPhotoInputRef = useRef(null);
  const [imagePickerMode, setImagePickerMode] = useState(null); // 'ocr' | 'photo'

  // İlaç Etkileşim Durumları
  const [checkingInteractions, setCheckingInteractions] = useState(false);
  const [interactionWarning, setInteractionWarning] = useState(null); 
  const [pendingFormData, setPendingFormData] = useState(null); 

  // Form Yöneticisi
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(medicationSchema),
    defaultValues: {
      stock_count: 0,
      start_date: new Date().toISOString().split('T')[0],
    }
  });

  // Sayfa açıldığında veya mod değiştiğinde en üste kaydır
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [isScanMode, isEditMode]);

  // Eğer edit modundaysak, ilacın mevcut bilgilerini çekip form alanlarına doldur
  useEffect(() => {
    if (isEditMode && medications.length > 0) {
      const medicationToEdit = medications.find((med) => med.id === Number(editId));
      if (medicationToEdit) {
        setValue('name', medicationToEdit.name);
        setValue('dosage', medicationToEdit.dosage || '');
        setValue('form', medicationToEdit.form || 'tablet');
        setValue('frequency', medicationToEdit.frequency || 'günde 1');
        setValue('purpose', medicationToEdit.purpose || '');
        setValue('active_ingredient', medicationToEdit.active_ingredient || '');
        setValue('stock_count', medicationToEdit.stock_count || 0);
        
        setValue('how_to_use', medicationToEdit.how_to_use || '');
        setValue('side_effects', medicationToEdit.side_effects || '');
        setValue('warnings', medicationToEdit.warnings || '');

        if (medicationToEdit.start_date) {
          setValue('start_date', new Date(medicationToEdit.start_date).toISOString().split('T')[0]);
        }
        if (medicationToEdit.end_date) {
          setValue('end_date', new Date(medicationToEdit.end_date).toISOString().split('T')[0]);
        }

        if (medicationToEdit.times) {
          setTimes(medicationToEdit.times);
        }

        // İlaç görselini localStorage'dan çek
        const storedImg = localStorage.getItem(`med_img_${medicationToEdit.id}`);
        if (storedImg) setMedPhotoPreview(storedImg);
      }
    }
    clearError();
  }, [isEditMode, editId, medications, setValue, clearError]);

  const handleAddTime = () => {
    if (newTime && !times.includes(newTime)) {
      setTimes([...times, newTime].sort());
      setNewTime('');
    }
  };

  const handleRemoveTime = (timeToRemove) => {
    if (times.length > 1) {
      setTimes(times.filter((t) => t !== timeToRemove));
    }
  };

  const handleAddOcrTime = () => {
    if (ocrNewTime && !ocrTimes.includes(ocrNewTime)) {
      setOcrTimes([...ocrTimes, ocrNewTime].sort());
      setOcrNewTime('');
      setOcrTimesError(null);
    }
  };

  const handleRemoveOcrTime = (timeToRemove) => {
    setOcrTimes(ocrTimes.filter((t) => t !== timeToRemove));
  };

  const executeSave = async (formattedData) => {
    try {
      let savedMed;
      if (isEditMode) {
        savedMed = await update(Number(editId), formattedData);
        await notificationService.cancelForMedication(savedMed.id);
        await notificationService.scheduleMedicationReminders(savedMed);
      } else {
        savedMed = await add(formattedData);
        await notificationService.scheduleMedicationReminders(savedMed);
      }
      
      // Varsa fotoğrafı kaydet
      if (medPhotoPreview) {
        localStorage.setItem(`med_img_${savedMed.id}`, medPhotoPreview);
      }
      
      navigate('/medications');
    } catch (err) {
      // Hata store'da set ediliyor
    }
  };

  const onSubmit = async (data) => {
    const formattedData = {
      ...data,
      times: times,
      end_date: data.end_date === '' ? null : data.end_date,
    };

    setCheckingInteractions(true);
    setInteractionWarning(null);
    try {
      const res = await aiService.checkInteractions(data.name);
      if (res && res.has_interactions && res.interactions && res.interactions.length > 0) {
        setPendingFormData(formattedData);
        setInteractionWarning(res.interactions);
      } else {
        await executeSave(formattedData);
      }
    } catch (err) {
      console.error("Etkileşim kontrolü hatası:", err);
      await executeSave(formattedData);
    } finally {
      setCheckingInteractions(false);
    }
  };

  // OCR Kamera/Görsel Yükleme Handler'ı
  const handleOcrProcess = async (file) => {
    setOcrLoading(true);
    setOcrError(null);
    setOcrResults([]);

    try {
      const data = await ocrService.scanPrescription(file);
      
      if (data.detected_medications && data.detected_medications.length > 0) {
        setOcrResults(data.detected_medications);

        // Başlangıçta tüm algılanan ilaçları seçili yapalım
        const initialSelection = {};
        data.detected_medications.forEach((_, idx) => {
          initialSelection[idx] = true;
        });
        setSelectedOcrMeds(initialSelection);
        setOcrTimes([]);
        setOcrNewTime('');
        setOcrTimesError(null);
        setShowOcrModal(true);
      } else {
        setOcrError("Görsel üzerinde okunabilir bir ilaç veya reçete bilgisi tespit edilemedi.");
      }
    } catch (err) {
      setOcrError(err.response?.data?.detail || "Görsel taranırken bir hata oluştu.");
    } finally {
      setOcrLoading(false);
    }
  };

  const handleOcrFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await handleOcrProcess(file);
  };

  const handleCameraSelect = async () => {
    try {
      const photo = await cameraService.takePhoto();
      if (photo && photo.base64String) {
        if (imagePickerMode === 'ocr') {
          const file = cameraService.base64ToFile(photo.base64String, photo.format);
          await handleOcrProcess(file);
        } else {
          setMedPhotoPreview(`data:image/${photo.format};base64,${photo.base64String}`);
        }
      }
    } catch (err) {
      console.error("Camera capture error:", err);
      if (err.message && !err.message.includes("User cancelled")) {
        if (imagePickerMode === 'ocr') setOcrError("Kamera başlatılamadı veya çekim iptal edildi.");
      }
    }
  };

  const handleGallerySelect = async () => {
    try {
      const photo = await cameraService.pickFromGallery();
      if (photo && photo.base64String) {
        if (imagePickerMode === 'ocr') {
          const file = cameraService.base64ToFile(photo.base64String, photo.format);
          await handleOcrProcess(file);
        } else {
          setMedPhotoPreview(`data:image/${photo.format};base64,${photo.base64String}`);
        }
      }
    } catch (err) {
      console.error("Gallery pick error:", err);
      if (err.message && !err.message.includes("User cancelled")) {
        if (imagePickerMode === 'ocr') setOcrError("Galeri açılamadı veya seçim iptal edildi.");
      }
    }
  };

  const handleMedPhotoFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setMedPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleAddSelectedOcrMeds = async () => {
    if (ocrTimes.length === 0) {
      setOcrTimesError("Lütfen en az bir ilaç alma saati ekleyin.");
      return;
    }

    setOcrLoading(true);
    setShowOcrModal(false);

    try {
      // Seçilen her ilacı sırayla veritabanına ekle
      for (let idx = 0; idx < ocrResults.length; idx++) {
        if (selectedOcrMeds[idx]) {
          const med = ocrResults[idx];

          const newMed = await add({
            name: med.name,
            dosage: med.dosage || "25mg",
            form: med.form || "Tablet",
            frequency: med.frequency || "günde 1",
            times: ocrTimes,
            purpose: "Reçeteli Tedavi",
            active_ingredient: med.active_ingredient || "Bilinmiyor",
            how_to_use: med.how_to_use || "",
            side_effects: med.side_effects || "",
            warnings: med.warnings || "",
            stock_count: (med.quantity != null && med.quantity > 0) ? med.quantity : 0,
            start_date: new Date().toISOString().split('T')[0]
          });
          await notificationService.scheduleMedicationReminders(newMed);
        }
      }
      navigate('/medications');
    } catch (err) {
      setOcrError("İlaçlar eklenirken bir hata oluştu.");
    } finally {
      setOcrLoading(false);
    }
  };

  const triggerOcrInput = () => {
    setImagePickerMode('ocr');
    if (Capacitor.isNativePlatform()) {
      setIsImagePickerOpen(true);
    } else {
      fileInputRef.current.click();
    }
  };

  const triggerMedPhotoInput = () => {
    setImagePickerMode('photo');
    if (Capacitor.isNativePlatform()) {
      setIsImagePickerOpen(true);
    } else {
      medPhotoInputRef.current.click();
    }
  };

  const toggleOcrMedSelection = (idx) => {
    setSelectedOcrMeds((prev) => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const isLoading = storeLoading || ocrLoading || checkingInteractions;
  const error = storeError || ocrError;

  return (
    <div className="min-h-screen bg-background">
      <SubPageHeader title="PharmaGuard AI" />

      <main className="px-5 py-6 pb-10">
        {/* Page Title */}
        <div className="mb-6">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-1">
            {isEditMode ? t('common.edit') : isScanMode ? t('ocr.title') : t('common.add')}
          </h2>
          <p className="font-body text-base text-on-surface-variant">
            {isEditMode 
              ? 'İlacınızın kullanım detaylarını güncelleyin.' 
              : isScanMode 
                ? t('ocr.subtitle') 
                : 'İlaç bilgilerinizi manuel girerek tedavi takviminize ekleyin.'
            }
          </p>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mb-5 p-3 rounded-lg bg-error-container text-on-error-container text-xs font-body border border-error/20 flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-error">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Loading overlay for OCR scan or Interaction check */}
        {(ocrLoading || checkingInteractions) && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
            <LoadingSpinner size="large" />
            <p className="font-body text-sm text-primary font-bold mt-4 animate-pulse">
              {ocrLoading ? t('ocr.scanning') : "İlaç etkileşimleri kontrol ediliyor..."}
            </p>
          </div>
        )}

        {/* GİZLİ FILE INPUT (Kamera/Dosya yükleme için) */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleOcrFileSelect}
          accept="image/*"
          className="hidden"
        />

        <input 
          type="file" 
          ref={medPhotoInputRef} 
          onChange={handleMedPhotoFileSelect}
          accept="image/*"
          className="hidden"
        />

        {/* 1. TARAMA MODU ARAYÜZÜ */}
        {isScanMode ? (
          <div className="space-y-6">
            <div 
              onClick={triggerOcrInput}
              className="border-2 border-dashed border-outline-variant hover:border-primary bg-surface-container-lowest rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer active:scale-[0.99] transition-all min-h-[220px] shadow-[0px_4px_20px_rgba(0,0,0,0.04)]"
            >
              <div className="w-16 h-16 rounded-full bg-primary-container text-primary flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[32px]">add_a_photo</span>
              </div>
              <h3 className="font-display text-base font-bold text-on-surface mb-1">
                {t('ocr.uploadPhoto')}
              </h3>
              <p className="font-body text-xs text-on-surface-variant max-w-[240px]">
                Kameranızı açmak veya galeriden bir fotoğraf yüklemek için buraya dokunun.
              </p>
            </div>

            <div className="text-center pt-2">
              <Link 
                to="/add-medication"
                className="font-body text-xs text-primary font-bold hover:underline"
              >
                {t('ocr.manualEntry')}
              </Link>
            </div>
          </div>
        ) : (
          /* 2. MANUEL FORM MODU ARAYÜZÜ */
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Fotoğraf Tarama Kısayol Kartı */}
            {!isEditMode && (
              <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-lg">document_scanner</span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-display text-sm font-bold text-on-surface truncate">Fotoğraf ile Otomatik Doldur</h4>
                    <p className="font-body text-[11px] text-on-surface-variant truncate">Reçete/kutu resmi yükleyip formu doldurun</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={triggerOcrInput}
                  className="px-4 h-9 bg-primary text-on-primary rounded-full font-body font-semibold text-xs shrink-0 active:scale-95 transition-transform"
                >
                  {t('ocr.quickScan')}
                </button>
              </div>
            )}

            {/* İlaç Fotoğrafı Yükleme (Mevcut Görseli Gösterme ve Değiştirme) */}
            <div className="flex flex-col gap-2">
              <label className="font-body text-sm font-semibold text-on-surface-variant">
                İlaç Görseli (İsteğe Bağlı)
              </label>
              {medPhotoPreview ? (
                <div className="relative w-full h-[160px] rounded-2xl overflow-hidden border border-outline-variant bg-surface-container-lowest flex items-center justify-center">
                  <img src={medPhotoPreview} alt="Medication" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                    <button
                      type="button"
                      onClick={triggerMedPhotoInput}
                      className="w-10 h-10 rounded-full bg-white text-primary flex items-center justify-center hover:scale-105 transition-transform"
                      title="Değiştir"
                    >
                      <span className="material-symbols-outlined text-xl">edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMedPhotoPreview(null)}
                      className="w-10 h-10 rounded-full bg-error text-white flex items-center justify-center hover:scale-105 transition-transform"
                      title="Kaldır"
                    >
                      <span className="material-symbols-outlined text-xl">delete</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={triggerMedPhotoInput}
                  className="w-full h-[100px] border-2 border-dashed border-outline-variant hover:border-primary rounded-2xl flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-colors bg-surface-container-lowest"
                >
                  <span className="material-symbols-outlined text-2xl mb-1">add_photo_alternate</span>
                  <span className="font-body text-xs font-semibold">Fotoğraf Ekle / Çek</span>
                </button>
              )}
            </div>

            {/* İlaç Adı */}
            <div className="flex flex-col gap-1">
              <label className="font-body text-sm font-semibold text-on-surface-variant" htmlFor="name">
                {t('medications.name')}
              </label>
              <input
                id="name"
                type="text"
                placeholder="Örn: Parol"
                {...register("name")}
                className="h-[44px] px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface focus:ring-2 focus:ring-primary focus:border-primary transition-shadow font-body text-sm w-full"
              />
              {errors.name && (
                <span className="text-xs text-error font-body mt-1">{errors.name.message}</span>
              )}
            </div>

            {/* Etken Madde (Opsiyonel) */}
            <div className="flex flex-col gap-1">
              <label className="font-body text-sm font-semibold text-on-surface-variant" htmlFor="active_ingredient">
                {t('medications.activeIngredient')} (İsteğe Bağlı)
              </label>
              <input
                id="active_ingredient"
                type="text"
                placeholder="Örn: Parasetamol"
                {...register("active_ingredient")}
                className="h-[44px] px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface focus:ring-2 focus:ring-primary focus:border-primary transition-shadow font-body text-sm w-full"
              />
            </div>

            {/* Dozaj ve Form */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="font-body text-sm font-semibold text-on-surface-variant" htmlFor="dosage">
                  {t('medications.dosage')}
                </label>
                <input
                  id="dosage"
                  type="text"
                  placeholder="Örn: 500mg"
                  {...register("dosage")}
                  className="h-[44px] px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface focus:ring-2 focus:ring-primary focus:border-primary transition-shadow font-body text-sm w-full"
                />
                {errors.dosage && (
                  <span className="text-xs text-error font-body mt-1">{errors.dosage.message}</span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-body text-sm font-semibold text-on-surface-variant" htmlFor="form">
                  {t('medications.form')}
                </label>
                <select
                  id="form"
                  {...register("form")}
                  className="h-[44px] px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface focus:ring-2 focus:ring-primary focus:border-primary transition-shadow font-body text-sm w-full"
                >
                  <option value="tablet">Tablet</option>
                  <option value="kapsül">Kapsül</option>
                  <option value="şurup">Şurup</option>
                  <option value="enjeksiyon">İğne / Enjeksiyon</option>
                  <option value="krem">Krem / Jel</option>
                  <option value="solüsyon">Damlalık / Solüsyon</option>
                </select>
              </div>
            </div>

            {/* Sıklık */}
            <div className="flex flex-col gap-1">
              <label className="font-body text-sm font-semibold text-on-surface-variant" htmlFor="frequency">
                {t('medications.frequency')}
              </label>
              <select
                id="frequency"
                {...register("frequency")}
                className="h-[44px] px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface focus:ring-2 focus:ring-primary focus:border-primary transition-shadow font-body text-sm w-full"
              >
                <option value="günde 1">Günde 1 kez</option>
                <option value="günde 2">Günde 2 kez</option>
                <option value="günde 3">Günde 3 kez</option>
                <option value="günde 4">Günde 4 kez</option>
                <option value="haftada 1">Haftada 1 kez</option>
                <option value="ihtiyaç halinde">Sadece ihtiyaç halinde</option>
              </select>
            </div>

            {/* Stok Sayısı */}
            <div className="flex flex-col gap-1">
              <label className="font-body text-sm font-semibold text-on-surface-variant" htmlFor="stock_count">
                {t('medications.stock')}
              </label>
              <input
                id="stock_count"
                type="number"
                {...register("stock_count")}
                className="h-[44px] px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface focus:ring-2 focus:ring-primary focus:border-primary transition-shadow font-body text-sm w-full"
              />
              {errors.stock_count && (
                <span className="text-xs text-error font-body mt-1">{errors.stock_count.message}</span>
              )}
            </div>

            {/* Doz Saatleri */}
            <div className="bg-surface-container rounded-2xl p-4 space-y-3">
              <label className="font-body text-sm font-semibold text-on-surface-variant block">
                {t('medications.times')}
              </label>
              
              <div className="flex flex-wrap gap-2">
                {times.map((time) => (
                  <span
                    key={time}
                    className="pl-3 pr-1.5 py-1 rounded-full bg-primary-container text-on-primary-container text-xs font-bold font-body flex items-center gap-1"
                  >
                    {time}
                    {times.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTime(time)}
                        className="w-5 h-5 rounded-full hover:bg-black/10 flex items-center justify-center text-on-primary-container"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    )}
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="h-[36px] px-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface font-body text-xs flex-1 focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={handleAddTime}
                  disabled={!newTime}
                  className="px-3 h-[36px] bg-primary text-on-primary rounded-lg font-body font-semibold text-xs flex items-center gap-1 active:scale-95 transition-transform disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  {t('common.add')}
                </button>
              </div>
            </div>

            {/* Başlangıç & Bitiş Tarihleri */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="font-body text-sm font-semibold text-on-surface-variant" htmlFor="start_date">
                  {t('medications.startDate')}
                </label>
                <input
                  id="start_date"
                  type="date"
                  {...register("start_date")}
                  className="h-[44px] px-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface focus:ring-2 focus:ring-primary focus:border-primary transition-shadow font-body text-xs w-full"
                />
                {errors.start_date && (
                  <span className="text-xs text-error font-body mt-1">{errors.start_date.message}</span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-body text-sm font-semibold text-on-surface-variant" htmlFor="end_date">
                  {t('medications.endDate')} (İsteğe Bağlı)
                </label>
                <input
                  id="end_date"
                  type="date"
                  {...register("end_date")}
                  className="h-[44px] px-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface focus:ring-2 focus:ring-primary focus:border-primary transition-shadow font-body text-xs w-full"
                />
              </div>
            </div>

            {/* Kullanım Amacı (Opsiyonel) */}
            <div className="flex flex-col gap-1">
              <label className="font-body text-sm font-semibold text-on-surface-variant" htmlFor="purpose">
                {t('medications.purpose')} (İsteğe Bağlı)
              </label>
              <textarea
                id="purpose"
                rows={2}
                placeholder="Örn: Baş ağrısı ve ateş düşürücü"
                {...register("purpose")}
                className="p-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface text-sm font-body w-full focus:ring-2 focus:ring-primary focus:border-primary transition-shadow resize-none"
              />
            </div>

            {/* Gelişmiş Bilgiler Toggle */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-primary font-body font-semibold text-sm hover:underline"
              >
                <span className={`material-symbols-outlined transition-transform duration-300 ${showAdvanced ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
                {showAdvanced ? "Gelişmiş Bilgileri Gizle" : "Gelişmiş Bilgileri Göster"}
              </button>
            </div>

            {/* Gelişmiş Bilgiler İçeriği */}
            {showAdvanced && (
              <div className="space-y-4 animate-fade-in border-l-2 border-primary pl-4 py-2">
                
                {/* Kullanım Şekli */}
                <div className="flex flex-col gap-1">
                  <label className="font-body text-sm font-semibold text-on-surface-variant" htmlFor="how_to_use">
                    Kullanım Şekli (İsteğe Bağlı)
                  </label>
                  <textarea
                    id="how_to_use"
                    rows={2}
                    placeholder="Örn: Aç karnına, bol su ile..."
                    {...register("how_to_use")}
                    className="p-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface text-sm font-body w-full focus:ring-2 focus:ring-primary focus:border-primary transition-shadow resize-none"
                  />
                </div>

                {/* Yan Etkiler */}
                <div className="flex flex-col gap-1">
                  <label className="font-body text-sm font-semibold text-on-surface-variant" htmlFor="side_effects">
                    Yan Etkiler (İsteğe Bağlı)
                  </label>
                  <textarea
                    id="side_effects"
                    rows={2}
                    placeholder="Örn: Mide bulantısı yapabilir..."
                    {...register("side_effects")}
                    className="p-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface text-sm font-body w-full focus:ring-2 focus:ring-primary focus:border-primary transition-shadow resize-none"
                  />
                </div>

                {/* Uyarılar */}
                <div className="flex flex-col gap-1">
                  <label className="font-body text-sm font-semibold text-on-surface-variant" htmlFor="warnings">
                    Uyarılar (İsteğe Bağlı)
                  </label>
                  <textarea
                    id="warnings"
                    rows={2}
                    placeholder="Örn: Araç kullanımını etkileyebilir..."
                    {...register("warnings")}
                    className="p-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface text-sm font-body w-full focus:ring-2 focus:ring-primary focus:border-primary transition-shadow resize-none"
                  />
                </div>

              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-4 flex gap-4">
              <button
                type="button"
                onClick={() => navigate('/medications')}
                className="flex-1 h-[48px] rounded-full border-2 border-primary text-primary font-body font-semibold text-sm tracking-wider flex items-center justify-center active:scale-95 transition-transform"
              >
                {t('common.cancel')}
              </button>
              
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 h-[48px] bg-primary text-on-primary rounded-full font-body font-semibold text-sm tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all duration-200 shadow-md disabled:opacity-75 disabled:pointer-events-none"
              >
                {isLoading ? (
                  <LoadingSpinner size="small" />
                ) : (
                  <>
                    <span className="material-symbols-outlined text-xl">save</span>
                    {t('common.save')}
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </main>

      {/* OCR ALGILANAN İLAÇLAR SEÇİM MODALI */}
      {showOcrModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 z-50 animate-fade-in">
          <div className="bg-surface-container-lowest rounded-[24px] p-6 w-[calc(100%-32px)] max-w-[380px] min-w-[280px] space-y-4 shadow-xl border border-outline-variant/30 flex flex-col max-h-[80vh]">
            <div>
              <h3 className="font-display text-lg font-bold text-on-surface mb-1">
                {t('ocr.detectedMeds')}
              </h3>
              <p className="font-body text-xs text-on-surface-variant">
                {t('ocr.selectToAdd')}
              </p>
            </div>

            <div className="space-y-2 overflow-y-auto flex-1 pr-1 py-1">
              {ocrResults.map((med, idx) => (
                <div
                  key={idx}
                  onClick={() => toggleOcrMedSelection(idx)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all ${
                    selectedOcrMeds[idx]
                      ? 'border-primary bg-primary/5'
                      : 'border-outline-variant/30 bg-surface-container-lowest'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary-container text-primary flex items-center justify-center font-display font-bold text-sm shrink-0">
                      {med.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-display text-sm font-semibold text-on-surface truncate">{med.name}</h4>
                      <p className="font-body text-[11px] text-on-surface-variant">
                        Doz: {med.dosage} · Skala: %{med.confidence}
                        {med.quantity != null && med.quantity > 0 ? ` · Adet: ${med.quantity}` : ''}
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!selectedOcrMeds[idx]}
                    onChange={() => {}} 
                    className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer shrink-0"
                  />
                </div>
              ))}
            </div>

            {/* OCR ile Eklenecek İlaçlar İçin Saat Seçimi (Manuel, otomatik doldurulmaz) */}
            <div className="bg-surface-container rounded-2xl p-4 space-y-3">
              <label className="font-body text-sm font-semibold text-on-surface-variant block">
                {t('medications.times')}
              </label>

              {ocrTimes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {ocrTimes.map((time) => (
                    <span
                      key={time}
                      className="pl-3 pr-1.5 py-1 rounded-full bg-primary-container text-on-primary-container text-xs font-bold font-body flex items-center gap-1"
                    >
                      {time}
                      <button
                        type="button"
                        onClick={() => handleRemoveOcrTime(time)}
                        className="w-5 h-5 rounded-full hover:bg-black/10 flex items-center justify-center text-on-primary-container"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="time"
                  value={ocrNewTime}
                  onChange={(e) => setOcrNewTime(e.target.value)}
                  className="h-[36px] px-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface font-body text-xs flex-1 focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={handleAddOcrTime}
                  disabled={!ocrNewTime}
                  className="px-3 h-[36px] bg-primary text-on-primary rounded-lg font-body font-semibold text-xs flex items-center gap-1 active:scale-95 transition-transform disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  {t('common.add')}
                </button>
              </div>

              {ocrTimesError && (
                <span className="text-xs text-error font-body block">{ocrTimesError}</span>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowOcrModal(false);
                  setOcrTimes([]);
                  setOcrNewTime('');
                  setOcrTimesError(null);
                }}
                className="flex-1 h-[44px] rounded-full bg-surface-container-high text-on-surface-variant font-body font-semibold text-xs active:scale-95 transition-transform"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleAddSelectedOcrMeds}
                className="flex-1 h-[44px] rounded-full bg-primary text-on-primary font-body font-semibold text-xs active:scale-95 transition-transform shadow-md"
              >
                {t('ocr.addSelected')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* İlaç Etkileşim Uyarısı Modalı */}
      {interactionWarning && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 z-50 animate-fade-in">
          <div className="bg-surface-container-lowest rounded-[24px] p-6 w-[calc(100%-32px)] max-w-[380px] min-w-[280px] space-y-4 shadow-xl border border-outline-variant/30 flex flex-col max-h-[85vh]">
            <div className="flex items-center gap-2 text-error">
              <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
              <h3 className="font-display text-lg font-bold">⚠️ Etkileşim Uyarısı</h3>
            </div>
            
            <p className="font-body text-xs text-on-surface-variant">
              Bu ilaç, kullandığınız diğer ilaçlarla etkileşime girebilir:
            </p>

            <div className="space-y-3 overflow-y-auto flex-1 pr-1 py-1">
              {interactionWarning.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border-l-4 ${
                    item.severity === 'high' ? 'border-error bg-error/5 text-error' : 'border-tertiary bg-tertiary/5 text-tertiary'
                  } border border-outline-variant/30`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-display text-xs font-bold text-on-surface">
                      {item.drug1} ↔️ {item.drug2}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      item.severity === 'high' ? 'bg-error/15 text-error' : 'bg-tertiary/15 text-tertiary'
                    }`}>
                      {item.severity === 'high' ? 'Ciddi' : 'Orta'}
                    </span>
                  </div>
                  <p className="font-body text-[11px] text-on-surface-variant leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>

            <p className="font-body text-[10px] text-on-surface-variant text-center italic">
              Yine de bu ilacı eklemek istiyor musunuz?
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setInteractionWarning(null);
                  setPendingFormData(null);
                }}
                className="flex-grow h-[44px] rounded-full bg-surface-container-high text-on-surface-variant font-body font-semibold text-xs active:scale-95 transition-transform"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  executeSave(pendingFormData);
                  setInteractionWarning(null);
                  setPendingFormData(null);
                }}
                className={`flex-grow h-[44px] rounded-full text-on-primary font-body font-semibold text-xs active:scale-95 transition-transform shadow-md ${
                  interactionWarning.some(i => i.severity === 'high') ? 'bg-error hover:bg-error/90' : 'bg-tertiary hover:bg-tertiary/90'
                }`}
              >
                Yine de Ekle
              </button>
            </div>
          </div>
        </div>
      )}

      <ImagePickerSheet
        isOpen={isImagePickerOpen}
        onClose={() => setIsImagePickerOpen(false)}
        onCameraSelect={handleCameraSelect}
        onGallerySelect={handleGallerySelect}
      />
    </div>
  );
}
