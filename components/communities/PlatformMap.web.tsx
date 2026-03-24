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

      const layersSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: white;"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>`;

      const baseMarkerStyle = `
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 2px solid #fff;
        display: flex;
        justify-content: center;
        align-items: center;
        box-shadow: 0px 2px 4px rgba(0,0,0,0.25);
        position: relative;
      `;

      const badgeStyle = `
        position: absolute;
        top: -8px;
        right: -8px;
        background-color: #ff4757;
        color: white;
        border-radius: 10px;
        width: 20px;
        height: 20px;
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 10px;
        font-weight: bold;
        border: 1.5px solid white;
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

      const multipleIcon = (count: number) => new L.DivIcon({
        html: `<div style="${baseMarkerStyle} background-color: #3d405b; width: 40px; height: 40px;">
                ${layersSvg}
                <div style="${badgeStyle}">${count}</div>
               </div>`,
        className: '',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20],
      });

      const multipleMyIcon = (count: number) => new L.DivIcon({
        html: `<div style="${baseMarkerStyle} background-color: #e4715f; width: 40px; height: 40px;">
                ${layersSvg}
                <div style="${badgeStyle}">${count}</div>
               </div>`,
        className: '',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20],
      });

      setMapComponents({
        MapContainer: RL.MapContainer,
        TileLayer: RL.TileLayer,
        Marker: RL.Marker,
        Popup: RL.Popup,
        otherIcon,
        myIcon,
        multipleIcon,
        multipleMyIcon,
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

  const { MapContainer, TileLayer, Marker, Popup, otherIcon, myIcon, multipleIcon, multipleMyIcon } = mapComponents;

  // Group communities by coordinates to be 100% sure overlapping items are caught
  const grouped = new Map<string, { spot: Bookspot, communities: (CommunityDto & { spot: Bookspot })[] }>();
  
  communities.forEach(comm => {
    // Round coordinates slightly to handle tiny floating point differences
    const lat = comm.spot.latitude.toFixed(6);
    const lon = comm.spot.longitude.toFixed(6);
    const key = `${lat},${lon}`;
    
    if (!grouped.has(key)) {
      grouped.set(key, { spot: comm.spot, communities: [] });
    }
    grouped.get(key)!.communities.push(comm);
  });

  const groupedList = Array.from(grouped.values());

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
      
      {groupedList.map(({ spot, communities: spotComms }) => {
        const hasMyComm = spotComms.some(comm => myCommunities.some(mc => mc.id === comm.id));
        const isMultiple = spotComms.length > 1;
        
        let icon;
        if (isMultiple) {
          icon = hasMyComm ? multipleMyIcon(spotComms.length) : multipleIcon(spotComms.length);
        } else {
          icon = hasMyComm ? myIcon : otherIcon;
        }

        return (
          <Marker 
            key={`spot-${spot.id}`} 
            position={[spot.latitude, spot.longitude]}
            icon={icon}
          >
            <Popup minWidth={220} maxWidth={280}>
              <View style={styles.popupScrollContainer}>
                <Text style={styles.commSpot}>{spot.nombre}</Text>
                {spotComms.map((comm, index) => {
                  const isMine = myCommunities.some((mc: any) => mc.id === comm.id);
                  return (
                    <View key={`comm-${comm.id}`} style={[
                      styles.commItem, 
                      index < spotComms.length - 1 && styles.commItemBorder
                    ]}>
                      <Text style={styles.commName}>{comm.name}</Text>
                      <Text style={styles.commMembers}>{comm.memberCount} miembros</Text>
                      
                      {!isMine ? (
                        <Pressable 
                          style={styles.joinBtn} 
                          onPress={async (e) => {
                            // En web, Leaflet puede ser problemático con los eventos
                            if (e && e.preventDefault) e.preventDefault();
                            if (e && e.stopPropagation) e.stopPropagation();
                            
                            try {
                              await onJoin(comm.id);
                            } catch (err: any) {
                              window.alert(`Error: ${err.message}`);
                            }
                          }}
                        >
                          <Text style={styles.joinBtnText}>Unirse</Text>
                        </Pressable>
                      ) : (
                        <Pressable style={[styles.joinBtn, { backgroundColor: '#e4715f' }]} onPress={() => onLibrary?.(comm.id)}>
                          <Text style={styles.joinBtnText}>Ver Comunidad</Text>
                        </Pressable>
                      )}
                    </View>
                  );
                })}
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
  popupScrollContainer: {
    maxHeight: 300,
    overflowY: 'auto' as any,
    paddingRight: 5,
  },
  commItem: {
    paddingVertical: 10,
  },
  commItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  commName: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 2,
    color: '#333',
  },
  commSpot: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
    marginBottom: 5,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 5,
  },
  commMembers: {
    fontSize: 12,
    color: '#333',
    marginBottom: 6,
  },
  joinBtn: {
    backgroundColor: '#e4715f',
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    cursor: 'pointer',
  },
  joinBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  myCommButtons: {
    flexDirection: 'column',
    gap: 4,
  },
});
