import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { Wordmark } from './Wordmark';
import { Avatar } from './Avatar';
import { BRAND } from '../../branding/tokens';

interface NavItem {
  label: string;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Plattform', path: '/admin' },
  { label: 'Organisationen', path: '/admin/organizations' },
  { label: 'Rechner', path: '/admin/rechner' },
  { label: 'Kunden', path: '/admin/customers' },
  { label: 'Benutzer', path: '/admin/users' },
  { label: 'Einstellungen', path: '/admin/settings' },
];

function isActivePath(pathname: string, search: string, itemPath: string): boolean {
  const [itemPath0, itemQuery] = itemPath.split('?');
  const currentTab = new URLSearchParams(search).get('tab');
  const itemTab = itemQuery ? new URLSearchParams(itemQuery).get('tab') : null;
  const pathMatches =
    pathname === itemPath0 || (itemPath0 !== '/admin' && pathname.startsWith(itemPath0 + '/'));
  return pathMatches && currentTab === itemTab;
}

export function AdminHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const go = (path: string) => {
    setMenuOpen(false);
    navigate(path);
  };

  return (
    <header
      className="border-b sticky top-0 z-30"
      style={{ backgroundColor: BRAND.colors.background, borderColor: BRAND.colors.border }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <Link to="/admin" className="flex items-center gap-2 hover:opacity-80 shrink-0">
          <Wordmark size="md" brand="kalku" />
          <span
            className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{ backgroundColor: BRAND.colors.accent, color: BRAND.colors.background }}
          >
            Plattform
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active = isActivePath(location.pathname, location.search, item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
                style={{
                  backgroundColor: active ? BRAND.colors.card : 'transparent',
                  color: BRAND.colors.text,
                }}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Desktop right actions */}
        <div className="hidden md:flex items-center gap-2">
          <Link
            to="/profil"
            aria-label="Profil und Einstellungen"
            title="Profil und Einstellungen"
            className="rounded-full transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2"
          >
            <Avatar name={user?.name} email={user?.email} size="sm" />
          </Link>
          <button
            onClick={logout}
            className="text-sm px-3 py-1.5 rounded-full border transition-opacity hover:opacity-70"
            style={{ borderColor: BRAND.colors.border, color: BRAND.colors.text }}
          >
            Abmelden
          </button>
        </div>

        {/* Mobile: avatar + hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <Link
            to="/profil"
            aria-label="Profil und Einstellungen"
            className="rounded-full transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2"
          >
            <Avatar name={user?.name} email={user?.email} size="sm" />
          </Link>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menü"
            aria-expanded={menuOpen}
            aria-controls="admin-mobile-menu"
            className="p-2 rounded-lg border transition-opacity hover:opacity-70"
            style={{ borderColor: BRAND.colors.border, color: BRAND.colors.text }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              {menuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <nav
          id="admin-mobile-menu"
          className="md:hidden border-t px-3 py-3 flex flex-col gap-1"
          style={{ borderColor: BRAND.colors.border, backgroundColor: BRAND.colors.background }}
        >
          {NAV_ITEMS.map((item) => {
            const active = isActivePath(location.pathname, location.search, item.path);
            return (
              <button
                key={item.path}
                onClick={() => go(item.path)}
                className="text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: active ? BRAND.colors.card : 'transparent',
                  color: BRAND.colors.text,
                }}
              >
                {item.label}
              </button>
            );
          })}
          <div className="border-t mt-1 pt-2 flex flex-col gap-1" style={{ borderColor: BRAND.colors.border }}>
            <button
              onClick={() => { setMenuOpen(false); logout(); }}
              className="text-left px-3 py-2.5 rounded-lg text-sm transition-opacity hover:opacity-70"
              style={{ color: BRAND.colors.text }}
            >
              Abmelden
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}
