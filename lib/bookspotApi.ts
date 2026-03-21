import { apiRequest } from "./api";

export interface BookspotNearbyDTO {
  id: number;
  nombre: string;
  addressText: string;
  latitude: number;
  longitude: number;
  isBookdrop: boolean;
  distanceKm: number;
}

export interface BookspotPendingDTO {
  id: number;
  nombre: string;
  addressText: string;
  latitude: number;
  longitude: number;
  isBookdrop: boolean;
  status: string;
  validationCount: number;
  requiredValidations: number;
  createdAt: string;
}

export const MAX_RADIUS_KM = 20;
export const DEFAULT_RADIUS_KM = 1;

export async function getNearbyBookspots(
  latitude: number,
  longitude: number,
  radiusKm: number,
): Promise<BookspotNearbyDTO[]> {
  if (radiusKm > MAX_RADIUS_KM) return [];
  try {
    const res = await apiRequest(
      `/bookspots/nearby?latitude=${latitude}&longitude=${longitude}&radiusKm=${radiusKm.toFixed(2)}`,
    );
    if (!res.ok) {
      console.warn(`[BookSpots] API error ${res.status}:`, await res.text());
      return [];
    }
    return res.json();
  } catch (e: any) {
    console.warn("[BookSpots] fetch error:", e?.message ?? e);
    return [];
  }
}

export async function createBookspot(data: {
  nombre: string;
  addressText: string;
  latitude: number;
  longitude: number;
  isBookdrop: boolean;
}): Promise<any> {
  const res = await apiRequest(`/bookspots`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Error ${res.status}`);
  }
  return res.json();
}

export async function getUserPendingBookspots(): Promise<BookspotPendingDTO[]> {
  try {
    const res = await apiRequest(`/bookspots/user/pending`);
    if (!res.ok) {
      console.warn(`[BookSpots] API error ${res.status}:`, await res.text());
      return [];
    }
    return res.json();
  } catch (e: any) {
    console.warn("[BookSpots] fetch error:", e?.message ?? e);
    return [];
  }
}

export async function deleteBookspot(id: number): Promise<void> {
  const res = await apiRequest(`/bookspots/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Error ${res.status}`);
  }
}

export async function getAddressFromCoordinates(
  latitude: number,
  longitude: number,
): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      { headers: { "Accept-Language": "es" } },
    );
    const data = await res.json();
    const addr = data.address || {};
    const street = addr.road || addr.pedestrian || addr.footway || "";
    const number = addr.house_number ? ", " + addr.house_number : "";
    const district =
      addr.suburb || addr.neighbourhood || addr.city_district || "";
    const parts = [street + number, district].filter(Boolean);
    return parts.length > 0
      ? parts.join(" - ")
      : data.display_name || "Ubicación actual";
  } catch (e) {
    console.warn("[Address] lookup error:", e);
    return "Ubicación actual";
  }
}

export async function getRouteDistance(
  userLat: number,
  userLng: number,
  spotLat: number,
  spotLng: number,
): Promise<{ distanceM: number; durationS: number } | null> {
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/foot/${userLng},${userLat};${spotLng},${spotLat}?overview=full&geometries=geojson`,
    );
    const data = await res.json();
    if (data.routes && data.routes.length > 0) {
      return {
        distanceM: data.routes[0].distance,
        durationS: data.routes[0].duration,
      };
    }
    return null;
  } catch (e) {
    console.warn("[Route] calculation error:", e);
    return null;
  }
}

export function getRouteGeoJSON(
  userLng: number,
  userLat: number,
  spotLng: number,
  spotLat: number,
  data: any,
): any {
  if (data.routes && data.routes.length > 0) return data.routes[0].geometry;
  return null;
}
