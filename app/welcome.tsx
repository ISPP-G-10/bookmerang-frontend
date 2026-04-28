import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const CORAL = "#e07a5f";
const NAVY = "#3d405b";
const CREAM = "#fdfbf7";
const GOLD = "#f2cc8f";
const GREEN = "#81b29a";

const FEATURES = [
  {
    icon: "swap-horizontal-outline" as const,
    title: "Intercambia",
    description: "Cambia libros con lectores cercanos a ti de forma totalmente gratuita",
    color: CORAL,
  },
  {
    icon: "search-outline" as const,
    title: "Descubre",
    description: "Encuentra tu próxima lectura favorita entre miles de títulos",
    color: GREEN,
  },
  {
    icon: "people-outline" as const,
    title: "Conecta",
    description: "Únete a una comunidad vibrante de amantes de los libros",
    color: GOLD,
  },
];

function FloatingLogo() {
  const translateY = useSharedValue(0);
  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-9, { duration: 1900, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1900, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, []);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  return (
    <Animated.View style={animStyle}>
      <View style={styles.logoGlow} />
      <View style={styles.logoIconContainer}>
        <Ionicons name="book-outline" size={60} color="#fff" />
      </View>
    </Animated.View>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  color,
  enterDelay,
}: (typeof FEATURES)[0] & { enterDelay: number }) {
  return (
    <Animated.View
      entering={FadeInDown.delay(enterDelay).springify().damping(16)}
      style={styles.featureCard}
    >
      <View style={[styles.featureIconBg, { backgroundColor: color + "28" }]}>
        <Ionicons name={icon} size={28} color={color} />
      </View>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDesc}>{description}</Text>
    </Animated.View>
  );
}

