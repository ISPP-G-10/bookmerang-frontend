import React from "react";
import { Text, View } from "react-native";

interface ErrorMessageProps {
  message?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  if (!message) return null;

  return (
    <View className="bg-[#fef2f0] border border-[#f8c4bb] rounded-xl p-3 mb-4">
      <Text className="text-[#e07a5f] text-sm">{message}</Text>
    </View>
  );
};
