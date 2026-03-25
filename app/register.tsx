import PreferencesModal from "@/components/PreferencesModal";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ErrorMessage } from "@/components/auth/ErrorMessage";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/lib/authService";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

type Genre = { id: number; name: string };

const FALLBACK_LAT = 37.3886;
const FALLBACK_LNG = -5.9823;

export default function RegisterScreen() {
  const { setBackendUserId } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [showPreferences, setShowPreferences] = useState(false);
  const [preferencesError, setPreferencesError] = useState("");
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [availableGenres, setAvailableGenres] = useState<Genre[]>([]);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [registeredUserId, setRegisteredUserId] = useState<string | null>(null);

  const validate = () => {
    if (!email || !password || !username || !name) {
      setError("Todos los campos son obligatorios");
      return false;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return false;
    }
    if (!email.includes("@")) {
      setError("El correo electrónico no es válido");
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setLoading(true);
    setError("");

    try {
      // 1) Get Location
      const { status } = await Location.requestForegroundPermissionsAsync();
      let latitud = FALLBACK_LAT;
      let longitud = FALLBACK_LNG;

      if (status === "granted") {
        const location = await Location.getCurrentPositionAsync({});
        latitud = location.coords.latitude;
        longitud = location.coords.longitude;
        setUserLocation({ latitude: latitud, longitude: longitud });
      }

      // 2) Backend Register
      const userData = await authService.registerBackendProfile({
        email,
        password,
        username,
        name,
        latitud,
        longitud,
      });

      if (userData?.id) {
        setBackendUserId(userData.id);
        setRegisteredUserId(userData.id);
      }

      // 3) Prepare Preferences Modal
      const genres = await authService.fetchGenres();
      setAvailableGenres(genres);

      setLoading(false);
      setShowPreferences(true);
    } catch (err: any) {
      setError(err.message || "Error al crear la cuenta");
      setLoading(false);
    }
  };

  const handleSavePreferences = async (preferences: {
    distanceKm: number;
    genres: string[];
    bookLength: string[];
  }) => {
    setPreferencesLoading(true);
    setPreferencesError("");

    try {
      const latitude = userLocation?.latitude ?? FALLBACK_LAT;
      const longitude = userLocation?.longitude ?? FALLBACK_LNG;

      const genreIds = preferences.genres
        .map((gName) => {
          const normalized = gName.toLowerCase().trim();
          return availableGenres.find(
            (g) => g.name.toLowerCase().trim() === normalized,
          )?.id;
        })
        .filter((id): id is number => id !== undefined);

      const extension =
        preferences.bookLength.includes("0-200") ? "SHORT" :
        preferences.bookLength.includes("400+") ? "LONG" : "MEDIUM";

      const userId = registeredUserId;
      if (!userId) throw new Error("Sesión no encontrada");

      await authService.updatePreferences(userId, {
        latitude,
        longitude,
        radioKm: preferences.distanceKm || 10,
        extension,
        genreIds,
      });

      setShowPreferences(false);
      router.replace("/(tabs)/matcher" as any);
    } catch (err: any) {
      setPreferencesError(err?.message || "Error al guardar preferencias");
    } finally {
      setPreferencesLoading(false);
    }
  };

  return (
    <AuthLayout title="Regístrate">
      <AuthInput
        icon="person-outline"
        placeholder="Nombre completo"
        value={name}
        onChangeText={setName}
      />

      <AuthInput
        icon="at-outline"
        placeholder="Nombre de usuario"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />

      <AuthInput
        icon="mail-outline"
        placeholder="Correo electrónico"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <AuthInput
        icon="lock-closed-outline"
        placeholder="Elige una contraseña"
        value={password}
        onChangeText={setPassword}
        isPassword
      />

      <ErrorMessage message={error} />

      <AuthButton
        title="Crear cuenta"
        onPress={handleRegister}
        loading={loading}
      />

      <View className="items-center mt-1">
        <Text className="text-[#9e9aad] text-sm">
          ¿Ya tienes cuenta?{" "}
          <Text
            className="text-[#e07a5f] font-bold underline"
            onPress={() => router.replace("/login" as any)}
          >
            Inicia sesión
          </Text>
        </Text>
      </View>

      <PreferencesModal
        visible={showPreferences}
        onClose={() => setShowPreferences(false)}
        onSave={handleSavePreferences}
        onSkip={() => router.replace("/(tabs)/matcher" as any)}
        availableGenres={availableGenres}
        title="Completa tus preferencias"
        error={preferencesError}
        loading={preferencesLoading}
      />
    </AuthLayout>
  );
}
