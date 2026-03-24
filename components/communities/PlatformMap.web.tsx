import { Bookspot } from '@/lib/mockBookspots';
import { CommunityDto } from '@/types/community';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
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

export default function PlatformMap({ location, communities, myCommunities, onJoin, onAdmin, onLibrary }: Props) {
  const [MapReady, setMapReady] = useState(false);
  const [mapComponents, setMapComponents] = useState<any>(null);
  const [rouletteGroup, setRouletteGroup] = useState<GroupedCommunitySpot | null>(null);
  const groupedMarkers = useMemo(
    () => groupCommunitiesBySpot(communities, myCommunities),
    [communities, myCommunities]
  );
  const myCommunityIds = useMemo(() => new Set(myCommunities.map((community) => community.id)), [myCommunities]);

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
      const layersSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" style="color: white;"><path d="m12 2 10 5-10 5L2 7l10-5Z"></path><path d="m2 17 10 5 10-5"></path><path d="m2 12 10 5 10-5"></path></svg>`;

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

      const createMultiIcon = (count: number, hasMine: boolean) =>
        new L.DivIcon({
          html: `<div style="${baseMarkerStyle} width: 42px; height: 42px; background-color: ${hasMine ? '#e4715f' : '#3d405b'}; position: relative;">${layersSvg}<span style="position: absolute; top: -6px; right: -6px; min-width: 20px; height: 20px; border-radius: 10px; padding: 0 4px; background-color: #f59e0b; color: white; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; border: 2px solid #fff;">${count}</span></div>`,
          className: '',
          iconSize: [42, 42],
          iconAnchor: [21, 21],
          popupAnchor: [0, -20],
        });

      setMapComponents({
        MapContainer: RL.MapContainer,
        TileLayer: RL.TileLayer,
        Marker: RL.Marker,
        Popup: RL.Popup,
        otherIcon,
        myIcon,
        createMultiIcon,
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

  const { MapContainer, TileLayer, Marker, Popup, otherIcon, myIcon, createMultiIcon } = mapComponents;

  return (
    <View style={styles.mapWrapper}>
      <MapContainer
        center={[location.latitude, location.longitude]}
        zoom={12}
        style={styles.leafletMap}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {groupedMarkers.map((group) => {
          if (group.communities.length > 1) {
            return (
              <Marker
                key={group.key}
                position={[group.spot.latitude, group.spot.longitude]}
                icon={createMultiIcon(group.communities.length, group.hasMine)}
                eventHandlers={{
                  click: () => setRouletteGroup(group),
                }}
              />
            );
          }

          const comm = group.communities[0];
          const isMine = myCommunityIds.has(comm.id);

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
  mapWrapper: {
    width: '100%',
    height: '100%',
  },
  leafletMap: {
    height: '100%',
    width: '100%',
    zIndex: 0,
  },
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
  calloutContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    width: 220,
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
