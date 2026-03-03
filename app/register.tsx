import PreferencesModal from "@/components/PreferencesModal";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { apiRequest } from "../lib/api";
import supabase from "../lib/supabase";

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferencesError, setPreferencesError] = useState("");
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [availableGenres, setAvailableGenres] = useState<
    Array<{ id: number; name: string }>
  >([]);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const handleRegister = async () => {
    setLoading(true);
    setError("");

    // 1. Crear cuenta en Supabase
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: name,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // 2. Guardar en base_users
    try {
      const response = await apiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          username,
          name,
          profilePhoto: "",
          userType: 2, // USER
          latitud: 37.3886,
          longitud: -5.9823,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Register error:", errorText);
        setError("Error al guardar el perfil: " + errorText);
        setLoading(false);
        return;
      }
    } catch (err: any) {
      console.error("Register request error:", err);
      setError("Error en la solicitud: " + err.message);
      setLoading(false);
      return;
    }

    setLoading(false);

    // 3. Fetch genres and get location
    try {
      const {
        data: { session: newSession },
      } = await supabase.auth.getSession();
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/userpreferences/genres`,
        {
          headers: newSession?.access_token
            ? { Authorization: `Bearer ${newSession.access_token}` }
            : {},
        },
      );
      console.log("Genres response status:", res.status);

      if (res.ok) {
        const genres = await res.json();
        console.log("Genres loaded:", genres);
        console.log("Genres type:", typeof genres);
        console.log("Genres is array?", Array.isArray(genres));
        if (Array.isArray(genres) && genres.length > 0) {
          console.log("First genre:", genres[0]);
        }
        setAvailableGenres(genres);
      } else {
        console.error("Failed to fetch genres, status:", res.status);
        const errorText = await res.text();
        console.error("Error response:", errorText);
      }
    } catch (err) {
      console.error("Error fetching genres:", err);
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        try {
          const location = await Location.getCurrentPositionAsync({});
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        } catch (locErr) {
          console.warn(
            "Could not get current position, using default location",
          );
        }
      }
    } catch (permErr) {
      console.warn("Location permission denied or unavailable");
    }

    // 4. Mostrar modal de preferencias
    setShowPreferences(true);
  };

  const handleSavePreferences = async (preferences: {
    distanceKm: number;
    genres: string[];
    bookLength: string[];
  }) => {
    setPreferencesLoading(true);
    setPreferencesError("");
    try {
      console.log("=== Starting save preferences ===");
      console.log("Preferences:", preferences);

      // Get the current session to get the JWT token
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        console.error("No session found");
        setPreferencesError("No autorizado");
        setPreferencesLoading(false);
        return;
      }

      console.log("Session user ID:", session.user.id);

      // Get user ID from session
      const userId = session.user.id;

      // Use location from state or default coordinates
      const latitude = userLocation?.latitude || 37.3886;
      const longitude = userLocation?.longitude || -5.9823;

      // Use distanceKm directly from the input
      const radioKm = preferences.distanceKm || 10;

      // Map genre names to IDs using availableGenres from the API
      const genreIds: number[] = preferences.genres
        .map((name) => availableGenres.find((g) => g.name === name)?.id)
        .filter((id): id is number => id !== undefined);

      console.log("Mapped genreIds:", genreIds, "RadioKm:", radioKm);

      if (genreIds.length === 0 && preferences.genres.length > 0) {
        setPreferencesError("Error mapeando géneros. Intenta de nuevo.");
        setPreferencesLoading(false);
        return;
      }

      // Map book lengths to extension
      let extension = "MEDIUM"; // default
      if (preferences.bookLength.length > 0) {
        const lengths = preferences.bookLength;
        if (lengths.length === 3) {
          extension = "MEDIUM";
        } else if (lengths.includes("0-200")) {
          extension = "SHORT";
        } else if (lengths.includes("400+")) {
          extension = "LONG";
        }
      }

      console.log("Mapped extension:", extension);

      const apiUrl = `${process.env.EXPO_PUBLIC_API_URL}/api/users/${userId}/preferences`;
      const body = JSON.stringify({
        latitud: latitude,
        longitud: longitude,
        radioKm,
        extension,
        genreIds,
      });

      console.log("API URL:", apiUrl);
      console.log("Request body:", body);

      const res = await fetch(apiUrl, {
        method: "PUT",
        body,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      console.log("Response status:", res.status);

      if (res.ok) {
        console.log("✓ Preferences saved successfully");
        setShowPreferences(false);
        router.replace("/(tabs)" as any);
      } else {
        const errorData = await res.text();
        console.error("✗ Error response:", errorData);
        setPreferencesError(errorData || "Error al guardar preferencias");
      }
    } catch (err: any) {
      console.error("✗ Exception saving preferences:", err);
      setPreferencesError(err?.message || "Error al guardar preferencias");
    } finally {
      setPreferencesLoading(false);
    }
  };

  const handleSkipPreferences = () => {
    setShowPreferences(false);
    router.replace("/(tabs)" as any);
    router.replace("/(tabs)/matcher" as any);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-amber-50"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* Cabecera */}
        <View className="bg-amber-800 px-8 pt-16 pb-10 rounded-b-[40px] items-center">
          <Text className="text-5xl mb-3">📚</Text>
          <Text className="text-white text-3xl font-bold">Bookmerang</Text>
          <Text className="text-amber-200 text-sm mt-1">Crea tu cuenta</Text>
        </View>

        {/* Formulario */}
        <View className="px-8 pt-8">
          <Text className="text-gray-500 text-sm mb-1 ml-1">Email</Text>
          <TextInput
            className="border border-gray-200 bg-white rounded-xl p-4 mb-4 text-gray-800"
            placeholder="tu@email.com"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text className="text-gray-500 text-sm mb-1 ml-1">Contraseña</Text>
          <TextInput
            className="border border-gray-200 bg-white rounded-xl p-4 mb-4 text-gray-800"
            placeholder="••••••••"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Text className="text-gray-500 text-sm mb-1 ml-1">
            Nombre de usuario
          </Text>
          <TextInput
            className="border border-gray-200 bg-white rounded-xl p-4 mb-4 text-gray-800"
            placeholder="@usuario"
            placeholderTextColor="#9ca3af"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />

          <Text className="text-gray-500 text-sm mb-1 ml-1">Nombre</Text>
          <TextInput
            className="border border-gray-200 bg-white rounded-xl p-4 mb-4 text-gray-800"
            placeholder="Tu nombre"
            placeholderTextColor="#9ca3af"
            value={name}
            onChangeText={setName}
          />

          {error ? (
            <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <Text className="text-red-600 text-sm">{error}</Text>
            </View>
          ) : (
            <View className="mb-4" />
          )}

          <TouchableOpacity
            className={`rounded-xl p-4 items-center mb-4 ${loading ? "bg-amber-400" : "bg-amber-800"}`}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text className="text-white font-bold text-lg">
              {loading ? "Creando cuenta..." : "Registrarse"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center mb-8"
            onPress={() => router.replace("/login" as any)}
          >
            <Text className="text-amber-800 text-sm">
              ¿Ya tienes cuenta? Inicia sesión
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <PreferencesModal
        visible={showPreferences}
        onClose={() => setShowPreferences(false)}
        onSave={handleSavePreferences}
        onSkip={handleSkipPreferences}
        availableGenres={availableGenres}
        title="Completa tus preferencias"
        error={preferencesError}
        loading={preferencesLoading}
      />
    </KeyboardAvoidingView>
  );
}
