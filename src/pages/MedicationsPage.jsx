import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMedicationStore } from '../stores/medicationStore';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function MedicationsPage() {
  const { t } = useTranslation();
  const { medications, isLoading, isInitialized, error, fetchAll } = useMedicationStore();
  const [searchTerm, setSearchTerm] = useState('');

  // Sayfa açıldığında ilaç listesini API'den çek
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Arama filtresi (isim veya etken maddeye göre)
  const filteredMedications = medications.filter((med) => {
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = med.name.toLowerCase().includes(searchLower);
    const ingredientMatch = med.active_ingredient 
      ? med.active_ingredient.toLowerCase().includes(searchLower)
      : false;
    return nameMatch || ingredientMatch;
  });

  if (isLoading && !isInitialized) {
    return <LoadingSpinner fullPage />;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex justify-between items-center">
        <div>
          <h2 className="font-display text-2xl font-bold text-on-surface">{t('medications.title')}</h2>
          <p className="font-body text-sm text-on-surface-variant mt-1">{t('medications.subtitle')}</p>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-error-container text-on-error-container text-xs font-body border border-error/20 flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-error">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-4 relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
          search
        </span>
        <input
          type="text"
          placeholder={t('common.search')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-[44px] pl-10 pr-4 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface focus:ring-[3px] focus:ring-primary focus:border-primary transition-shadow font-body text-sm w-full"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        )}
      </div>

      {/* Medication Cards */}
      <div className="space-y-3">
        {filteredMedications.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.08)] p-8 text-center text-on-surface-variant font-body">
            <span className="material-symbols-outlined text-4xl text-outline-variant mb-2">pill</span>
            <p className="text-sm">
              {searchTerm ? t('common.noData') : t('medications.empty')}
            </p>
            {!searchTerm && (
              <Link
                to="/add-medication"
                className="mt-4 inline-flex h-9 items-center justify-center px-4 rounded-full bg-primary text-on-primary font-semibold text-xs transition-colors"
              >
                {t('common.add')}
              </Link>
            )}
          </div>
        ) : (
          filteredMedications.map((med) => (
            <Link
              key={med.id}
              to={`/medications/${med.id}`}
              className="block bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.08)] p-4 border-l-4 border-primary hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex items-center gap-4">
                {med.image_url ? (
                  <img
                    src={med.image_url}
                    alt={med.name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-surface-container shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-primary-container text-primary flex items-center justify-center font-display font-bold text-lg shrink-0">
                    {med.name.charAt(0)}
                  </div>
                )}
                
                <div className="flex-grow min-w-0">
                  <h3 className="font-display text-base font-semibold text-on-surface truncate">{med.name}</h3>
                  <p className="font-body text-sm text-on-surface-variant truncate">
                    {med.dosage} · {t(`forms.${med.form}`, med.form)}
                  </p>
                  <p className="font-body text-xs text-on-surface-variant">{t(`frequencies.${med.frequency}`, med.frequency)}</p>
                  
                  {med.times && med.times.length > 0 && (
                    <p className="font-body text-xs text-primary font-medium mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">schedule</span>
                      {t('medications.times')}: {med.times.join(', ')}
                    </p>
                  )}
                </div>
                
                <span className="material-symbols-outlined text-on-surface-variant shrink-0 text-xl">
                  chevron_right
                </span>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* FAB */}
      <Link
        to="/add-medication"
        className="fixed right-6 bottom-[calc(env(safe-area-inset-bottom,24px)+5rem)] w-14 h-14 rounded-full bg-primary text-on-primary shadow-lg flex items-center justify-center hover:bg-primary-container hover:text-on-primary-container transition-colors active:scale-95 duration-200 z-40"
      >
        <span className="material-symbols-outlined text-3xl">add</span>
      </Link>
    </div>
  );
}
