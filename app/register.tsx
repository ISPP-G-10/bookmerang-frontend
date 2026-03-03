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

type Genre = { id: number; name: string };

function bookLengthToExtension(
  bookLength: string[],
): "SHORT" | "MEDIUM" | "LONG" {
  if (!bookLength || bookLength.length === 0) return "MEDIUM";
  if (bookLength.includes("0-200")) return "SHORT";
  if (bookLength.includes("200-400")) return "MEDIUM";
  if (bookLength.includes("400+")) return "LONG";
  return "MEDIUM";
}

function mapGenresToIds(
  selectedNames: string[],
  availableGenres: Genre[],
): number[] {
  return selectedNames
    .map((name) => {
      const normalized = name.toLowerCase().trim();
      return availableGenres.find((g) => g.name.toLowerCase().trim() === normalized)?.id;
    })
    .filter((id): id is number => id !== undefined);
}

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

  const [availableGenres, setAvailableGenres] = useState<Genre[]>([]);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const fetchGenres = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/genres`, {
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {},
      });

      if (!res.ok) {
        setAvailableGenres([
          { id: 1, name: "Ficción" },
          { id: 2, name: "No ficción" },
          { id: 3, name: "Fantasía" },
          { id: 4, name: "Romance" },
          { id: 5, name: "Misterio" },
          { id: 6, name: "Ciencia ficción" },
          { id: 7, name: "Biografía" },
          { id: 8, name: "Historia" },
          { id: 9, name: "Autoayuda" },
          { id: 10, name: "Infantil" },
          { id: 11, name: "Juvenil" },
          { id: 12, name: "Terror" },
          { id: 13, name: "Poesía" },
          { id: 14, name: "Ensayo" },
        ]);
        return;
      }

      const genres = await res.json();
      if (Array.isArray(genres)) setAvailableGenres(genres);
    } catch (err) {
      // fallback: usar géneros por defecto
      setAvailableGenres([
        { id: 1, name: "Ficción" },
        { id: 2, name: "No ficción" },
        { id: 3, name: "Fantasía" },
        { id: 4, name: "Romance" },
        { id: 5, name: "Misterio" },
        { id: 6, name: "Ciencia ficción" },
        { id: 7, name: "Biografía" },
        { id: 8, name: "Historia" },
        { id: 9, name: "Autoayuda" },
        { id: 10, name: "Infantil" },
        { id: 11, name: "Juvenil" },
        { id: 12, name: "Terror" },
        { id: 13, name: "Poesía" },
        { id: 14, name: "Ensayo" },
      ]);
    }
  };

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch {
      // silencioso: se usará ubicación por defecto al guardar preferencias
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    setError("");

    // Validar campos
    if (!email || !password || !username || !name) {
      setError("Todos los campos son obligatorios");
      setLoading(false);
      return;
    }

    // 1) Crear cuenta en Supabase
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // 2) Guardar en base_users (backend)
    try {
      const response = await apiRequest("/Auth/register", {
        method: "POST",
        body: JSON.stringify({
          username,
          name,
          profilePhoto: "",
          userType: 2,
          latitud: 37.3886,
          longitud: -5.9823,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        setError("Error al guardar el perfil: " + errorText);
        setLoading(false);
        return;
      }
    } catch (err: any) {
      setError("Error en la solicitud: " + (err?.message ?? "desconocido"));
      setLoading(false);
      return;
    }

    setLoading(false);

    // 3) Preparar modal: géneros + ubicación (no bloqueante, pero mejor en orden)
    await fetchGenres();
    await getUserLocation();

    // 4) Mostrar modal
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
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setPreferencesError("No autorizado");
        return;
      }

      const latitude = userLocation?.latitude ?? 37.3886;
      const longitude = userLocation?.longitude ?? -5.9823;

      const radioKm = preferences.distanceKm || 10;

      const genreIds = mapGenresToIds(preferences.genres, availableGenres);
      
      if (preferences.genres.length > 0 && genreIds.length === 0) {
        setPreferencesError("Error mapeando géneros. Intenta de nuevo.");
        return;
      }

      const extension = bookLengthToExtension(preferences.bookLength);

      const apiUrl = `${process.env.EXPO_PUBLIC_API_URL}/users/${session.user.id}/preferences`;

      const res = await fetch(apiUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          latitud: latitude,
          longitud: longitude,
          radioKm,
          extension,
          genreIds,
        }),
      });

      if (res.ok) {
        setShowPreferences(false);
        router.replace("/(tabs)/matcher" as any);
        return;
      }

      const errorData = await res.text();
      setPreferencesError(errorData || "Error al guardar preferencias");
    } catch (err: any) {
      setPreferencesError(err?.message || "Error al guardar preferencias");
    } finally {
      setPreferencesLoading(false);
    }
  };

  const handleSkipPreferences = () => {
    setShowPreferences(false);
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
            className={`rounded-xl p-4 items-center mb-4 ${
              loading ? "bg-amber-400" : "bg-amber-800"
            }`}
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
            disabled={loading}
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
