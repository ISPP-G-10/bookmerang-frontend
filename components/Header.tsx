import { useAuth } from "@/contexts/AuthContext";
import { getMyInkdrops } from "@/lib/inkdropsApi";
import { Ionicons } from "@expo/vector-icons";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface HeaderProps {
  showBack?: boolean;
}

export default function Header({ showBack = false }: HeaderProps) {
  const insets = useSafeAreaInsets();
  const { currentUserId } = useAuth();
  const [inkdrops, setInkdrops] = useState<number | null>(null);

  useEffect(() => {
    if (!currentUserId) return;
    getMyInkdrops()
      .then((data) => setInkdrops(data.inkdrops))
      .catch(() => setInkdrops(null));
  }, [currentUserId]);

  const handleLeftPress = () => {
    if (showBack) {
      router.back();
    } else {
      router.push("/profile");
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <TouchableOpacity onPress={handleLeftPress}>
        <View style={styles.profileButton}>
          <FontAwesome
            name={showBack ? "arrow-left" : "user"}
            size={18}
            color="#fdfbf7"
          />
        </View>
      </TouchableOpacity>

      <View style={styles.logoContainer}>
        <View style={styles.logoIcon}>
          <FontAwesome name="book" size={16} color="#fdfbf7" />
        </View>
        <Text style={styles.logoText}>Bookmerang</Text>
      </View>

      {inkdrops !== null ? (
        <View style={styles.inkdropsChip}>
          <Ionicons name="water" size={14} color="#e4715f" />
          <Text style={styles.inkdropsText}>{inkdrops}</Text>
        </View>
      ) : (
        <View style={styles.spacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#e07a5f",
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoIcon: {
    backgroundColor: "#e07a5f",
    borderRadius: 7,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  logoText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 18,
    color: "#e07a5f",
  },
  inkdropsChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1.5,
    borderColor: "#e4715f",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  inkdropsText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
    color: "#e4715f",
  },
  spacer: {
    width: 36,
  },
});
