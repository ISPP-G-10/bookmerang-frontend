import PreferencesModal from "@/components/PreferencesModal";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/api";
import supabase from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

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
  const { setBackendUserId } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

    // Validar ubicación
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setError(
        "Necesitamos tu ubicación para mostrarte libros cercanos. Actívala en los ajustes.",
      );
      setLoading(false);
      return;
    }

    const location = await Location.getCurrentPositionAsync({});
    const latitud = location.coords.latitude;
    const longitud = location.coords.longitude;

    // 1) Crear cuenta en Supabase
    const { data, error: signUpError } = await supabase.auth.signUp({
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
          latitud,
          longitud,
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

    // Intentar capturar el ID interno del backend desde la respuesta
    try {
      const userData = await response.json();
      if (userData?.id) {
        setBackendUserId(userData.id);
      }
    } catch {
      // La respuesta puede no ser JSON; no es crítico
    }

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
      className="flex-1 bg-[#fdfbf7]"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="items-center pt-14 pb-4 bg-[#fdfbf7]">
          {/* Logo */}
          <View className="flex-row items-center mb-6">
            <View className="bg-[#e07a5f] rounded-lg p-1.5 mr-2">
              <Ionicons name="book-outline" size={18} color="#ffffff" />
            </View>
            <Text className="text-2xl font-bold text-[#3d405b] tracking-wide">
              Bookmerang
            </Text>
          </View>

          {/* Imagen */}
          <Image
            source={require("../assets/images/fondo_bookmerang.png")}
            style={{ width: "100%", height: 220 }}
            resizeMode="cover"
          />
        </View>

        {/* Formulario */}
        <View className="flex-1 px-7 pt-2 pb-8 bg-[#fdfbf7]">
          <Text className="text-3xl font-bold text-[#3d405b] mb-7 text-center">
            Regístrate
          </Text>

          {/* Campo nombre completo */}
          <View className="flex-row items-center bg-white border border-[#e8e4dc] rounded-xl px-4 mb-4 h-14">
            <Ionicons
              name="person-outline"
              size={18}
              color="#b0adb8"
              style={{ marginRight: 10 }}
            />
            <TextInput
              className="flex-1 text-[15px] text-[#3d405b]"
              placeholder="Nombre completo"
              placeholderTextColor="#b0adb8"
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Usuario */}
          <View className="flex-row items-center bg-white border border-[#e8e4dc] rounded-xl px-4 mb-4 h-14">
            <Ionicons
              name="at-outline"
              size={18}
              color="#b0adb8"
              style={{ marginRight: 10 }}
            />
            <TextInput
              className="flex-1 text-[15px] text-[#3d405b]"
              placeholder="Nombre de usuario"
              placeholderTextColor="#b0adb8"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>

          {/* Campo email */}
          <View className="flex-row items-center bg-white border border-[#e8e4dc] rounded-xl px-4 mb-4 h-14">
            <Ionicons
              name="mail-outline"
              size={18}
              color="#b0adb8"
              style={{ marginRight: 10 }}
            />
            <TextInput
              className="flex-1 text-[15px] text-[#3d405b]"
              placeholder="Correo electrónico"
              placeholderTextColor="#b0adb8"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {/* Campo contraseña */}
          <View className="flex-row items-center bg-white border border-[#e8e4dc] rounded-xl px-4 mb-2.5 h-14">
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color="#b0adb8"
              style={{ marginRight: 10 }}
            />
            <TextInput
              className="flex-1 text-[15px] text-[#3d405b]"
              placeholder="Elige una contraseña"
              placeholderTextColor="#b0adb8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={18}
                color="#b0adb8"
              />
            </TouchableOpacity>
          </View>

          {/* Error */}
          {error ? (
            <View className="bg-[#fef2f0] border border-[#f8c4bb] rounded-xl p-3 mb-4 mt-2">
              <Text className="text-[#e07a5f] text-sm">{error}</Text>
            </View>
          ) : (
            <View className="mb-4" />
          )}

          {/* Botón principal */}
          <TouchableOpacity
            className={`rounded-full py-4 items-center mb-4 ${
              loading ? "bg-[#f0a898]" : "bg-[#e07a5f]"
            }`}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text className="text-white font-bold text-base">
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </Text>
          </TouchableOpacity>

          {/* Link a login */}
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
