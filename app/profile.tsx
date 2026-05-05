import AnimatedNameDisplay from "@/components/animations/AnimatedNameDisplay";
import AnimatedProgressBar from "@/components/animations/AnimatedProgressBar";
import AnimatedReward from "@/components/animations/AnimatedReward";
import AnimatedStatBox from "@/components/animations/AnimatedStatBox";
import AvatarWithFrame from "@/components/AvatarWithFrame";
import Header from "@/components/Header";
import InkdropsHistoryModal from "@/components/InkdropsHistoryModal";
import PreferencesModal from "@/components/PreferencesModal";
import { useAuth } from "@/contexts/AuthContext";
import {
  DEFAULT_NAME_COLOR,
  getActiveBadgeEmoji,
  getNameColorById,
  getUnlockedRewards,
  getUserTier,
} from "@/lib/rewardsSystem";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { apiRequest } from "../lib/api";
import { getStoredAuthSession } from "../lib/authSession";
import { updateUserLocation } from "../lib/locationService";
import {
  getMyLibrary,
  toConditionLabel,
  type BookListItem,
} from "../lib/books";

const mapProfileBooksToLibraryItems = (books: any[]): BookListItem[] => {
  if (!Array.isArray(books)) return [];
  return books
    .filter((book) => {
      const status = book?.status ?? book?.bookStatus ?? book?.estado;
      if (typeof status !== "string") return false;
      const normalized = status.toLowerCase().replace(/[\s-]+/g, "_");
      return normalized === "published";
    })
    .map((book) => ({
      id: Number(book?.id ?? book?.bookId),
      titulo: book?.titulo ?? book?.title,
      autor: book?.autor ?? book?.author,
      condition: book?.condition ?? null,
      thumbnailUrl:
        book?.thumbnailUrl ??
        book?.image ??
        book?.imageUrl ??
        book?.coverUrl ??
        book?.photoUrl ??
        null,
    }))
    .filter((book) => Number.isFinite(book.id));
};

