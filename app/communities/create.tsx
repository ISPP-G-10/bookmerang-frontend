import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, TextInput, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createCommunity } from '@/lib/communityApi';
import { getUserActiveBookspots, BookspotPendingDTO } from '@/lib/bookspotApi';

export default function CreateCommunityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [selectedSpot, setSelectedSpot] = useState<number | null>(null);
  const [bookspots, setBookspots] = useState<BookspotPendingDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchBookspots = useCallback(async () => {
    try {
      setInitialLoading(true);
      const data = await getUserActiveBookspots();
      setBookspots(data);
    } catch (error: any) {
      console.error(error);
      setErrorMessage('No se pudieron cargar los BookSpots disponibles.');
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchBookspots();
    }, [fetchBookspots])
  );

  const handleCreate = async () => {
    setErrorMessage(null);
    if (!name.trim()) {
      setErrorMessage('Por favor, ingresa un nombre para la comunidad.');
      return;
    }
    if (!selectedSpot) {
      setErrorMessage('Por favor, selecciona un BookSpot de referencia.');
      return;
    }

    try {
      setLoading(true);
      await createCommunity({
        name: name.trim(),
        referenceBookspotId: selectedSpot,
      });
      router.replace('/(tabs)/comunidades' as any);
    } catch (error: any) {
      setErrorMessage(error.message || 'Error al crear la comunidad');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top > 0 ? insets.top + 8 : 12 }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </Pressable>
          <Text style={styles.headerTitle}>Crear Comunidad</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          {errorMessage && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color="#DC2626" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <Text style={styles.label}>Nombre de la comunidad</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Amantes de la ciencia ficción"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (errorMessage) setErrorMessage(null);
            }}
            maxLength={50}
          />

          <Text style={styles.label}>BookSpot de Referencia</Text>
          <Text style={styles.subLabel}>Este será el lugar principal para los encuentros.</Text>

          <View style={styles.spotsSection}>
            {initialLoading ? (
              <ActivityIndicator size="small" color="#e4715f" style={styles.loadingIndicator} />
            ) : (
              <ScrollView
                style={styles.spotsScroll}
                contentContainerStyle={bookspots.length === 0 ? styles.spotsEmptyContent : styles.spotsScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {bookspots.length === 0 ? (
                  <Text style={styles.emptyText}>No hay BookSpots activos disponibles en este momento.</Text>
                ) : (
                  bookspots.map((spot) => (
                    <Pressable
                      key={spot.id}
                      style={[
                        styles.spotItem,
                        selectedSpot === spot.id && styles.spotItemSelected
                      ]}
                      onPress={() => {
                        setSelectedSpot(spot.id);
                        if (errorMessage) setErrorMessage(null);
                      }}
                    >
                      <View style={styles.spotInfo}>
                        <Text style={[styles.spotName, selectedSpot === spot.id && styles.spotNameSelected]}>
                          {spot.nombre}
                        </Text>
                        <Text style={styles.spotAddress}>{spot.addressText}</Text>
                      </View>
                      {selectedSpot === spot.id && (
                        <Ionicons name="checkmark-circle" size={24} color="#e4715f" />
                      )}
                    </Pressable>
                  ))
                )}
              </ScrollView>
            )}
          </View>

          <View style={[styles.footer, { paddingBottom: insets.bottom > 0 ? insets.bottom + 12 : 16 }]}>
            <Pressable
              style={[styles.createBtn, (!name.trim() || !selectedSpot || loading || initialLoading) && styles.createBtnDisabled]}
              onPress={handleCreate}
              disabled={!name.trim() || !selectedSpot || loading || initialLoading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.createBtnText}>Crear Comunidad</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fdfbf7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 16,
    minHeight: 0,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  subLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  spotsSection: {
    flex: 1,
    minHeight: 0,
  },
  spotsScroll: {
    flex: 1,
  },
  spotsScrollContent: {
    paddingBottom: 8,
  },
  spotsEmptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  loadingIndicator: {
    marginVertical: 20,
  },
  spotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
  },
  spotItemSelected: {
    borderColor: '#e4715f',
    backgroundColor: '#fef5f2',
  },
  spotInfo: {
    flex: 1,
  },
  spotName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  spotNameSelected: {
    color: '#e4715f',
  },
  spotAddress: {
    fontSize: 13,
    color: '#666',
  },
  footer: {
    paddingTop: 12,
    backgroundColor: '#fdfbf7',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  createBtn: {
    backgroundColor: '#e4715f',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  createBtnDisabled: {
    opacity: 0.6,
  },
  createBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
