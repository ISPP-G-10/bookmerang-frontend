import PreferencesModal from "@/components/PreferencesModal";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import supabase from "../lib/supabase";

export default function ProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState("");

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [saving, setSaving] = useState(false);

  // Preferences modal state
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [preferences, setPreferences] = useState<{
    distanceKm: number;
    genres: string[];
    bookLength: string[];
  }>({
    distanceKm: 10,
    genres: [],
    bookLength: [],
  });
  const [preferencesError, setPreferencesError] = useState("");
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [availableGenres, setAvailableGenres] = useState<Array<{ id: number; name: string }>>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user: currentUser } = {} } = await supabase.auth.getUser();
      if (!currentUser) {
        setLoading(false);
        return router.replace("/login" as any);
      }

      setUser(currentUser);

      // Fetch genres with authorization
      try {
        console.log("Fetching genres from:", `${process.env.EXPO_PUBLIC_API_URL}/api/userpreferences/genres`);
        
        // Get session to get potential authorization header
        const { data: { session } } = await supabase.auth.getSession();
        
        const genreRes = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/userpreferences/genres`, {
          headers: session?.access_token ? {
            "Authorization": `Bearer ${session.access_token}`
          } : {}
        });
        
        console.log("Genres response status:", genreRes.status);
        
        if (genreRes.ok) {
          const genres = await genreRes.json();
          console.log("Genres loaded:", genres);
          console.log("Genres type:", typeof genres);
          console.log("Genres is array?", Array.isArray(genres));
          if (Array.isArray(genres) && genres.length > 0) {
            console.log("First genre:", genres[0]);
          }
          setAvailableGenres(genres);
        } else {
          console.error("Failed to fetch genres, status:", genreRes.status);
          const errorText = await genreRes.text();
          console.error("Error response:", errorText);
        }
      } catch (err) {
        console.error("Error fetching genres:", err);
      }

      // Get user location (with error handling)
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
            console.warn("Could not get current position, using default location");
          }
        }
      } catch (permErr) {
        console.warn("Location permission denied or unavailable");
      }

      // Fetch profile from your backend `base_users` via API
      try {
        const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/me`, {
          headers: { "Content-Type": "application/json" },
        });

        if (res.ok) {
          const json = await res.json();
          setProfile(json);
          // Load preferences if they exist
          if (json.preferences) {
            setPreferences(json.preferences);
          }
        } else {
          // fallback: try Supabase user metadata
          const { data: { user: u } = {} } = await supabase.auth.getUser();
          setProfile({ email: u?.email, name: u?.user_metadata?.name ?? "", username: u?.user_metadata?.username ?? "" });
        }
      } catch (err: any) {
        const { data: { user: u } = {} } = await supabase.auth.getUser();
        setProfile({ email: u?.email, name: u?.user_metadata?.name ?? "", username: u?.user_metadata?.username ?? "" });
      }

      setLoading(false);
    })();
  }, []);

  const openEdit = () => {
    setEditName(profile?.name ?? "");
    setEditUsername(profile?.username ?? "");
    setError("");
    setEditOpen(true);
  };

  const saveProfile = async () => {
    setSaving(true);
    setError("");

    try {
      // Get session to get token
      const { data: { session } } = await supabase.auth.getSession();
      
      // First update on backend if available
      const apiUrl = `${process.env.EXPO_PUBLIC_API_URL}/auth/me`;
      const body = JSON.stringify({ name: editName, username: editUsername });

      const headers: any = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(apiUrl, { 
        method: "PUT", 
        body, 
        headers: headers 
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Profile update error:", errorText);
        
        // attempt to update via Supabase user metadata as fallback
        const { error: supErr } = await supabase.auth.updateUser({ data: { name: editName, username: editUsername } });
        if (supErr) throw supErr;
      }

      // Refresh profile shown
      setProfile({ ...profile, name: editName, username: editUsername });
      setEditOpen(false);
    } catch (err: any) {
      console.error("Error saving profile:", err);
      setError(err?.message ?? "Error al guardar");
    }

    setSaving(false);
  };

  const handleSavePreferences = async (newPreferences: {
    distanceKm: number;
    genres: string[];
    bookLength: string[];
  }) => {
    setPreferencesLoading(true);
    setPreferencesError("");
    try {
      console.log("=== Starting save preferences ===");
      console.log("Available genres in state:", availableGenres);
      console.log("Available genres length:", availableGenres.length);
      console.log("New preferences passed:", newPreferences);
      console.log("Selected genres (names):", newPreferences.genres);

      // Get the current session to get the JWT token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error("No session found");
        setPreferencesError("No autorizado");
        setPreferencesLoading(false);
        return;
      }

      console.log("Session user ID:", session.user.id);

      // Get user ID from session
      const userId = session.user.id;

      // Use default location if not available
      const latitude = userLocation?.latitude || 40.4168;
      const longitude = userLocation?.longitude || -3.7038;

      // Use the distanceKm directly from preferences
      const radioKm = newPreferences.distanceKm || 5;

      console.log("Mapped radioKm:", radioKm);

      // Map genre names to IDs
      console.log("=== Genre Mapping Debug ===");
      const genreIds: number[] = [];
      
      newPreferences.genres.forEach(genreName => {
        console.log(`Looking for genre: "${genreName}"`);
        const foundGenre = availableGenres.find(g => {
          console.log(`  Comparing with: "${g.name}" (id: ${g.id})`);
          return g.name === genreName;
        });
        if (foundGenre) {
          console.log(`  ✓ Found! ID: ${foundGenre.id}`);
          genreIds.push(foundGenre.id);
        } else {
          console.log(`  ✗ Not found`);
        }
      });

      console.log("Final mapped genre IDs:", genreIds);
      console.log("Genre IDs length:", genreIds.length);

      if (genreIds.length === 0) {
        console.warn("⚠️ No genres could be mapped!");
        console.warn("This means availableGenres is empty or genre names don't match");
        setPreferencesError("Debes seleccionar al menos un género");
        setPreferencesLoading(false);
        return;
      }

      // Map book lengths to extension
      let extension = "MEDIUM"; // default
      if (newPreferences.bookLength.length > 0) {
        const lengths = newPreferences.bookLength;
        if (lengths.length === 3) {
          extension = "MEDIUM"; // all selected
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
          "Authorization": `Bearer ${session.access_token}`,
        },
      });

      console.log("Response status:", res.status);

      if (res.ok) {
        console.log("✓ Preferences saved successfully");
        setPreferences(newPreferences);
        setProfile({ ...profile, preferences: newPreferences });
        setPreferencesOpen(false);
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

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  const progressPercent = profile?.progress ?? 0.45; // fallback

  return (
    <View className="flex-1 bg-amber-50">
      {/* Header */}
      <View className="items-center bg-amber-100 pt-6 pb-8">
        <View className="w-full px-4 flex-row items-center justify-between">
          <Pressable onPress={() => router.back()}>
            <Text className="text-amber-700 text-xl">◀️</Text>
          </Pressable>
          <Text className="text-amber-800 font-bold text-lg">Bookmerang</Text>
          <TouchableOpacity onPress={openEdit} accessibilityLabel="Editar perfil">
            <Text className="text-amber-700 text-xl">⚙️</Text>
          </TouchableOpacity>
        </View>

        <View className="items-center mt-6">
          <View className="w-28 h-28 rounded-full bg-white items-center justify-center overflow-hidden border-4 border-amber-50">
            {profile?.avatar ? (
              <Image source={{ uri: profile.avatar }} className="w-28 h-28" />
            ) : (
              <View className="w-28 h-28 bg-gray-200 items-center justify-center">
                <Text className="text-4xl">📚</Text>
              </View>
            )}
          </View>

          <Text className="text-2xl font-bold text-amber-900 mt-4">{profile?.name ?? "—"}</Text>
          <Text className="text-amber-700 mt-1">{profile?.username ? `@${profile.username}` : "—"}</Text>
          <Text className="text-gray-500 text-sm mt-1">📍 {profile?.location ?? "Madrid, España"}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24 }}>
        {/* Stats cards */}
        <View className="flex-row gap-4 mb-4 mt-6">
          <View className="flex-1 bg-white rounded-2xl p-4 items-center shadow-sm border border-amber-100">
            <View className="flex-row items-center justify-center gap-1 mb-2">
              <Text className="text-2xl">🏆</Text>
              <Text className="text-2xl font-black text-amber-900">{profile?.level ?? 6}</Text>
            </View>
            <Text className="text-xs text-amber-800 font-bold text-center">Nivel</Text>
            <Text className="text-[10px] text-amber-700 font-black mt-1">{profile?.tier ?? "BRONCE"}</Text>
          </View>

          <View className="flex-1 bg-white rounded-2xl p-4 items-center shadow-sm border border-amber-100">
            <View className="flex-row items-center justify-center gap-1 mb-2">
              <Text className="text-2xl">💧</Text>
              <Text className="text-2xl font-black text-amber-900">{profile?.monthlyInkDrops ?? 250}</Text>
            </View>
            <Text className="text-xs text-amber-800 font-bold text-center">InkDrops</Text>
            <Text className="text-[10px] text-amber-800 font-bold mt-1">MENSUALES</Text>
            <Text className="text-[9px] text-orange-600 font-bold mt-1">Reinicia en {profile?.daysUntilReset ?? 12} días</Text>
          </View>
        </View>

        {/* Progress */}
        <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-amber-100">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-2">
              <Text>📈</Text>
              <Text className="text-sm font-black text-amber-900">Progreso a Nivel {(profile?.level ?? 6) + 1}</Text>
            </View>
            <Text className="text-xs font-bold text-amber-800">{profile?.inksToNextLevel ?? 114} InkDrops</Text>
          </View>

          <View className="w-full h-3 bg-amber-100 rounded-full overflow-hidden">
            <View 
              style={{ width: `${Math.min(100, Math.round((progressPercent || 0.45) * 100))}%` }} 
              className="h-3 rounded-full bg-gradient-to-r from-amber-700 to-orange-600" 
            />
          </View>

          <View className="flex-row justify-between mt-2">
            <Text className="text-[10px] font-bold text-amber-800">Nivel {profile?.level ?? 6} {profile?.tier ?? "Bronce"}</Text>
            <Text className="text-[10px] font-bold text-orange-600">Nivel {(profile?.level ?? 6) + 1} {profile?.tier ?? "Bronce"}</Text>
          </View>
        </View>

        {/* Racha / bonus */}
        <View className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-4 mb-4 flex-row items-center justify-between shadow-sm border-2 border-orange-200">
          <View className="flex-row items-center gap-3">
            <View className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center shadow-lg">
              <Text className="text-lg">🔥</Text>
            </View>
            <View>
              <Text className="font-black text-amber-900">Racha de {profile?.streak ?? 4} semanas</Text>
              <Text className="text-xs text-amber-800 mt-0.5">¡Sigue así! 🔥</Text>
            </View>
          </View>
          <View className="text-right">
            <Text className="text-2xl font-black text-orange-600">+{profile?.bonus ?? 16}%</Text>
            <Text className="text-[10px] font-bold text-orange-600">BONIFICACIÓN</Text>
          </View>
        </View>

        {/* Buttons */}
        <TouchableOpacity
          className="bg-white border-2 border-orange-600 rounded-full p-4 items-center mb-3"
          onPress={() => setPreferencesOpen(true)}
        >
          <Text className="text-orange-600 font-black text-sm">Editar Preferencias</Text>
        </TouchableOpacity>

        <TouchableOpacity className="bg-white border-2 border-orange-600 rounded-full p-4 items-center mb-6">
          <Text className="text-orange-600 font-black text-base">Tu Biblioteca</Text>
        </TouchableOpacity>

        {/* Books Library */}
        {profile?.books && profile.books.length > 0 && (
          <View className="mb-6">
            <View className="grid grid-cols-2 gap-4">
              {profile.books.map((book: any, index: number) => (
                <TouchableOpacity 
                  key={index}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm border border-amber-100 hover:shadow-lg hover:scale-105 transition-all"
                >
                  <View className="aspect-[3/4] relative overflow-hidden bg-amber-200">
                    {book.image ? (
                      <Image 
                        source={{ uri: book.image }} 
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="w-full h-full bg-gradient-to-br from-amber-100 to-orange-200 items-center justify-center">
                        <Text className="text-4xl">📚</Text>
                      </View>
                    )}
                    <View className="absolute bottom-2 left-2 bg-orange-600 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                      <Text className="text-white text-[10px] font-bold">{book.condition || "Bueno"}</Text>
                    </View>
                  </View>
                  <View className="p-3">
                    <Text className="font-bold text-amber-900 text-sm truncate">{book.title}</Text>
                    <Text className="text-xs text-amber-800 truncate">{book.author}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <Modal visible={editOpen} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-amber-50 rounded-t-2xl p-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-2xl font-bold">Editar perfil</Text>
              <Pressable onPress={() => setEditOpen(false)}>
                <Text className="text-gray-600">Cerrar</Text>
              </Pressable>
            </View>

            <Text className="text-gray-500 text-sm mb-1">Nombre</Text>
            <TextInput
              className="border border-gray-200 bg-white rounded-xl p-4 mb-4 text-gray-800"
              value={editName}
              onChangeText={setEditName}
            />

            <Text className="text-gray-500 text-sm mb-1">Nombre de usuario</Text>
            <TextInput
              className="border border-gray-200 bg-white rounded-xl p-4 mb-4 text-gray-800"
              value={editUsername}
              onChangeText={setEditUsername}
              autoCapitalize="none"
            />

            {error ? (
              <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <Text className="text-red-600 text-sm">{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              className={`rounded-xl p-4 items-center ${saving ? "bg-amber-400" : "bg-amber-800"}`}
              onPress={saveProfile}
              disabled={saving}
            >
              <Text className="text-white font-bold text-lg">{saving ? "Guardando..." : "Guardar"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
