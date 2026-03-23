import supabase from './supabase';
import { CommunityDto, CreateCommunityRequest, CommunityLibraryBookDto } from '@/types/community';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5044/api';

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function exploreCommunities(latitude: number, longitude: number, radiusKm: number = 50): Promise<CommunityDto[]> {
  const headers = await getAuthHeaders();
  const url = new URL(`${API_URL}/communities/explore`);
  url.searchParams.append('latitude', latitude.toString());
  url.searchParams.append('longitude', longitude.toString());
  url.searchParams.append('radiusKm', radiusKm.toString());

  const res = await fetch(url.toString(), { headers });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error al explorar comunidades: ${res.status} ${errorText}`);
  }

  return res.json();
}

export async function getMyCommunities(): Promise<CommunityDto[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/communities/me`, { headers });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error al obtener mis comunidades: ${res.status} ${errorText}`);
  }

  return res.json();
}

export async function getCommunity(communityId: number): Promise<CommunityDto> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/communities/${communityId}`, { headers });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error al obtener comunidad: ${res.status} ${errorText}`);
  }

  return res.json();
}

export async function createCommunity(request: CreateCommunityRequest): Promise<CommunityDto> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/communities`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const errorText = await res.text();
    let message = errorText;
    try {
      const errorJson = JSON.parse(errorText);
      message = errorJson.message || errorJson.error || errorText;
    } catch {}
    throw new Error(message);
  }

  return res.json();
}

export async function joinCommunity(communityId: number): Promise<CommunityDto> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/communities/${communityId}/join`, {
    method: 'POST',
    headers,
  });

  if (!res.ok) {
    const errorText = await res.text();
    let message = errorText;
    try {
      const errorJson = JSON.parse(errorText);
      message = errorJson.message || errorJson.error || errorText;
    } catch {}
    throw new Error(message);
  }

  return res.json();
}

export async function deleteCommunity(communityId: number): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/communities/${communityId}`, {
    method: 'DELETE',
    headers,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error al eliminar comunidad: ${res.status} ${errorText}`);
  }
}

export async function leaveCommunity(communityId: number): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/communities/${communityId}/leave`, {
    method: 'POST',
    headers,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error al abandonar comunidad: ${res.status} ${errorText}`);
  }
}

// --- BIBLIOTECA ---

export async function getCommunityLibrary(
  communityId: number,
  page: number = 1,
  pageSize: number = 20
): Promise<CommunityLibraryBookDto[]> {
  const headers = await getAuthHeaders();
  const url = new URL(`${API_URL}/communities/${communityId}/library`);
  url.searchParams.append('page', page.toString());
  url.searchParams.append('pageSize', pageSize.toString());

  const res = await fetch(url.toString(), { headers });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error al cargar la biblioteca: ${res.status} ${errorText}`);
  }

  return res.json();
}

export async function toggleBookLike(communityId: number, bookId: number): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/communities/${communityId}/library/${bookId}/like`, {
    method: 'POST',
    headers,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error al dar like: ${res.status} ${errorText}`);
  }
}

