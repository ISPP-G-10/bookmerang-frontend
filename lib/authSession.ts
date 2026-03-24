import AsyncStorage from "@react-native-async-storage/async-storage";

const AUTH_SESSION_KEY = "auth_session";

export type StoredAuthUser = {
  id: string;
  supabaseId?: string;
  email: string;
  username?: string;
  name?: string;
  profilePhoto?: string;
};

export type StoredAuthSession = {
  accessToken: string;
  user: StoredAuthUser;
};

export async function getStoredAuthSession(): Promise<StoredAuthSession | null> {
  try {
    const raw = await AsyncStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredAuthSession;
  } catch {
    return null;
  }
}

export async function setStoredAuthSession(session: StoredAuthSession): Promise<void> {
  await AsyncStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

export async function updateStoredAuthUser(
  patch: Partial<StoredAuthUser>,
): Promise<StoredAuthSession | null> {
  const session = await getStoredAuthSession();
  if (!session) return null;

  const updatedSession: StoredAuthSession = {
    ...session,
    user: {
      ...session.user,
      ...patch,
    },
  };

  await setStoredAuthSession(updatedSession);
  return updatedSession;
}

export async function clearStoredAuthSession(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_SESSION_KEY);
}

export async function getAccessToken(): Promise<string | null> {
  const session = await getStoredAuthSession();
  return session?.accessToken ?? null;
}

export async function getStoredUserId(): Promise<string | null> {
  const session = await getStoredAuthSession();
  return session?.user?.id ?? null;
}
