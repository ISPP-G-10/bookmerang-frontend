import { AuthButton } from "@/components/auth/AuthButton";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ErrorMessage } from "@/components/auth/ErrorMessage";
import { authService } from "@/lib/authService";
import { getEmailValidationError, normalizeEmail } from "@/lib/emailValidation";
import { router } from "expo-router";
import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

type Step = "email" | "code" | "done";

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRequestReset = async () => {
    if (!email) {
      setError("Por favor, introduce tu correo electrónico");
      return;
    }

    const emailError = getEmailValidationError(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    setLoading(true);
    setError("");
    try {
      await authService.requestPasswordReset(normalizeEmail(email));
      setStep("code");
    } catch (err: any) {
      setError(err.message || "Error al enviar el correo de recuperación");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!code.trim()) {
      setError("Introduce el código que recibiste por correo");
      return;
    }

    if (!newPassword) {
      setError("Introduce tu nueva contraseña");
      return;
    }

    if (newPassword.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await authService.resetPassword(code.trim(), newPassword);
      setStep("done");
    } catch (err: any) {
      setError(err.message || "Error al restablecer la contraseña");
    } finally {
      setLoading(false);
    }
  };

  if (step === "done") {
    return (
      <AuthLayout title="¡Contraseña actualizada!" scrollable={true}>
        <View className="items-center py-4">
          <Text className="text-[#3d405b] text-base text-center mb-6 leading-6">
            Tu contraseña se ha restablecido correctamente. Ya puedes iniciar
            sesión con tu nueva contraseña.
          </Text>

          <AuthButton
            title="Volver al inicio de sesión"
            onPress={() => router.replace("/login" as any)}
          />
        </View>
      </AuthLayout>
    );
  }

  if (step === "code") {
    return (
      <AuthLayout title="Nueva contraseña" scrollable={true}>
        <Text className="text-[#9e9aad] text-sm text-center mb-5 leading-5">
          Introduce el código de 6 caracteres que hemos enviado a{" "}
          <Text className="text-[#3d405b] font-bold">{email}</Text> y elige tu
          nueva contraseña.
        </Text>

        <AuthInput
          icon="key-outline"
          placeholder="Código de recuperación"
          value={code}
          onChangeText={(value) => {
            setCode(value.toUpperCase());
            if (error) setError("");
          }}
          autoCapitalize="characters"
          maxLength={6}
          returnKeyType="next"
        />

        <AuthInput
          icon="lock-closed-outline"
          placeholder="Nueva contraseña"
          value={newPassword}
          onChangeText={(value) => {
            setNewPassword(value);
            if (error) setError("");
          }}
          isPassword
          returnKeyType="next"
        />

        <AuthInput
          icon="lock-closed-outline"
          placeholder="Confirmar contraseña"
          value={confirmPassword}
          onChangeText={(value) => {
            setConfirmPassword(value);
            if (error) setError("");
          }}
          isPassword
          returnKeyType="done"
          onSubmitEditing={handleResetPassword}
        />

        <ErrorMessage message={error} />

        <AuthButton
          title="Restablecer contraseña"
          onPress={handleResetPassword}
          loading={loading}
        />

        <View className="items-center mt-1">
          <TouchableOpacity onPress={() => { setStep("email"); setError(""); }}>
            <Text className="text-[#e07a5f] text-sm font-medium">
              Volver atrás
            </Text>
          </TouchableOpacity>
        </View>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Recuperar contraseña" scrollable={true}>
      <Text className="text-[#9e9aad] text-sm text-center mb-5 leading-5">
        Introduce tu correo electrónico y te enviaremos un código para
        restablecer tu contraseña.
      </Text>

      <AuthInput
        icon="mail-outline"
        placeholder="Correo electrónico"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          if (error) setError("");
        }}
        autoCapitalize="none"
        keyboardType="email-address"
        returnKeyType="done"
        onSubmitEditing={handleRequestReset}
      />

      <ErrorMessage message={error} />

      <AuthButton
        title="Enviar código"
        onPress={handleRequestReset}
        loading={loading}
      />

      <View className="items-center mt-1">
        <TouchableOpacity onPress={() => router.replace("/login" as any)}>
          <Text className="text-[#e07a5f] text-sm font-medium">
            Volver al inicio de sesión
          </Text>
        </TouchableOpacity>
      </View>
    </AuthLayout>
  );
}
