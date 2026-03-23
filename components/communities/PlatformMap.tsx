import React from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { CommunityDto } from '@/types/community';
import { Bookspot } from '@/lib/mockBookspots';

type Props = {
  location: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
  communities: (CommunityDto & { spot: Bookspot })[];
  myCommunities: CommunityDto[];
  onJoin: (communityId: number) => void;
  onAdmin: (comm: CommunityDto) => void;
};

export default function PlatformMap({ location, communities, myCommunities, onJoin, onAdmin }: Props) {
  return (
    <MapView
      style={styles.map}
      initialRegion={location}
      showsUserLocation={true}
    >
      {communities.map((comm) => {
        const isMine = myCommunities.some(mc => mc.id === comm.id);
        return (
          <Marker
            key={comm.id}
            coordinate={{
              latitude: comm.spot.latitude,
              longitude: comm.spot.longitude,
            }}
            onCalloutPress={() => {
              if (!isMine) {
                onJoin(comm.id);
              } else {
                onAdmin(comm);
              }
            }}
          >
            <View style={[styles.markerContainer, isMine ? styles.myMarker : styles.otherMarker]}>
              <Ionicons name={isMine ? "people" : "location"} size={20} color="#fff" />
            </View>
            <Callout tooltip={true}>
              <View style={styles.calloutContent}>
                <Text style={styles.commName}>{comm.name}</Text>
                <Text style={styles.commSpot}>{comm.spot.nombre}</Text>
                <Text style={styles.commMembers}>{comm.memberCount} miembros</Text>
                <Text style={styles.commStatus}>Estado: {comm.status}</Text>
                
                {!isMine ? (
                  <View style={styles.joinBtn}>
                    <Text style={styles.joinBtnText}>Toca para Unirte</Text>
                  </View>
                ) : (
                  <View style={[styles.joinBtn, { backgroundColor: '#3d405b' }]}>
                    <Text style={styles.joinBtnText}>Administrar</Text>
                  </View>
                )}
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
  myMarker: {
    backgroundColor: '#e4715f',
  },
  otherMarker: {
    backgroundColor: '#3d405b',
  },
  calloutContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  commName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  commSpot: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  commMembers: {
    fontSize: 12,
    color: '#333',
    marginBottom: 2,
  },
  commStatus: {
    fontSize: 12,
    color: '#333',
    marginBottom: 8,
  },
  joinBtn: {
    backgroundColor: '#e4715f',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  joinBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  alreadyJoined: {
    color: '#e4715f',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 4,
  },
});
