import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

export default function BottomNav() {
  const { t } = useTranslation();
  const location = useLocation();

  const navItems = [
    { to: '/dashboard',   icon: 'dashboard',  label: t('dashboard.dailyProgram') },
    { to: '/medications', icon: 'medication',  label: t('medications.title') },
    { to: '/reports',     icon: 'analytics',   label: t('reports.title') },
    { to: '/profile',     icon: 'person',      label: t('profile.title') },
  ];

  const handleTabClick = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch (e) {
        // sessizce geç
      }
    }
  };

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const isActive = location.pathname === item.to ||
          (item.to !== '/dashboard' && location.pathname.startsWith(item.to));

        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={handleTabClick}
            className="bottom-nav__item"
            aria-current={isActive ? 'page' : undefined}
          >
            {/* Aktif indicator pill */}
            <span className={`bottom-nav__indicator ${isActive ? 'bottom-nav__indicator--active' : ''}`} />

            {/* İkon */}
            <span
              className={`material-symbols-outlined bottom-nav__icon ${isActive ? 'bottom-nav__icon--active' : ''}`}
            >
              {item.icon}
            </span>

            {/* Etiket */}
            <span className={`bottom-nav__label ${isActive ? 'bottom-nav__label--active' : ''}`}>
              {item.label}
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
}
