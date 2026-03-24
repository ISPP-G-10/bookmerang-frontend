import Header from "@/components/Header";
import BookSpotActionMenu from "@/components/bookspots/BookSpotActionMenu";
import CreateBookspotModal from "@/components/bookspots/CreateBookspotModal";
import { getMapHtml } from "@/components/bookspots/MapHtml";
import MyPendingBookSpotsModal from "@/components/bookspots/MyPendingBookSpotsModal";
import ValidationCard, {
  getSeenSpotIds,
} from "@/components/bookspots/ValidationCard";
import FontAwesome from "@expo/vector-icons/FontAwesome";

import {
  DEFAULT_RADIUS_KM,
  MAX_RADIUS_KM,
  deleteBookspot,
  getAddressFromCoordinates,
  getNearbyBookspots,
  getRandomPendingBookspot,
  getUserActiveBookspots,
  getUserPendingBookspots,
  updateBookspotName,
} from "@/lib/bookspotApi";

import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

interface SpotToValidate {
  id: number;
  nombre: string;
  addressText: string;
}

export default function BookSpotsScreen() {
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [pendingModalOpen, setPendingModalOpen] = useState(false);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [pickedLocation, setPickedLocation] = useState<{
    lat: number;
    lng: number;
    address?: string;
  } | null>(null);
  const [spotToValidate, setSpotToValidate] = useState<SpotToValidate | null>(
    null,
  );
  const [pendingName, setPendingName] = useState("");
  const [createModalKey, setCreateModalKey] = useState(0);

  const webViewRef = useRef<WebView>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fetchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationRef = useRef<{ latitude: number; longitude: number } | null>(
    null,
  );
  const validationFetchedRef = useRef(false);

  // ── Ubicación ─────────────────
  useEffect(() => {
    if (Platform.OS === "web") {
      navigator.geolocation?.getCurrentPosition(
        (pos) => {
          const coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          locationRef.current = coords;
          setLocation(coords);
          setLoading(false);
        },
        () => {
          setPermissionDenied(true);
          setLoading(false);
        },
      );
      return;
    }
    let subscription: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setPermissionDenied(true);
        setLoading(false);
        return;
      }
      const current = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      };
      locationRef.current = coords;
      setLocation(coords);
      setLoading(false);
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 2,
        },
        (newLoc) => {
          const { latitude, longitude } = newLoc.coords;
          locationRef.current = { latitude, longitude };
          webViewRef.current?.injectJavaScript(
            `updateUserPosition(${latitude}, ${longitude}); true;`,
          );
        },
      );
    })();
    return () => {
      subscription?.remove();
    };
  }, []);

  // ── Validacion ─────────────────
  const fetchNextValidation = useCallback(async (delayMs = 0) => {
    const loc = locationRef.current;
    if (!loc) return;
    try {
      const spot = await getRandomPendingBookspot(
        loc.latitude,
        loc.longitude,
        DEFAULT_RADIUS_KM,
      );
      if (!spot) return;
      const seenIds = await getSeenSpotIds();
      if (seenIds.includes(spot.id)) return;
      const show = () =>
        setSpotToValidate({
          id: spot.id,
          nombre: spot.nombre,
          addressText: spot.addressText,
        });
      if (delayMs > 0) setTimeout(show, delayMs);
      else show();
    } catch {}
  }, []);

  useEffect(() => {
    if (!location || validationFetchedRef.current) return;
    validationFetchedRef.current = true;
    fetchNextValidation(1400);
  }, [location, fetchNextValidation]);

  // ── Mapeado de comunicaciones ───────────────────────
  const sendToMap = useCallback((js: string) => {
    if (Platform.OS !== "web") {
      webViewRef.current?.injectJavaScript(`${js}; true;`);
    } else {
      iframeRef.current?.contentWindow?.postMessage(
        { type: "eval", code: js },
        "*",
      );
    }
  }, []);

  const fetchNearby = useCallback(
    async (lat: number, lng: number, radiusKm: number) => {
      if (radiusKm > MAX_RADIUS_KM) {
        sendToMap("showTooFarMessage()");
        return;
      }
      try {
        const data = await getNearbyBookspots(lat, lng, radiusKm);
        sendToMap(
          `updateBookspots(${JSON.stringify(data)}, ${radiusKm.toFixed(1)})`,
        );
      } catch (e: any) {
        console.warn("[BookSpots] Error:", e?.message ?? e);
      }
    },
    [sendToMap],
  );

  const fetchUserPending = useCallback(async () => {
    try {
      const [pending, active] = await Promise.all([
        getUserPendingBookspots(),
        getUserActiveBookspots(),
      ]);
      sendToMap(`updateUserPendingSpots(${JSON.stringify(pending)})`);
      sendToMap(`updateUserActiveSpots(${JSON.stringify(active)})`);
    } catch (e: any) {
      console.warn("[BookSpots] pending/active error:", e?.message ?? e);
    }
  }, [sendToMap]);

  const handleWebViewLoad = useCallback(() => {
    const c = locationRef.current;
    if (c) {
      fetchNearby(c.latitude, c.longitude, DEFAULT_RADIUS_KM);
      fetchUserPending();
    }
  }, [fetchNearby, fetchUserPending]);

  const handleIframeLoad = useCallback(() => {
    const c = locationRef.current;
    if (c) {
      fetchNearby(c.latitude, c.longitude, DEFAULT_RADIUS_KM);
      fetchUserPending();
    }
  }, [fetchNearby, fetchUserPending]);

  // ── Logica de handler de mensaje ───────────────────────
  const handleMapMessage = useCallback(
    (msg: any) => {
      if (msg.type === "mapModalOpen") {
        setMapModalOpen(true);
        return;
      }
      if (msg.type === "mapModalClose") {
        setMapModalOpen(false);
        return;
      }

      if (msg.type === "viewChange") {
        if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
        fetchDebounceRef.current = setTimeout(
          () => fetchNearby(msg.lat, msg.lng, msg.radiusKm),
          600,
        );
        return;
      }

      if (msg.type === "pickLocation") {
        (async () => {
          const address = await getAddressFromCoordinates(msg.lat, msg.lng);
          setPickedLocation({ lat: msg.lat, lng: msg.lng, address });
          setCreateModalOpen(true);
        })();
        return;
      }

      if (msg.type === "pickCancelled") {
        setCreateModalOpen(true);
        return;
      }

      if (msg.type === "deletePendingSpot") {
        (async () => {
          try {
            await deleteBookspot(msg.id);
            fetchUserPending();
          } catch (e: any) {
            console.warn("[BookSpots] delete error:", e?.message ?? e);
          }
        })();
        return;
      }

      if (msg.type === "editPendingSpotName") {
        (async () => {
          try {
            await updateBookspotName(msg.id, msg.nombre);
            fetchUserPending();
          } catch (e: any) {
            console.warn("[BookSpots] rename error:", e?.message ?? e);
          }
        })();
        return;
      }
    },
    [fetchNearby, fetchUserPending],
  );

  // ── Mensajes web ────────────────────────────
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handleMessage = (event: MessageEvent) => {
      try {
        const msg =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        handleMapMessage(msg);
      } catch {}
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMapMessage]);

  // ── Mensajes nativos ────────────────
  const handleNativeMessage = useCallback(
    (event: any) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        handleMapMessage(msg);
      } catch {}
    },
    [handleMapMessage],
  );

  const handlePendingModalClose = useCallback(() => {
    setPendingModalOpen(false);
    fetchUserPending();
  }, [fetchUserPending]);

  // ── Render ─────────────────────────
  if (loading) {
    return (
      <View className="flex-1 bg-[#fdfbf7]">
        <Header />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#e07a5f" />
        </View>
      </View>
    );
  }

  if (permissionDenied) {
    return (
      <View className="flex-1 bg-[#fdfbf7]">
        <Header />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-xl font-bold text-[#3d405b] mb-3 text-center">
            Ubicación necesaria
          </Text>
          <Text className="text-sm text-[#9e9aad] text-center leading-6">
            Necesitamos acceso a tu ubicación para mostrarte los BookSpots
            cercanos. Actívala desde los ajustes del dispositivo.
          </Text>
        </View>
      </View>
    );
  }

  const mapHtml = getMapHtml(location!.latitude, location!.longitude);
  const anyModalOpen =
    menuOpen || createModalOpen || pendingModalOpen || mapModalOpen;

  const AddButton = (
    <Pressable
      onPress={() => setMenuOpen(true)}
      style={{
        position: "absolute",
        bottom: 20,
        right: 20,
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: "#e07a5f",
        alignItems: "center",
        justifyContent: "center",
        elevation: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.22,
        shadowRadius: 5,
        zIndex: anyModalOpen ? -1 : 10,
        opacity: anyModalOpen ? 0 : 1,
      }}
    >
      <FontAwesome name="map-marker" size={22} color="#ffffff" />
      <View
        style={{
          position: "absolute",
          top: 7,
          right: 7,
          width: 15,
          height: 15,
          borderRadius: 8,
          backgroundColor: "#ffffff",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            fontSize: 10,
            fontWeight: "900",
            color: "#e07a5f",
            lineHeight: 13,
          }}
        >
          +
        </Text>
      </View>
    </Pressable>
  );

  // PARA DESARROLLAR USANDO EXTENSIÓN DE CHROME, NO BORRAR
  if (Platform.OS === "web") {
    return (
      <View className="flex-1 bg-[#fdfbf7]">
        <Header />
        <View className="flex-1 relative">
          <iframe
            ref={iframeRef}
            srcDoc={mapHtml}
            onLoad={handleIframeLoad}
            style={{ width: "100%", height: "100%", border: "none" }}
          />
          {AddButton}
        </View>
        <ValidationCard
          spot={spotToValidate}
          userLocation={location}
          onDone={() => {
            setSpotToValidate(null);
            fetchNextValidation(800);
          }}
        />
        <BookSpotActionMenu
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          onProposeNew={() => {
            setPickedLocation(null);
            setPendingName("");
            setCreateModalKey((k) => k + 1);
            setCreateModalOpen(true);
          }}
          onViewPending={() => setPendingModalOpen(true)}
        />
        <CreateBookspotModal
          key={createModalKey}
          visible={createModalOpen}
          name={pendingName}
          onNameChange={setPendingName}
          onClose={() => {
            setCreateModalOpen(false);
            setPickedLocation(null);
            setPendingName("");
            setCreateModalKey((k) => k + 1); // resetea el estado del modal state
            fetchUserPending();
            sendToMap("disablePickMode()");
          }}
          pickedLocation={pickedLocation}
          onPickOnMap={() => {
            setPickedLocation(null); // quita la ubicación seleccionada
            setCreateModalOpen(false);
            // se mantiene el nombre
            sendToMap("enablePickMode()");
          }}
        />
        <MyPendingBookSpotsModal
          visible={pendingModalOpen}
          onClose={handlePendingModalClose}
          onRefresh={fetchUserPending}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#fdfbf7]">
      <Header />
      <View className="flex-1 relative">
        <WebView
          ref={webViewRef}
          style={{ flex: 1 }}
          source={{ html: mapHtml }}
          originWhitelist={["*"]}
          javaScriptEnabled
          onLoad={handleWebViewLoad}
          onMessage={handleNativeMessage}
        />
        {AddButton}
      </View>
      <ValidationCard
        spot={spotToValidate}
        userLocation={location}
        onDone={() => {
          setSpotToValidate(null);
          fetchNextValidation(800);
        }}
      />
      <BookSpotActionMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onProposeNew={() => {
          setPickedLocation(null);
          setPendingName("");
          setCreateModalKey((k) => k + 1);
          setCreateModalOpen(true);
        }}
        onViewPending={() => setPendingModalOpen(true)}
      />
      <CreateBookspotModal
        key={createModalKey}
        visible={createModalOpen}
        name={pendingName}
        onNameChange={setPendingName}
        onClose={() => {
          setCreateModalOpen(false);
          setPickedLocation(null);
          setPendingName("");
          setCreateModalKey((k) => k + 1);
          fetchUserPending();
          sendToMap("disablePickMode()");
        }}
        pickedLocation={pickedLocation}
        onPickOnMap={() => {
          setPickedLocation(null);
          setCreateModalOpen(false);
          sendToMap("enablePickMode()");
        }}
      />
      <MyPendingBookSpotsModal
        visible={pendingModalOpen}
        onClose={handlePendingModalClose}
        onRefresh={fetchUserPending}
      />
    </View>
  );
}
