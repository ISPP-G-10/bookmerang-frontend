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

export const MAX_RADIUS_KM = 20;
export const DEFAULT_RADIUS_KM = 1;

export async function getNearbyBookspots(
  latitude: number,
  longitude: number,
  radiusKm: number,
): Promise<BookspotNearbyDTO[]> {
  if (radiusKm > MAX_RADIUS_KM) {
    return [];
  }

  try {
    const res = await apiRequest(
      `/bookspots/nearby?latitude=${latitude}&longitude=${longitude}&radiusKm=${radiusKm.toFixed(2)}`,
    );

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[BookSpots] API error ${res.status}:`, errText);
      return [];
    }

    const data: BookspotNearbyDTO[] = await res.json();
    return data;
  } catch (e: any) {
    console.warn("[BookSpots] fetch error:", e?.message ?? e);
    return [];
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
): Promise<{
  distanceM: number;
  durationS: number;
} | null> {
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/foot/${userLng},${userLat};${spotLng},${spotLat}?overview=full&geometries=geojson`,
    );
    const data = await res.json();
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      return {
        distanceM: route.distance,
        durationS: route.duration,
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
  if (data.routes && data.routes.length > 0) {
    return data.routes[0].geometry;
  }
  return null;
}
