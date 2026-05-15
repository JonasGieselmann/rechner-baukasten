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
  { label: 'Rechner', path: '/admin' },
  { label: 'Funnels', path: '/admin?tab=funnel' },
  { label: 'Kunden', path: '/admin/customers' },
  { label: 'Benutzer', path: '/admin/users' },
];

export function AdminHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

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
            const [itemPath, itemQuery] = item.path.split('?');
            const currentTab = new URLSearchParams(location.search).get('tab');
            const itemTab = itemQuery ? new URLSearchParams(itemQuery).get('tab') : null;
            const pathMatches =
              location.pathname === itemPath ||
              (itemPath !== '/admin' && location.pathname.startsWith(itemPath + '/'));
            const active = pathMatches && currentTab === itemTab;
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
          <Avatar name={user?.name} email={user?.email} size="sm" />
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
