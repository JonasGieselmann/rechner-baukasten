import { createContext, useContext, useEffect, useState } from 'react';
import { useSession, signOut } from '../lib/auth-client';
import type { Session, User } from 'better-auth/types';

// In production, frontend and API are served from the same origin
const API_URL = import.meta.env.VITE_API_URL || '';

export interface ExtendedUser extends User {
  role: 'super_admin' | 'user';
  approved: boolean;
}

interface AuthContextType {
  user: ExtendedUser | null;
  session: Session | null;
  loading: boolean;
  isSuperAdmin: boolean;
  isApproved: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isSuperAdmin: false,
  isApproved: false,
  logout: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: sessionData, isPending } = useSession();
  const [extendedUser, setExtendedUser] = useState<ExtendedUser | null>(null);
  const [userLoading, setUserLoading] = useState(false);

  // Fetch extended user data with role and approved status
  const fetchExtendedUser = async () => {
    if (!sessionData?.user) {
      setExtendedUser(null);
      return;
    }

    setUserLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/me`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setExtendedUser({
          ...data.user,
          role: data.user.role || 'user',
          approved: data.user.approved ?? false,
        });
      }
    } catch (error) {
      console.error('Failed to fetch extended user data:', error);
    } finally {
      setUserLoading(false);
    }
  };

  useEffect(() => {
    if (!isPending) {
      fetchExtendedUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionData?.user?.id, isPending]);

  const logout = async () => {
    await signOut();
    setExtendedUser(null);
  };

  const isLoading = isPending || userLoading;

  return (
    <AuthContext.Provider
      value={{
        user: extendedUser,
        session: sessionData?.session || null,
        loading: isLoading,
        isSuperAdmin: extendedUser?.role === 'super_admin',
        isApproved: extendedUser?.approved ?? false,
        logout,
        refreshUser: fetchExtendedUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
