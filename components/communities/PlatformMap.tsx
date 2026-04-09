import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import MapView, { Callout, CalloutSubview, Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { CommunityDto } from '@/types/community';
import { Bookspot } from '@/lib/mockBookspots';
import CommunityRouletteModal from './CommunityRouletteModal';
import { GroupedCommunitySpot, groupCommunitiesBySpot } from './communityMapUtils';

type Props = {
  location: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
  communities: (CommunityDto & { spot: Bookspot })[];
  myCommunities: CommunityDto[];
  onJoin: (communityId: number) => void;
  onAdmin: (comm: CommunityDto) => void;
  onLibrary?: (communityId: number) => void;
};

export default function PlatformMap({
  location,
  communities,
  myCommunities,
  onJoin,
  onAdmin,
  onLibrary,
}: Props) {
  const [rouletteGroup, setRouletteGroup] = useState<GroupedCommunitySpot | null>(null);
  const groupedMarkers = useMemo(
    () => groupCommunitiesBySpot(communities, myCommunities),
    [communities, myCommunities]
  );
  const myCommunityIds = useMemo(() => new Set(myCommunities.map((comm) => comm.id)), [myCommunities]);

  return (
    <View style={styles.wrapper}>
      <MapView style={styles.map} initialRegion={location} showsUserLocation>
        {groupedMarkers.map((group) => {
          if (group.communities.length > 1) {
            return (
              <Marker
                key={group.key}
                coordinate={{
                  latitude: group.spot.latitude,
                  longitude: group.spot.longitude,
                }}
                onPress={() => setRouletteGroup(group)}
              >
                <View style={[styles.multiMarker, group.hasMine ? styles.multiMarkerMine : styles.multiMarkerOther]}>
                  <Ionicons name="layers" size={18} color="#fff" />
                  <View style={styles.multiMarkerBadge}>
                    <Text style={styles.multiMarkerBadgeText}>{group.communities.length}</Text>
                  </View>
                </View>
              </Marker>
            );
          }

          const comm = group.communities[0];
          const isMine = myCommunityIds.has(comm.id);

          return (
            <Marker
              key={comm.id}
              coordinate={{
                latitude: comm.spot.latitude,
                longitude: comm.spot.longitude,
              }}
            >
              <View style={[styles.markerContainer, isMine ? styles.myMarker : styles.otherMarker]}>
                <Ionicons name={isMine ? 'people' : 'location'} size={20} color="#fff" />
              </View>

              <Callout tooltip>
                <View style={styles.calloutContent}>
                  <Text style={styles.commName}>{comm.name}</Text>
                  <Text style={styles.commSpot}>{comm.spot.nombre}</Text>
                  <Text style={styles.commMembers}>{comm.memberCount} miembros</Text>
                  <Text style={styles.commStatus}>Estado: {comm.status}</Text>

                  {!isMine ? (
                    <CalloutSubview onPress={() => onJoin(comm.id)}>
                      <View style={styles.joinBtn}>
                        <Text style={styles.joinBtnText}>Toca para Unirte</Text>
                      </View>
                    </CalloutSubview>
                  ) : (
                    <View style={styles.myCommButtons}>
                      <CalloutSubview onPress={() => onAdmin(comm)}>
                        <View style={[styles.joinBtn, { backgroundColor: '#3d405b' }]}>
                          <Text style={styles.joinBtnText}>Administrar</Text>
                        </View>
                      </CalloutSubview>

                      {onLibrary ? (
                        <CalloutSubview onPress={() => onLibrary(comm.id)}>
                          <View style={[styles.joinBtn, { backgroundColor: '#e4715f' }]}>
                            <Text style={styles.joinBtnText}>Ver Comunidad</Text>
                          </View>
                        </CalloutSubview>
                      ) : null}
                    </View>
                  )}
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      <CommunityRouletteModal
        visible={rouletteGroup !== null}
        group={rouletteGroup}
        myCommunities={myCommunities}
        onClose={() => setRouletteGroup(null)}
        onJoin={onJoin}
        onAdmin={onAdmin}
        onLibrary={onLibrary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    height: '100%',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  markerContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  myMarker: {
    backgroundColor: '#e4715f',
  },
  otherMarker: {
    backgroundColor: '#3d405b',
  },
  multiMarker: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  multiMarkerMine: {
    backgroundColor: '#e4715f',
  },
  multiMarkerOther: {
    backgroundColor: '#3d405b',
  },
  multiMarkerBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    paddingHorizontal: 4,
  },
  multiMarkerBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  calloutContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    width: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  commName: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  commSpot: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },
  commMembers: {
    fontSize: 12,
    color: '#333',
    marginBottom: 6,
  },
  commStatus: {
    fontSize: 12,
    color: '#333',
    marginBottom: 8,
  },
  joinBtn: {
    backgroundColor: '#e4715f',
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  joinBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  myCommButtons: {
    flexDirection: 'column',
    gap: 4,
  },
});
