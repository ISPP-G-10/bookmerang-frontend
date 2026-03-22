import React, { useState, useCallback } from 'react';
import { StyleSheet, View, ActivityIndicator, Alert, Pressable, Platform } from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import Header from '@/components/Header';
import { exploreCommunities, getMyCommunities, joinCommunity } from '@/lib/communityApi';
import { CommunityDto } from '@/types/community';
import { mockBookspots } from '@/lib/mockBookspots';
import PlatformMap from '@/components/communities/PlatformMap';

const DEFAULT_LOCATION = {
  latitude: 37.3886,
  longitude: -5.9823,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

export default function ComunidadesScreen() {
  const router = useRouter();
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [communities, setCommunities] = useState<CommunityDto[]>([]);
  const [myCommunities, setMyCommunities] = useState<CommunityDto[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCommunities = useCallback(async (lat: number, lon: number) => {
    try {
      setLoading(true);
      const [allComms, myComms] = await Promise.all([
        exploreCommunities(lat, lon, 50),
        getMyCommunities()
      ]);
      setCommunities(allComms);
      setMyCommunities(myComms);
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.message || 'No se pudieron cargar las comunidades');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLocationAndData = useCallback(async () => {
    let lat = DEFAULT_LOCATION.latitude;
    let lon = DEFAULT_LOCATION.longitude;

    if (Platform.OS !== 'web') {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          let currentLocation = await Location.getCurrentPositionAsync({});
          lat = currentLocation.coords.latitude;
          lon = currentLocation.coords.longitude;
          setLocation({
            latitude: lat,
            longitude: lon,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          });
        } catch (e) {
          console.warn('Could not get current location, using default', e);
        }
      }
    }
    
    await fetchCommunities(lat, lon);
  }, [fetchCommunities]);

  useFocusEffect(
    useCallback(() => {
      loadLocationAndData();
    }, [loadLocationAndData])
  );

  const handleJoin = async (communityId: number) => {
    try {
      setLoading(true);
      await joinCommunity(communityId);
      Alert.alert('¡Éxito!', 'Te has unido a la comunidad.');
      await loadLocationAndData(); // Refresh to update myCommunities status
    } catch (error: any) {
      Alert.alert('Error al unirte', error.message || 'Error desconocido');
      setLoading(false);
    }
  };

  // Agrupar comunidades por bookspot para renderizar en el mapa
  const communitiesWithLocation = communities.map(c => {
    const spot = mockBookspots.find(b => b.id === c.referenceBookspotId);
    return { ...c, spot };
  }).filter(c => c.spot !== undefined) as (CommunityDto & { spot: typeof mockBookspots[0] })[];

  return (
    <View style={styles.container}>
      <Header />
      
      {loading && communities.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#e4715f" />
        </View>
      ) : (
        <View style={styles.mapContainer}>
          <PlatformMap 
            location={location}
            communities={communitiesWithLocation}
            myCommunities={myCommunities}
            onJoin={handleJoin}
          />
          
          <Pressable 
            style={styles.fab} 
            onPress={() => router.push('/communities/create' as any)}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </Pressable>
        </View>
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
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e4715f',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
