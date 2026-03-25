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

// ── Tipos ──────────────────────────────────────────────
interface AuthContextType {
  /** Sesión local (contiene access token y datos básicos del usuario) */
  session: any | null;

  /** ID interno del usuario en el backend (≠ Supabase UUID).
   *  Puede ser null si aún no se ha resuelto. */
  backendUserId: string | null;

  /** ID utilizable para identificar al usuario actual. */
  currentUserId: string | null;

  /** Plan de pricing del usuario ('FREE' | 'PREMIUM') */
  userPlan: string;

  /** true mientras se está comprobando la sesión inicial */
  loading: boolean;

  /** Fija el ID interno del backend (resolverlo desde datos de chat, registro, etc.) */
  setBackendUserId: (id: string) => void;

  /** Cierra sesión local y limpia el estado */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  backendUserId: null,
  currentUserId: null,
  userPlan: 'FREE',
  loading: true,
  setBackendUserId: () => {},
  signOut: async () => {},
});

// ── Helper ─────────────────────────────────────────────
const storageKey = (userId: string) => `backendUserId_${userId}`;

// ── Provider ───────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<any | null>(null);
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

  // Intenta resolver el backendUserId y plan desde el backend o desde AsyncStorage
  const resolveBackendUserId = useCallback(async (userId: string) => {
    // Primero intentar desde AsyncStorage
    const stored = await safeGetStorageItem(storageKey(userId));
    if (stored) {
      setBackendUserIdState(stored);
    }
    // Siempre llamar al backend para obtener el plan actualizado
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

  useEffect(() => {
    getStoredAuthSession().then((storedSession) => {
      const restoredSession = storedSession
        ? {
            access_token: storedSession.accessToken,
            user: {
              id: storedSession.user.id,
              email: storedSession.user.email,
            },
          }
        : null;

      // 1. Obtener sesión inicial y restaurar backendUserId persistido
      setSession(restoredSession);
      setLoading(false);

      if (!restoredSession) {
        router.replace('/login' as any);
      } else {
        const userId = restoredSession.user?.id;
        if (userId) {
          void resolveBackendUserId(userId);
        }
      }
    });
  }, [resolveBackendUserId]);

  // ID utilizable: backendUserId si existe, si no el id de sesión local
  const currentUserId = backendUserId ?? session?.user?.id ?? null;

  return (
    <AuthContext.Provider
      value={{ session, backendUserId, currentUserId, userPlan, loading, setBackendUserId, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de un <AuthProvider>');
  }
  return ctx;
}
