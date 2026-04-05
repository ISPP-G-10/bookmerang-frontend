import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs, usePathname, useRouter } from 'expo-router';
import React, { useEffect } from 'react';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { isBookdropUser, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (isBookdropUser) {
      router.replace('/bookDropControlPanel');
    }
  }, [isBookdropUser, loading, pathname, router]);

  if (loading) {
    return null;
  }

  if (isBookdropUser) {
    // Los usuarios BookDrop no deben montar el layout de tabs.
    return null;
  }

  return (
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
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color }) => <TabBarIcon name="comment" color={color} />,
        }}
      />
      <Tabs.Screen
        name="subir"
        options={{
          title: 'Subir',
          tabBarIcon: ({ color }) => <TabBarIcon name="plus" color={color} />,
        }}
      />
      <Tabs.Screen
        name="comunidades"
        options={{
          title: 'Comuni...',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="bookspots"
        options={{
          title: 'BookSp...',
          tabBarIcon: ({ color }) => <TabBarIcon name="map-marker" color={color} />,
        }}
      />
    </Tabs>
  );
}
