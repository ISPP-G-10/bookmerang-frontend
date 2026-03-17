import Header from "@/components/Header";
import { getMapHtml } from "@/components/bookspots/MapHtml";
import {
  DEFAULT_RADIUS_KM,
  MAX_RADIUS_KM,
  getNearbyBookspots,
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
        const spotsJson = JSON.stringify(data);
        sendToMap(`updateBookspots(${spotsJson}, ${radiusKm.toFixed(1)})`);
      } catch (e: any) {
        console.warn("[BookSpots] Error:", e?.message ?? e);
      }
    },
    [sendToMap],
  );

  const handleWebViewLoad = useCallback(() => {
    const coords = locationRef.current;
    if (coords)
      fetchNearby(coords.latitude, coords.longitude, DEFAULT_RADIUS_KM);
  }, [fetchNearby]);

  const handleIframeLoad = useCallback(() => {
    const coords = locationRef.current;
    if (coords)
      fetchNearby(coords.latitude, coords.longitude, DEFAULT_RADIUS_KM);
  }, [fetchNearby]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handleMessage = (event: MessageEvent) => {
      try {
        const msg =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (msg.type === "viewChange") {
          if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
          fetchDebounceRef.current = setTimeout(() => {
            fetchNearby(msg.lat, msg.lng, msg.radiusKm);
          }, 600);
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
        if (msg.type === "viewChange") {
          if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
          fetchDebounceRef.current = setTimeout(() => {
            fetchNearby(msg.lat, msg.lng, msg.radiusKm);
          }, 600);
        }
      } catch {}
    },
    [fetchNearby],
  );

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
            cercanos. Actívala desde los ajustes de tu dispositivo.
          </Text>
        </View>
      </View>
    );
  }

  const mapHtml = getMapHtml(location!.latitude, location!.longitude);

  const AddButton = (
    <Pressable
      onPress={() => {
        // TODO: MODAL CREAR
      }}
      className="absolute bottom-5 right-5 w-14 h-14 rounded-full bg-[#e07a5f]
                 items-center justify-center
                 shadow-md active:bg-[#c9694f]"
      style={{
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      }}
    >
      <Text
        className="text-white text-3xl font-light leading-none"
        style={
          Platform.OS === "web" ? { lineHeight: "normal" as any } : undefined
        }
      >
        +
      </Text>
    </Pressable>
  );

  //PARA DESARROLLAR USANDO EXTENSIÓN DE CHROME, NO BORRAR, SI NO NO SE VERÁ BIEN
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
    </View>
  );
}
