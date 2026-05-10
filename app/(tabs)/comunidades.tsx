import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  Modal,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Header from '@/components/Header';
import {
  exploreCommunities,
  getMyCommunities,
  joinCommunity,
  getCommunityMembers } from '@/lib/communityApi';
import { getBookspotById } from '@/lib/bookspotApi';
import { CommunityDto, CommunityMemberDto } from '@/types/community';

// Colors from mockup
const COLORS = {
  coral: '#e4715f',
  coralLight: '#fdf0ec',
  darkText: '#3d405b',
  grayText: '#6b7280',
  lightGray: '#9ca3af',
  border: '#e5e7eb',
  background: '#fdfbf7',
  tagBg: '#f3f4f6',
  white: '#ffffff',
};

// Avatar colors for member circles
const AVATAR_COLORS = ['#e4715f', '#3d405b', '#81b29a', '#f2cc8f', '#9c6644', '#457b9d', '#8338ec', '#fb5607'];

const MAX_MEMBERS = 10;
const MAX_VISIBLE_AVATARS = 4;


const DEFAULT_LOCATION = {
  latitude: 37.3886,
  longitude: -5.9823,
};

type TabKey = 'explorar' | 'mis';

interface BookspotInfo {
  name: string;
  city: string;
  address?: string;
}

