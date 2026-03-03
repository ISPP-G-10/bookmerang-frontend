import FontAwesome from "@expo/vector-icons/FontAwesome";
import React, { useState } from "react";
import {
  Modal,
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
  initialPreferences = { distanceKm: 10, genres: [], bookLength: [] },
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
    String(initialPreferences.distanceKm || 10),
  );
  const [selectedGenres, setSelectedGenres] = useState<string[]>(
    initialPreferences.genres || [],
  );
  const [selectedLengths, setSelectedLengths] = useState<string[]>(
    initialPreferences.bookLength || [],
  );
  const [localLoading, setLocalLoading] = useState(false);

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre],
    );
  };

  const toggleLength = (length: string) => {
    setSelectedLengths((prev) =>
      prev.includes(length)
        ? prev.filter((l) => l !== length)
        : [...prev, length],
    );
  };

  const handleSave = async () => {
    setLocalLoading(true);
    try {
      await onSave({
        distanceKm: parseInt(distanceKm, 10) || 10,
        genres: selectedGenres,
        bookLength: selectedLengths,
      });
    } finally {
      setLocalLoading(false);
    }
  };

  const handleClose = () => {
    onSkip?.();
    onClose();
  };

  const loading = localLoading || isLoading;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      {/* Fondo oscuro */}
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          alignItems: "center",
          padding: 16,
        }}
      >
        {/* Tarjeta flotante */}
        <View
          style={{
            backgroundColor: "#fdfbf7",
            borderRadius: 24,
            width: "100%",
            maxHeight: "85%",
            overflow: "hidden",
          }}
        >
          {/* Header del modal */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 24,
              paddingTop: 24,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: "#F3E9E0",
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: "900", color: "#3e2723" }}>
              {title}
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: "#8B7355",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FontAwesome name="times" size={14} color="#8B7355" />
            </TouchableOpacity>
          </View>

          {/* Contenido scrollable */}
          <ScrollView
            contentContainerStyle={{ padding: 24, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Distancia */}
            <Text
              style={{
                fontSize: 11,
                fontWeight: "900",
                letterSpacing: 1.5,
                color: "#e07a5f",
                marginBottom: 12,
                textTransform: "uppercase",
              }}
            >
              Distancia para intercambios
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                marginBottom: 24,
              }}
            >
              <TextInput
                style={{
                  flex: 1,
                  borderWidth: 1.5,
                  borderColor: "#F3E9E0",
                  backgroundColor: "#ffffff",
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 16,
                  color: "#3e2723",
                }}
                keyboardType="numeric"
                placeholder="Ej: 10"
                placeholderTextColor="#c4a882"
                value={distanceKm}
                onChangeText={(v) => setDistanceKm(v.replace(/[^0-9]/g, ""))}
                maxLength={4}
              />
              <Text
                style={{ fontSize: 16, fontWeight: "600", color: "#8B7355" }}
              >
                km
              </Text>
            </View>

            {/* Géneros */}
            <Text
              style={{
                fontSize: 11,
                fontWeight: "900",
                letterSpacing: 1.5,
                color: "#e07a5f",
                marginBottom: 12,
                textTransform: "uppercase",
              }}
            >
              Géneros de interés
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 24,
              }}
            >
              {genreList.map((genre) => {
                const selected = selectedGenres.includes(genre);
                return (
                  <TouchableOpacity
                    key={genre}
                    onPress={() => toggleGenre(genre)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 999,
                      borderWidth: 1.5,
                      backgroundColor: selected ? "#e07a5f" : "#ffffff",
                      borderColor: selected ? "#e07a5f" : "#F3E9E0",
                    }}
                  >
                    <View
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        borderWidth: 1.5,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: selected ? "#ffffff" : "#fdfbf7",
                        borderColor: selected ? "#ffffff" : "#c4a882",
                      }}
                    >
                      {selected && (
                        <FontAwesome name="check" size={9} color="#e07a5f" />
                      )}
                    </View>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: selected ? "#ffffff" : "#8B7355",
                      }}
                    >
                      {genre}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Error */}
            {error ? (
              <View
                style={{
                  backgroundColor: "#fff0f0",
                  borderWidth: 1,
                  borderColor: "#fca5a5",
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16,
                }}
              >
                <Text style={{ color: "#dc2626", fontSize: 13 }}>{error}</Text>
              </View>
            ) : null}

            {/* Extensión del libro */}
            <Text
              style={{
                fontSize: 11,
                fontWeight: "900",
                letterSpacing: 1.5,
                color: "#e07a5f",
                marginBottom: 12,
                textTransform: "uppercase",
              }}
            >
              Extensión del libro
            </Text>
            <View style={{ gap: 8, marginBottom: 8 }}>
              {BOOK_LENGTHS.map((length) => {
                const selected = selectedLengths.includes(length.value);
                return (
                  <TouchableOpacity
                    key={length.value}
                    onPress={() => toggleLength(length.value)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 14,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      backgroundColor: selected ? "#e07a5f" : "#ffffff",
                      borderColor: selected ? "#e07a5f" : "#F3E9E0",
                    }}
                  >
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        borderWidth: 1.5,
                        marginRight: 12,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: selected ? "#ffffff" : "#fdfbf7",
                        borderColor: selected ? "#ffffff" : "#c4a882",
                      }}
                    >
                      {selected && (
                        <FontAwesome name="check" size={10} color="#e07a5f" />
                      )}
                    </View>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "700",
                        color: selected ? "#ffffff" : "#3e2723",
                      }}
                    >
                      {length.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Footer con botones */}
          <View
            style={{
              flexDirection: "row",
              gap: 12,
              padding: 24,
              borderTopWidth: 1,
              borderTopColor: "#F3E9E0",
              backgroundColor: "#fdfbf7",
            }}
          >
            <TouchableOpacity
              onPress={handleClose}
              disabled={loading}
              style={{
                flex: 1,
                borderWidth: 2,
                borderColor: "#e07a5f",
                borderRadius: 999,
                padding: 14,
                alignItems: "center",
              }}
            >
              <Text
                style={{ color: "#e07a5f", fontWeight: "900", fontSize: 15 }}
              >
                Cancelar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              disabled={loading}
              style={{
                flex: 1,
                borderRadius: 999,
                padding: 14,
                alignItems: "center",
                backgroundColor: loading ? "#f4a896" : "#e07a5f",
              }}
            >
              <Text
                style={{ color: "#ffffff", fontWeight: "900", fontSize: 15 }}
              >
                {loading ? "Guardando..." : "Guardar"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
