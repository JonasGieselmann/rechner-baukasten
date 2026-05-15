import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { BRAND } from '../../branding/tokens';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, isApproved, logout } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: BRAND.colors.background, color: BRAND.colors.text }}
      >
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: BRAND.colors.accent }}
        />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isApproved) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: BRAND.colors.background, color: BRAND.colors.text }}
      >
        <div
          className="rounded-2xl border p-8 max-w-md w-full text-center"
          style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}
        >
          <h1 className="text-xl font-bold mb-2">Genehmigung ausstehend</h1>
          <p className="opacity-70 mb-6">
            Dein Konto wartet auf die Genehmigung durch einen Administrator.
            Du wirst benachrichtigt, sobald dein Konto freigeschaltet wurde.
          </p>
          <div
            className="p-4 rounded-xl mb-6"
            style={{ backgroundColor: BRAND.colors.background, borderColor: BRAND.colors.border, borderWidth: 1, borderStyle: 'solid' }}
          >
            <p className="text-sm">
              <span className="opacity-60">Angemeldet als:</span> {user.email}
            </p>
          </div>
          <button
            onClick={logout}
            className="w-full py-3 px-4 rounded-full font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: BRAND.colors.primary, color: '#ffffff' }}
          >
            Abmelden
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
