import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  scrollable?: boolean;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  scrollable = true,
}) => {
  const isWeb = Platform.OS === "web";
  const { height } = useWindowDimensions();

  const isShortScreen = height < 760;
  const headerTopPadding = isShortScreen ? 36 : 56;
  const headerBottomPadding = isShortScreen ? 12 : 16;
  const imageHeight = isWeb ? Math.min(260, height * 0.32) : isShortScreen ? 170 : 220;
  const imageWidth = isWeb ? 420 : "80%";

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#fdfbf7]"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {scrollable ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View
            className="items-center bg-[#fdfbf7]"
            style={{ paddingTop: headerTopPadding, paddingBottom: headerBottomPadding }}
          >
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
              style={{
                width: imageWidth,
                height: imageHeight,
                maxWidth: "90%",
              }}
              resizeMode="cover"
            />
          </View>

          {/* Formulario */}
          <View className="flex-1 px-7 bg-[#fdfbf7]" style={{ paddingTop: isShortScreen ? 4 : 8, paddingBottom: isShortScreen ? 20 : 32 }}>
            <Text className="text-3xl font-bold text-[#3d405b] mb-7 text-center">
              {title}
            </Text>
            {children}
          </View>
        </ScrollView>
      ) : (
        <View className="flex-1 bg-[#fdfbf7]" pointerEvents="box-none">
          {/* Header */}
          <View
            className="items-center bg-[#fdfbf7]"
            style={{ paddingTop: headerTopPadding, paddingBottom: headerBottomPadding }}
          >
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
              style={{
                width: imageWidth,
                height: imageHeight,
                maxWidth: "90%",
              }}
              resizeMode="cover"
            />
          </View>

          {/* Formulario */}
          <View
            className="flex-1 px-7 bg-[#fdfbf7]"
            style={{ paddingTop: isShortScreen ? 4 : 8, paddingBottom: isShortScreen ? 20 : 32 }}
          >
            <Text className="text-3xl font-bold text-[#3d405b] mb-7 text-center">
              {title}
            </Text>
            {children}
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};
