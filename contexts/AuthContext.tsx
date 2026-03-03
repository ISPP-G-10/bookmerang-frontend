import { fetchMyBackendUserId } from '@/lib/api';
import supabase from '@/lib/supabase';
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
  /** Sesión de Supabase (contiene JWT, user, etc.) */
  session: any | null;

  /** ID interno del usuario en el backend (≠ Supabase UUID).
   *  Puede ser null si aún no se ha resuelto. */
  backendUserId: string | null;

  /** ID utilizable para identificar al usuario actual.
   *  Usa backendUserId si existe, si no el UUID de Supabase. */
  currentUserId: string | null;

  /** true mientras se está comprobando la sesión inicial */
  loading: boolean;

  /** Fija el ID interno del backend (resolverlo desde datos de chat, registro, etc.) */
  setBackendUserId: (id: string) => void;

  /** Cierra sesión de Supabase y limpia el estado */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  backendUserId: null,
  currentUserId: null,
  loading: true,
  setBackendUserId: () => {},
  signOut: async () => {},
});

// ── Helper ─────────────────────────────────────────────
const storageKey = (supabaseId: string) => `backendUserId_${supabaseId}`;

// ── Provider ───────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<any | null>(null);
  const [backendUserId, setBackendUserIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const setBackendUserId = useCallback((id: string) => {
    setBackendUserIdState(id);
    // Persistir para sobrevivir reinicios de app
    supabase.auth.getSession().then(({ data }: { data: any }) => {
      const supabaseId = data?.session?.user?.id;
      if (supabaseId) {
        AsyncStorage.setItem(storageKey(supabaseId), id);
      }
    });
  }, []);

  const signOut = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const supabaseId = data?.session?.user?.id;
    if (supabaseId) {
      await AsyncStorage.removeItem(storageKey(supabaseId));
    }
    setBackendUserIdState(null);
    await supabase.auth.signOut();
  }, []);

  // Intenta resolver el backendUserId desde el backend o desde AsyncStorage
  const resolveBackendUserId = useCallback(async (supabaseId: string) => {
    // Primero intentar desde AsyncStorage
    const stored = await AsyncStorage.getItem(storageKey(supabaseId));
    if (stored) {
      setBackendUserIdState(stored);
      return;
    }
    // Si no hay almacenado, intentar llamar al backend
    const resolved = await fetchMyBackendUserId();
    if (resolved) {
      setBackendUserIdState(resolved);
      AsyncStorage.setItem(storageKey(supabaseId), resolved);
    }
  }, []);

  useEffect(() => {
    // 1. Obtener sesión inicial y restaurar backendUserId persistido
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
      setSession(session);
      setLoading(false);

      if (!session) {
        router.replace('/login' as any);
      } else {
        const supabaseId = session.user?.id;
        if (supabaseId) {
          resolveBackendUserId(supabaseId);
        }
      }
    });

    // 2. Escuchar cambios de sesión (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setSession(session);

      if (!session) {
        // Limpiar userId al cerrar sesión
        setBackendUserIdState(null);
        router.replace('/login' as any);
      } else {
        // Al iniciar sesión, resolver backendUserId
        const supabaseId = session.user?.id;
        if (supabaseId) {
          resolveBackendUserId(supabaseId);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ID utilizable: backendUserId si existe, si no el UUID de Supabase
  const currentUserId = backendUserId ?? session?.user?.id ?? null;

  return (
    <AuthContext.Provider
      value={{ session, backendUserId, currentUserId, loading, setBackendUserId, signOut }}
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