function FloatDot({
  left,
  top,
  size,
  color,
  delay,
}: {
  left: number;
  top: number;
  size: number;
  color: string;
  delay: number;
}) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0.4);
  useEffect(() => {
    const dur = 1900 + delay * 380;
    translateY.value = withDelay(
      delay * 220,
      withRepeat(
        withSequence(
          withTiming(-13, { duration: dur, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: dur, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );
    opacity.value = withDelay(
      delay * 220,
      withRepeat(
        withSequence(
          withTiming(0.85, { duration: dur }),
          withTiming(0.2, { duration: dur })
        ),
        -1,
        false
      )
    );
  }, []);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));
  return (
    <Animated.View
      style={[
        animStyle,
        {
          position: "absolute",
          left,
          top,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
      ]}
    />
  );
}

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width > 640;
  const router = useRouter();

  const handleStart = async () => {
    await AsyncStorage.setItem("hasVisited", "true");
    router.replace("/login" as any);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          title: "Bookmerang – Intercambia libros con tu comunidad",
        }}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: CREAM }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── HERO ─── */}
        <LinearGradient
          colors={["#fff8f5", "#fdfbf7", "#eef2ff"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 52 }]}
        >
          {/* Background blobs */}
          <View
            style={[
              styles.blob,
              { width: 240, height: 240, top: -70, right: -80, backgroundColor: CORAL + "1a" },
            ]}
          />
          <View
            style={[
              styles.blob,
              { width: 180, height: 180, bottom: -40, left: -60, backgroundColor: GREEN + "1a" },
            ]}
          />
          <View
            style={[
              styles.blob,
              { width: 110, height: 110, top: 100, left: 20, backgroundColor: GOLD + "28" },
            ]}
          />

          {/* Floating accent dots */}
          <FloatDot left={44} top={88} size={9} color={CORAL} delay={0} />
          <FloatDot left={width - 64} top={116} size={6} color={GREEN} delay={1} />
          <FloatDot left={width - 36} top={228} size={11} color={GOLD} delay={2} />
          <FloatDot left={18} top={264} size={5} color={CORAL} delay={3} />
          <FloatDot left={width / 2 - 10} top={36} size={7} color={GREEN} delay={4} />

          {/* Logo */}
          <Animated.View
            entering={FadeInDown.delay(80).springify().damping(12)}
            style={{ marginBottom: 32, alignItems: "center" }}
          >
            <FloatingLogo />
          </Animated.View>

          {/* Brand name */}
          <Animated.View
            entering={FadeInDown.delay(170).springify().damping(14)}
            style={{ alignItems: "center", marginBottom: 18 }}
          >
            <Text style={[styles.brandText, { fontSize: isWide ? 56 : 48 }]}>
              Bookmerang
            </Text>
            <View style={styles.brandUnderline} />
          </Animated.View>

          {/* Tagline */}
          <Animated.Text
            entering={FadeInDown.delay(260).springify().damping(15)}
            style={[styles.tagline, { maxWidth: isWide ? 500 : 320 }]}
          >
            Intercambia libros con tu comunidad y da una segunda vida a tus
            lecturas favoritas
          </Animated.Text>

          {/* CTA */}
          <Animated.View
            entering={FadeInDown.delay(360).springify().damping(13)}
            style={{ marginTop: 36 }}
          >
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={handleStart}
              activeOpacity={0.82}
            >
              <Text style={styles.ctaText}>Comenzar</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </TouchableOpacity>
          </Animated.View>
        </LinearGradient>

        {/* ─── FEATURES ─── */}
        <View style={styles.featuresSection}>
          <Animated.Text
            entering={FadeInDown.delay(500).springify()}
            style={styles.sectionTitle}
          >
            ¿Por qué Bookmerang?
          </Animated.Text>
          <View style={[styles.featuresGrid, isWide && { flexDirection: "row" }]}>
            {FEATURES.map((f, i) => (
              <FeatureCard key={f.title} {...f} enterDelay={580 + i * 110} />
            ))}
          </View>
        </View>

        {/* ─── FOOTER ─── */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 28 }]}>
          <View style={styles.footerLogo}>
            <View style={styles.footerIconBox}>
              <Ionicons name="book-outline" size={15} color="white" />
            </View>
            <Text style={styles.footerBrand}>Bookmerang</Text>
          </View>
          <Text style={styles.footerText}>
            © 2025 Bookmerang. Todos los derechos reservados.
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: "center",
    paddingBottom: 72,
    paddingHorizontal: 24,
    position: "relative",
    overflow: "hidden",
  },
  blob: {
    position: "absolute",
    borderRadius: 999,
  },
  logoIconContainer: {
    backgroundColor: CORAL,
    borderRadius: 26,
    padding: 24,
    shadowColor: CORAL,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.48,
    shadowRadius: 28,
    elevation: 16,
  },
  logoGlow: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: CORAL + "22",
    top: -8,
    left: -8,
  },
  brandText: {
    fontFamily: "Outfit_700Bold",
    color: NAVY,
    letterSpacing: -1.5,
    textAlign: "center",
  },
  brandUnderline: {
    width: 68,
    height: 4,
    backgroundColor: CORAL,
    borderRadius: 2,
    marginTop: 10,
  },
  tagline: {
    fontFamily: "Outfit_400Regular",
    fontSize: 17,
    color: "#9e9aad",
    textAlign: "center",
    lineHeight: 27,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: CORAL,
    paddingHorizontal: 36,
    paddingVertical: 18,
    borderRadius: 999,
    shadowColor: CORAL,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  ctaText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 18,
    color: "white",
  },
  featuresSection: {
    paddingHorizontal: 18,
    paddingVertical: 52,
    backgroundColor: "#f7f4ef",
  },
  sectionTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 26,
    color: NAVY,
    textAlign: "center",
    marginBottom: 14,
  },
  featuresGrid: {
    flexDirection: "column",
  },
  featureCard: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 22,
    marginVertical: 7,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e8e4dc",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  featureIconBg: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  featureTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    color: NAVY,
    marginBottom: 6,
    textAlign: "center",
  },
  featureDesc: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: "#9e9aad",
    textAlign: "center",
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 34,
    alignItems: "center",
    backgroundColor: NAVY,
  },
  footerLogo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },
  footerIconBox: {
    backgroundColor: CORAL,
    borderRadius: 8,
    padding: 7,
  },
  footerBrand: {
    fontFamily: "Outfit_700Bold",
    fontSize: 18,
    color: "white",
  },
  footerText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.42)",
    textAlign: "center",
  },
});
