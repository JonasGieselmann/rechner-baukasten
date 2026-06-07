import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export function IndexRedirect() {
  const { user, loading, isSuperAdmin, isAgencyAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#7EC8F3] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  const target = isSuperAdmin ? '/admin' : isAgencyAdmin ? '/agency' : '/dashboard';
  return <Navigate to={target} replace />;
}
