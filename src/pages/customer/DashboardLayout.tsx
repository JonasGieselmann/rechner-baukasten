import type { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../components/AuthProvider';
import { BRAND } from '../../../branding/tokens';
import { Wordmark } from '../../components/Wordmark';

const iconBase = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const OverviewIcon = () => (
  <svg {...iconBase} aria-hidden="true">
    <rect x="3" y="3" width="7" height="9" rx="1" />
    <rect x="14" y="3" width="7" height="5" rx="1" />
    <rect x="14" y="12" width="7" height="9" rx="1" />
    <rect x="3" y="16" width="7" height="5" rx="1" />
  </svg>
);

const PotenzialIcon = () => (
  <svg {...iconBase} aria-hidden="true">
    <polygon points="12 2 22 8.5 19 19 5 19 2 8.5" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const LeitfadenIcon = () => (
  <svg {...iconBase} aria-hidden="true">
    <path d="M4 4h10a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4V4z" />
    <path d="M4 16h14" />
    <path d="M8 8h6" />
    <path d="M8 12h6" />
  </svg>
);

const AccountIcon = () => (
  <svg {...iconBase} aria-hidden="true">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
  </svg>
);

const BellIcon = () => (
  <svg {...iconBase} width="18" height="18" aria-hidden="true">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

interface NavItem {
  label: string;
  shortLabel: string;
  path: string;
  icon: ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Übersicht', shortLabel: 'Übersicht', path: '/dashboard', icon: <OverviewIcon /> },
  { label: 'Potenzialanalyse', shortLabel: 'Analyse', path: '/dashboard/potenzialanalyse', icon: <PotenzialIcon /> },
  { label: 'Leitfaden', shortLabel: 'Leitfaden', path: '/dashboard/leitfaden', icon: <LeitfadenIcon /> },
  { label: 'Account', shortLabel: 'Account', path: '/dashboard/account', icon: <AccountIcon /> },
];

export default function DashboardLayout() {
  const { logout, isSuperAdmin } = useAuth();

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: BRAND.colors.background, color: BRAND.colors.text }}
    >
      <header
        className="flex items-center justify-between px-4 py-3 border-b sticky top-0 z-30"
        style={{ borderColor: BRAND.colors.border, backgroundColor: BRAND.colors.background }}
      >
        <div className="flex items-center gap-2">
          <Wordmark size="md" />
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: BRAND.colors.accent }}
            aria-hidden="true"
          />
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => alert('Keine neuen Benachrichtigungen')}
            className="p-2 rounded-full transition-colors hover:opacity-70"
            style={{ color: BRAND.colors.text }}
            aria-label="Benachrichtigungen"
          >
            <BellIcon />
          </button>
          {isSuperAdmin && (
            <NavLink
              to="/admin"
              className="hidden sm:inline-block text-sm px-3 py-1.5 rounded-full border transition-colors hover:opacity-70"
              style={{ borderColor: BRAND.colors.border, color: BRAND.colors.text }}
              title="Zurück zur Admin-Ansicht"
            >
              &#x2190; Admin
            </NavLink>
          )}
          <button
            onClick={logout}
            className="text-sm px-3 py-1.5 rounded-full border transition-colors hover:opacity-70"
            style={{ borderColor: BRAND.colors.border, color: BRAND.colors.text }}
          >
            Abmelden
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Desktop sidebar */}
        <nav
          className="hidden md:flex flex-shrink-0 w-60 border-r flex-col pt-6 gap-1"
          style={{ borderColor: BRAND.colors.border, backgroundColor: BRAND.colors.background }}
        >
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/dashboard'}
              className={({ isActive }) =>
                [
                  'mx-2 px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-3',
                  isActive ? 'font-semibold' : 'hover:opacity-70',
                ].join(' ')
              }
              style={({ isActive }) =>
                isActive
                  ? {
                      backgroundColor: `${BRAND.colors.accent}26`,
                      color: BRAND.colors.text,
                      borderLeft: `3px solid ${BRAND.colors.accent}`,
                      paddingLeft: 9,
                    }
                  : { color: BRAND.colors.text }
              }
            >
              <span className="shrink-0" style={{ color: BRAND.colors.muted }}>
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <main
          className="flex-1 p-4 sm:p-6 overflow-y-auto pb-24 md:pb-6"
          style={{ backgroundColor: BRAND.colors.background }}
        >
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom tab bar (Apple iOS style) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t flex items-stretch"
        style={{
          backgroundColor: `${BRAND.colors.background}F2`,
          borderColor: BRAND.colors.border,
          backdropFilter: 'saturate(180%) blur(20px)',
          WebkitBackdropFilter: 'saturate(180%) blur(20px)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/dashboard'}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-opacity"
            style={({ isActive }) => ({
              color: isActive ? BRAND.colors.accent : BRAND.colors.muted,
            })}
          >
            {item.icon}
            <span className="text-[11px] font-medium">{item.shortLabel}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
