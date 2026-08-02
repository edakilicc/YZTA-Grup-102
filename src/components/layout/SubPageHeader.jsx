import { useNavigate } from 'react-router-dom';

export default function SubPageHeader({ title }) {
  const navigate = useNavigate();

  return (
    <header className="bg-surface shadow-[0px_4px_20px_rgba(0,0,0,0.08)] sticky top-0 z-40 w-full pt-[env(safe-area-inset-top,32px)]">
      <div className="flex justify-between items-center px-2 py-1 w-full h-[56px]">
        <button
          onClick={() => navigate(-1)}
          aria-label="Geri Dön"
          className="text-on-surface-variant rounded-full hover:bg-surface-container-low transition-colors active:scale-95 duration-200 flex items-center justify-center w-10 h-10"
        >
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </button>
        <h1 className="font-display text-lg text-primary font-semibold">
          {title}
        </h1>
        <button
          aria-label="Bildirimler"
          className="text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-full flex items-center justify-center active:scale-95 duration-200 w-10 h-10"
        >
          <span className="material-symbols-outlined text-xl">notifications</span>
        </button>
      </div>
    </header>
  );
}
