import { AuthButton } from "@/components/auth/AuthButton";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ErrorMessage } from "@/components/auth/ErrorMessage";
import { authService } from "@/lib/authService";
import { router } from "expo-router";
import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Por favor, introduce tu email y contraseña");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await authService.signIn(email, password);
      router.replace("/(tabs)/matcher" as any);
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Inicia sesión" scrollable={false}>
      <AuthInput
        icon="mail-outline"
        placeholder="Correo electrónico"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <AuthInput
        icon="lock-closed-outline"
        placeholder="Contraseña"
        value={password}
        onChangeText={setPassword}
        isPassword
      />

      <TouchableOpacity className="self-end mb-5">
        <Text className="text-[#e07a5f] text-sm font-medium">
          ¿Olvidaste tu contraseña?
        </Text>
      </TouchableOpacity>

      <ErrorMessage message={error} />

      <AuthButton
        title="Iniciar sesión"
        onPress={handleLogin}
        loading={loading}
      />

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
    </AuthLayout>
  );
}
