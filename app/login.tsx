import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import supabase from "../lib/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.replace("/(tabs)" as any);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-amber-50"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Parte superior decorativa */}
      <View className="flex-1 bg-amber-800 rounded-b-[40px] items-center justify-center">
        <Text className="text-6xl mb-4">📚</Text>
        <Text className="text-white text-4xl font-bold">Bookmerang</Text>
        <Text className="text-amber-200 text-base mt-2">
          Intercambia libros con tu comunidad
        </Text>
      </View>

      {/* Formulario */}
      <View className="flex-1 px-8 pt-10">
        <Text className="text-2xl font-bold text-gray-800 mb-6">
          Iniciar sesión
        </Text>

        <Text className="text-gray-500 text-sm mb-1 ml-1">Email</Text>
        <TextInput
          className="border border-gray-200 bg-white rounded-xl p-4 mb-4 text-gray-800"
          placeholder="tu@email.com"
          placeholderTextColor="#9ca3af"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text className="text-gray-500 text-sm mb-1 ml-1">Contraseña</Text>
        <TextInput
          className="border border-gray-200 bg-white rounded-xl p-4 mb-2 text-gray-800"
          placeholder="••••••••"
          placeholderTextColor="#9ca3af"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {error ? (
          <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <Text className="text-red-600 text-sm">{error}</Text>
          </View>
        ) : (
          <View className="mb-4" />
        )}

        <TouchableOpacity
          className={`rounded-xl p-4 items-center ${loading ? "bg-amber-400" : "bg-amber-800"}`}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text className="text-white font-bold text-lg">
            {loading ? "Cargando..." : "Entrar"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="items-center mt-4"
          onPress={() => router.replace("/register" as any)}
        >
          <Text className="text-amber-800 text-sm">
            ¿No tienes cuenta? Regístrate
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
