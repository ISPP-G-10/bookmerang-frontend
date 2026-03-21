import Header from "@/components/Header";
import BookSpotActionMenu from "@/components/bookspots/BookSpotActionMenu";
import CreateBookspotModal from "@/components/bookspots/CreateBookspotModal";
import { getMapHtml } from "@/components/bookspots/MapHtml";
import MyPendingBookSpotsModal from "@/components/bookspots/MyPendingBookSpotsModal";
import FontAwesome from "@expo/vector-icons/FontAwesome";

import {
  DEFAULT_RADIUS_KM,
  MAX_RADIUS_KM,
  getAddressFromCoordinates,
  getNearbyBookspots,
  getUserPendingBookspots,
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

  const webViewRef = useRef<WebView>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fetchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationRef = useRef<{ latitude: number; longitude: number } | null>(
    null,
  );

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

  // Fetch the user's own pending spots and paint them on the map with the amber icon
  const fetchUserPending = useCallback(async () => {
    try {
      const pending = await getUserPendingBookspots();
      sendToMap(`updateUserPendingSpots(${JSON.stringify(pending)})`);
    } catch (e: any) {
      console.warn("[BookSpots] pending error:", e?.message ?? e);
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

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handleMessage = (event: MessageEvent) => {
      try {
        const msg =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;
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
        }
        if (msg.type === "pickLocation") {
          (async () => {
            const address = await getAddressFromCoordinates(msg.lat, msg.lng);
            setPickedLocation({ lat: msg.lat, lng: msg.lng, address });
            setCreateModalOpen(true);
          })();
        }
      } catch {}
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [fetchNearby]);

  const handleNativeMessage = useCallback(
    (event: any) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
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
        }
        if (msg.type === "pickLocation") {
          (async () => {
            const address = await getAddressFromCoordinates(msg.lat, msg.lng);
            setPickedLocation({ lat: msg.lat, lng: msg.lng, address });
            setCreateModalOpen(true);
          })();
        }
      } catch {}
    },
    [fetchNearby],
  );

  // Re-send pending spots to map whenever the pending modal closes
  // (user may have deleted one)
  const handlePendingModalClose = useCallback(() => {
    setPendingModalOpen(false);
    fetchUserPending();
  }, [fetchUserPending]);

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

  // FAB: map-marker icon + small "+" badge
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
        <BookSpotActionMenu
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          onProposeNew={() => {
            setPickedLocation(null);
            setCreateModalOpen(true);
          }}
          onViewPending={() => setPendingModalOpen(true)}
        />
        <CreateBookspotModal
          visible={createModalOpen}
          onClose={() => {
            setCreateModalOpen(false);
            // Refresh pending pins after a new proposal
            fetchUserPending();
          }}
          pickedLocation={pickedLocation}
          onPickOnMap={() => {
            setCreateModalOpen(false);
            sendToMap("enablePickMode()");
          }}
        />
        <MyPendingBookSpotsModal
          visible={pendingModalOpen}
          onClose={handlePendingModalClose}
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
      <BookSpotActionMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onProposeNew={() => {
          setPickedLocation(null);
          setCreateModalOpen(true);
        }}
        onViewPending={() => setPendingModalOpen(true)}
      />
      <CreateBookspotModal
        visible={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          fetchUserPending();
        }}
        pickedLocation={pickedLocation}
        onPickOnMap={() => {
          setCreateModalOpen(false);
          sendToMap("enablePickMode()");
        }}
      />
      <MyPendingBookSpotsModal
        visible={pendingModalOpen}
        onClose={handlePendingModalClose}
      />
    </View>
  );
}
