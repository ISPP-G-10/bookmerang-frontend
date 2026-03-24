import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { getCommunity, leaveCommunity, deleteCommunity, getMyCommunities } from '@/lib/communityApi';
import { getBookspotById } from '@/lib/bookspotApi';
import { getChat } from '@/lib/chatApi';
import { useAuth } from '@/contexts/AuthContext';
import { CommunityDto } from '@/types/community';
import { ChatParticipantDto } from '@/types/chat';
import { Bookspot } from '@/lib/mockBookspots';
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
  const { currentUserId } = useAuth();
  const communityId = Number(id);

  const [community, setCommunity] = useState<CommunityDto | null>(null);
  const [bookspot, setBookspot] = useState<Bookspot | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<SectionKey>('biblioteca');
  const [adminModalVisible, setAdminModalVisible] = useState(false);
  const [adminMembers, setAdminMembers] = useState<ChatParticipantDto[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    title: '',
    message: '',
    isDestructive: false,
    onConfirm: async () => {},
  });

  // ... rest of state

  const bookspotName = bookspot?.nombre ?? '';

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [data, myComms] = await Promise.all([
        getCommunity(communityId),
        getMyCommunities()
      ]);
      setCommunity(data);
      setIsMember(myComms.some(c => c.id === communityId));

      // Fetch real bookspot data
      if (data.referenceBookspotId) {
        const spotData = await getBookspotById(data.referenceBookspotId);
        setBookspot(spotData);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo cargar la comunidad');
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleAdmin = async () => {
    if (!community) return;
    setAdminModalVisible(true);
    setAdminLoading(true);
    try {
      if (community.chatId) {
        const chat = await getChat(community.chatId);
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
    if (!community) return;
    try {
      setAdminLoading(true);
      await leaveCommunity(community.id);
      Alert.alert('Éxito', 'Has abandonado la comunidad');
      setAdminModalVisible(false);
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo abandonar');
    } finally {
      setAdminLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!community) return;
    try {
      setAdminLoading(true);
      await deleteCommunity(community.id);
      Alert.alert('Éxito', 'Comunidad eliminada');
      setAdminModalVisible(false);
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo eliminar');
    } finally {
      setAdminLoading(false);
    }
  };

  const isCreator = community?.creatorId === currentUserId;

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

        <View style={styles.headerRight}>
          <View style={styles.membersChip}>
            <Ionicons name="people-outline" size={15} color="#4b5563" />
            <Text style={styles.membersText}>{community.memberCount}/{MAX_MEMBERS}</Text>
          </View>

          {isMember && (
            <Pressable onPress={handleAdmin} style={styles.adminButton}>
              <Ionicons name="settings-outline" size={22} color="#4b5563" />
            </Pressable>
          )}
        </View>
      </View>

      {!isMember ? (
        <View style={styles.inactiveContainer}>
          <Ionicons name="lock-closed-outline" size={48} color="#d1ccc3" />
          <Text style={styles.inactiveTitle}>Acceso restringido</Text>
          <Text style={styles.inactiveText}>
            Debes ser miembro de esta comunidad para acceder a sus funcionalidades.
          </Text>
        </View>
      ) : community.status !== 'ACTIVE' ? (
        <View style={styles.inactiveContainer}>
          <Ionicons name="people-outline" size={48} color="#d1ccc3" />
          <Text style={styles.inactiveTitle}>Comunidad en formación</Text>
          <Text style={styles.inactiveText}>
            Se necesitan al menos 3 miembros para desbloquear las funcionalidades de la comunidad.
          </Text>
          <Text style={styles.inactiveCount}>
            {community.memberCount}/3 miembros
          </Text>
        </View>
      ) : (
        <>
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
        </>
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
                      {m.userId === community.creatorId && (
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adminButton: {
    padding: 4,
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
  inactiveContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  inactiveTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 16,
  },
  inactiveText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
  },
  inactiveCount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e4715f',
    marginTop: 12,
  },
  // Modal Styles
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
