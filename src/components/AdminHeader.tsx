import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { Wordmark } from './Wordmark';
import { BRAND } from '../../branding/tokens';

interface NavItem {
  label: string;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Tools', path: '/admin' },
  { label: 'Funnels', path: '/admin?tab=funnel' },
  { label: 'Benutzer', path: '/admin/users' },
];

export function AdminHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const initial = user?.name?.charAt(0).toUpperCase() ?? '?';

  return (
    <header
      className="border-b sticky top-0 z-30"
      style={{ backgroundColor: BRAND.colors.background, borderColor: BRAND.colors.border }}
    >
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
        <Link to="/admin" className="flex items-center gap-2 hover:opacity-80">
          <Wordmark size="md" />
          <span
            className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{ backgroundColor: BRAND.colors.accent, color: BRAND.colors.background }}
          >
            Admin
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path.split('?')[0];
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

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm px-3 py-1.5 rounded-full border transition-opacity hover:opacity-70"
            style={{ borderColor: BRAND.colors.border, color: BRAND.colors.text }}
            title="Customer-Dashboard ansehen"
          >
            Customer-Ansicht ↗
          </button>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
            style={{ backgroundColor: BRAND.colors.accent, color: BRAND.colors.background }}
            title={user?.email}
          >
            {initial}
          </div>
          <button
            onClick={logout}
            className="text-sm px-3 py-1.5 rounded-full border transition-opacity hover:opacity-70"
            style={{ borderColor: BRAND.colors.border, color: BRAND.colors.text }}
          >
            Abmelden
          </button>
        </div>
      </div>
    </header>
  );
}
