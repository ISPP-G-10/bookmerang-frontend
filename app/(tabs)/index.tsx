import { useEffect, useState } from "react";
import { Button, StyleSheet } from "react-native";

import EditScreenInfo from "@/components/EditScreenInfo";
import { Text, View } from "@/components/Themed";
import { router } from "expo-router";
import supabase from "../../lib/supabase";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8080";

export default function TabOneScreen() {
  const [status, setStatus] = useState<string>("sin comprobar");
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setLoggedIn(!!data?.session);
      } catch (e) {
        setLoggedIn(false);
      }
    })();
  }, []);

  const checkStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/health`);
      const data = await res.json();
      setStatus(data.status ?? "unknown");
    } catch (err) {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bookmerang1</Text>

      <Text style={styles.status}>Backend status: {status}</Text>

      <Button
        title={loading ? "Comprobando..." : "Comprobar backend"}
        onPress={checkStatus}
        disabled={loading}
      />

      {loggedIn && (
        <Button title="Ver mi perfil" onPress={() => router.push("/profile")} />
      )}

      <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />

      <EditScreenInfo path="app/(tabs)/index.tsx" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  status: {
    fontSize: 16,
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: "80%",
  },
});
