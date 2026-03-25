import { getAccessToken } from "./authSession";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL!;

export async function apiRequest(endpoint: string, options?: RequestInit) {
  const token = await getAccessToken();

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  return response;
}

/**
 * Obtiene el ID interno y el plan del backend para el usuario autenticado.
 * Intenta GET /Auth/me. Si no existe, devuelve null.
 */
export async function fetchMyBackendUser(): Promise<{ id: string; plan: string } | null> {
  try {
    const res = await apiRequest("/Auth/me");
    if (!res.ok) return null;
    const data = await res.json();
    const id = data?.id ?? data?.userId ?? null;
    if (!id) return null;
    return { id, plan: data?.plan ?? "FREE" };
  } catch {
    return null;
  }
}

/** @deprecated Usa fetchMyBackendUser() que también devuelve el plan */
export async function fetchMyBackendUserId(): Promise<string | null> {
  const user = await fetchMyBackendUser();
  return user?.id ?? null;
}