export default function ComunidadesScreen() {
  const router = useRouter();
  const { height: screenHeight } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<TabKey>('mis');
  const [searchQuery, setSearchQuery] = useState('');
  const [communities, setCommunities] = useState<CommunityDto[]>([]);
  const [myCommunities, setMyCommunities] = useState<CommunityDto[]>([]);
  const [loading, setLoading] = useState(true);

  const [bookspotInfoMap, setBookspotInfoMap] = useState<Record<number, BookspotInfo>>({});
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedOnce = useRef(false);
  const [joiningId, setJoiningId] = useState<number | null>(null);
  const [hoveredCardId, setHoveredCardId] = useState<number | null>(null);
  const [selectedCommunity, setSelectedCommunity] = useState<CommunityDto | null>(null);
  const [selectedCommunityMembers, setSelectedCommunityMembers] = useState<CommunityMemberDto[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchCommunities = useCallback(async (lat: number, lon: number) => {
    try {
      const [allComms, myComms] = await Promise.all([
        exploreCommunities(lat, lon, 50),
        getMyCommunities(),
      ]);

      setCommunities(allComms);
      setMyCommunities(myComms);

      // Fetch bookspot info for all communities
      const allCommunities = [...allComms, ...myComms];
      const uniqueBookspotIds = [...new Set(allCommunities.map(c => c.referenceBookspotId))];
      
      const bookspotInfoPromises = uniqueBookspotIds.map(async (id) => {
        try {
          const bookspot = await getBookspotById(id);
          const city = bookspot.addressText?.split(',').pop()?.trim() || 'Madrid';
          const address = bookspot.addressText || 'Dirección no disponible';
          return { id, info: { name: bookspot.nombre, city, address } };
        } catch {
          return { id, info: { name: 'BookSpot', city: 'Madrid', address: 'Dirección no disponible' } };
        }
      });

      const results = await Promise.all(bookspotInfoPromises);
      const infoMap: Record<number, BookspotInfo> = {};
      results.forEach(r => { infoMap[r.id] = r.info; });
      setBookspotInfoMap(infoMap);


    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'No se pudieron cargar las comunidades';
      console.error(error);
      Alert.alert('Error', errorMessage);
    }
  }, []);

  const loadLocationAndData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    
    let lat = DEFAULT_LOCATION.latitude;
    let lon = DEFAULT_LOCATION.longitude;

    if (Platform.OS !== 'web') {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const currentLocation = await Location.getCurrentPositionAsync({});
          lat = currentLocation.coords.latitude;
          lon = currentLocation.coords.longitude;
        } catch (e) {
          console.warn('Could not get current location, using default', e);
        }
      }
    }

    await fetchCommunities(lat, lon);
    hasLoadedOnce.current = true;
    setLoading(false);
    setRefreshing(false);
  }, [fetchCommunities]);

  useFocusEffect(
    useCallback(() => {
      loadLocationAndData(!hasLoadedOnce.current ? false : true);
    }, [loadLocationAndData])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadLocationAndData(true);
  }, [loadLocationAndData]);

  const handleJoin = async (communityId: number) => {
    try {
      setJoiningId(communityId);
      await joinCommunity(communityId);
      await loadLocationAndData(true);
      showToast('Te has unido a la comunidad', 'success');
    } catch (error: unknown) {
      console.error('Error joining community:', error);
      const errorMessage = error instanceof Error ? error.message : 'No se pudo unir a la comunidad';
      showToast(errorMessage, 'error');
    } finally {
      setJoiningId(null);
    }
  };

  const handleCommunityPress = async (community: CommunityDto) => {
    const isMine = myCommIds.has(community.id);
    if (isMine) {
      // If user is member, go directly to community detail
      router.push(`/communities/${community.id}` as never);
    } else {
      // If not member, show modal with details and load members
      setSelectedCommunity(community);
      setSelectedCommunityMembers([]);
      setModalVisible(true);
      
      // Load members in background
      try {
        setLoadingMembers(true);
        const members = await getCommunityMembers(community.id);
        setSelectedCommunityMembers(members);
      } catch (error) {
        console.error('Error loading members:', error);
      } finally {
        setLoadingMembers(false);
      }
    }
  };

  const handleModalJoin = async () => {
    if (!selectedCommunity) return;
    setModalVisible(false);
    await handleJoin(selectedCommunity.id);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedCommunity(null);
  };

  const handleCreatePress = () => {
    router.push('/communities/create' as never);
  };

  // Filter communities based on active tab and search query
  const myCommIds = useMemo(() => new Set(myCommunities.map(c => c.id)), [myCommunities]);
  
  const filteredCommunities = useMemo(() => {
    let list: CommunityDto[];
    
    if (activeTab === 'explorar') {
      // Show communities user hasn't joined
      list = communities.filter(c => !myCommIds.has(c.id));
    } else {
      // Show user's communities
      list = myCommunities;
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(query));
    }

    return list;
  }, [activeTab, communities, myCommunities, myCommIds, searchQuery]);


  // Render member avatars (for list cards)
  const renderMemberAvatars = (memberCount: number, communityId: number) => {
    const visibleCount = Math.min(memberCount, MAX_VISIBLE_AVATARS);
    const remainingCount = memberCount - visibleCount;
    const avatars = [];

    for (let i = 0; i < visibleCount; i++) {
      avatars.push(
        <View
          key={i}
          style={[
            styles.avatar,
            {
              backgroundColor: AVATAR_COLORS[(communityId + i) % AVATAR_COLORS.length],
              marginLeft: i > 0 ? -8 : 0,
              zIndex: visibleCount - i,
            },
          ]}
        >
          <Text style={styles.avatarText}>
            {String.fromCharCode(65 + ((communityId + i) % 26))}
          </Text>
        </View>
      );
    }

    if (remainingCount > 0) {
      avatars.push(
        <View
          key="remaining"
          style={[
            styles.avatar,
            styles.avatarRemaining,
            { marginLeft: -8, zIndex: 0 },
          ]}
        >
          <Text style={styles.avatarRemainingText}>+{remainingCount}</Text>
        </View>
      );
    }

    return avatars;
  };

  // Render a community card
  const renderCommunityCard = ({ item }: { item: CommunityDto }) => {
    const availableSpots = MAX_MEMBERS - item.memberCount;
    const bookspotInfo = bookspotInfoMap[item.referenceBookspotId];
    const isMine = myCommIds.has(item.id);
    const isJoining = joiningId === item.id;
    const isHovered = hoveredCardId === item.id;

    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          isHovered && styles.cardHovered,
          pressed && styles.cardPressed,
        ]}
        onPress={() => handleCommunityPress(item)}
        onHoverIn={() => setHoveredCardId(item.id)}
        onHoverOut={() => setHoveredCardId(null)}
      >
        {/* Card Header: Name + Chevron */}
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.lightGray} />
        </View>

        {/* Location */}
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={16} color={COLORS.grayText} />
          <Text style={styles.infoText}>{bookspotInfo?.city || 'Madrid'}</Text>
        </View>

        {/* BookSpot */}
        <View style={styles.infoRow}>
          <Ionicons name="storefront-outline" size={16} color={COLORS.grayText} />
          <Text style={styles.infoText} numberOfLines={1}>
            {bookspotInfo?.name || 'BookSpot'}
          </Text>
        </View>

        {/* Members Row */}
        <View style={styles.membersRow}>
          <View style={styles.avatarsContainer}>
            {renderMemberAvatars(item.memberCount, item.id)}
          </View>
          <Text style={styles.memberCount}>{item.memberCount}/{MAX_MEMBERS}</Text>
          {availableSpots > 0 && (
            <Text style={styles.availableSpots}>{availableSpots} plazas</Text>
          )}
        </View>

        {/* Action Button */}
        {!isMine ? (
          <Pressable
            style={[styles.joinButton, isJoining && styles.joinButtonDisabled]}
            onPress={(e) => {
              e.stopPropagation();
              if (!isJoining) handleJoin(item.id);
            }}
            disabled={isJoining}
          >
            {isJoining ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="people" size={18} color={COLORS.white} />
                <Text style={styles.joinButtonText}>Unirse a la comunidad</Text>
              </>
            )}
          </Pressable>
        ) : (
          <Pressable
            style={styles.viewButton}
            onPress={(e) => {
              e.stopPropagation();
              router.push(`/communities/${item.id}` as never);
            }}
          >
            <Ionicons name="eye-outline" size={18} color={COLORS.coral} />
            <Text style={styles.viewButtonText}>Ver comunidad</Text>
          </Pressable>
        )}
      </Pressable>
    );
  };

  // Empty state component
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons 
        name={activeTab === 'explorar' ? 'compass-outline' : 'people-outline'} 
        size={48} 
        color={COLORS.lightGray} 
      />
      <Text style={styles.emptyStateTitle}>
        {activeTab === 'explorar' 
          ? 'No hay comunidades cerca' 
          : 'Aún no te has unido a ninguna comunidad'}
      </Text>
      <Text style={styles.emptyStateText}>
        {activeTab === 'explorar'
          ? 'Intenta ampliar tu búsqueda o crea una nueva comunidad'
          : 'Explora comunidades cerca de ti y únete'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header />

      {toast && (
        <View style={{
          position: 'absolute',
          top: 110,
          left: 16,
          right: 16,
          zIndex: 999,
          backgroundColor: toast.type === 'success' ? '#f0fdf4' : '#fff0f0',
          borderRadius: 14,
          padding: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 6,
        }}>
          <View style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: toast.type === 'success' ? '#22c55e' : '#dc2626',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Ionicons
              name={toast.type === 'success' ? 'checkmark' : 'close'}
              size={14}
              color="#ffffff"
            />
          </View>
          <Text style={{
            fontSize: 14,
            fontWeight: '700',
            color: toast.type === 'success' ? '#166534' : '#dc2626',
            flex: 1,
          }}>
            {toast.message}
          </Text>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <Pressable
          style={[styles.tab, activeTab === 'mis' && styles.tabActive]}
          onPress={() => setActiveTab('mis')}
        >
          <Text style={[styles.tabText, activeTab === 'mis' && styles.tabTextActive]}>
            Mis Comunidades
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'explorar' && styles.tabActive]}
          onPress={() => setActiveTab('explorar')}
        >
          <Text style={[styles.tabText, activeTab === 'explorar' && styles.tabTextActive]}>
            Explorar
          </Text>
        </Pressable>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.lightGray} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar comunidades..."
            placeholderTextColor={COLORS.lightGray}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.lightGray} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {activeTab === 'explorar' ? 'Cerca de ti' : 'Tus comunidades'}
        </Text>
        <Pressable style={styles.addButton} onPress={handleCreatePress}>
          <Ionicons name="add" size={20} color={COLORS.white} />
        </Pressable>
      </View>

      {/* Community List */}
      {loading && communities.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.coral} />
        </View>
      ) : (
        <FlatList
          data={filteredCommunities}
          renderItem={renderCommunityCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.coral]}
              tintColor={COLORS.coral}
            />
          }
        />
      )}

      {/* Community Detail Modal (Bottom Sheet) */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleModalClose}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={handleModalClose} />
          <View style={[styles.modalContainer, { maxHeight: screenHeight * 0.85, minHeight: screenHeight * 0.6 }]}>
            {selectedCommunity && (
              <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedCommunity.name}</Text>
                  <Pressable onPress={handleModalClose} style={styles.modalCloseBtn}>
                    <Ionicons name="close" size={24} color={COLORS.grayText} />
                  </Pressable>
                </View>
                {/* Location */}
                <View style={styles.modalLocationRow}>
                  <Ionicons name="location" size={16} color={COLORS.coral} />
                  <Text style={styles.modalLocationText}>
                    {bookspotInfoMap[selectedCommunity.referenceBookspotId]?.city || 'Madrid'}
                  </Text>
                </View>

                {/* BookSpot Card */}
                <View style={styles.bookspotCard}>
                  <View style={styles.bookspotIcon}>
                    <Ionicons name="storefront" size={24} color={COLORS.coral} />
                  </View>
                  <View style={styles.bookspotInfo}>
                    <Text style={styles.bookspotLabel}>BookSpot de referencia</Text>
                    <Text style={styles.bookspotName}>
                      {bookspotInfoMap[selectedCommunity.referenceBookspotId]?.name || 'BookSpot'}
                    </Text>
                    <View style={styles.bookspotAddressRow}>
                      <Ionicons name="location-outline" size={14} color={COLORS.grayText} />
                      <Text style={styles.bookspotAddress}>
                        {bookspotInfoMap[selectedCommunity.referenceBookspotId]?.address || 'Dirección no disponible'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Members Section */}
                <View style={styles.modalSection}>
                  <View style={styles.modalSectionHeader}>
                    <Ionicons name="people-outline" size={20} color={COLORS.darkText} />
                    <Text style={styles.modalSectionTitle}>
                      Miembros ({selectedCommunity.memberCount}/{MAX_MEMBERS})
                    </Text>
                  </View>
                  <View style={styles.membersGrid}>
                    {loadingMembers ? (
                      <ActivityIndicator size="small" color={COLORS.coral} style={{ padding: 10 }} />
                    ) : (
                      selectedCommunityMembers.map((member, idx) => (
                        <View key={member.userId} style={styles.memberChip}>
                          <View
                            style={[
                              styles.memberChipAvatar,
                              { backgroundColor: AVATAR_COLORS[idx % AVATAR_COLORS.length] }
                            ]}
                          >
                            <Text style={styles.memberChipAvatarText}>
                              {member.username.substring(0, 2).toUpperCase()}
                            </Text>
                          </View>
                          <Text style={styles.memberChipName}>{member.username}</Text>
                        </View>
                      ))
                    )}
                    {/* Available spots badge */}
                    {MAX_MEMBERS - selectedCommunity.memberCount > 0 && (
                      <View style={styles.availableSpotsChip}>
                        <Text style={styles.availableSpotsChipText}>
                          {MAX_MEMBERS - selectedCommunity.memberCount} plazas libres
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Benefits Section */}
                <View style={styles.benefitsCard}>
                  <Text style={styles.benefitsTitle}>Al unirte tendrás:</Text>
                  <View style={styles.benefitRow}>
                    <Ionicons name="chatbubble-ellipses-outline" size={20} color={COLORS.coral} />
                    <Text style={styles.benefitText}>Chat interno con los miembros</Text>
                  </View>
                  <View style={styles.benefitRow}>
                    <Ionicons name="calendar-outline" size={20} color={COLORS.coral} />
                    <Text style={styles.benefitText}>Quedadas de intercambio en el BookSpot</Text>
                  </View>
                  <View style={styles.benefitRow}>
                    <Ionicons name="library-outline" size={20} color={COLORS.coral} />
                    <Text style={styles.benefitText}>Biblioteca compartida con "Me gusta"</Text>
                  </View>
                  <View style={styles.benefitRow}>
                    <Ionicons name="trophy-outline" size={20} color={COLORS.coral} />
                    <Text style={styles.benefitText}>Ranking mensual con premio al 1º</Text>
                  </View>
                </View>

                {/* Bottom spacing for buttons */}
                <View style={{ height: 100 }} />
              </ScrollView>
            )}

            {/* Fixed Bottom Buttons */}
            <View style={styles.modalButtonsContainer}>
              <Pressable style={styles.modalCloseButton} onPress={handleModalClose}>
                <Text style={styles.modalCloseButtonText}>Cerrar</Text>
              </Pressable>
              <Pressable
                style={[styles.modalJoinButton, joiningId === selectedCommunity?.id && styles.joinButtonDisabled]}
                onPress={handleModalJoin}
                disabled={joiningId === selectedCommunity?.id}
              >
                {joiningId === selectedCommunity?.id ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.modalJoinButtonText}>Unirse</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.coral,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.grayText,
  },
  tabTextActive: {
    color: COLORS.coral,
    fontWeight: '600',
  },

  // Search
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: COLORS.darkText,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.darkText,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.coral,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },

  // Card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    // Transition for web hover effect
    ...(Platform.OS === 'web' && {
      transition: 'all 0.2s ease-in-out',
      cursor: 'pointer',
    }),
  } as any,
  cardHovered: {
    borderColor: COLORS.coral,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    transform: [{ scale: 1.01 }],
  },
  cardPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.99 }],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.darkText,
    flex: 1,
    marginRight: 8,
  },

  // Info rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.grayText,
    marginLeft: 6,
    flex: 1,
  },

  // Members
  membersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  avatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  avatarText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
  },
  avatarRemaining: {
    backgroundColor: COLORS.tagBg,
  },
  avatarRemainingText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.grayText,
  },
  memberCount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkText,
    marginLeft: 12,
  },
  availableSpots: {
    fontSize: 13,
    color: COLORS.coral,
    fontWeight: '500',
    marginLeft: 8,
  },

  // Buttons
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.coral,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  joinButtonDisabled: {
    opacity: 0.7,
  },
  joinButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.coralLight,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  viewButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.coral,
  },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.darkText,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.grayText,
    marginTop: 8,
    textAlign: 'center',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.darkText,
    flex: 1,
    marginRight: 12,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalLocationText: {
    fontSize: 14,
    color: COLORS.coral,
    marginLeft: 4,
    fontWeight: '500',
  },

  // BookSpot Card in modal
  bookspotCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.coralLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  bookspotIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bookspotInfo: {
    flex: 1,
  },
  bookspotLabel: {
    fontSize: 12,
    color: COLORS.grayText,
    marginBottom: 2,
  },
  bookspotName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkText,
    marginBottom: 4,
  },
  bookspotAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookspotAddress: {
    fontSize: 13,
    color: COLORS.grayText,
    marginLeft: 4,
    flex: 1,
  },

  // Modal sections
  modalSection: {
    marginBottom: 20,
  },
  modalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkText,
    marginLeft: 8,
  },

  // Members grid in modal
  membersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
    paddingLeft: 4,
  },
  memberChipAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  memberChipAvatarText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.white,
  },
  memberChipName: {
    fontSize: 13,
    color: COLORS.darkText,
    fontWeight: '500',
  },
  availableSpotsChip: {
    backgroundColor: COLORS.coralLight,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.coralLight,
    borderStyle: 'dashed',
  },
  availableSpotsChipText: {
    fontSize: 13,
    color: COLORS.coral,
    fontWeight: '500',
  },

  // Benefits card in modal
  benefitsCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  benefitsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.darkText,
    marginBottom: 12,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  benefitText: {
    fontSize: 14,
    color: COLORS.grayText,
    marginLeft: 12,
    flex: 1,
  },

  // Modal buttons
  modalButtonsContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  modalCloseButton: {
    flex: 1,
    backgroundColor: COLORS.tagBg,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkText,
  },
  modalJoinButton: {
    flex: 1.5,
    backgroundColor: COLORS.coral,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalJoinButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});
