import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { ProtectedRoute } from './ProtectedRoute';

// Guards Tier-2 (white-label agency) routes. Platform admins may also enter.
export function AgencyRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AgencyGate>{children}</AgencyGate>
    </ProtectedRoute>
  );
}

function AgencyGate({ children }: { children: React.ReactNode }) {
  const { isAgencyAdmin, isSuperAdmin } = useAuth();
  if (!isAgencyAdmin && !isSuperAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
