import React from "react";
import { Text, TouchableOpacity, ActivityIndicator } from "react-native";

interface AuthButtonProps {
  onPress: () => void;
  title: string;
  loading?: boolean;
  disabled?: boolean;
}

export const AuthButton: React.FC<AuthButtonProps> = ({
  onPress,
  title,
  loading,
  disabled,
}) => {
  return (
    <TouchableOpacity
      className={`rounded-full py-4 items-center mb-4 ${
        loading || disabled ? "bg-[#f0a898]" : "bg-[#e07a5f]"
      }`}
      onPress={onPress}
      disabled={loading || disabled}
    >
      {loading ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text className="text-white font-bold text-base">{title}</Text>
      )}
    </TouchableOpacity>
  );
};
