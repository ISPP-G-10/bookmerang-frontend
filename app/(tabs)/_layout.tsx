import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, Tabs, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useTutorial } from '@/contexts/TutorialContext';
import { CopilotStep, useCopilot, walkthroughable } from 'react-native-copilot';

const WalkthroughableView = walkthroughable(View);
const WalkthroughablePressable = walkthroughable(Pressable);

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

/** Strip `href` from tab-button props so Pressable renders a <div> instead of
 *  an <a> on web — prevents the browser from doing a full-page navigation
 *  (the `onPress` handler already does client-side SPA routing). */
function stripHref(props: any): any {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { href, ...rest } = props ?? {};
  return rest;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { session, isBookdropUser, loading } = useAuth();
  const {
    tutorialCompleted,
    tutorialLoading,
    tutorialReplayRequested,
    completeTutorial,
  } = useTutorial();
  const { start, copilotEvents, visible: copilotVisible } = useCopilot();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 0);
  const segments = useSegments();
  // `isTabsActive` ensures the tutorial only starts when the user is actually
  // viewing the tabs. Expo Router v3 might resolve the root path `/` to empty segments
  // or a direct nested route, so we check if segments start with `(tabs)`, are empty,
  // or point to a known tab screen like 'matcher'.
  const isTabsActive = !segments || !segments[0] || segments[0] === '(tabs)' || segments[0] === 'matcher';
  const shouldShowTutorial = !tutorialCompleted || tutorialReplayRequested;

  const displayName = session?.user?.name || session?.user?.username || 'lector/a';

  // Auto-start tutorial for new users
  useEffect(() => {
    if (!tutorialLoading && shouldShowTutorial && session && isTabsActive) {
      const timeout = setTimeout(() => {
        start();
      }, 800);
      return () => clearTimeout(timeout);
    }
  }, [tutorialLoading, shouldShowTutorial, session, isTabsActive]);

  // Navigate tabs in sync with tutorial steps
  useEffect(() => {
    const handleStepChange = (step: any) => {
      if (!step || !copilotVisible) return;
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

    const handleStop = () => {
      completeTutorial();
      router.navigate('/(tabs)/matcher' as any);
    };

    copilotEvents.on('stepChange', handleStepChange);
    copilotEvents.on('stop', handleStop);
    return () => {
      copilotEvents.off('stepChange', handleStepChange);
      copilotEvents.off('stop', handleStop);
    };
  }, [completeTutorial, copilotVisible]);

  if (loading) {
    return null;
  }

  if (isBookdropUser) {
    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fdfbf7' }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          tabBarInactiveTintColor: '#3d405b',
          tabBarLabelStyle: {
            fontSize: 10,
            fontFamily: 'Outfit_400Regular',
          },
          tabBarStyle: {
            paddingBottom: bottomInset + 5,
            paddingTop: 5,
            height: 65 + bottomInset,
          },
          headerShown: false,
        }}>
        <Tabs.Screen
          name="matcher"
          options={{
            title: 'Matcher',
            tabBarIcon: ({ color }) => <TabBarIcon name="heart" color={color} />,
            tabBarButton: (props) => shouldShowTutorial ? (
              <CopilotStep
                text={JSON.stringify({
                  icon: '💘',
                  title: 'Matcher',
                  body: 'Desliza a la derecha ❤️ si un libro te interesa, o a la izquierda ✗ para pasar. Si a la otra persona también le interesa el tuyo, ¡es un match!',
                })}
                order={2}
                name="matcher-tab"
              >
                <WalkthroughablePressable {...stripHref(props)} />
              </CopilotStep>
            ) : (
              <Pressable {...stripHref(props)} />
            ),
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: 'Chats',
            tabBarIcon: ({ color }) => <TabBarIcon name="comment" color={color} />,
            tabBarButton: (props) => shouldShowTutorial ? (
              <CopilotStep
                text={JSON.stringify({
                  icon: '💬',
                  title: 'Chats',
                  body: 'Tus conversaciones organizadas en tres pestañas: "Nuevos" para matches recientes, "En curso" para intercambios aceptados, y "Finalizados" para el historial. Escribe aquí para acordar dónde y cuándo hacer el intercambio.',
                })}
                order={3}
                name="chat-tab"
              >
                <WalkthroughablePressable {...stripHref(props)} />
              </CopilotStep>
            ) : (
              <Pressable {...stripHref(props)} />
            ),
          }}
        />
        <Tabs.Screen
          name="subir"
          options={{
            title: 'Subir',
            tabBarIcon: ({ color }) => <TabBarIcon name="plus" color={color} />,
            tabBarButton: (props) => shouldShowTutorial ? (
              <CopilotStep
                text={JSON.stringify({
                  icon: '➕',
                  title: 'Sube tus libros',
                  body: 'Añade entre 2 y 4 fotos del libro, luego rellena el título, autor y estado. Cuantos más libros subas, más matches tendrás. ¡Puedes guardar borradores y retomarlo más tarde!',
                })}
                order={4}
                name="subir-tab"
              >
                <WalkthroughablePressable {...stripHref(props)} />
              </CopilotStep>
            ) : (
              <Pressable {...stripHref(props)} />
            ),
          }}
        />
        <Tabs.Screen
          name="comunidades"
          options={{
            title: 'Comunidades',
            tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
            tabBarButton: (props) => shouldShowTutorial ? (
              <CopilotStep
                text={JSON.stringify({
                  icon: '🏡',
                  title: 'Comunidades',
                  body: 'Únete a grupos de lectura asociados a un BookSpot cercano. Dentro de cada comunidad tienes: chat grupal, quedadas presenciales, biblioteca compartida y ranking mensual. Explora las disponibles o crea la tuya propia.',
                })}
                order={5}
                name="comunidades-tab"
              >
                <WalkthroughablePressable {...stripHref(props)} />
              </CopilotStep>
            ) : (
              <Pressable {...stripHref(props)} />
            ),
          }}
        />
        <Tabs.Screen
          name="bookspots"
          options={{
            title: 'BookSpots',
            tabBarIcon: ({ color }) => <TabBarIcon name="map-marker" color={color} />,
            tabBarButton: (props) => shouldShowTutorial ? (
              <CopilotStep
                text={JSON.stringify({
                  icon: '📍',
                  title: 'BookSpots',
                  body: 'Puntos físicos donde hacer los intercambios: cafeterías, bibliotecas, librerías... Puedes validar spots propuestos por otros usuarios o proponer uno nuevo con el botón +. ¡Ya lo tienes todo, empieza a explorar!',
                })}
                order={6}
                name="bookspots-tab"
              >
                <WalkthroughablePressable {...stripHref(props)} />
              </CopilotStep>
            ) : (
              <Pressable {...stripHref(props)} />
            ),
          }}
        />
      </Tabs>

      {/* Welcome step — solo se monta cuando toca mostrar el tutorial */}
      {shouldShowTutorial && <View
        style={{
          position: 'absolute',
          top: screenHeight * 0.65,
          left: Math.max(8, (screenWidth - 320) / 2),
          width: 1,
          height: 1,
        }}
        pointerEvents="none"
      >
        <CopilotStep
          text={JSON.stringify({
            icon: '📚',
            title: `¡Bienvenido, ${displayName}!`,
            body: 'Bookmerang es tu app para intercambiar libros con personas cerca de ti. En un momento te mostramos cómo funciona.',
          })}
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
      </View>}
    </View>
  );
}
