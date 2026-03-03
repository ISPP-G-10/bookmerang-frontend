import supabase from "./supabase";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL!;

export async function apiRequest(endpoint: string, options?: RequestInit) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });

  return response;
}

/**
 * Obtiene el ID interno del backend para el usuario autenticado.
 * Intenta GET /auth/me. Si no existe, devuelve null.
 */
export async function fetchMyBackendUserId(): Promise<string | null> {
  try {
    const res = await apiRequest("/auth/me");
    if (!res.ok) return null;
    const data = await res.json();
    // Aceptar respuestas con { id: "..." } o { userId: "..." }
    return data?.id ?? data?.userId ?? null;
  } catch {
    return null;
  }
}