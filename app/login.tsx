import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import supabase from "../lib/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

    router.replace("/(tabs)/matcher" as any);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#fdfbf7]"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="items-center pt-14 pb-4 bg-[#fdfbf7]">
          {/* Logo */}
          <View className="flex-row items-center mb-6">
            <View className="bg-[#e07a5f] rounded-lg p-1.5 mr-2">
              <Ionicons name="book-outline" size={18} color="#ffffff" />
            </View>
            <Text className="text-2xl font-bold text-[#3d405b] tracking-wide">
              Bookmerang
            </Text>
          </View>

          {/* Imagen */}
          <Image
            source={require("../assets/images/fondo_bookmerang.png")}
            style={{ width: "100%", height: 220 }}
            resizeMode="cover"
          />
        </View>

        {/* Formulario */}
        <View className="flex-1 px-7 pt-2 pb-8 bg-[#fdfbf7]">
          <Text className="text-3xl font-bold text-[#3d405b] mb-7 text-center">
            Inicia sesión
          </Text>

          {/* Campo email */}
          <View className="flex-row items-center bg-white border border-[#e8e4dc] rounded-xl px-4 mb-4 h-14">
            <Ionicons
              name="mail-outline"
              size={18}
              color="#b0adb8"
              style={{ marginRight: 10 }}
            />
            <TextInput
              className="flex-1 text-[15px] text-[#3d405b]"
              placeholder="Correo electrónico"
              placeholderTextColor="#b0adb8"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {/* Campo contraseña */}
          <View className="flex-row items-center bg-white border border-[#e8e4dc] rounded-xl px-4 mb-2.5 h-14">
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color="#b0adb8"
              style={{ marginRight: 10 }}
            />
            <TextInput
              className="flex-1 text-[15px] text-[#3d405b]"
              placeholder="Contraseña"
              placeholderTextColor="#b0adb8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={18}
                color="#b0adb8"
              />
            </TouchableOpacity>
          </View>

          {/* ¿Olvidaste tu contraseña? */}
          <TouchableOpacity className="self-end mb-5">
            <Text className="text-[#e07a5f] text-sm font-medium">
              ¿Olvidaste tu contraseña?
            </Text>
          </TouchableOpacity>

          {/* Error */}
          {error ? (
            <View className="bg-[#fef2f0] border border-[#f8c4bb] rounded-xl p-3 mb-4">
              <Text className="text-[#e07a5f] text-sm">{error}</Text>
            </View>
          ) : null}

          {/* Botón principal */}
          <TouchableOpacity
            className={`rounded-full py-4 items-center mb-4 ${
              loading ? "bg-[#f0a898]" : "bg-[#e07a5f]"
            }`}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text className="text-white font-bold text-base">
              {loading ? "Cargando..." : "Iniciar sesión"}
            </Text>
          </TouchableOpacity>

          {/* registro */}
          <View className="items-center mt-1">
            <Text className="text-[#9e9aad] text-sm">
              ¿No tienes cuenta?{" "}
              <Text
                className="text-[#e07a5f] font-bold underline"
                onPress={() => router.replace("/register" as any)}
              >
                Regístrate
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
