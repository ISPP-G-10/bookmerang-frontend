import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title }) => {
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
            source={require("../../assets/images/fondo_bookmerang.png")}
            style={{ width: "100%", height: 220 }}
            resizeMode="cover"
          />
        </View>

        {/* Formulario */}
        <View className="flex-1 px-7 pt-2 pb-8 bg-[#fdfbf7]">
          <Text className="text-3xl font-bold text-[#3d405b] mb-7 text-center">
            {title}
          </Text>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
