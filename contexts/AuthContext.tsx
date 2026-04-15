import { fetchMyBackendUser } from '@/lib/api';
import { clearStoredAuthSession, getStoredAuthSession } from '@/lib/authSession';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

type AuthUserType = string | undefined | null;

type AuthSessionUser = {
  id: string;
  email: string;
  username?: string;
  name?: string;
  profilePhoto?: string;
  userType?: AuthUserType;
};

type AuthSession = {
  accessToken: string;
  user: AuthSessionUser;
};

interface AuthContextType {
  session: AuthSession | null;
  backendUserId: string | null;
  currentUserId: string | null;
  userPlan: string;
  loading: boolean;
  userType: AuthUserType;
  isBookdropUser: boolean;
  setBackendUserId: (id: string) => void;
  signOut: () => Promise<void>;
  refreshUserPlan: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  backendUserId: null,
  currentUserId: null,
  userPlan: 'FREE',
  loading: true,
  userType: null,
  isBookdropUser: false,
  setBackendUserId: () => {},
  signOut: async () => {},
  refreshUserPlan: async () => {},
});

const storageKey = (userId: string) => `backendUserId_${userId}`;

function normalizeUserType(userType: AuthUserType): string {
  return String(userType ?? '').trim().toUpperCase();
}

function isBookdropUserType(userType: AuthUserType): boolean {
  const normalized = normalizeUserType(userType);
  return normalized === 'BOOKDROP_USER' || normalized === 'BOOKDROP' || normalized === 'BUSINESS';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [backendUserId, setBackendUserIdState] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<string>('FREE');
  const [loading, setLoading] = useState(true);

  const safeGetStorageItem = useCallback(async (key: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.warn('[AuthContext] AsyncStorage.getItem failed:', error);
      return null;
    }
  }, []);

  const safeSetStorageItem = useCallback(async (key: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.warn('[AuthContext] AsyncStorage.setItem failed:', error);
    }
  }, []);

  const safeRemoveStorageItem = useCallback(async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.warn('[AuthContext] AsyncStorage.removeItem failed:', error);
    }
  }, []);

  const setBackendUserId = useCallback((id: string) => {
    setBackendUserIdState(id);
    const userId = session?.user?.id;
    if (userId) {
      void safeSetStorageItem(storageKey(userId), id);
    }
  }, [safeSetStorageItem, session]);

  const signOut = useCallback(async () => {
    const userId = session?.user?.id;
    if (userId) {
      await safeRemoveStorageItem(storageKey(userId));
    }
    setBackendUserIdState(null);
    setSession(null);
    await clearStoredAuthSession();
    router.replace('/login' as any);
  }, [safeRemoveStorageItem, session]);

  const resolveBackendUserId = useCallback(async (userId: string) => {
    const stored = await safeGetStorageItem(storageKey(userId));
    if (stored) {
      setBackendUserIdState(stored);
    }

    try {
      const backendUser = await fetchMyBackendUser();
      if (backendUser) {
        setBackendUserIdState(backendUser.id);
        setUserPlan(backendUser.plan);
        await safeSetStorageItem(storageKey(userId), backendUser.id);
      }
    } catch (error) {
      console.warn('[AuthContext] fetchMyBackendUser failed:', error);
    }
  }, [safeGetStorageItem, safeSetStorageItem]);

  const refreshUserPlan = useCallback(async () => {
    try {
      const backendUser = await fetchMyBackendUser();
      if (backendUser) {
        setUserPlan(backendUser.plan);
      }
    } catch (error) {
      console.warn('[AuthContext] refreshUserPlan failed:', error);
    }
  }, []);

  useEffect(() => {
    getStoredAuthSession().then((storedSession) => {
      setSession(storedSession);
      setLoading(false);

      const userId = storedSession?.user?.id;
      if (userId) {
        void resolveBackendUserId(userId);
      }
    });
  }, [resolveBackendUserId]);

  const currentUserId = backendUserId ?? session?.user?.id ?? null;
  const userType = session?.user?.userType;
  const isBookdropUser = isBookdropUserType(userType);

  return (
    <AuthContext.Provider
      value={{
        session,
        backendUserId,
        currentUserId,
        userPlan,
        loading,
        userType,
        isBookdropUser,
        setBackendUserId,
        signOut,
        refreshUserPlan,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de un <AuthProvider>');
  }
  return ctx;
}
