import React from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import MapView, { Marker, Callout, CalloutSubview } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { CommunityDto } from '@/types/community';
import { Bookspot } from '@/lib/mockBookspots';

type Props = {
  location: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
  communities: (CommunityDto & { spot: Bookspot })[];
  myCommunities: CommunityDto[];
  onJoin: (communityId: number) => void;
  onAdmin: (comm: CommunityDto) => void;
  onLibrary: (communityId: number) => void;
};

export default function PlatformMap({ location, communities, myCommunities, onJoin, onAdmin, onLibrary }: Props) {
  // Group communities by spot.id to ensure ONLY ONE marker per spot
  const grouped = new Map<number, { spot: Bookspot, communities: (CommunityDto & { spot: Bookspot })[] }>();
  
  communities.forEach(comm => {
    const spotId = comm.spot.id;
    if (!grouped.has(spotId)) {
      grouped.set(spotId, {
        spot: comm.spot,
        communities: []
      });
    }
    grouped.get(spotId)!.communities.push(comm);
  });

  const groupedList = Array.from(grouped.values());

  return (
    <MapView
      style={styles.map}
      initialRegion={location}
      showsUserLocation={true}
    >
      {groupedList.map(({ spot, communities: spotComms }) => {
        const hasMyComm = spotComms.some(comm => myCommunities.some(mc => mc.id === comm.id));
        const multipleComms = spotComms.length > 1;

        return (
          <Marker
            key={`spot-${spot.id}`}
            coordinate={{
              latitude: spot.latitude,
              longitude: spot.longitude,
            }}
            tracksViewChanges={false}
          >
            <View style={[
              styles.markerContainer, 
              hasMyComm ? styles.myMarker : styles.otherMarker,
              multipleComms && styles.multipleMarker
            ]}>
              <Ionicons 
                name={multipleComms ? "layers" : (hasMyComm ? "people" : "location")} 
                size={20} 
                color="#fff" 
              />
              {multipleComms && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{spotComms.length}</Text>
                </View>
              )}
            </View>
            <Callout tooltip={true}>
              <View style={[styles.calloutContent, multipleComms && styles.calloutContentMultiple]}>
                <Text style={styles.commSpot}>{spot.nombre}</Text>
                <ScrollView 
                  style={multipleComms ? { maxHeight: 250 } : {}}
                  showsVerticalScrollIndicator={multipleComms}
                >
                  {spotComms.map((comm, index) => {
                    const isMine = myCommunities.some(mc => mc.id === comm.id);
                    return (
                      <View key={`comm-${comm.id}`} style={[
                        styles.commItem, 
                        index < spotComms.length - 1 && styles.commItemBorder
                      ]}>
                        <Text style={styles.commName}>{comm.name}</Text>
                        <Text style={styles.commMembers}>{comm.memberCount} miembros</Text>
                        
                        {!isMine ? (
                          <CalloutSubview onPress={async () => await onJoin(comm.id)}>
                            <View style={styles.joinBtn}>
                              <Text style={styles.joinBtnText}>Unirse</Text>
                            </View>
                          </CalloutSubview>
                        ) : (

                          <CalloutSubview onPress={() => onLibrary(comm.id)}>
                            <View style={[styles.joinBtn, { backgroundColor: '#e4715f' }]}>
                              <Text style={styles.joinBtnText}>Ver Comunidad</Text>
                            </View>
                          </CalloutSubview>

                        )}
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            </Callout>
          </Marker>
        );
      })}
    </MapView>
  );
}

const styles = StyleSheet.create({
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
  multipleMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ff4757',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  myMarker: {
    backgroundColor: '#e4715f',
  },
  otherMarker: {
    backgroundColor: '#3d405b',
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
  calloutContentMultiple: {
    width: 250,
    maxHeight: 400,
  },
  commItem: {
    paddingVertical: 8,
  },
  commItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
  alreadyJoined: {
    color: '#e4715f',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 4,
  },
  myCommButtons: {
    flexDirection: 'column',
    gap: 4,
  },
  myCommBtn: {
    width: '100%',
  },
});
