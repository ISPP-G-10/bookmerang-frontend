import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { Outfit_400Regular, Outfit_700Bold } from "@expo-google-fonts/outfit";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, usePathname, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import "../global.css";

import TutorialTooltip from '@/components/TutorialTooltip';
import { TutorialProvider } from '@/contexts/TutorialContext';
import { CopilotProvider } from 'react-native-copilot';

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    Outfit_400Regular,
    Outfit_700Bold,
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function AuthGate({ children }: { children: ReactNode }) {
  const { session, isBookdropUser, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [hasVisited, setHasVisited] = useState<boolean | null>(null);

  const isAuthRoute = pathname === "/login" || pathname === "/register";
  const isWelcomeRoute = pathname === "/welcome";
  const isBookdropRoute = pathname === "/bookDropControlPanel";
  const isIndexRoute = pathname === "/";

  useEffect(() => {
    AsyncStorage.getItem("hasVisited").then((val) => setHasVisited(val !== null));
  }, []);

  useEffect(() => {
    if (loading || hasVisited === null) return;

    if (!session) {
      if (isAuthRoute || isWelcomeRoute) return;
      router.replace(hasVisited ? ("/login" as any) : ("/welcome" as any));
      return;
    }

    if (isBookdropUser) {
      if (!isBookdropRoute) {
        router.replace("/bookDropControlPanel" as any);
      }
      return;
    }

    if (isAuthRoute || isBookdropRoute || isIndexRoute || isWelcomeRoute) {
      router.replace("/(tabs)/matcher" as any);
    }
  }, [
    isAuthRoute,
    isWelcomeRoute,
    isBookdropRoute,
    isBookdropUser,
    isIndexRoute,
    hasVisited,
    loading,
    pathname,
    router,
    session,
  ]);

  if (loading || hasVisited === null) return null;

  if (!session) {
    return isAuthRoute || isWelcomeRoute ? <>{children}</> : null;
  }

  if (isBookdropUser) {
    return isBookdropRoute ? <>{children}</> : null;
  }

  if (isAuthRoute || isBookdropRoute || isIndexRoute || isWelcomeRoute) {
    return null;
  }

  return <>{children}</>;
}

function RootLayoutNav() {
  const copilotTooltipStyle = {
    backgroundColor: 'transparent',
    paddingTop: 0,
    paddingHorizontal: 0,
    borderRadius: 0,
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <TutorialProvider>
          <CopilotProvider
            tooltipComponent={TutorialTooltip}
            stepNumberComponent={() => null}
            overlay="view"
            backdropColor="rgba(0,0,0,0.7)"
            animationDuration={300}
            verticalOffset={0}
            arrowColor="#ffffff"
            tooltipStyle={copilotTooltipStyle}
          >
            <SubscriptionProvider>
              <ThemeProvider value={DefaultTheme}>
                <AuthGate>
                  <Stack>
                    <Stack.Screen name="index" options={{ headerShown: false }} />
                    <Stack.Screen name="(tabs)" options={{ headerShown: false, contentStyle: { backgroundColor: '#fdfbf7' } }} />
                    <Stack.Screen name="login" options={{ headerShown: false }} />
                    <Stack.Screen name="modal" options={{ presentation: "modal" }} />
                    <Stack.Screen name="register" options={{ headerShown: false }} />
                    <Stack.Screen name="profile" options={{ headerShown: false }} />
                    <Stack.Screen
                      name="bookDropControlPanel"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="books/[id]/index"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="books/[id]/edit"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="books/create/[id]/datos"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="books/create/[id]/estado"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen name="subscription" options={{ headerShown: false }} />
                    <Stack.Screen name="welcome" options={{ headerShown: false }} />
                    <Stack.Screen
                      name="chat/[id]"
                      options={{
                        headerShown: true,
                        title: "Chat",
                      }}
                    />
                  </Stack>
                </AuthGate>
              </ThemeProvider>
            </SubscriptionProvider>
          </CopilotProvider>
        </TutorialProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
