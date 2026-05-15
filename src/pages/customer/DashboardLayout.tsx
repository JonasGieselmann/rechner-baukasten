import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../components/AuthProvider';
import { BRAND } from '../../../branding/tokens';

interface NavItem {
  label: string;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Übersicht', path: '/dashboard' },
  { label: 'Potenzialanalyse', path: '/dashboard/potenzialanalyse' },
  { label: 'Leitfaden', path: '/dashboard/leitfaden' },
  { label: 'Account', path: '/dashboard/account' },
];

export default function DashboardLayout() {
  const { logout, isSuperAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: BRAND.colors.background, color: BRAND.colors.text }}
    >
      <header
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: BRAND.colors.border }}
      >
        <div className="flex items-center gap-2">
          <button
            className="md:hidden p-1 rounded"
            aria-label="Menu"
            onClick={() => setSidebarOpen((v) => !v)}
          >
            <span className="block w-5 h-0.5 bg-current mb-1" />
            <span className="block w-5 h-0.5 bg-current mb-1" />
            <span className="block w-5 h-0.5 bg-current" />
          </button>
          <span className="text-lg font-bold tracking-tight">
            BeautyFlow
          </span>
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: BRAND.colors.accent }}
            aria-hidden="true"
          />
        </div>
        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <NavLink
              to="/admin"
              className="text-sm px-3 py-1.5 rounded-full border transition-colors hover:opacity-70"
              style={{ borderColor: BRAND.colors.border, color: BRAND.colors.text }}
              title="Zurück zur Admin-Ansicht"
            >
              ← Admin
            </NavLink>
          )}
          <button
            onClick={logout}
            className="text-sm px-3 py-1.5 rounded-full border transition-colors hover:opacity-70"
            style={{ borderColor: BRAND.colors.border }}
          >
            Abmelden
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <nav
          className={[
            'flex-shrink-0 w-56 border-r flex flex-col pt-6 gap-1',
            'fixed inset-y-0 left-0 z-20 bg-white transition-transform md:static md:translate-x-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          ].join(' ')}
          style={{ borderColor: BRAND.colors.border, backgroundColor: BRAND.colors.background }}
        >
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/dashboard'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                [
                  'mx-2 px-3 py-2 rounded text-sm transition-colors',
                  isActive
                    ? 'font-bold border-l-2'
                    : 'hover:opacity-70',
                ].join(' ')
              }
              style={({ isActive }) =>
                isActive
                  ? { borderLeftColor: BRAND.colors.accent, color: BRAND.colors.text }
                  : { color: BRAND.colors.text }
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {sidebarOpen && (
          <div
            className="fixed inset-0 z-10 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main
          className="flex-1 p-4 sm:p-6 overflow-y-auto"
          style={{ backgroundColor: BRAND.colors.background }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
