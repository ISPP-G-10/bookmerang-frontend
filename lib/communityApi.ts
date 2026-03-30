import {
  CommunityDto,
  CreateCommunityRequest,
  CommunityLibraryBookDto,
  CommunityMeetupDto,
  CreateCommunityMeetupRequest,
  AttendCommunityMeetupRequest,
  MeetupAttendanceDto,
} from '@/types/community';
import { apiRequest } from './api';

export async function exploreCommunities(latitude: number, longitude: number, radiusKm: number = 50): Promise<CommunityDto[]> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    radiusKm: radiusKm.toString(),
  });
  const res = await apiRequest(`/communities/explore?${params.toString()}`);

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error al explorar comunidades: ${res.status} ${errorText}`);
  }

  return res.json();
}

export async function getMyCommunities(): Promise<CommunityDto[]> {
  const res = await apiRequest('/communities/me');

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error al obtener mis comunidades: ${res.status} ${errorText}`);
  }

  return res.json();
}

export async function getCommunity(communityId: number): Promise<CommunityDto> {
  const res = await apiRequest(`/communities/${communityId}`);

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error al obtener comunidad: ${res.status} ${errorText}`);
  }

  return res.json();
}

export async function createCommunity(request: CreateCommunityRequest): Promise<CommunityDto> {
  const res = await apiRequest('/communities', {
    method: 'POST',
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
  const res = await apiRequest(`/communities/${communityId}/join`, {
    method: 'POST',
  });

  if (!res.ok) {
    const errorText = await res.text();
    let message = `Error al unirse: ${res.status}`;
    
    try {
      const errorJson = JSON.parse(errorText);
      message = errorJson.error || errorJson.message || errorJson.detail || errorText;
    } catch {
      message = errorText || `Error ${res.status}`;
    }
    
    console.error('Backend Join Error:', message);
    throw new Error(message);
  }

  return res.json();
}

export async function deleteCommunity(communityId: number): Promise<void> {
  const res = await apiRequest(`/communities/${communityId}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error al eliminar comunidad: ${res.status} ${errorText}`);
  }
}

export async function leaveCommunity(communityId: number): Promise<void> {
  const res = await apiRequest(`/communities/${communityId}/leave`, {
    method: 'POST',
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
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  });
  const res = await apiRequest(`/communities/${communityId}/library?${params.toString()}`);

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error al cargar la biblioteca: ${res.status} ${errorText}`);
  }

  return res.json();
}

export async function toggleBookLike(communityId: number, bookId: number): Promise<void> {
  const res = await apiRequest(`/communities/${communityId}/library/${bookId}/like`, {
    method: 'POST',
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error al dar like: ${res.status} ${errorText}`);
  }
}

// --- QUEDADAS ---

export async function getCommunityMeetups(communityId: number): Promise<CommunityMeetupDto[]> {
  const res = await apiRequest(`/communities/${communityId}/meetups`);

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error al cargar las quedadas: ${res.status} ${errorText}`);
  }

  return res.json();
}

export async function createCommunityMeetup(
  communityId: number,
  request: CreateCommunityMeetupRequest
): Promise<CommunityMeetupDto> {
  const res = await apiRequest(`/communities/${communityId}/meetups`, {
    method: 'POST',
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error al crear la quedada: ${res.status} ${errorText}`);
  }

  return res.json();
}

export async function updateCommunityMeetup(
  communityId: number,
  meetupId: number,
  request: CreateCommunityMeetupRequest
): Promise<CommunityMeetupDto> {
  const res = await apiRequest(`/communities/${communityId}/meetups/${meetupId}`, {
    method: 'PUT',
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error al actualizar la quedada: ${res.status} ${errorText}`);
  }

  return res.json();
}

export async function deleteCommunityMeetup(communityId: number, meetupId: number): Promise<void> {
  const res = await apiRequest(`/communities/${communityId}/meetups/${meetupId}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error al eliminar la quedada: ${res.status} ${errorText}`);
  }
}

export async function attendCommunityMeetup(
  communityId: number,
  meetupId: number,
  request: AttendCommunityMeetupRequest
): Promise<MeetupAttendanceDto> {
  const res = await apiRequest(`/communities/${communityId}/meetups/${meetupId}/attend`, {
    method: 'POST',
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error al apuntarte a la quedada: ${res.status} ${errorText}`);
  }

  return res.json();
}

export async function cancelCommunityMeetupAttendance(
  communityId: number,
  meetupId: number
): Promise<void> {
  const res = await apiRequest(`/communities/${communityId}/meetups/${meetupId}/attend`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error al cancelar asistencia: ${res.status} ${errorText}`);
  }
}

