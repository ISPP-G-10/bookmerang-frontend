import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { TextInput, TouchableOpacity, View, TextInputProps } from "react-native";

interface AuthInputProps extends TextInputProps {
  icon: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
}

export const AuthInput: React.FC<AuthInputProps> = ({
  icon,
  isPassword,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View className="flex-row items-center bg-white border border-[#e8e4dc] rounded-xl px-4 mb-4 h-14">
      <Ionicons
        name={icon}
        size={18}
        color="#b0adb8"
        style={{ marginRight: 10 }}
      />
      <TextInput
        className="flex-1 text-[15px] text-[#3d405b]"
        placeholderTextColor="#b0adb8"
        secureTextEntry={isPassword && !showPassword}
        {...props}
      />
      {isPassword && (
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Ionicons
            name={showPassword ? "eye-off-outline" : "eye-outline"}
            size={18}
            color="#b0adb8"
          />
        </TouchableOpacity>
      )}
    </View>
  );
};
