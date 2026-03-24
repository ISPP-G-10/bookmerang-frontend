import { createBookspot } from "@/lib/bookspotApi";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  PanResponder,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface Props {
  visible: boolean;
  onClose: () => void;
  onPickOnMap?: () => void;
  pickedLocation?: { lat: number; lng: number; address?: string } | null;
  name?: string;
  onNameChange?: (name: string) => void;
}

export default function CreateBookspotModal({
  visible,
  onClose,
  onPickOnMap,
  pickedLocation,
  name = "",
  onNameChange,
}: Props) {
  const [address, setAddress] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<any | null>(null);

  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const translateY = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) =>
        g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80 || g.vy > 0.5) {
          Animated.timing(translateY, {
            toValue: 700,
            duration: 220,
            useNativeDriver: true,
          }).start(() => {
            translateY.setValue(0);
            resetLocal();
            onClose();
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        }
      },
    }),
  ).current;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!pickedLocation) return;

    setErrorMsg(null);
    setResults([]);
    setSelectedLocation({
      lat: String(pickedLocation.lat),
      lon: String(pickedLocation.lng),
    });

    if (pickedLocation.address) setAddress(pickedLocation.address);
  }, [pickedLocation]);

  function handleNameChange(val: string) {
    onNameChange?.(val);
  }

  async function searchAddress(query: string) {
    setAddress(query);
    setSelectedLocation(null);
    setErrorMsg(null);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      if (query.length < 4) {
        setResults([]);
        return;
      }

      try {
        setSearching(true);

        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query,
          )}&limit=5`,
          {
            headers: {
              "User-Agent": "bookmerang-app",
            },
          },
        );

        const data = await res.json();
        setResults(data);
      } catch (e) {
        console.warn("Address search error", e);
      } finally {
        setSearching(false);
      }
    }, 600);
  }

  function selectAddress(item: any) {
    setAddress(item.display_name);
    setSelectedLocation(item);
    setResults([]);
  }

  async function handleSubmit() {
    if (!name || !selectedLocation) return;

    try {
      setLoading(true);
      setErrorMsg(null);

      const result = await createBookspot({
        nombre: name,
        addressText: address,
        latitude: parseFloat(selectedLocation.lat),
        longitude: parseFloat(selectedLocation.lon),
        isBookdrop: false,
      });

      console.log("[CreateBookspot] ✓ Propuesta creada exitosamente!", result);

      resetLocal();
      onClose();
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      console.error("[CreateBookspot] ✗ Error details:", msg);

      if (
        msg.toLowerCase().includes("límite") ||
        msg.toLowerCase().includes("limit") ||
        msg.toLowerCase().includes("bookspots por mes")
      ) {
        setErrorMsg(
          "Has alcanzado el límite de 5 bookspots por mes. Intenta de nuevo el próximo mes.",
        );
      } else if (
        msg.toLowerCase().includes("duplicado") ||
        msg.toLowerCase().includes("duplicate") ||
        msg.toLowerCase().includes("5 metros")
      ) {
        setErrorMsg(
          "Ya existe un BookSpot muy cercano en esta zona. Elige una ubicación diferente.",
        );
      } else if (msg.includes("401") || msg.includes("Unauthorized")) {
        setErrorMsg("Tu sesión ha expirado. Por favor inicia sesión de nuevo.");
      } else if (msg.trim().length > 0) {
        setErrorMsg(msg);
      } else {
        setErrorMsg(
          "No se ha podido proponer el BookSpot. Inténtalo de nuevo.",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  function resetLocal() {
    setAddress("");
    setResults([]);
    setSelectedLocation(null);
    setErrorMsg(null);
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => {
          if (!loading) {
            resetLocal();
            onClose();
          }
        }}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          alignItems: "center",
          padding: 16,
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {}}
          style={{ width: "100%", maxHeight: "85%" }}
        >
          <Animated.View
            style={{
              backgroundColor: "#fdfbf7",
              borderRadius: 24,
              overflow: "hidden",
              transform: [{ translateY }],
            }}
          >
            <View {...panResponder.panHandlers}>
              {/* Drag handle pill */}
              <View
                style={{
                  alignItems: "center",
                  paddingTop: 12,
                  paddingBottom: 4,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: "#e0d6cc",
                  }}
                />
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingHorizontal: 24,
                  paddingTop: 8,
                  paddingBottom: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: "#F3E9E0",
                }}
              >
                <Text
                  style={{ fontSize: 20, fontWeight: "900", color: "#3e2723" }}
                >
                  Proponer BookSpot
                </Text>
                <TouchableOpacity
                  onPress={onClose}
                  disabled={loading}
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
            </View>

            {/* Contenido */}
            <ScrollView
              contentContainerStyle={{ padding: 24, paddingBottom: 8 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Nombre */}
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
                Nombre del lugar
              </Text>

              <TextInput
                style={{
                  borderWidth: 1.5,
                  borderColor: "#F3E9E0",
                  backgroundColor: "#ffffff",
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 16,
                  color: "#3e2723",
                  marginBottom: 24,
                }}
                value={name}
                onChangeText={handleNameChange}
                placeholder="Ej: Biblioteca de barrio"
                placeholderTextColor="#ccc"
              />

              {/* Dirección */}
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
                Dirección
              </Text>

              <TextInput
                style={{
                  borderWidth: 1.5,
                  borderColor: "#F3E9E0",
                  backgroundColor: "#ffffff",
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 16,
                  color: "#3e2723",
                  marginBottom: 12,
                }}
                value={address}
                onChangeText={searchAddress}
                placeholder="Busca una dirección..."
                placeholderTextColor="#ccc"
              />

              {/* Boton de seleccionar en mapa */}
              {onPickOnMap && (
                <TouchableOpacity
                  onPress={onPickOnMap}
                  disabled={loading}
                  style={{
                    borderWidth: 1.5,
                    borderColor: "#e07a5f",
                    borderRadius: 12,
                    padding: 14,
                    alignItems: "center",
                    marginBottom: 24,
                  }}
                >
                  <Text
                    style={{
                      color: "#e07a5f",
                      fontWeight: "900",
                      fontSize: 15,
                    }}
                  >
                    Seleccionar en mapa
                  </Text>
                </TouchableOpacity>
              )}

              {/* Cargando */}
              {searching && (
                <View style={{ marginBottom: 12, alignItems: "center" }}>
                  <ActivityIndicator size="small" color="#e07a5f" />
                </View>
              )}

              {/* Resultados de búsqueda */}
              {results.length > 0 && (
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: "#F3E9E0",
                    borderRadius: 12,
                    overflow: "hidden",
                    marginBottom: 24,
                    maxHeight: 200,
                  }}
                >
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {results.map((item, index) => (
                      <TouchableOpacity
                        key={item.place_id}
                        onPress={() => selectAddress(item)}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 12,
                          borderBottomWidth: index < results.length - 1 ? 1 : 0,
                          borderBottomColor: "#F3E9E0",
                          backgroundColor:
                            index % 2 === 0 ? "#ffffff" : "#fdfbf7",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            color: "#3e2723",
                            lineHeight: 20,
                          }}
                          numberOfLines={2}
                        >
                          {item.display_name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Mensaje de error */}
              {errorMsg && (
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
                  <Text style={{ color: "#dc2626", fontSize: 13 }}>
                    {errorMsg}
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Footer */}
            <View
              style={{
                flexDirection: "row",
                gap: 12,
                padding: 24,
                borderTopWidth: 1,
                borderTopColor: "#F3E9E0",
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  resetLocal();
                  onClose();
                }}
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
                onPress={handleSubmit}
                disabled={loading || !selectedLocation || !name}
                style={{
                  flex: 1,
                  borderRadius: 999,
                  padding: 14,
                  alignItems: "center",
                  backgroundColor:
                    loading || !selectedLocation || !name
                      ? "#f4a896"
                      : "#e07a5f",
                }}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text
                    style={{
                      color: "#ffffff",
                      fontWeight: "900",
                      fontSize: 15,
                    }}
                  >
                    Proponer
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
