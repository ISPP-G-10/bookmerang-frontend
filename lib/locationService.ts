import * as Location from "expo-location";
import { apiRequest } from "./api";
import { Alert, Platform } from "react-native";

const showLocationPermissionMessage = () => {
  const title = "Permiso de ubicación necesario";
  const message =
    "No se puede actualizar tu ubicación sin permiso. Por favor, habilita el permiso de ubicación en la configuración de tu dispositivo.";

  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
    return;
  }

  Alert.alert(title, message);
};

export const updateUserLocation = async (userId?: string | number) => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      showLocationPermissionMessage();
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
