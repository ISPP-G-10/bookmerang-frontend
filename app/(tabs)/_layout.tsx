import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs, router, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useTutorial } from '@/contexts/TutorialContext';
import { CopilotStep, useCopilot, walkthroughable } from 'react-native-copilot';

const WalkthroughableView = walkthroughable(View);

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { session } = useAuth();
  const { tutorialCompleted, tutorialLoading, completeTutorial } = useTutorial();
  const { start, copilotEvents } = useCopilot();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const segments = useSegments();
  const isTabsActive = segments[0] === '(tabs)';

  const displayName = session?.user?.user_metadata?.display_name || 'lector/a';

  useEffect(() => {
    if (!tutorialLoading && !tutorialCompleted && session && isTabsActive) {
      const timeout = setTimeout(() => {
        start();
      }, 800);
      return () => clearTimeout(timeout);
    }
  }, [tutorialLoading, tutorialCompleted, session, isTabsActive]);

  useEffect(() => {
    const handleStepChange = (step: any) => {
      if (!step) return;
      switch (step.name) {
        case 'welcome':
        case 'matcher-tab':
          router.navigate('/(tabs)/matcher' as any);
          break;
        case 'chat-tab':
          router.navigate('/(tabs)/chat' as any);
          break;
        case 'subir-tab':
          router.navigate('/(tabs)/subir' as any);
          break;
        case 'comunidades-tab':
          router.navigate('/(tabs)/comunidades' as any);
          break;
        case 'bookspots-tab':
          router.navigate('/(tabs)/bookspots' as any);
          break;
      }
    };

    copilotEvents.on('stepChange', handleStepChange);
    copilotEvents.on('stop', () => {
      completeTutorial();
      router.navigate('/(tabs)/matcher' as any);
    });
    return () => {
      copilotEvents.off('stepChange');
      copilotEvents.off('stop');
    };
  }, [completeTutorial]);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          tabBarInactiveTintColor: '#3d405b',
          tabBarLabelStyle: {
            fontSize: 11,
          },
          tabBarStyle: {
            paddingBottom: 5,
            paddingTop: 5,
            height: 65,
          },
          headerShown: false,
        }}>
        <Tabs.Screen
          name="matcher"
          options={{
            title: 'Matcher',
            tabBarIcon: ({ color }) => <TabBarIcon name="heart" color={color} />,
            tabBarButton: (props) => (
              <CopilotStep
                text="Matcher 💘 Aquí descubrirás libros de otros usuarios. Desliza a la derecha si te interesa, o a la izquierda para pasar."
                order={2}
                name="matcher-tab"
              >
                <WalkthroughableView {...props} />
              </CopilotStep>
            ),
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: 'Chats',
            tabBarIcon: ({ color }) => <TabBarIcon name="comment" color={color} />,
            tabBarButton: (props) => (
              <CopilotStep
                text="Chats 💬 Cuando hagas match con alguien, aquí podréis chatear para acordar el intercambio de libros."
                order={3}
                name="chat-tab"
              >
                <WalkthroughableView {...props} />
              </CopilotStep>
            ),
          }}
        />
        <Tabs.Screen
          name="subir"
          options={{
            title: 'Subir',
            tabBarIcon: ({ color }) => <TabBarIcon name="plus" color={color} />,
            tabBarButton: (props) => (
              <CopilotStep
                text="Subir ➕ Añade los libros que quieras intercambiar. Otros usuarios los verán en su matcher."
                order={4}
                name="subir-tab"
              >
                <WalkthroughableView {...props} />
              </CopilotStep>
            ),
          }}
        />
        <Tabs.Screen
          name="comunidades"
          options={{
            title: 'Comuni...',
            tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
            tabBarButton: (props) => (
              <CopilotStep
                text="Comunidades 🏠 Únete a grupos de lectura y conecta con personas que comparten tus gustos literarios."
                order={5}
                name="comunidades-tab"
              >
                <WalkthroughableView {...props} />
              </CopilotStep>
            ),
          }}
        />
        <Tabs.Screen
          name="bookspots"
          options={{
            title: 'BookSp...',
            tabBarIcon: ({ color }) => <TabBarIcon name="map-marker" color={color} />,
            tabBarButton: (props) => (
              <CopilotStep
                text="BookSpots 📍 Encuentra puntos de intercambio cercanos en el mapa. ¡Ya estás listo para explorar Bookmerang!"
                order={6}
                name="bookspots-tab"
              >
                <WalkthroughableView {...props} />
              </CopilotStep>
            ),
          }}
        />
      </Tabs>

      {/* Welcome step - centered anchor for first tutorial box */}
      <View
        style={{
          position: 'absolute',
          top: screenHeight / 2,
          left: screenWidth / 2,
          width: 1,
          height: 1,
        }}
        pointerEvents="none"
      >
        <CopilotStep
          text={`¡Bienvenido a Bookmerang, ${displayName}! 📚\n\nTu nueva app para intercambiar libros con otras personas. Vamos a darte un tour rápido por las secciones principales.`}
          order={1}
          name="welcome"
        >
          <WalkthroughableView
            style={{
              width: 1,
              height: 1,
              backgroundColor: 'transparent',
            }}
          />
        </CopilotStep>
      </View>
    </View>
  );
}