export default function ProfileScreen() {
  const router = useRouter();
  const { isBookdropUser, loading: authLoading } = useAuth();
  const { width } = useWindowDimensions();
  const { message } = useLocalSearchParams<{ message?: string }>();
  const [libraryBooks, setLibraryBooks] = useState<BookListItem[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState("");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [inventoryOpen, setInventoryOpen] = useState(false);

  const numColumns = width >= 768 ? 4 : 2;
  const bookWidth = (width - 40 - (numColumns - 1) * 12) / numColumns;

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
  const [inkdropsModalVisible, setInkdropsModalVisible] = useState(false);
  const [locationUpdating, setLocationUpdating] = useState(false);

  useEffect(() => {
    if (!authLoading && isBookdropUser) {
      router.replace("/bookDropControlPanel" as any);
    }
  }, [authLoading, isBookdropUser, router]);

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

  const loadLibrary = async (profileData?: any) => {
    setLibraryLoading(true);
    setLibraryError("");
    try {
      const books = await getMyLibrary();
      setLibraryBooks(books);
    } catch {
      const fallbackBooks = mapProfileBooksToLibraryItems(
        profileData?.books ?? profile?.books,
      );
      setLibraryBooks(fallbackBooks.length > 0 ? fallbackBooks : []);
      setLibraryError("");
    } finally {
      setLibraryLoading(false);
    }
  };

  const handleOpenLibraryBook = useCallback(
    async (bookId: number) => {
      if (!Number.isFinite(bookId) || bookId <= 0) return;
      router.push(`/books/${bookId}` as any);
    },
    [router],
  );

  const loadProfileData = useCallback(async (): Promise<any | null> => {
    const session = await getStoredAuthSession();
    const currentUser = session?.user;
    if (!currentUser) {
      router.replace("/login" as any);
      return null;
    }
    try {
      const res = await apiRequest("/Auth/perfil", { method: "GET" });
      if (res.ok) {
        const json = await res.json();
        setProfile(json);
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
        if (parsedLat && parsedLon && !isNaN(parsedLat) && !isNaN(parsedLon)) {
          setUserLocation({ latitude: parsedLat, longitude: parsedLon });
          reverseGeocodeAndSet(parsedLat, parsedLon);
        } else if (json.location) {
          setLocationLabel(json.location);
        }
        return json;
      }
      const u = session?.user;
      setProfile({
        email: u?.email,
        name: u?.name ?? "",
        username: u?.username ?? "",
        avatar: u?.profilePhoto ?? null,
      });
      return null;
    } catch {
      const u = session?.user;
      setProfile({
        email: u?.email,
        name: u?.name ?? "",
        username: u?.username ?? "",
        avatar: u?.profilePhoto ?? null,
      });
      return null;
    }
  }, [router]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const currentSession = await getStoredAuthSession();
      if (!currentSession?.user) {
        setLoading(false);
        return router.replace("/login" as any);
      }
      try {
        const genreRes = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL}/genres`,
          { headers: {} },
        );
        if (genreRes.ok) {
          const genres = await genreRes.json();
          if (Array.isArray(genres)) setAvailableGenres(genres);
        }
      } catch (err) {
        console.error("Error fetching genres:", err);
      }
      const profileData = await loadProfileData();
      if (profileData) await loadLibrary(profileData);
      else await loadLibrary();
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!message) return;
    loadLibrary();
  }, [message]);

  useFocusEffect(
    useCallback(() => {
      void loadProfileData();
    }, [loadProfileData]),
  );

  const handleSavePreferences = async (newPreferences: {
    distanceKm: number;
    genres: string[];
    bookLength: string[];
  }) => {
    setPreferencesLoading(true);
    setPreferencesError("");
    try {
      const userId = profile?.id ?? profile?.userId ?? profile?.user_id;
      if (!userId) {
        setPreferencesError("No autorizado");
        setPreferencesLoading(false);
        return;
      }
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
        if (newPreferences.bookLength.includes("0-200")) extension = "SHORT";
        else if (newPreferences.bookLength.includes("200-400"))
          extension = "MEDIUM";
        else if (newPreferences.bookLength.includes("400+")) extension = "LONG";
      }
      const res = await apiRequest(`/users/${userId}/preferences`, {
        method: "PUT",
        body: JSON.stringify({
          latitude,
          longitude,
          radioKm,
          extension,
          genreIds,
        }),
      });
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

  const handleOpenPreferences = async () => {
    setPreferencesOpen(true);
    setPreferencesLoading(true);
    setPreferencesError("");
    try {
      const userId = profile?.id ?? profile?.userId ?? profile?.user_id;
      if (!userId) return;
      const prefsRes = await apiRequest(`/users/${userId}/preferences`, {
        method: "GET",
      });
      if (prefsRes.ok) {
        const prefs = await prefsRes.json();
        const bookLengths: string[] = [];
        if (prefs.extension === "SHORT") bookLengths.push("0-200");
        else if (prefs.extension === "MEDIUM") bookLengths.push("200-400");
        else if (prefs.extension === "LONG") bookLengths.push("400+");
        const genreNames: string[] = [];
        if (
          prefs.genreIds &&
          Array.isArray(prefs.genreIds) &&
          availableGenres.length > 0
        ) {
          prefs.genreIds.forEach((id: number) => {
            const genre = availableGenres.find((g) => g.id === id);
            if (genre) genreNames.push(genre.name);
          });
        }
        setPreferences({
          distanceKm: prefs.radioKm || 10,
          genres: genreNames,
          bookLength: bookLengths,
        });
      }
    } catch {
    } finally {
      setPreferencesLoading(false);
    }
  };

  const handleManualUpdate = async () => {
    setLocationUpdating(true);
    try {
      const session = await getStoredAuthSession();
      const userId = session?.user?.id;
      await updateUserLocation(userId);
      await loadProfileData();
    } catch (err) {
      console.warn("Error actualizando ubicación manualmente:", err);
    } finally {
      setLocationUpdating(false);
    }
  };

  if (authLoading || isBookdropUser || loading) {
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

  // ── Datos de recompensas derivados del nivel ──
  const userLevel = profile?.level ?? 1;
  const tier = getUserTier(userLevel);
  const badgeEmoji = getActiveBadgeEmoji(userLevel);
  const nameColor = profile?.activeColorId
    ? (getNameColorById(profile.activeColorId)?.color ?? DEFAULT_NAME_COLOR)
    : DEFAULT_NAME_COLOR;
  const unlockedRewards = getUnlockedRewards(userLevel);
  const progressPercent = profile?.progress ?? 0.45;

  // Colores del tier para la barra de progreso
  const tierColor = tier?.color ?? "#e07a5f";

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
            <TouchableOpacity
              onPress={() => router.push("/settings" as any)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "#e07a5f",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FontAwesome name="cog" size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Avatar con marco */}
          <AvatarWithFrame
            avatarUri={profile?.avatar}
            profilePhoto={profile?.profilePhoto}
            size={112}
            activeFrameId={profile?.activeFrameId ?? null}
          />

          {/* Nombre con color activo y shine opcional para tier alto */}
          <AnimatedNameDisplay
            name={profile?.name ?? "—"}
            color={nameColor}
            isHighTier={userLevel >= 20}
            size={24}
            weight="900"
            style={{
              marginTop: 16,
            }}
          />
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

          {/* Ubicación */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              marginTop: 6,
            }}
          >
            <FontAwesome name="map-marker" size={14} color="#e07a5f" />
            <Text style={{ fontSize: 14, color: "#8B7355" }}>
              {locationLabel ?? profile?.location ?? "Cargando ubicación..."}
            </Text>
            <TouchableOpacity
              onPress={handleManualUpdate}
              style={{ padding: 6, marginLeft: 6 }}
            >
              {locationUpdating ? (
                <ActivityIndicator size="small" color="#e07a5f" />
              ) : (
                <FontAwesome name="refresh" size={14} color="#e07a5f" />
              )}
            </TouchableOpacity>
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
          {/* Nivel + badge */}
          <AnimatedStatBox index={0} delay={200} style={{ flex: 1 }}>
            <View
              style={{
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
                {/* Badge dinámico según nivel — sustituye al trofeo fijo */}
                <Text style={{ fontSize: 20 }}>{badgeEmoji}</Text>
                <Text
                  style={{ fontSize: 26, fontWeight: "900", color: "#3e2723" }}
                >
                  {userLevel}
                </Text>
              </View>
              <Text
                style={{ fontSize: 12, fontWeight: "700", color: "#8B7355" }}
              >
                Nivel
              </Text>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "900",
                  color: tierColor,
                  marginTop: 4,
                }}
              >
                {tier?.name.toUpperCase() ?? profile?.tier ?? "—"}
              </Text>
            </View>
          </AnimatedStatBox>

          {/* InkDrops */}
          <AnimatedStatBox index={1} delay={200} style={{ flex: 1 }}>
            <View
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 16,
                padding: 16,
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#F3E9E0",
              }}
            >
              <View style={{ width: "100%", alignItems: "center" }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 4,
                  }}
                >
                  <FontAwesome name="tint" size={20} color="#e07a5f" />
                  <Text
                    style={{
                      fontSize: 26,
                      fontWeight: "900",
                      color: "#3e2723",
                    }}
                  >
                    {profile?.monthlyInkDrops ?? 250}
                  </Text>
                </View>
                <Text
                  style={{ fontSize: 12, fontWeight: "700", color: "#8B7355" }}
                >
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
          </AnimatedStatBox>
        </View>

        {/* ── Botón Historial ── */}
        <View style={{ marginHorizontal: 20, marginBottom: 12 }}>
          <TouchableOpacity
            onPress={() => setInkdropsModalVisible(true)}
            style={{
              backgroundColor: "#e07a5f",
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: 8,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>
              Historial de Inkdrops
            </Text>
          </TouchableOpacity>
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
              <FontAwesome
                name={userLevel >= 50 ? "star" : "arrow-up"}
                size={16}
                color="#e07a5f"
              />
              <Text
                style={{ fontSize: 14, fontWeight: "900", color: "#3e2723" }}
              >
                {userLevel >= 50
                  ? "¡Has alcanzado el máximo nivel!"
                  : `Progreso a Nivel ${userLevel + 1}`}
              </Text>
            </View>
            {userLevel < 50 && (
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#8B7355" }}>
                {profile?.inksToNextLevel ?? 114} InkDrops
              </Text>
            )}
          </View>
          <View
            style={{
              height: 10,
              borderRadius: 5,
              backgroundColor: "#F3E9E0",
              overflow: "hidden",
            }}
          >
            <AnimatedProgressBar
              progress={userLevel >= 50 ? 1 : Math.min(progressPercent, 1)}
              fillColor={tierColor}
              backgroundColor="transparent"
              height={10}
              borderRadius={5}
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
              Nivel {userLevel} {tier?.name ?? ""}
            </Text>
            {userLevel < 50 && (
              <Text style={{ fontSize: 10, fontWeight: "700", color: tierColor }}>
                Nivel {userLevel + 1} {tier?.name ?? ""}
              </Text>
            )}
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
              <FontAwesome name="fire" size={24} color="#ffffff" />
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

        {/* ── Inventario de recompensas ── */}
        <TouchableOpacity
          style={{
            marginHorizontal: 20,
            marginBottom: 12,
            borderWidth: 2,
            borderColor: tierColor,
            borderRadius: 999,
            padding: 16,
            alignItems: "center",
            backgroundColor: "#ffffff",
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
          }}
          onPress={() => setInventoryOpen(!inventoryOpen)}
        >
          <Text style={{ fontSize: 18 }}>{badgeEmoji}</Text>
          <Text style={{ color: tierColor, fontWeight: "900", fontSize: 15 }}>
            Mis recompensas ({unlockedRewards.length})
          </Text>
          <FontAwesome
            name={inventoryOpen ? "chevron-up" : "chevron-down"}
            size={14}
            color={tierColor}
          />
        </TouchableOpacity>

        {inventoryOpen && (
          <View style={{ marginHorizontal: 20, marginBottom: 16 }}>
            {/* Unlocked - Grid flexible con cartas de tamaño consistente */}
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              {unlockedRewards.map((reward, idx) => {
                const dotColor =
                  reward.type === "frame"
                    ? ((reward.animated
                        ? reward.animationColors?.[0]
                        : reward.borderColor) ?? tierColor)
                    : reward.type === "nameColor"
                      ? reward.color
                      : tierColor;

                return (
                  <AnimatedReward key={reward.id} delay={idx * 35} fast={true}>
                    <View
                      style={{
                        backgroundColor: "#ffffff",
                        borderRadius: 14,
                        padding: 12,
                        borderWidth: 1.5,
                        borderColor: dotColor,
                        width: (width - 60) / 3,
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {reward.type === "badge" && (
                        <Text style={{ fontSize: 22 }}>{reward.emoji}</Text>
                      )}
                      {reward.type === "frame" && (
                        <View
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            borderWidth: 4,
                            borderColor: dotColor,
                            backgroundColor: "#fdfbf7",
                          }}
                        />
                      )}
                      {reward.type === "nameColor" && (
                        <View
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            backgroundColor: dotColor,
                          }}
                        />
                      )}
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color: "#3e2723",
                          textAlign: "center",
                        }}
                      >
                        {reward.name}
                      </Text>
                      <Text style={{ fontSize: 9, color: "#8B7355" }}>
                        Niv. {reward.level}
                      </Text>
                    </View>
                  </AnimatedReward>
                );
              })}
            </View>

            {/* Próximas recompensas bloqueadas */}
            {userLevel < 50 && (
              <View style={{ marginTop: 12 }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: "#8B7355",
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  Próximas recompensas
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 10,
                  }}
                >
                  {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50]
                    .filter((lvl) => lvl > userLevel)
                    .slice(0, 3)
                    .map((lvl, idx) => {
                      const t = getUserTier(lvl);
                      return (
                        <AnimatedReward
                          key={lvl}
                          delay={150 + idx * 35}
                          fast={true}
                        >
                          <View
                            style={{
                              backgroundColor: "#F3E9E0",
                              borderRadius: 14,
                              padding: 12,
                              width: (width - 60) / 3,
                              alignItems: "center",
                              gap: 4,
                              opacity: 0.6,
                            }}
                          >
                            <FontAwesome
                              name="lock"
                              size={18}
                              color="#8B7355"
                            />
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: "700",
                                color: "#8B7355",
                                textAlign: "center",
                              }}
                            >
                              Niv. {lvl}
                            </Text>
                            <Text style={{ fontSize: 9, color: "#8B7355" }}>
                              {t?.name ?? "—"}
                            </Text>
                          </View>
                        </AnimatedReward>
                      );
                    })}
                </View>
              </View>
            )}
          </View>
        )}

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
          onPress={handleOpenPreferences}
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
          onPress={loadLibrary}
        >
          <Text style={{ color: "#e07a5f", fontWeight: "900", fontSize: 15 }}>
            Tu Biblioteca
          </Text>
        </TouchableOpacity>

        {/* ── Mensajes de estado ── */}
        {(message === "updated" ||
          message === "deleted" ||
          message === "published") && (
          <View
            style={{
              marginHorizontal: 20,
              marginBottom: 16,
              backgroundColor: "#d9f6e5",
              borderWidth: 1,
              borderColor: "#a9ebcb",
              borderRadius: 12,
              paddingVertical: 14,
              paddingHorizontal: 16,
            }}
          >
            <Text style={{ color: "#0f8d4b", fontWeight: "700", fontSize: 16 }}>
              {message === "updated"
                ? "Libro actualizado correctamente"
                : message === "deleted"
                  ? "Libro eliminado de tu biblioteca"
                  : "Libro publicado y añadido a tu biblioteca"}
            </Text>
          </View>
        )}

        {libraryLoading && (
          <View style={{ marginTop: 8, marginBottom: 16 }}>
            <ActivityIndicator color="#e07a5f" />
          </View>
        )}
        {!!libraryError && !libraryLoading && (
          <Text
            style={{
              marginHorizontal: 20,
              marginBottom: 16,
              color: "#d62828",
              fontWeight: "600",
            }}
          >
            {libraryError}
          </Text>
        )}
        {!libraryLoading && libraryBooks.length === 0 && !libraryError && (
          <Text
            style={{
              marginHorizontal: 20,
              marginBottom: 20,
              color: "#8B7355",
              textAlign: "center",
            }}
          >
            Aún no tienes libros activos en tu biblioteca.
          </Text>
        )}

        {/* ── Libros ── */}
        {libraryBooks.length > 0 && (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 12,
              marginHorizontal: 20,
              marginBottom: 24,
            }}
          >
            {libraryBooks.map((book) => (
              <TouchableOpacity
                key={book.id}
                onPress={() => handleOpenLibraryBook(book.id)}
                style={{
                  width: bookWidth,
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
                  {book.thumbnailUrl ? (
                    <Image
                      source={{ uri: book.thumbnailUrl }}
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
                      {toConditionLabel(book.condition)}
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
                    {book.titulo ?? book.title ?? "Sin título"}
                  </Text>
                  <Text
                    style={{ fontSize: 11, color: "#8B7355" }}
                    numberOfLines={1}
                  >
                    {book.autor ?? "—"}
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

      <InkdropsHistoryModal
        visible={inkdropsModalVisible}
        onClose={() => setInkdropsModalVisible(false)}
      />
    </View>
  );
}
