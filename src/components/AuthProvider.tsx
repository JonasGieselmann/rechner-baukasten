import { createContext, useContext } from 'react';
import { useSession, signOut } from '../lib/auth-client';
import type { Session, User } from 'better-auth/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: sessionData, isPending } = useSession();

  const logout = async () => {
    await signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user: sessionData?.user || null,
        session: sessionData?.session || null,
        loading: isPending,
        logout,
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
