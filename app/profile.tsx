import Header from "@/components/Header";
import PreferencesModal from "@/components/PreferencesModal";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import {
  Award,
  Droplet,
  Flame,
  MapPin,
  Settings,
  TrendingUp,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { apiRequest } from "../lib/api";
import supabase from "../lib/supabase";

export default function ProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [preferences, setPreferences] = useState<{
    distanceKm: number;
    genres: string[];
    bookLength: string[];
  }>({ distanceKm: 10, genres: [], bookLength: [] });
  const [preferencesError, setPreferencesError] = useState("");
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [availableGenres, setAvailableGenres] = useState<
    { id: number; name: string }[]
  >([]);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);

  const reverseGeocode = async (lat: number, lon: number) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=es`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "BookmerangApp/1.0 (contact: peter@example.com)",
        },
      });
      if (!res.ok) return "";
      const json = await res.json();
      const addr = json.address ?? {};
      const city = addr.city || addr.town || addr.village || addr.hamlet || "";
      const country = addr.country || "";
      if (city && country) return `${city}, ${country}`;
      if (country) return country;
      return "";
    } catch {
      return "";
    }
  };

  const reverseGeocodeAndSet = async (lat: number, lon: number) => {
    const label = await reverseGeocode(lat, lon);
    if (label) setLocationLabel(label);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user: currentUser } = {} } =
        await supabase.auth.getUser();
      if (!currentUser) {
        setLoading(false);
        return router.replace("/login" as any);
      }

      // 1️⃣ Cargar géneros PRIMERO
      let loadedGenres: any[] = [];
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const genreRes = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL}/genres`,
          {
            headers: session?.access_token
              ? { Authorization: `Bearer ${session.access_token}` }
              : {},
          },
        );
        if (genreRes.ok) {
          const genres = await genreRes.json();
          if (Array.isArray(genres)) {
            loadedGenres = genres;
            setAvailableGenres(genres);
          }
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
          } catch {
            console.warn("Could not get current position");
          }
        }
      } catch {
        console.warn("Location permission denied");
      }

      try {
        const res = await apiRequest("/Auth/perfil", { method: "GET" });
        if (res.ok) {
          const json = await res.json();
          setProfile(json);
          
          
          // 2️⃣ Cargar preferencias DESPUÉS de tener los géneros
          try {
            const {
              data: { session },
            } = await supabase.auth.getSession();
            if (session) {
              // Usar el ID del backend, NO el de Supabase
              const userId = json.id ?? json.userId ?? json.user_id;
              
              if (!userId) {
              } else {
                const prefsRes = await fetch(
                  `${process.env.EXPO_PUBLIC_API_URL}/users/${userId}/preferences`,
                  {
                    headers: {
                      Authorization: `Bearer ${session.access_token}`,
                    },
                  },
                );
                
                if (prefsRes.ok) {
                  const prefs = await prefsRes.json();
                  
                  // Convertir extension a bookLength
                  const bookLengths: string[] = [];
                  if (prefs.extension === "SHORT") bookLengths.push("0-200");
                  else if (prefs.extension === "MEDIUM") bookLengths.push("200-400");
                  else if (prefs.extension === "LONG") bookLengths.push("400+");
                  
                  // Mapear genreIds a nombres usando los géneros cargados
                  const genreNames: string[] = [];
                  if (prefs.genreIds && Array.isArray(prefs.genreIds) && loadedGenres.length > 0) {
                    prefs.genreIds.forEach((id: number) => {
                      const genre = loadedGenres.find((g) => g.id === id);
                      if (genre) genreNames.push(genre.name);
                    });
                  }
                  
                  setPreferences({
                    distanceKm: prefs.radioKm || 10,
                    genres: genreNames,
                    bookLength: bookLengths,
                  });
                }
              }
            }
          } catch (err) {
          }
          
          const maybeLat =
            json.latitud ??
            json.Latitud ??
            json.latitude ??
            json.Latitude ??
            json.lat ??
            json.Lat;
          const maybeLon =
            json.longitud ??
            json.Longitud ??
            json.longitude ??
            json.Longitude ??
            json.lon ??
            json.Lon ??
            json.Long;
          const parsedLat =
            typeof maybeLat === "string" ? Number(maybeLat) : maybeLat;
          const parsedLon =
            typeof maybeLon === "string" ? Number(maybeLon) : maybeLon;
          if (
            parsedLat &&
            parsedLon &&
            !isNaN(parsedLat) &&
            !isNaN(parsedLon)
          ) {
            reverseGeocodeAndSet(parsedLat, parsedLon);
          } else if (json.location) {
            setLocationLabel(json.location);
          }
        } else {
          const { data: { user: u } = {} } = await supabase.auth.getUser();
          setProfile({
            email: u?.email,
            name: u?.user_metadata?.name ?? "",
            username: u?.user_metadata?.username ?? "",
          });
        }
      } catch {
        const { data: { user: u } = {} } = await supabase.auth.getUser();
        setProfile({
          email: u?.email,
          name: u?.user_metadata?.name ?? "",
          username: u?.user_metadata?.username ?? "",
        });
      }

      setLoading(false);
    })();
  }, []);

  const handleSavePreferences = async (newPreferences: {
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
        setPreferencesLoading(false);
        return;
      }
      const userId = session.user.id;
      const latitude = userLocation?.latitude || 40.4168;
      const longitude = userLocation?.longitude || -3.7038;
      const radioKm = newPreferences.distanceKm || 5;
      const genreIds: number[] = [];
      newPreferences.genres.forEach((genreName) => {
        const found = availableGenres.find((g) => g.name === genreName);
        if (found) genreIds.push(found.id);
      });
      if (genreIds.length === 0) {
        setPreferencesError("Debes seleccionar al menos un género");
        setPreferencesLoading(false);
        return;
      }
      let extension = "MEDIUM";
      if (newPreferences.bookLength.length > 0) {
        const lengths = newPreferences.bookLength;
        if (lengths.includes("0-200")) extension = "SHORT";
        else if (lengths.includes("200-400")) extension = "MEDIUM";
        else if (lengths.includes("400+")) extension = "LONG";
      }
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/users/${userId}/preferences`,
        {
          method: "PUT",
          body: JSON.stringify({
            latitud: latitude,
            longitud: longitude,
            radioKm,
            extension,
            genreIds,
          }),
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      );
      if (res.ok) {
        setPreferences(newPreferences);
        setProfile({ ...profile, preferences: newPreferences });
        setPreferencesOpen(false);
      } else {
        setPreferencesError(
          (await res.text()) || "Error al guardar preferencias",
        );
      }
    } catch (err: any) {
      setPreferencesError(err?.message || "Error al guardar preferencias");
    } finally {
      setPreferencesLoading(false);
    }
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fdfbf7",
        }}
      >
        <ActivityIndicator color="#e07a5f" />
      </View>
    );
  }

  const progressPercent = profile?.progress ?? 0.45;

  return (
    <View style={{ flex: 1, backgroundColor: "#fdfbf7" }}>
      <Header showBack />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ── Mi Perfil + Avatar ── */}
        <View
          style={{
            alignItems: "center",
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: 8,
          }}
        >
          <View
            style={{
              width: "100%",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <View style={{ width: 36 }} />
            <Text style={{ fontSize: 20, fontWeight: "900", color: "#3e2723" }}>
              Mi Perfil
            </Text>
            {/* Engranaje → navega a /settings */}
            <TouchableOpacity
              onPress={() => router.push("/settings" as any)}
              style={{ padding: 6 }}
            >
              <Settings size={22} color="#8B7355" />
            </TouchableOpacity>
          </View>

          <View
            style={{
              width: 112,
              height: 112,
              borderRadius: 56,
              backgroundColor: "#ffffff",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              borderWidth: 4,
              borderColor: "#ffffff",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 5,
            }}
          >
            {profile?.avatar ? (
              <Image
                source={{ uri: profile.avatar }}
                style={{ width: 112, height: 112 }}
              />
            ) : (
              <View
                style={{
                  width: 112,
                  height: 112,
                  backgroundColor: "#e07a5f",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 48 }}>👤</Text>
              </View>
            )}
          </View>

          <Text
            style={{
              fontSize: 24,
              fontWeight: "900",
              marginTop: 16,
              color: "#3e2723",
            }}
          >
            {profile?.name ?? "—"}
          </Text>
          <Text
            style={{
              marginTop: 4,
              fontSize: 14,
              fontWeight: "700",
              color: "#8B7355",
            }}
          >
            {profile?.username ? `@${profile.username}` : "—"}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              marginTop: 6,
            }}
          >
            <MapPin size={14} color="#e07a5f" />
            <Text style={{ fontSize: 14, color: "#8B7355" }}>
              {locationLabel ?? profile?.location ?? "Madrid, España"}
            </Text>
          </View>
        </View>

        {/* ── Stats ── */}
        <View
          style={{
            flexDirection: "row",
            gap: 12,
            marginHorizontal: 20,
            marginTop: 20,
            marginBottom: 12,
          }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "#ffffff",
              borderRadius: 16,
              padding: 16,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#F3E9E0",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginBottom: 4,
              }}
            >
              <Award size={20} color="#CD7F32" />
              <Text
                style={{ fontSize: 26, fontWeight: "900", color: "#3e2723" }}
              >
                {profile?.level ?? 6}
              </Text>
            </View>
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#8B7355" }}>
              Nivel
            </Text>
            <Text
              style={{
                fontSize: 10,
                fontWeight: "900",
                color: "#CD7F32",
                marginTop: 4,
              }}
            >
              {profile?.tier ?? "BRONCE"}
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              backgroundColor: "#ffffff",
              borderRadius: 16,
              padding: 16,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#F3E9E0",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginBottom: 4,
              }}
            >
              <Droplet size={20} color="#e07a5f" fill="#e07a5f" />
              <Text
                style={{ fontSize: 26, fontWeight: "900", color: "#3e2723" }}
              >
                {profile?.monthlyInkDrops ?? 250}
              </Text>
            </View>
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#8B7355" }}>
              InkDrops
            </Text>
            <Text
              style={{
                fontSize: 10,
                fontWeight: "700",
                color: "#8B7355",
                marginTop: 2,
              }}
            >
              MENSUALES
            </Text>
            <Text
              style={{
                fontSize: 9,
                fontWeight: "700",
                color: "#e07a5f",
                marginTop: 2,
              }}
            >
              Reinicia en {profile?.daysUntilReset ?? 12} días
            </Text>
          </View>
        </View>

        {/* ── Progreso ── */}
        <View
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 16,
            padding: 16,
            marginHorizontal: 20,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: "#F3E9E0",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <TrendingUp size={16} color="#e07a5f" />
              <Text
                style={{ fontSize: 14, fontWeight: "900", color: "#3e2723" }}
              >
                Progreso a Nivel {(profile?.level ?? 6) + 1}
              </Text>
            </View>
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#8B7355" }}>
              {profile?.inksToNextLevel ?? 114} InkDrops
            </Text>
          </View>
          <View
            style={{
              height: 10,
              borderRadius: 5,
              backgroundColor: "#F3E9E0",
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: `${Math.min(100, Math.round(progressPercent * 100))}%`,
                height: 10,
                borderRadius: 5,
                backgroundColor: "#e07a5f",
              }}
            />
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 6,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: "700", color: "#8B7355" }}>
              Nivel {profile?.level ?? 6} {profile?.tier ?? "Bronce"}
            </Text>
            <Text style={{ fontSize: 10, fontWeight: "700", color: "#CD7F32" }}>
              Nivel {(profile?.level ?? 6) + 1} {profile?.tier ?? "Bronce"}
            </Text>
          </View>
        </View>

        {/* ── Racha ── */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#FFF5F0",
            borderRadius: 16,
            padding: 16,
            marginHorizontal: 20,
            marginBottom: 20,
            borderWidth: 2,
            borderColor: "#F3D4C7",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: "#e07a5f",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Flame size={24} color="#ffffff" />
            </View>
            <View>
              <Text style={{ fontWeight: "900", color: "#3e2723" }}>
                Racha de {profile?.streak ?? 4} semanas
              </Text>
              <Text style={{ fontSize: 12, color: "#8B7355", marginTop: 2 }}>
                ¡Sigue así! 🔥
              </Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 24, fontWeight: "900", color: "#e07a5f" }}>
              +{profile?.bonus ?? 16}%
            </Text>
            <Text style={{ fontSize: 10, fontWeight: "700", color: "#e07a5f" }}>
              BONIFICACIÓN
            </Text>
          </View>
        </View>

        {/* ── Botones ── */}
        <TouchableOpacity
          style={{
            marginHorizontal: 20,
            marginBottom: 12,
            borderWidth: 2,
            borderColor: "#e07a5f",
            borderRadius: 999,
            padding: 16,
            alignItems: "center",
            backgroundColor: "#ffffff",
          }}
          onPress={() => setPreferencesOpen(true)}
        >
          <Text style={{ color: "#e07a5f", fontWeight: "900", fontSize: 15 }}>
            Editar Preferencias
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            marginHorizontal: 20,
            marginBottom: 24,
            borderWidth: 2,
            borderColor: "#e07a5f",
            borderRadius: 999,
            padding: 16,
            alignItems: "center",
            backgroundColor: "#ffffff",
          }}
        >
          <Text style={{ color: "#e07a5f", fontWeight: "900", fontSize: 15 }}>
            Tu Biblioteca
          </Text>
        </TouchableOpacity>

        {/* ── Libros ── */}
        {profile?.books && profile.books.length > 0 && (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 12,
              marginHorizontal: 20,
              marginBottom: 24,
            }}
          >
            {profile.books.map((book: any, index: number) => (
              <TouchableOpacity
                key={index}
                style={{
                  width: "47%",
                  backgroundColor: "#ffffff",
                  borderRadius: 16,
                  overflow: "hidden",
                  borderWidth: 1,
                  borderColor: "#F3E9E0",
                }}
              >
                <View
                  style={{ aspectRatio: 3 / 4, backgroundColor: "#e5e5e5" }}
                >
                  {book.image ? (
                    <Image
                      source={{ uri: book.image }}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={{
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ fontSize: 40 }}>📚</Text>
                    </View>
                  )}
                  <View
                    style={{
                      position: "absolute",
                      bottom: 8,
                      left: 8,
                      backgroundColor: "#e07a5f",
                      borderRadius: 999,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    }}
                  >
                    <Text
                      style={{
                        color: "#ffffff",
                        fontSize: 10,
                        fontWeight: "700",
                      }}
                    >
                      {book.condition || "Bueno"}
                    </Text>
                  </View>
                </View>
                <View style={{ padding: 10 }}>
                  <Text
                    style={{
                      fontWeight: "700",
                      color: "#3e2723",
                      fontSize: 13,
                    }}
                    numberOfLines={1}
                  >
                    {book.title}
                  </Text>
                  <Text
                    style={{ fontSize: 11, color: "#8B7355" }}
                    numberOfLines={1}
                  >
                    {book.author}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <PreferencesModal
        visible={preferencesOpen}
        onClose={() => setPreferencesOpen(false)}
        onSave={handleSavePreferences}
        initialPreferences={preferences}
        availableGenres={availableGenres}
        title="Editar Preferencias"
        error={preferencesError}
        loading={preferencesLoading}
      />
    </View>
  );
}
