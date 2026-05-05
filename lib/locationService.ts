import * as Location from "expo-location";
import { apiRequest } from "./api";

export const updateUserLocation = async (userId?: string | number) => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      return null;
    }

    const location = await Location.getCurrentPositionAsync({});
    const lat = location.coords.latitude;
    const lon = location.coords.longitude;

    if (userId) {
      const response = await apiRequest(`/Auth/location`, {
        method: "PATCH",
        body: JSON.stringify({
          latitude: lat,
          longitude: lon,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }
    }

    return { latitude: lat, longitude: lon };
  } catch (error) {
    console.warn("Could not update location:", error);
    return null;
  }
};
