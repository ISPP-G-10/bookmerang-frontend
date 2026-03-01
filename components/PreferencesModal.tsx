import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface PreferencesModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (preferences: {
    distanceKm: number;
    genres: string[];
    bookLength: string[];
  }) => void;
  onSkip?: () => void;
  initialPreferences?: {
    distanceKm: number;
    genres: string[];
    bookLength: string[];
  };
  availableGenres?: Array<{ id: number; name: string }>;
  title?: string;
  error?: string;
  loading?: boolean;
}

const FALLBACK_GENRES = [
  "Ficción",
  "No ficción",
  "Fantasía",
  "Romance",
  "Misterio",
  "Ciencia ficción",
  "Biografía",
  "Historia",
  "Autoayuda",
  "Infantil",
  "Juvenil",
  "Terror",
  "Poesía",
  "Ensayo",
];

const BOOK_LENGTHS = [
  { label: "Cortos (0-200 pág.)", value: "0-200" },
  { label: "Medios (200-400 pág.)", value: "200-400" },
  { label: "Largos (+400 pág.)", value: "400+" },
];

export default function PreferencesModal({
  visible,
  onClose,
  onSave,
  onSkip,
  initialPreferences = { distanceKm: 1, genres: [], bookLength: [] },
  availableGenres,
  title = "Preferencias",
  error = "",
  loading: isLoading = false,
}: PreferencesModalProps) {
  const genreList =
    availableGenres && availableGenres.length > 0
      ? availableGenres.map((g) => g.name)
      : FALLBACK_GENRES;

  const [distanceKm, setDistanceKm] = useState<string>(
    String(initialPreferences.distanceKm || 1)
  );
  const [selectedGenres, setSelectedGenres] = useState<string[]>(
    initialPreferences.genres || []
  );
  const [selectedLengths, setSelectedLengths] = useState<string[]>(
    initialPreferences.bookLength || []
  );
  const [loading, setLoading] = useState(false);

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre)
        ? prev.filter((g) => g !== genre)
        : [...prev, genre]
    );
  };

  const toggleLength = (length: string) => {
    setSelectedLengths((prev) =>
      prev.includes(length)
        ? prev.filter((l) => l !== length)
        : [...prev, length]
    );
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave({
        distanceKm: parseInt(distanceKm, 10) || 1,
        genres: selectedGenres,
        bookLength: selectedLengths,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    onSkip?.();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View className="flex-1 bg-amber-50">
        {/* Header */}
        <View className="bg-white px-6 pt-12 pb-4 border-b border-gray-200 flex-row justify-between items-center">
          <Text className="text-2xl font-bold text-gray-800">{title}</Text>
          <Pressable onPress={handleSkip}>
            <Text className="text-2xl text-gray-400">✕</Text>
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {/* Distancia para Intercambios */}
          <View className="px-6 pt-6">
            <Text className="text-sm font-bold text-amber-800 mb-4 tracking-wider">
              DISTANCIA PARA INTERCAMBIOS
            </Text>
            <View className="flex-row items-center gap-3">
              <TextInput
                className="flex-1 border-2 border-gray-200 bg-white rounded-2xl p-4 text-gray-800 text-lg"
                keyboardType="numeric"
                placeholder="Ej: 25"
                placeholderTextColor="#9ca3af"
                value={distanceKm}
                onChangeText={(v) => setDistanceKm(v.replace(/[^0-9]/g, ""))}
                maxLength={4}
              />
              <Text className="text-gray-600 text-lg font-semibold">km</Text>
            </View>
          </View>

          {/* Géneros de Interés */}
          <View className="px-6 pt-8">
            <Text className="text-sm font-bold text-amber-800 mb-4 tracking-wider">
              GÉNEROS DE INTERÉS
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {genreList.map((genre) => (
                <TouchableOpacity
                  key={genre}
                  className={`px-4 py-3 rounded-full border-2 ${
                    selectedGenres.includes(genre)
                      ? "bg-amber-600 border-amber-600"
                      : "bg-white border-gray-200"
                  }`}
                  onPress={() => toggleGenre(genre)}
                >
                  <View className="flex-row items-center gap-2">
                    <View
                      className={`w-5 h-5 rounded border-2 items-center justify-center ${
                        selectedGenres.includes(genre)
                          ? "bg-white border-white"
                          : "border-gray-300"
                      }`}
                    >
                      {selectedGenres.includes(genre) && (
                        <Text className="text-amber-600 font-bold text-xs">
                          ✓
                        </Text>
                      )}
                    </View>
                    <Text
                      className={`font-semibold ${
                        selectedGenres.includes(genre)
                          ? "text-white"
                          : "text-gray-700"
                      }`}
                    >
                      {genre}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Error message */}
          {error ? (
            <View className="px-6 pt-6">
              <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <Text className="text-red-600 text-sm">{error}</Text>
              </View>
            </View>
          ) : null}

          {/* Extensión del Libro */}
          <View className="px-6 pt-8 pb-8">
            <Text className="text-sm font-bold text-amber-800 mb-4 tracking-wider">
              EXTENSIÓN DEL LIBRO
            </Text>
            <View className="gap-3">
              {BOOK_LENGTHS.map((length) => (
                <TouchableOpacity
                  key={length.value}
                  className={`rounded-2xl p-4 flex-row items-center border-2 ${
                    selectedLengths.includes(length.value)
                      ? "bg-amber-600 border-amber-600"
                      : "bg-white border-gray-200"
                  }`}
                  onPress={() => toggleLength(length.value)}
                >
                  <View
                    className={`w-6 h-6 rounded-full border-2 mr-3 items-center justify-center ${
                      selectedLengths.includes(length.value)
                        ? "bg-white border-white"
                        : "border-gray-300"
                    }`}
                  >
                    {selectedLengths.includes(length.value) && (
                      <Text className="text-amber-600 font-bold">✓</Text>
                    )}
                  </View>
                  <Text
                    className={`text-lg font-semibold ${
                      selectedLengths.includes(length.value)
                        ? "text-white"
                        : "text-gray-700"
                    }`}
                  >
                    {length.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Footer Buttons */}
        <View className="px-6 pb-8 pt-4 border-t border-gray-200 bg-white gap-3">
          <TouchableOpacity
            className="border-2 border-amber-600 rounded-full p-4 items-center"
            onPress={handleSkip}
            disabled={loading || isLoading}
          >
            <Text className="text-amber-600 font-bold text-lg">Más tarde</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`rounded-full p-4 items-center ${
              loading || isLoading ? "bg-amber-400" : "bg-amber-600"
            }`}
            onPress={handleSave}
            disabled={loading || isLoading}
          >
            <Text className="text-white font-bold text-lg">
              {loading || isLoading ? "Guardando..." : "Guardar"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
