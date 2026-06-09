import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { Avatar } from './Avatar';
import { BRAND } from '../../branding/tokens';
import { useOrgQuery } from '../lib/useOrgQuery';

interface NavItem {
  label: string;
  path: string;
  end?: boolean;
}

const NAV: NavItem[] = [
  { label: 'Übersicht', path: '/agency', end: true },
  { label: 'Funnels', path: '/agency/funnels' },
  { label: 'Dashboards', path: '/agency/dashboards' },
];

// Org-branded header + nav for the agency / BeautyFlow-org workspace, distinct
// from the Kalku platform AdminHeader. Drop-in replacement for <AdminHeader/>
// (pages keep their own min-h-screen wrapper). Preserves ?orgId on every link so
// a super_admin drilling into an org stays scoped to it.
export function AgencyHeader() {
  const { user, isSuperAdmin, logout } = useAuth();
  const { orgId, withQ } = useOrgQuery();
  const location = useLocation();
  const [orgName, setOrgName] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch(withQ('/api/agency/org'), { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((o) => o && setOrgName(o.brandName || o.name || ''))
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const navStyle = (active: boolean) => ({
    backgroundColor: active ? BRAND.colors.card : 'transparent',
    color: BRAND.colors.text,
  });

  return (
    <header className="border-b sticky top-0 z-30" style={{ backgroundColor: BRAND.colors.background, borderColor: BRAND.colors.border }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Link to={withQ('/agency')} className="flex items-center gap-2 hover:opacity-80 shrink-0">
            <span className="text-lg font-semibold tracking-tight" style={{ color: BRAND.colors.text }}>{orgName || 'Agentur'}</span>
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ backgroundColor: `${BRAND.colors.accent}26`, color: BRAND.colors.primary }}>Agentur</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((item) => (
              <NavLink key={item.path} to={withQ(item.path)} end={item.end} className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors" style={({ isActive }) => navStyle(isActive)}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Desktop right actions */}
          <div className="hidden md:flex items-center gap-2">
            {isSuperAdmin && (
              <Link to="/admin" className="text-sm px-3 py-1.5 rounded-full border transition-opacity hover:opacity-70" style={{ borderColor: BRAND.colors.border, color: BRAND.colors.text }} title="Zurück zur Kalku-Plattform">
                &#x2190; Plattform
              </Link>
            )}
            <Link to="/profil" aria-label="Profil und Einstellungen" className="rounded-full transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2">
              <Avatar name={user?.name} email={user?.email} size="sm" />
            </Link>
            <button onClick={logout} className="text-sm px-3 py-1.5 rounded-full border transition-opacity hover:opacity-70" style={{ borderColor: BRAND.colors.border, color: BRAND.colors.text }}>Abmelden</button>
          </div>

          {/* Mobile: avatar + hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <Link to="/profil" aria-label="Profil und Einstellungen" className="rounded-full transition-opacity hover:opacity-80">
              <Avatar name={user?.name} email={user?.email} size="sm" />
            </Link>
            <button onClick={() => setMenuOpen((o) => !o)} aria-label="Menü" aria-expanded={menuOpen} className="p-2 rounded-lg border transition-opacity hover:opacity-70" style={{ borderColor: BRAND.colors.border, color: BRAND.colors.text }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                {menuOpen ? (<><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>) : (<><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>)}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <nav className="md:hidden border-t px-3 py-3 flex flex-col gap-1" style={{ borderColor: BRAND.colors.border, backgroundColor: BRAND.colors.background }}>
            {NAV.map((item) => {
              const active = item.end ? location.pathname === item.path : location.pathname.startsWith(item.path);
              return (
                <NavLink key={item.path} to={withQ(item.path)} end={item.end} onClick={() => setMenuOpen(false)} className="text-left px-3 py-2.5 rounded-lg text-sm font-medium" style={navStyle(active)}>
                  {item.label}
                </NavLink>
              );
            })}
            <div className="border-t mt-1 pt-2 flex flex-col gap-1" style={{ borderColor: BRAND.colors.border }}>
              {isSuperAdmin && (
                <Link to="/admin" onClick={() => setMenuOpen(false)} className="text-left px-3 py-2.5 rounded-lg text-sm" style={{ color: BRAND.colors.text }}>&#x2190; Plattform</Link>
              )}
              <button onClick={() => { setMenuOpen(false); logout(); }} className="text-left px-3 py-2.5 rounded-lg text-sm" style={{ color: BRAND.colors.text }}>Abmelden</button>
            </div>
          </nav>
        )}
      </header>
  );
}

// Convenience wrapper for pages that don't bring their own min-h-screen chrome.
export function AgencyLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: BRAND.colors.background, color: BRAND.colors.text }}>
      <AgencyHeader />
      {children}
    </div>
  );
}
