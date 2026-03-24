import { apiRequest } from './api';
import { Bookspot } from './mockBookspots';

export async function getActiveBookspots(): Promise<Bookspot[]> {
  const res = await apiRequest('/bookspots/active');

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error al obtener bookspots: ${res.status} ${errorText}`);
  }

  return res.json();
}

export async function getBookspotById(id: number): Promise<Bookspot> {
  const res = await apiRequest(`/bookspots/${id}`);

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error al obtener el bookspot: ${res.status} ${errorText}`);
  }

  return res.json();
}
