import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { getCommunity } from '@/lib/communityApi';
import { CommunityDto } from '@/types/community';
import { mockBookspots } from '@/lib/mockBookspots';
import CommunityLibraryTab from '@/components/communities/CommunityLibraryTab';

const MAX_MEMBERS = 10;

type SectionKey = 'quedadas' | 'biblioteca' | 'ranking';

const SECTIONS: { key: SectionKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'quedadas', label: 'Quedadas', icon: 'calendar-outline' },
  { key: 'biblioteca', label: 'Biblioteca', icon: 'book' },
  { key: 'ranking', label: 'Ranking', icon: 'trophy-outline' },
];

export default function CommunityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const communityId = Number(id);

  const [community, setCommunity] = useState<CommunityDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<SectionKey>('biblioteca');

  const bookspotName = community
    ? mockBookspots.find(b => b.id === community.referenceBookspotId)?.nombre ?? ''
    : '';

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          setLoading(true);
          const data = await getCommunity(communityId);
          setCommunity(data);
        } catch (error: any) {
          Alert.alert('Error', error.message || 'No se pudo cargar la comunidad');
        } finally {
          setLoading(false);
        }
      })();
    }, [communityId])
  );

  if (loading || !community) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#e4715f" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header principal */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.communityName} numberOfLines={1}>{community.name}</Text>
          <View style={styles.bookspotRow}>
            <Ionicons name="location-outline" size={13} color="#9ca3af" />
            <Text style={styles.bookspotName} numberOfLines={1}>{bookspotName}</Text>
          </View>
        </View>

        <View style={styles.membersChip}>
          <Ionicons name="people-outline" size={15} color="#4b5563" />
          <Text style={styles.membersText}>{community.memberCount}/{MAX_MEMBERS}</Text>
        </View>
      </View>

      {/* Tabs de secciones */}
      <View style={styles.tabBar}>
        {SECTIONS.map(section => {
          const isActive = activeSection === section.key;
          const isDisabled = section.key !== 'biblioteca';
          return (
            <Pressable
              key={section.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => !isDisabled && setActiveSection(section.key)}
              disabled={isDisabled}
            >
              <Ionicons
                name={section.icon}
                size={20}
                color={isActive ? '#e4715f' : isDisabled ? '#d1ccc3' : '#9ca3af'}
              />
              <Text style={[
                styles.tabLabel,
                isActive && styles.tabLabelActive,
                isDisabled && styles.tabLabelDisabled,
              ]}>
                {section.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Contenido de la sección activa */}
      {activeSection === 'biblioteca' && (
        <CommunityLibraryTab communityId={communityId} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fdfbf7',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: '#fdfbf7',
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    marginLeft: 8,
  },
  communityName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1f2937',
  },
  bookspotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 3,
  },
  bookspotName: {
    fontSize: 13,
    color: '#9ca3af',
  },
  membersChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  membersText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0ece4',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    gap: 3,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#e4715f',
  },
  tabLabel: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#e4715f',
    fontWeight: '600',
  },
  tabLabelDisabled: {
    color: '#d1ccc3',
  },
});
