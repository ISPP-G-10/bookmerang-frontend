import supabase from './supabase';
import { Bookspot } from './mockBookspots';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5044/api';

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function getActiveBookspots(): Promise<Bookspot[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/bookspots/active`, { headers });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error al obtener bookspots: ${res.status} ${errorText}`);
  }

  return res.json();
}

export async function getBookspotById(id: number): Promise<Bookspot> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/bookspots/${id}`, { headers });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error al obtener el bookspot: ${res.status} ${errorText}`);
  }

  return res.json();
}
