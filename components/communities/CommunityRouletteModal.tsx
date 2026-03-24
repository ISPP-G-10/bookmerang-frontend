import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommunityDto } from '@/types/community';
import { GroupedCommunitySpot } from './communityMapUtils';

type Props = {
  visible: boolean;
  group: GroupedCommunitySpot | null;
  myCommunities: CommunityDto[];
  onClose: () => void;
  onJoin: (communityId: number) => void;
  onAdmin: (comm: CommunityDto) => void;
  onLibrary?: (communityId: number) => void;
};

const CARD_WIDTH = 176;

function normalizeDeltaAngle(angle: number): number {
  let normalized = angle;
  while (normalized > 180) {
    normalized -= 360;
  }
  while (normalized < -180) {
    normalized += 360;
  }
  return normalized;
}

function normalizePositiveAngle(angle: number): number {
  const normalized = angle % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function touchAngleDegrees(x: number, y: number, wheelSize: number): number {
  const center = wheelSize / 2;
  const radians = Math.atan2(y - center, x - center);
  return (radians * 180) / Math.PI + 90;
}

function resolveCommunityAvatar(community: CommunityDto): string | null {
  const avatar =
    community.avatarUrl ??
    community.profilePhoto ??
    community.iconUrl ??
    community.imageUrl;

  if (!avatar) {
    return null;
  }

  const normalized = avatar.trim();
  return normalized.length > 0 ? normalized : null;
}

export default function CommunityRouletteModal({
  visible,
  group,
  myCommunities,
  onClose,
  onJoin,
  onAdmin,
  onLibrary,
}: Props) {
  const { width } = useWindowDimensions();
  const rotation = useRef(new Animated.Value(0)).current;
  const rotationRef = useRef(0);
  const dragStartAngleRef = useRef(0);
  const dragStartRotationRef = useRef(0);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const myCommunityIds = useMemo(
    () => new Set(myCommunities.map((community) => community.id)),
    [myCommunities]
  );
  const communities = group?.communities ?? [];
  const selectedCommunity = communities[selectedIndex] ?? communities[0];
  const selectedIsMine = selectedCommunity ? myCommunityIds.has(selectedCommunity.id) : false;
  const selectedAvatar = selectedCommunity ? resolveCommunityAvatar(selectedCommunity) : null;

  const wheelSize = Math.min(width - 36, 320);
  const avatarSize = communities.length > 8 ? 40 : communities.length > 5 ? 48 : 56;
  const orbitRadius = wheelSize / 2 - avatarSize / 2 - 14;
  const stepAngle = communities.length > 0 ? 360 / communities.length : 360;

  const wheelRotation = rotation.interpolate({
    inputRange: [-2500, 2500],
    outputRange: ['-2500deg', '2500deg'],
    extrapolate: 'extend',
  });

  const getIndexFromRotation = useCallback(
    (rotationDeg: number) => {
      if (communities.length === 0) {
        return 0;
      }

      const normalized = normalizePositiveAngle(-rotationDeg);
      return Math.round(normalized / stepAngle) % communities.length;
    },
    [communities.length, stepAngle]
  );

  const updateSelectedFromRotation = useCallback(
    (rotationDeg: number) => {
      if (communities.length === 0) {
        return;
      }

      const nextIndex = getIndexFromRotation(rotationDeg);
      setSelectedIndex((current) => (current === nextIndex ? current : nextIndex));
    },
    [communities.length, getIndexFromRotation]
  );

  const snapToIndex = useCallback(
    (index: number, animated: boolean) => {
      if (communities.length === 0) {
        return;
      }

      const total = communities.length;
      const normalizedIndex = ((index % total) + total) % total;
      const targetRotation = -normalizedIndex * stepAngle;

      rotationRef.current = targetRotation;
      setSelectedIndex(normalizedIndex);

      if (!animated) {
        rotation.stopAnimation();
        rotation.setValue(targetRotation);
        return;
      }

      Animated.spring(rotation, {
        toValue: targetRotation,
        useNativeDriver: true,
        friction: 7,
        tension: 70,
      }).start();
    },
    [communities.length, rotation, stepAngle]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => communities.length > 1,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          communities.length > 1 && (Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3),
        onPanResponderGrant: (event) => {
          dragStartRotationRef.current = rotationRef.current;
          dragStartAngleRef.current = touchAngleDegrees(
            event.nativeEvent.locationX,
            event.nativeEvent.locationY,
            wheelSize
          );
        },
        onPanResponderMove: (event) => {
          const currentAngle = touchAngleDegrees(
            event.nativeEvent.locationX,
            event.nativeEvent.locationY,
            wheelSize
          );
          const delta = normalizeDeltaAngle(currentAngle - dragStartAngleRef.current);
          const nextRotation = dragStartRotationRef.current + delta;

          rotation.setValue(nextRotation);
        },
        onPanResponderRelease: () => {
          const nearestIndex = getIndexFromRotation(rotationRef.current);
          snapToIndex(nearestIndex, true);
        },
        onPanResponderTerminate: () => {
          const nearestIndex = getIndexFromRotation(rotationRef.current);
          snapToIndex(nearestIndex, true);
        },
      }),
    [communities.length, getIndexFromRotation, rotation, snapToIndex, wheelSize]
  );

  useEffect(() => {
    const listenerId = rotation.addListener(({ value }) => {
      rotationRef.current = value;
      updateSelectedFromRotation(value);
    });

    return () => {
      rotation.removeListener(listenerId);
    };
  }, [rotation, updateSelectedFromRotation]);

  useEffect(() => {
    if (!visible || communities.length === 0 || !group) {
      return;
    }

    const firstMineIndex = communities.findIndex((community) => myCommunityIds.has(community.id));
    const initialIndex = firstMineIndex >= 0 ? firstMineIndex : 0;

    snapToIndex(initialIndex, false);
  }, [visible, group, communities, myCommunityIds, snapToIndex]);

  if (!group) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.modalCard}>
          <View style={styles.headerRow}>
            <View style={styles.headerTextWrapper}>
              <Text style={styles.title}>Varias comunidades aqui</Text>
              <Text style={styles.subtitle}>
                {group.spot.nombre} · {group.communities.length} comunidades
              </Text>
            </View>

            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color="#374151" />
            </Pressable>
          </View>

          <View style={styles.wheelSection}>
            <View style={[styles.pointer, { left: wheelSize / 2 - 12 }]} />

            <View
              style={[
                styles.wheelContainer,
                {
                  width: wheelSize,
                  height: wheelSize,
                  borderRadius: wheelSize / 2,
                },
              ]}
              {...panResponder.panHandlers}
            >
              <Animated.View
                style={[
                  styles.wheelTrack,
                  {
                    width: wheelSize,
                    height: wheelSize,
                    borderRadius: wheelSize / 2,
                    transform: [{ rotate: wheelRotation }],
                  },
                ]}
              >
                {communities.map((community, index) => {
                  const angle = index * stepAngle - 90;
                  const radians = (angle * Math.PI) / 180;
                  const left = wheelSize / 2 + orbitRadius * Math.cos(radians) - avatarSize / 2;
                  const top = wheelSize / 2 + orbitRadius * Math.sin(radians) - avatarSize / 2;
                  const isMine = myCommunityIds.has(community.id);
                  const avatar = resolveCommunityAvatar(community);
                  const isCurrent = selectedIndex === index;

                  return (
                    <Pressable
                      key={community.id}
                      onPress={() => snapToIndex(index, true)}
                      style={[
                        styles.wheelItem,
                        {
                          left,
                          top,
                          width: avatarSize,
                          height: avatarSize,
                          borderRadius: avatarSize / 2,
                        },
                        isCurrent ? styles.wheelItemSelected : null,
                      ]}
                    >
                      {avatar ? (
                        <Image source={{ uri: avatar }} style={styles.wheelAvatar} />
                      ) : (
                        <View style={styles.wheelAvatarFallback}>
                          <Ionicons name="people" size={18} color="#3d405b" />
                        </View>
                      )}

                      {isMine ? <View style={styles.myDot} /> : null}
                    </Pressable>
                  );
                })}
              </Animated.View>

              <View style={styles.centerHub}>
                {selectedAvatar ? (
                  <Image source={{ uri: selectedAvatar }} style={styles.centerAvatar} />
                ) : (
                  <View style={styles.centerAvatarFallback}>
                    <Ionicons name="people" size={24} color="#3d405b" />
                    <Text style={styles.centerInitial}>
                      {selectedCommunity?.name?.trim().charAt(0).toUpperCase() ?? '?'}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <Text style={styles.rotateHint}>Desliza la ruleta para girar</Text>
          </View>

          <View style={styles.selectedInfo}>
            <Text style={styles.communityName} numberOfLines={2}>
              {selectedCommunity?.name ?? ''}
            </Text>
            <Text style={styles.metaText}>
              {selectedCommunity?.memberCount ?? 0} miembros · {selectedCommunity?.status ?? ''}
            </Text>
            {selectedIsMine ? (
              <View style={styles.mineBadge}>
                <Text style={styles.mineBadgeText}>Tu comunidad</Text>
              </View>
            ) : null}
          </View>

          {selectedCommunity ? (
            <View style={styles.actionsBlock}>
              {!selectedIsMine ? (
                <Pressable
                  style={[styles.actionBtn, styles.joinBtn]}
                  onPress={() => {
                    onClose();
                    onJoin(selectedCommunity.id);
                  }}
                >
                  <Text style={styles.actionBtnText}>Unirme a esta comunidad</Text>
                </Pressable>
              ) : (
                <>
                  <Pressable
                    style={[styles.actionBtn, styles.adminBtn]}
                    onPress={() => {
                      onClose();
                      onAdmin(selectedCommunity);
                    }}
                  >
                    <Text style={styles.actionBtnText}>Administrar</Text>
                  </Pressable>

                  {onLibrary ? (
                    <Pressable
                      style={[styles.actionBtn, styles.viewBtn, styles.secondaryActionSpacing]}
                      onPress={() => {
                        onClose();
                        onLibrary(selectedCommunity.id);
                      }}
                    >
                      <Text style={styles.actionBtnText}>Ver Comunidad</Text>
                    </Pressable>
                  ) : null}
                </>
              )}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTextWrapper: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  wheelSection: {
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 8,
  },
  pointer: {
    position: 'absolute',
    top: 0,
    zIndex: 20,
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 18,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#e4715f',
  },
  wheelContainer: {
    marginTop: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  wheelTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  wheelItem: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#ffffff',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 4,
  },
  wheelItemSelected: {
    borderColor: '#e4715f',
    transform: [{ scale: 1.08 }],
  },
  wheelAvatar: {
    width: '100%',
    height: '100%',
  },
  wheelAvatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  myDot: {
    position: 'absolute',
    right: 1,
    bottom: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F97316',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  centerHub: {
    width: CARD_WIDTH,
    height: CARD_WIDTH,
    borderRadius: CARD_WIDTH / 2,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  centerAvatar: {
    width: 108,
    height: 108,
    borderRadius: 54,
  },
  centerAvatarFallback: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerInitial: {
    marginTop: 2,
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  rotateHint: {
    marginTop: 10,
    fontSize: 12,
    color: '#6B7280',
  },
  selectedInfo: {
    alignItems: 'center',
    marginBottom: 10,
    minHeight: 54,
  },
  communityName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 2,
    minHeight: 20,
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  mineBadge: {
    marginTop: 6,
    backgroundColor: '#FFF1EE',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  mineBadgeText: {
    fontSize: 11,
    color: '#C2410C',
    fontWeight: '700',
  },
  actionsBlock: {
    marginTop: 2,
  },
  actionBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryActionSpacing: {
    marginTop: 8,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  joinBtn: {
    backgroundColor: '#e4715f',
  },
  adminBtn: {
    backgroundColor: '#3d405b',
  },
  viewBtn: {
    backgroundColor: '#e4715f',
  },
});
