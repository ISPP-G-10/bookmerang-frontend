import PreferencesModal from "@/components/PreferencesModal";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ErrorMessage } from "@/components/auth/ErrorMessage";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/lib/authService";
import { getEmailValidationError, normalizeEmail } from "@/lib/emailValidation";
import { GeocodingSuggestion, searchGeocodingSuggestions } from "@/lib/geocodingApi";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

type Genre = { id: number; name: string };

const FALLBACK_LAT = 37.3886;
const FALLBACK_LNG = -5.9823;
const BOOKDROP_PENDING_KEY = "bookmerang:bookdrop-register-pending";

type PendingBookdropRegistration = {
  Email: string;
  Password: string;
  Username: string;
  Name: string;
  NombreEstablecimiento: string;
  AddressText: string;
  Latitud: number;
  Longitud: number;
};

export default function RegisterScreen() {
  const { setBackendUserId } = useAuth();
  const params = useLocalSearchParams<{ status?: string | string[]; session_id?: string | string[] }>();
  const [isBookdrop, setIsBookdrop] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");

  const [bookdropName, setBookdropName] = useState("");
  const [bookdropAddress, setBookdropAddress] = useState("");
  const [bookdropLocation, setBookdropLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<GeocodingSuggestion[]>([]);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const addressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const handledStripeSessionRef = useRef<string | null>(null);

  const paymentStatus = Array.isArray(params.status) ? params.status[0] : params.status;
  const stripeSessionId = Array.isArray(params.session_id) ? params.session_id[0] : params.session_id;

  const savePendingBookdropRegistration = (payload: PendingBookdropRegistration) => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    window.sessionStorage.setItem(BOOKDROP_PENDING_KEY, JSON.stringify(payload));
  };

  const loadPendingBookdropRegistration = (): PendingBookdropRegistration | null => {
    if (Platform.OS !== "web" || typeof window === "undefined") return null;
    const raw = window.sessionStorage.getItem(BOOKDROP_PENDING_KEY);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      return parsed as PendingBookdropRegistration;
    } catch {
      return null;
    }
  };

  const clearPendingBookdropRegistration = () => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    window.sessionStorage.removeItem(BOOKDROP_PENDING_KEY);
  };

  const applyPendingToForm = (pending: PendingBookdropRegistration) => {
    setEmail(pending.Email);
    setPassword(pending.Password);
    setUsername(pending.Username);
    setName(pending.Name);
    setBookdropName(pending.NombreEstablecimiento);
    setBookdropAddress(pending.AddressText);
    setBookdropLocation({ lat: pending.Latitud, lon: pending.Longitud });
  };

  useEffect(() => {
    if (paymentStatus === "cancelled") {
      const pending = loadPendingBookdropRegistration();
      if (pending) applyPendingToForm(pending);
      setIsBookdrop(true);
      setError("No se ha podido pagar. Intentalo de nuevo.");
      setLoading(false);
      return;
    }

    if (paymentStatus !== "success" || !stripeSessionId) return;
    if (handledStripeSessionRef.current === stripeSessionId) return;
    handledStripeSessionRef.current = stripeSessionId;

    const pending = loadPendingBookdropRegistration();
    if (!pending) {
      setIsBookdrop(true);
      setError("No hemos encontrado los datos del registro. Vuelve a completar el formulario.");
      setLoading(false);
      return;
    }

    applyPendingToForm(pending);
    setIsBookdrop(true);
    setLoading(true);
    setError("");

    (async () => {
      try {
        const result = await authService.registerBookdropBackendProfile({
          ...pending,
          StripeSessionId: stripeSessionId,
        });

        if (result.status !== "registered") {
          throw new Error("No se ha podido verificar el pago en Stripe.");
        }

        if (result.user?.id) {
          setBackendUserId(result.user.id);
          setRegisteredUserId(result.user.id);
        }

        clearPendingBookdropRegistration();
        router.replace("/bookDropControlPanel" as any);
      } catch (err: any) {
        setError(err?.message || "No se ha podido completar el registro tras el pago.");
      } finally {
        setLoading(false);
      }
    })();
  }, [paymentStatus, stripeSessionId, setBackendUserId]);
  const validate = () => {
    if (!email || !password || !username || !name) {
      setError("Todos los campos son obligatorios");
      return false;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return false;
    }
    const emailError = getEmailValidationError(email);
    if (emailError) {
      setError(emailError);
      return false;
    }
    return true;
  };

  const validateBookdrop = () => {
    if (!email || !password || !username || !name || !bookdropName || !bookdropAddress) {
      setError("Todos los campos son obligatorios");
      return false;
    }
    if (!bookdropLocation) {
      setError("Selecciona una dirección válida de la lista de sugerencias");
      return false;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return false;
    }
    const emailError = getEmailValidationError(email);
    if (emailError) {
      setError(emailError);
      return false;
    }
    return true;
  }

  const handleAddressSearch = (query: string) => {
    setBookdropAddress(query);
    setBookdropLocation(null);

    if (addressTimeoutRef.current) clearTimeout(addressTimeoutRef.current);

    addressTimeoutRef.current = setTimeout(async () => {
      if (query.trim().length < 3) {
        setAddressSuggestions([]);
        return;
      }
      try {
        setSearchingAddress(true);
        const results = await searchGeocodingSuggestions(query.trim());
        setAddressSuggestions(results);
      } catch {
        setAddressSuggestions([]);
      } finally {
        setSearchingAddress(false);
      }
    }, 500);
  };

  const handleSelectAddress = (suggestion: GeocodingSuggestion) => {
    setBookdropAddress(suggestion.label);
    setBookdropLocation({ lat: suggestion.lat, lon: suggestion.lon });
    setAddressSuggestions([]);
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
        email: normalizeEmail(email),
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

  const handleRegisterBookdrop = async () => {
    if (!validateBookdrop()) return;

    setLoading(true);
    setError("");

    try {
      const payload: PendingBookdropRegistration = {
        Email: normalizeEmail(email),
        Password: password,
        Username: username,
        Name: name,
        NombreEstablecimiento: bookdropName,
        AddressText: bookdropAddress,
        Latitud: bookdropLocation!.lat,
        Longitud: bookdropLocation!.lon,
      };

      const result = await authService.registerBookdropBackendProfile(payload);

      if (result.status === "payment_required") {
        savePendingBookdropRegistration(payload);

        if (Platform.OS === "web" && typeof window !== "undefined") {
          window.location.assign(result.checkoutUrl);
          return;
        }

        await Linking.openURL(result.checkoutUrl);
        setLoading(false);
        return;
      }

      if (result.user?.id) {
        setBackendUserId(result.user.id);
        setRegisteredUserId(result.user.id);
      }

      clearPendingBookdropRegistration();
      setLoading(false);
      router.replace("/bookDropControlPanel" as any);
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

      <View style={{ flexDirection: "row", alignSelf: "center", backgroundColor: "#f1f1f4", borderRadius: 999, padding: 4, marginBottom: 16 }}>
        <Pressable
          onPress={() => setIsBookdrop(false)}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 999,
            backgroundColor: !isBookdrop ? "#e07a5f" : "transparent",
          }}
        >
          <Text
            style={{
              color: !isBookdrop ? "#fff" : "#5f5b73",
              fontWeight: "600",
            }}
          >
            Usuario
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setIsBookdrop(true)}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 999,
            backgroundColor: isBookdrop ? "#e07a5f" : "transparent",
          }}
        >
          <Text
            style={{
              color: isBookdrop ? "#fff" : "#5f5b73",
              fontWeight: "600",
            }}
          >
            Bookdrop
          </Text>
        </Pressable>
      </View>

      {isBookdrop && (
        <Text style={{ color: "#5f5b73", fontWeight: "700", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10, marginTop: 4 }}>
          Datos del Responsable
        </Text>
      )}

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
        onChangeText={(value) => {
          setEmail(value);
          if (error) setError("");
        }}
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

      {isBookdrop && (
        <>
          <Text style={{ color: "#5f5b73", fontWeight: "700", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10, marginTop: 8 }}>
            Datos del Establecimiento
          </Text>

          <AuthInput
            icon="home-outline"
            placeholder="Nombre del establecimiento"
            value={bookdropName}
            onChangeText={setBookdropName}
          />

          <View className="flex-row items-center bg-white border border-[#e8e4dc] rounded-xl px-4 mb-4 h-14">
            <Ionicons name="map-outline" size={18} color="#b0adb8" style={{ marginRight: 10 }} />
            <TextInput
              className="flex-1 text-[15px] text-[#3d405b]"
              placeholderTextColor="#b0adb8"
              placeholder="Busca la dirección del establecimiento..."
              value={bookdropAddress}
              onChangeText={handleAddressSearch}
              autoCapitalize="none"
            />
            {searchingAddress && <ActivityIndicator size="small" color="#e07a5f" />}
            {bookdropLocation && <Ionicons name="checkmark-circle" size={20} color="#4caf50" />}
          </View>

          {addressSuggestions.length > 0 && (
            <View style={{ borderWidth: 1, borderColor: "#e8e4dc", borderRadius: 12, overflow: "hidden", marginBottom: 8, maxHeight: 160 }}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {addressSuggestions.map((item, index) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => handleSelectAddress(item)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderBottomWidth: index < addressSuggestions.length - 1 ? 1 : 0,
                      borderBottomColor: "#e8e4dc",
                      backgroundColor: index % 2 === 0 ? "#ffffff" : "#fdfbf7",
                    }}
                  >
                    <Text style={{ fontSize: 13, color: "#3d405b", lineHeight: 18 }} numberOfLines={2}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </>
      )}

      <ErrorMessage message={error} />

      <AuthButton
        title="Crear cuenta"
        onPress={(!isBookdrop) ? handleRegister : handleRegisterBookdrop}
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


