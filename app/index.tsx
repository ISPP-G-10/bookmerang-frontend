import { router } from "expo-router";
import { useEffect } from "react";
import supabase from "../lib/supabase";

export default function IndexScreen() {
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
    }
  };

  // Retornamos null para que no se vea una pantalla de carga blanca con el spinner
  // mientras el RootLayout y AuthContext resuelven el estado y ocultan el SplashScreen.
  return null;
}
