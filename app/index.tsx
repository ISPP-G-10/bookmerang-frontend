import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import supabase from "../lib/supabase";

export default function IndexScreen() {
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        router.replace("/(tabs)/matcher");
      } else {
        router.replace("/login");
      }
    } catch (error) {
      console.error("Error checking auth:", error);
      router.replace("/login");
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <View className="flex-1 items-center justify-center bg-amber-50">
      <ActivityIndicator size="large" color="#92400e" />
    </View>
  );
}
