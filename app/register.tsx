import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { apiRequest } from "../lib/api";
import supabase from "../lib/supabase";

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setLoading(true);
    setError("");

    // 1. Crear cuenta en Supabase
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // 2. Guardar en base_users
    const response = await apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        username,
        name,
        profilePhoto: "",
        userType: 2, // USER
        latitud: 37.3886, // ubicación por defecto, luego se puede cambiar
        longitud: -5.9823,
      }),
    });

    setLoading(false);

    if (!response.ok) {
      setError("Error al guardar el perfil");
      return;
    }

    router.replace("/(tabs)/matcher" as any);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-amber-50"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* Cabecera */}
        <View className="bg-amber-800 px-8 pt-16 pb-10 rounded-b-[40px] items-center">
          <Text className="text-5xl mb-3">📚</Text>
          <Text className="text-white text-3xl font-bold">Bookmerang</Text>
          <Text className="text-amber-200 text-sm mt-1">Crea tu cuenta</Text>
        </View>

        {/* Formulario */}
        <View className="px-8 pt-8">
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
            className="border border-gray-200 bg-white rounded-xl p-4 mb-4 text-gray-800"
            placeholder="••••••••"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Text className="text-gray-500 text-sm mb-1 ml-1">
            Nombre de usuario
          </Text>
          <TextInput
            className="border border-gray-200 bg-white rounded-xl p-4 mb-4 text-gray-800"
            placeholder="@usuario"
            placeholderTextColor="#9ca3af"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />

          <Text className="text-gray-500 text-sm mb-1 ml-1">Nombre</Text>
          <TextInput
            className="border border-gray-200 bg-white rounded-xl p-4 mb-4 text-gray-800"
            placeholder="Tu nombre"
            placeholderTextColor="#9ca3af"
            value={name}
            onChangeText={setName}
          />

          {error ? (
            <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <Text className="text-red-600 text-sm">{error}</Text>
            </View>
          ) : (
            <View className="mb-4" />
          )}

          <TouchableOpacity
            className={`rounded-xl p-4 items-center mb-4 ${loading ? "bg-amber-400" : "bg-amber-800"}`}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text className="text-white font-bold text-lg">
              {loading ? "Creando cuenta..." : "Registrarse"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center mb-8"
            onPress={() => router.replace("/login" as any)}
          >
            <Text className="text-amber-800 text-sm">
              ¿Ya tienes cuenta? Inicia sesión
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
