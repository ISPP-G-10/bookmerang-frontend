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

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user: currentUser } = {} } = await supabase.auth.getUser();
      if (!currentUser) {
        setLoading(false);
        return router.replace("/login" as any);
      }

      setUser(currentUser);

      // Fetch profile from your backend `base_users` via API
      try {
        const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/me`, {
          headers: { "Content-Type": "application/json" },
        });

        if (res.ok) {
          const json = await res.json();
          setProfile(json);
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
      // First update on backend if available
      const apiUrl = `${process.env.EXPO_PUBLIC_API_URL}/auth/me`;
      const body = JSON.stringify({ name: editName, username: editUsername });

      const res = await fetch(apiUrl, { method: "PUT", body, headers: { "Content-Type": "application/json" } });

      if (!res.ok) {
        // attempt to update via Supabase user metadata as fallback
        const { error: supErr } = await supabase.auth.updateUser({ data: { name: editName, username: editUsername } });
        if (supErr) throw supErr;
      }

      // Refresh profile shown
      setProfile({ ...profile, name: editName, username: editUsername });
      setEditOpen(false);
    } catch (err: any) {
      setError(err?.message ?? "Error al guardar");
    }

    setSaving(false);
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

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Stats cards */}
        <View className="flex-row gap-4 mb-4">
          <View className="flex-1 bg-white rounded-xl p-4 items-center shadow">
            <Text className="text-orange-700 font-bold">6</Text>
            <Text className="text-gray-500 text-sm mt-1">Nivel</Text>
            <Text className="text-xs text-gray-400 mt-1">BRONCE</Text>
          </View>

          <View className="flex-1 bg-white rounded-xl p-4 items-center shadow">
            <Text className="text-orange-700 font-bold">250</Text>
            <Text className="text-gray-500 text-sm mt-1">InkDrops</Text>
            <Text className="text-xs text-gray-400 mt-1">MENSUALES</Text>
          </View>
        </View>

        {/* Progress */}
        <View className="bg-white rounded-xl p-4 mb-4">
          <View className="flex-row justify-between mb-2">
            <Text className="text-sm text-gray-600">Progreso a Nivel 7</Text>
            <Text className="text-sm text-gray-600">114 InkDrops</Text>
          </View>

          <View className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <View style={{ width: `${Math.min(100, Math.round((progressPercent || 0.45) * 100))}%` }} className="h-3 bg-amber-600" />
          </View>

          <View className="flex-row justify-between mt-2">
            <Text className="text-xs text-gray-400">Nivel 6 Bronce</Text>
            <Text className="text-xs text-gray-400">Nivel 7 Bronce</Text>
          </View>
        </View>

        {/* Racha / bonus */}
        <View className="bg-white rounded-xl p-4 mb-4 flex-row items-center justify-between">
          <View>
            <Text className="font-bold">Racha de 4 semanas</Text>
            <Text className="text-sm text-gray-500">¡Sigue así! 🔥</Text>
          </View>
          <View className="bg-amber-100 rounded-full px-3 py-2">
            <Text className="text-amber-700 font-bold">+16%</Text>
            <Text className="text-xs text-amber-600">BONIFICACIÓN</Text>
          </View>
        </View>

        {/* Buttons */}
        <TouchableOpacity className="bg-white border border-amber-300 rounded-full p-4 items-center mb-3">
          <Text className="text-amber-700 font-semibold">Editar Preferencias</Text>
        </TouchableOpacity>

        <TouchableOpacity className="bg-white border border-amber-300 rounded-full p-4 items-center mb-6">
          <Text className="text-amber-700 font-semibold">Tu Biblioteca</Text>
        </TouchableOpacity>

        {/* Gallery placeholders */}
        <View className="flex-row gap-4">
          <View className="flex-1 h-36 bg-white rounded-xl" />
          <View className="flex-1 h-36 bg-white rounded-xl" />
        </View>
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
    </View>
  );
}
