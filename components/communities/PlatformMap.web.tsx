import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, Pressable, ActivityIndicator } from 'react-native';
import { CommunityDto } from '@/types/community';
import { Bookspot } from '@/lib/mockBookspots';

type Props = {
  location: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
  communities: (CommunityDto & { spot: Bookspot })[];
  myCommunities: CommunityDto[];
  onJoin: (communityId: number) => void;
  onAdmin: (comm: CommunityDto) => void;
  onLibrary?: (communityId: number) => void;
};

export default function PlatformMap({ location, communities, myCommunities, onJoin, onAdmin, onLibrary }: Props) {
  const [MapReady, setMapReady] = useState(false);
  const [mapComponents, setMapComponents] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 1. Inject Leaflet CSS dynamically to avoid Metro bundler local resource errors
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      // 2. Require leaflet and react-leaflet only on the client side
      const L = require('leaflet');
      const RL = require('react-leaflet');

      const peopleSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: white;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`;
      const locationSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: white;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`;

      const baseMarkerStyle = `
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 2px solid #fff;
        display: flex;
        justify-content: center;
        align-items: center;
        box-shadow: 0px 2px 4px rgba(0,0,0,0.25);
      `;

      // Custom icons
      const otherIcon = new L.DivIcon({
        html: `<div style="${baseMarkerStyle} background-color: #3d405b;">${locationSvg}</div>`,
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18],
      });

      const myIcon = new L.DivIcon({
        html: `<div style="${baseMarkerStyle} background-color: #e4715f;">${peopleSvg}</div>`,
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18],
      });

      setMapComponents({
        MapContainer: RL.MapContainer,
        TileLayer: RL.TileLayer,
        Marker: RL.Marker,
        Popup: RL.Popup,
        otherIcon,
        myIcon,
      });
      setMapReady(true);
    }
  }, []);

  if (!MapReady || !mapComponents) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e4715f" />
        <Text style={{ marginTop: 10, color: '#666' }}>Cargando mapa...</Text>
      </View>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup, otherIcon, myIcon } = mapComponents;

  return (
    <MapContainer 
      center={[location.latitude, location.longitude]} 
      zoom={12} 
      style={{ height: '100%', width: '100%', zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {communities.map((comm) => {
        const isMine = myCommunities.some((mc: any) => mc.id === comm.id);
        return (
          <Marker 
            key={comm.id} 
            position={[comm.spot.latitude, comm.spot.longitude]}
            icon={isMine ? myIcon : otherIcon}
          >
            <Popup>
              <View style={styles.calloutContent}>
                <Text style={styles.commName}>{comm.name}</Text>
                <Text style={styles.commSpot}>{comm.spot.nombre}</Text>
                <Text style={styles.commMembers}>{comm.memberCount} miembros</Text>
                <Text style={styles.commStatus}>Estado: {comm.status}</Text>
                
                {!isMine ? (
                  <Pressable style={styles.joinBtn} onPress={() => onJoin(comm.id)}>
                    <Text style={styles.joinBtnText}>Toca para Unirte</Text>
                  </Pressable>
                ) : (
                  <View style={styles.myCommButtons}>
                    <Pressable style={[styles.joinBtn, { backgroundColor: '#3d405b' }]} onPress={() => onAdmin(comm)}>
                      <Text style={styles.joinBtnText}>Administrar</Text>
                    </Pressable>
                    <Pressable style={[styles.joinBtn, { backgroundColor: '#e4715f' }]} onPress={() => onLibrary?.(comm.id)}>
                      <Text style={styles.joinBtnText}>Ver Comunidad</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fdfbf7',
  },
  calloutContent: {
    width: 200,
    padding: 5,
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
    cursor: 'pointer',
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
  myCommButtons: {
    gap: 6,
  },
});
