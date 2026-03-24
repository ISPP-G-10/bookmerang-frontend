import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Alert, Pressable, Platform, Modal, ScrollView, Image } from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import Header from '@/components/Header';
import { exploreCommunities, getMyCommunities, joinCommunity, leaveCommunity, deleteCommunity } from '@/lib/communityApi';
import { getUserActiveBookspots, BookspotPendingDTO } from '@/lib/bookspotApi';
import { getChat } from '@/lib/chatApi';
import { useAuth } from '@/contexts/AuthContext';
import { CommunityDto } from '@/types/community';
import { ChatParticipantDto } from '@/types/chat';
import PlatformMap from '@/components/communities/PlatformMap';

const DEFAULT_LOCATION = {
  latitude: 37.3886,
  longitude: -5.9823,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

export default function ComunidadesScreen() {
  const router = useRouter();
  const { currentUserId } = useAuth();
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [communities, setCommunities] = useState<CommunityDto[]>([]);
  const [myCommunities, setMyCommunities] = useState<CommunityDto[]>([]);
  const [bookspots, setBookspots] = useState<BookspotPendingDTO[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin Modal state
  const [adminModalVisible, setAdminModalVisible] = useState(false);
  const [selectedAdminComm, setSelectedAdminComm] = useState<CommunityDto | null>(null);
  const [adminMembers, setAdminMembers] = useState<ChatParticipantDto[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);

  // Confirm Modal state
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    title: '',
    message: '',
    isDestructive: false,
    onConfirm: async () => {},
  });

  const fetchCommunities = useCallback(async (lat: number, lon: number) => {
    try {
      setLoading(true);
      const [allComms, myComms, allBookspots] = await Promise.all([
        exploreCommunities(lat, lon, 50),
        getMyCommunities(),
        getUserActiveBookspots()
      ]);
      setCommunities(allComms);
      setMyCommunities(myComms);
      setBookspots(allBookspots);
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

    await loadLocationAndData(); 
  } catch (error: any) {
    console.error('Error joining community:', error);
    const errorMessage = error.message || 'No se pudo unir a la comunidad';
    
    if (Platform.OS === 'web') {
      // Forzamos el alert nativo del navegador para depuración inmediata
      window.alert(`No se pudo unir: ${errorMessage}`);
    } else {
      Alert.alert('No se pudo unir', errorMessage);
    }
  } finally {
    setLoading(false);
  }
};


  const handleAdmin = async (comm: CommunityDto) => {
    setSelectedAdminComm(comm);
    setAdminModalVisible(true);
    setAdminLoading(true);
    try {
      if (comm.chatId) {
        const chat = await getChat(comm.chatId);
        setAdminMembers(chat.participants || []);
      }
    } catch (e) {
      console.warn("Could not load chat participants", e);
    } finally {
      setAdminLoading(false);
    }
  };

  const confirmAction = (title: string, msg: string, onConfirm: () => void, isDestructive = false) => {
    setConfirmConfig({
      title,
      message: msg,
      isDestructive,
      onConfirm: async () => {
        onConfirm();
      },
    });
    setConfirmModalVisible(true);
  };

  const handleLeave = async () => {
    if (!selectedAdminComm) return;
    try {
      setAdminLoading(true);
      await leaveCommunity(selectedAdminComm.id);
      Alert.alert('Éxito', 'Has abandonado la comunidad');
      setAdminModalVisible(false);
      await loadLocationAndData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo abandonar');
    } finally {
      setAdminLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAdminComm) return;
    try {
      setAdminLoading(true);
      await deleteCommunity(selectedAdminComm.id);
      Alert.alert('Éxito', 'Comunidad eliminada');
      setAdminModalVisible(false);
      await loadLocationAndData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo eliminar');
    } finally {
      setAdminLoading(false);
    }
  };



  // Agrupar comunidades por bookspot para renderizar en el mapa
  const communitiesWithLocation = communities.map(c => {
    const spot = bookspots.find(b => b.id === c.referenceBookspotId);
    return { ...c, spot };
  }).filter(c => c.spot !== undefined) as (CommunityDto & { spot: BookspotPendingDTO })[];

  const isCreator = selectedAdminComm?.creatorId === currentUserId;

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
            onAdmin={handleAdmin}
            onLibrary={(communityId: number) => router.push(`/communities/${communityId}` as any)}
          />
          
          <Pressable 
            style={styles.fab} 
            onPress={() => router.push('/communities/create' as any)}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </Pressable>
        </View>
      )}

      {/* Modal de Administración */}
      <Modal visible={adminModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Gestionar Comunidad</Text>
              <Pressable onPress={() => setAdminModalVisible(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={24} color="#333" />
              </Pressable>
            </View>

            {adminLoading ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#e4715f" />
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 300, marginBottom: 16 }}>
                <Text style={styles.sectionTitle}>Miembros ({adminMembers.length})</Text>
                {adminMembers.map(m => (
                  <View key={m.userId} style={styles.memberRow}>
                    <View style={styles.memberInfo}>
                      {m.profilePhoto ? (
                        <Image source={{ uri: m.profilePhoto }} style={styles.memberAvatar} />
                      ) : (
                        <View style={styles.memberAvatarPlaceholder}>
                          <Text style={styles.memberAvatarText}>{m.username.charAt(0)}</Text>
                        </View>
                      )}
                      <Text style={styles.memberName}>{m.username}</Text>
                      {m.userId === selectedAdminComm?.creatorId && (
                        <Text style={styles.creatorBadge}>(Moderador)</Text>
                      )}
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <Pressable
                style={styles.leaveBtn}
                onPress={() => confirmAction('Abandonar', '¿Seguro que quieres abandonar esta comunidad?', handleLeave, true)}
              >
                <Text style={styles.leaveBtnText}>Abandonar Comunidad</Text>
              </Pressable>

              {isCreator && (
                <Pressable
                  style={styles.deleteBtn}
                  onPress={() => confirmAction('Eliminar', '¿Seguro que quieres eliminar esta comunidad permanentemente? Se perderán todos los datos.', handleDelete, true)}
                >
                  <Text style={styles.deleteBtnText}>Eliminar Comunidad</Text>
                </Pressable>
              )}
            </View>

          </View>
        </View>

          {/* Confirm overlay at modalOverlay level to cover full screen on iOS */}
          {confirmModalVisible && (
            <View style={styles.confirmOverlay}>
              <View style={styles.confirmCard}>
                <Text style={styles.confirmTitle}>{confirmConfig.title}</Text>
                <Text style={styles.confirmMessage}>{confirmConfig.message}</Text>
                <View style={styles.confirmButtons}>
                  <Pressable
                    style={styles.confirmSecondaryBtn}
                    onPress={() => setConfirmModalVisible(false)}
                  >
                    <Text style={styles.confirmSecondaryText}>Cancelar</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.confirmPrimaryBtn,
                      confirmConfig.isDestructive ? styles.confirmDangerBtn : null,
                    ]}
                    onPress={async () => {
                      setConfirmModalVisible(false);
                      await confirmConfig.onConfirm();
                    }}
                  >
                    <Text style={styles.confirmPrimaryText}>Confirmar</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  memberAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e4715f',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  memberName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  creatorBadge: {
    fontSize: 12,
    color: '#e4715f',
    marginLeft: 8,
    fontWeight: '600',
  },
  removeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fee2e2',
    borderRadius: 6,
  },
  removeBtnText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
  },
  modalActions: {
    gap: 12,
    marginTop: 8,
  },
  leaveBtn: {
    padding: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    alignItems: 'center',
  },
  leaveBtnText: {
    color: '#4b5563',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteBtn: {
    padding: 16,
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteBtnText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99,
  },
  confirmCard: {
    width: '90%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  confirmMessage: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 16,
  },
  confirmButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  confirmSecondaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    marginRight: 8,
    backgroundColor: '#F3F4F8',
  },
  confirmSecondaryText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  confirmPrimaryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#e4715f',
  },
  confirmDangerBtn: {
    backgroundColor: '#DC2626',
  },
  confirmPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
