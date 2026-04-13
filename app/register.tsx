import PreferencesModal from "@/components/PreferencesModal";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ErrorMessage } from "@/components/auth/ErrorMessage";
import { getMapHtml } from "@/components/bookspots/MapHtml";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/lib/authService";
import { GeocodingSuggestion, reverseGeocode, searchGeocodingSuggestions } from "@/lib/geocodingApi";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

type Genre = { id: number; name: string };

const FALLBACK_LAT = 37.3886;
const FALLBACK_LNG = -5.9823;

let StripeWebView: any = null;
if (Platform.OS !== "web") {
  StripeWebView = require("react-native-webview").WebView;
}

type MapPickerMessage =
  | { type: "pickLocation"; lat: number; lng: number }
  | { type: "pickCancelled" }
  | { type: string; [key: string]: unknown };

function extractSessionIdFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const candidates = ["session_id", "sessionId", "checkout_session_id"];
    for (const key of candidates) {
      const value = parsed.searchParams.get(key);
      if (value && value.trim().length > 0) return value;
    }
  } catch {
    // Fallback regex below.
  }

  const match = /[?&#](?:session_id|sessionId|checkout_session_id)=([^&#]+)/i.exec(url);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function openBookdropCheckoutPopup(checkoutUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("No se puede abrir la pasarela de pago en este dispositivo."));
      return;
    }

    const width = 520;
    const height = 760;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      checkoutUrl,
      "bookdrop_checkout",
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`,
    );

    if (!popup) {
      reject(new Error("No se pudo abrir la ventana de pago. Permite ventanas emergentes e intentalo de nuevo."));
      return;
    }

    let finished = false;
    const finish = (cb: () => void) => {
      if (finished) return;
      finished = true;
      clearInterval(checkInterval);
      clearTimeout(timeoutId);
      cb();
    };

    const checkInterval = setInterval(() => {
      try {
        if (popup.closed) {
          finish(() => reject(new Error("Pago cancelado antes de completarse.")));
          return;
        }

        const currentUrl = popup.location?.href;
        if (!currentUrl) return;

        if (currentUrl.includes("status=cancelled")) {
          finish(() => {
            popup.close();
            reject(new Error("Pago cancelado."));
          });
          return;
        }

        const sessionId = extractSessionIdFromUrl(currentUrl);
        const hasSuccessStatus = currentUrl.includes("status=success");

        if (!sessionId && !hasSuccessStatus) return;

        if (!sessionId) {
          finish(() => {
            popup.close();
            reject(new Error("Pago completado, pero no se recibio session_id. Revisa la URL de exito de Stripe."));
          });
          return;
        }

        finish(() => {
          popup.close();
          resolve(sessionId);
        });
      } catch {
        // The popup is still on Stripe domain (cross-origin). Keep waiting.
      }
    }, 500);

    const timeoutId = setTimeout(() => {
      finish(() => {
        try {
          popup.close();
        } catch {}
        reject(new Error("El pago tardo demasiado. Intentalo de nuevo."));
      });
    }, 10 * 60 * 1000);
  });
}

export default function RegisterScreen() {
  const { setBackendUserId } = useAuth();
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
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapPickerCenter, setMapPickerCenter] = useState<{ lat: number; lon: number }>({
    lat: FALLBACK_LAT,
    lon: FALLBACK_LNG,
  });
  const mapPickerWebViewRef = useRef<any>(null);
  const mapPickerIframeRef = useRef<HTMLIFrameElement | null>(null);

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
      setError("Selecciona una ubicación válida desde sugerencias o en el mapa");
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

  const mapPickerHtml = useMemo(
    () => getMapHtml(mapPickerCenter.lat, mapPickerCenter.lon),
    [mapPickerCenter.lat, mapPickerCenter.lon],
  );

  const sendMapPickerEval = useCallback((code: string) => {
    if (Platform.OS === "web") {
      mapPickerIframeRef.current?.contentWindow?.postMessage(
        { type: "eval", code },
        "*",
      );
      return;
    }

    mapPickerWebViewRef.current?.injectJavaScript(`${code}; true;`);
  }, []);

  const handleMapPickerMessage = useCallback((message: MapPickerMessage) => {
    if (!message || typeof message !== "object") return;

    if (message.type === "pickCancelled") {
      setShowMapPicker(false);
      return;
    }

    if (message.type !== "pickLocation") return;

    const nextLat = Number(message.lat);
    const nextLon = Number(message.lng);
    if (!Number.isFinite(nextLat) || !Number.isFinite(nextLon)) return;

    setBookdropLocation({ lat: nextLat, lon: nextLon });
    setAddressSuggestions([]);
    setShowMapPicker(false);
    setError("");

    void (async () => {
      try {
        const resolvedAddress = await reverseGeocode(nextLat, nextLon);
        if (resolvedAddress) {
          setBookdropAddress(resolvedAddress);
          return;
        }
      } catch {
        // si falla reverse geocoding, dejamos fallback de coordenadas
      }

      setBookdropAddress(`${nextLat.toFixed(6)}, ${nextLon.toFixed(6)}`);
    })();
  }, []);

  const openMapPicker = useCallback(() => {
    setAddressSuggestions([]);
    setSearchingAddress(false);
    setError("");

    const center =
      bookdropLocation ??
      (userLocation
        ? { lat: userLocation.latitude, lon: userLocation.longitude }
        : { lat: FALLBACK_LAT, lon: FALLBACK_LNG });

    setMapPickerCenter(center);
    setShowMapPicker(true);
  }, [bookdropLocation, userLocation]);

  const handleMapPickerLoaded = useCallback(() => {
    setTimeout(() => {
      sendMapPickerEval("enablePickMode()");
    }, 120);
  }, [sendMapPickerEval]);

  const handleMapPickerNativeMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        const parsed = JSON.parse(event.nativeEvent.data) as MapPickerMessage;
        handleMapPickerMessage(parsed);
      } catch {
        // ignore malformed messages
      }
    },
    [handleMapPickerMessage],
  );

  useEffect(() => {
    if (Platform.OS !== "web" || !showMapPicker) return;

    const onMessage = (event: MessageEvent) => {
      try {
        const parsed =
          typeof event.data === "string"
            ? (JSON.parse(event.data) as MapPickerMessage)
            : (event.data as MapPickerMessage);
        handleMapPickerMessage(parsed);
      } catch {
        // ignore malformed messages
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [handleMapPickerMessage, showMapPicker]);

  const closeBookdropCheckoutModal = useCallback(() => {
    setShowBookdropCheckout(false);
    setBookdropCheckoutUrl(null);
  }, []);

  const completeBookdropRegistration = useCallback(
    async (paymentSessionId: string) => {
      if (!bookdropLocation) {
        setError("No se pudo recuperar la ubicacion del establecimiento.");
        return;
      }

      setLoading(true);
      setError("");

      try {
        const userData = await authService.registerBookdropBackendProfile({
          Email: email.trim().toLowerCase(),
          Password: password,
          Username: username,
          Name: name,
          NombreEstablecimiento: bookdropName,
          AddressText: bookdropAddress,
          Latitud: bookdropLocation.lat,
          Longitud: bookdropLocation.lon,
          PaymentSessionId: paymentSessionId,
        });

        if (userData?.id) {
          setBackendUserId(userData.id);
          setRegisteredUserId(userData.id);
        }

        router.replace("/bookDropControlPanel" as any);
      } catch (err: any) {
        setError(err?.message || "No se pudo completar el registro de BookDrop.");
      } finally {
        setLoading(false);
      }
    },
    [bookdropAddress, bookdropLocation, bookdropName, email, name, password, setBackendUserId, username],
  );

  const handleBookdropCheckoutNavigationChange = useCallback(
    (navState: { url: string }) => {
      const currentUrl = navState.url;
      if (!currentUrl) return;

      if (currentUrl.includes("status=cancelled")) {
        bookdropCheckoutHandledRef.current = false;
        closeBookdropCheckoutModal();
        setError("Pago cancelado. Completa el pago de 1 EUR para crear el BookDrop.");
        return;
      }

      if (!currentUrl.includes("status=success")) return;
      if (bookdropCheckoutHandledRef.current) return;

      bookdropCheckoutHandledRef.current = true;
      const paymentSessionId = extractSessionIdFromUrl(currentUrl);
      closeBookdropCheckoutModal();

      if (!paymentSessionId) {
        bookdropCheckoutHandledRef.current = false;
        setError("Pago completado, pero no se recibio session_id. Revisa la configuracion de la URL de exito.");
        return;
      }

      void completeBookdropRegistration(paymentSessionId);
    },
    [closeBookdropCheckoutModal, completeBookdropRegistration],
  );


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
      let checkoutOptions: { successUrl?: string; cancelUrl?: string } | undefined;
      if (Platform.OS === "web" && typeof window !== "undefined") {
        const origin = window.location.origin;
        checkoutOptions = {
          successUrl:
            `${origin}/register?bookdrop=1&status=success&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${origin}/register?bookdrop=1&status=cancelled`,
        };
      }

      const checkoutUrl = await authService.createBookdropCheckoutSession(
        email.trim().toLowerCase(),
        checkoutOptions,
      );

      if (Platform.OS === "web") {
        setLoading(false);
        const paymentSessionId = await openBookdropCheckoutPopup(checkoutUrl);
        await completeBookdropRegistration(paymentSessionId);
        return;
      }

      // 3) Prepare Preferences Modal
      const genres = await authService.fetchGenres();
      setAvailableGenres(genres);

      
      setLoading(false);
      router.replace("/bookDropControlPanel" as any);
      //setShowPreferences(true);
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

          <TouchableOpacity
            onPress={openMapPicker}
            style={{
              borderWidth: 1.5,
              borderColor: "#e07a5f",
              borderRadius: 12,
              paddingVertical: 12,
              paddingHorizontal: 14,
              marginBottom: 8,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Ionicons name="map-outline" size={18} color="#e07a5f" />
            <Text style={{ color: "#e07a5f", fontWeight: "800" }}>
              {bookdropLocation ? "Cambiar ubicacion en mapa" : "Seleccionar ubicacion en mapa"}
            </Text>
          </TouchableOpacity>

          {bookdropLocation && (
            <Text style={{ color: "#7a6f84", fontSize: 12, marginBottom: 12 }}>
              Coordenadas: {bookdropLocation.lat.toFixed(5)}, {bookdropLocation.lon.toFixed(5)}
            </Text>
          )}
        </>
      )}

      {isBookdrop && (
        <View
          style={{
            backgroundColor: "#fdf3ef",
            borderColor: "#f2d4c8",
            borderWidth: 1,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            marginBottom: 10,
          }}
        >
          <Text style={{ color: "#7a4c3d", fontSize: 13, lineHeight: 18 }}>
            Para crear un BookDrop se requiere un pago unico de 1 EUR. Al pulsar
            "Crear cuenta", abriremos la pasarela de pago segura de Stripe.
          </Text>
        </View>
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

      <Modal
        visible={showMapPicker}
        animationType="slide"
        onRequestClose={() => setShowMapPicker(false)}
      >
        <View style={{ flex: 1, backgroundColor: "#fff" }}>
          <View
            style={{
              paddingTop: 56,
              paddingBottom: 12,
              paddingHorizontal: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: "#faf8f3",
              borderBottomWidth: 1,
              borderBottomColor: "#e8dcc8",
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "900", color: "#2d2520" }}>
              Seleccionar ubicacion en mapa
            </Text>
            <TouchableOpacity
              onPress={() => setShowMapPicker(false)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={24} color="#8B7355" />
            </TouchableOpacity>
          </View>
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 10,
              backgroundColor: "#fff8f4",
              borderBottomWidth: 1,
              borderBottomColor: "#f2dfd4",
            }}
          >
            <Text style={{ color: "#6b4f3f", fontSize: 13 }}>
              Arrastra el pin o toca en el mapa para fijar el BookDrop.
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            {Platform.OS === "web" ? (
              <iframe
                ref={mapPickerIframeRef}
                srcDoc={mapPickerHtml}
                onLoad={handleMapPickerLoaded}
                style={{ width: "100%", height: "100%", border: "none" }}
              />
            ) : (
              StripeWebView && (
                <StripeWebView
                  ref={mapPickerWebViewRef}
                  source={{ html: mapPickerHtml }}
                  originWhitelist={["*"]}
                  javaScriptEnabled
                  onMessage={handleMapPickerNativeMessage}
                  onLoadEnd={handleMapPickerLoaded}
                />
              )
            )}
          </View>
        </View>
      </Modal>

      {Platform.OS !== "web" && (
        <Modal
          visible={showBookdropCheckout}
          animationType="slide"
          onRequestClose={() => {
            bookdropCheckoutHandledRef.current = false;
            closeBookdropCheckoutModal();
            setError("Pago cancelado. Completa el pago de 1 EUR para crear el BookDrop.");
          }}
        >
          <View style={{ flex: 1, backgroundColor: "#fff" }}>
            <View
              style={{
                paddingTop: 56,
                paddingBottom: 12,
                paddingHorizontal: 16,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "#faf8f3",
                borderBottomWidth: 1,
                borderBottomColor: "#e8dcc8",
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "900", color: "#2d2520" }}>
                Pago BookDrop (1 EUR)
              </Text>
              <TouchableOpacity
                onPress={() => {
                  bookdropCheckoutHandledRef.current = false;
                  closeBookdropCheckoutModal();
                  setError("Pago cancelado. Completa el pago de 1 EUR para crear el BookDrop.");
                }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={24} color="#8B7355" />
              </TouchableOpacity>
            </View>

            {bookdropCheckoutUrl && StripeWebView && (
              <StripeWebView
                source={{ uri: bookdropCheckoutUrl }}
                onNavigationStateChange={handleBookdropCheckoutNavigationChange}
                startInLoadingState
                renderLoading={() => (
                  <View
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor: "#fff",
                    }}
                  >
                    <ActivityIndicator size="large" color="#e07a5f" />
                    <Text style={{ marginTop: 12, color: "#8B7355", fontSize: 14 }}>
                      Cargando pasarela de pago...
                    </Text>
                  </View>
                )}
              />
            )}
          </View>
        </Modal>
      )}
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
