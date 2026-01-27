import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, isApproved, logout } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#04070d] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-[#7EC8F3]/20 flex items-center justify-center animate-pulse">
            <svg className="w-6 h-6 text-[#7EC8F3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <p className="text-[#6b7a90]">Laden...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login but save the attempted URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Show pending approval page if user is not approved
  if (!isApproved) {
    return (
      <div className="min-h-screen bg-[#04070d] flex items-center justify-center p-4">
        <div className="bg-[#10131c] rounded-2xl border border-[#1a1f2e] p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-yellow-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Genehmigung ausstehend</h1>
          <p className="text-[#6b7a90] mb-6">
            Dein Konto wartet auf die Genehmigung durch einen Administrator.
            Du wirst benachrichtigt, sobald dein Konto freigeschaltet wurde.
          </p>
          <div className="p-4 bg-[#1a1f2e] rounded-xl mb-6">
            <p className="text-sm text-[#b8c7d9]">
              <span className="text-[#6b7a90]">Angemeldet als:</span> {user.email}
            </p>
          </div>
          <button
            onClick={logout}
            className="w-full py-3 px-4 rounded-xl bg-[#1a1f2e] text-[#b8c7d9] hover:text-white
                       hover:bg-[#2a3142] transition-colors font-medium"
          >
            Abmelden
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
