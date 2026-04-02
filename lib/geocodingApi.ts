import { apiRequest } from "./api";

export interface GeocodingSuggestion {
  id: string;
  label: string;
  lat: number;
  lon: number;
}

export async function searchGeocodingSuggestions(
  query: string,
  limit = 5,
): Promise<GeocodingSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const res = await apiRequest(
    `/geocoding/search?q=${encodeURIComponent(trimmed)}&limit=${limit}`,
  );

  if (!res.ok) {
    throw new Error(`Geocoding search failed (${res.status})`);
  }

  const data = (await res.json()) as GeocodingSuggestion[];
  return Array.isArray(data) ? data : [];
}

export async function reverseGeocode(
  lat: number,
  lon: number,
): Promise<string | null> {
  const res = await apiRequest(
    `/geocoding/reverse?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}`,
  );

  if (!res.ok) {
    throw new Error(`Reverse geocoding failed (${res.status})`);
  }

  const data = (await res.json()) as { displayName?: string };
  const displayName = typeof data?.displayName === "string" ? data.displayName.trim() : "";
  return displayName.length > 0 ? displayName : null;
}
