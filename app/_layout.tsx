import { useColorScheme } from "@/components/useColorScheme";
import { Outfit_400Regular, Outfit_700Bold } from '@expo-google-fonts/outfit';
import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";
import '../global.css';

import TutorialTooltip from '@/components/TutorialTooltip';
import { AuthProvider } from '@/contexts/AuthContext';
import { TutorialProvider } from '@/contexts/TutorialContext';
import { CopilotProvider } from 'react-native-copilot';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    Outfit_400Regular,
    Outfit_700Bold,
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
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

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <TutorialProvider>
        <CopilotProvider
          tooltipComponent={TutorialTooltip}
          stepNumberComponent={() => null}
          backdropColor="rgba(0,0,0,0.7)"
          animationDuration={300}
          verticalOffset={0}
          arrowColor="#ffffff"
        >
          <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
            <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: "modal" }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="profile" options={{ headerShown: false }} />
          <Stack.Screen name="books/[id]/index" options={{ headerShown: false }} />
          <Stack.Screen name="books/[id]/edit" options={{ headerShown: false }} />
          <Stack.Screen
            name="chat/[id]"
            options={{
              headerShown: true,
              title: "Chat",
            }}
          />
            </Stack>
          </ThemeProvider>
        </CopilotProvider>
      </TutorialProvider>
    </AuthProvider>
  );
}