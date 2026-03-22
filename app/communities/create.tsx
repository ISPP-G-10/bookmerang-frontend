import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, Pressable, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { createCommunity } from '@/lib/communityApi';
import { mockBookspots } from '@/lib/mockBookspots';

export default function CreateCommunityScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [selectedSpot, setSelectedSpot] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Por favor, ingresa un nombre para la comunidad.');
      return;
    }
    if (!selectedSpot) {
      Alert.alert('Error', 'Por favor, selecciona un BookSpot de referencia.');
      return;
    }

    try {
      setLoading(true);
      await createCommunity({
        name: name.trim(),
        referenceBookspotId: selectedSpot,
      });
      Alert.alert('¡Éxito!', 'Comunidad creada correctamente.');
      router.back();
    } catch (error: any) {
      Alert.alert('Error al crear', error.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </Pressable>
          <Text style={styles.headerTitle}>Crear Comunidad</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content}>
          <Text style={styles.label}>Nombre de la comunidad</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Amantes de la ciencia ficción"
            value={name}
            onChangeText={setName}
            maxLength={50}
          />

          <Text style={styles.label}>BookSpot de Referencia</Text>
          <Text style={styles.subLabel}>Este será el lugar principal para los encuentros.</Text>
          
          {mockBookspots.map((spot) => (
            <Pressable
              key={spot.id}
              style={[
                styles.spotItem,
                selectedSpot === spot.id && styles.spotItemSelected
              ]}
              onPress={() => setSelectedSpot(spot.id)}
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
          ))}

          <Pressable 
            style={[styles.createBtn, (!name.trim() || !selectedSpot || loading) && styles.createBtnDisabled]}
            onPress={handleCreate}
            disabled={!name.trim() || !selectedSpot || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.createBtnText}>Crear Comunidad</Text>
            )}
          </Pressable>
        </ScrollView>
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
    paddingTop: 60,
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
    padding: 16,
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
  createBtn: {
    backgroundColor: '#e4715f',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  createBtnDisabled: {
    opacity: 0.6,
  },
  createBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
