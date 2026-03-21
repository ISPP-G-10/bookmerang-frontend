import {
    BookspotPendingDTO,
    deleteBookspot,
    getUserPendingBookspots,
} from "@/lib/bookspotApi";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface Props {
  visible: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export default function MyPendingBookSpotsModal({
  visible,
  onClose,
  onRefresh,
}: Props) {
  const [bookspots, setBookspots] = useState<BookspotPendingDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  // confirmingId: shows the inline "¿Seguro?" row for this spot
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPending = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUserPendingBookspots();
      setBookspots(data);
    } catch {
      setError("No se pudieron cargar tus propuestas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!visible) {
      setConfirmingId(null);
      return;
    }
    fetchPending();
  }, [visible]);

  const handleRefresh = async () => {
    setConfirmingId(null);
    await fetchPending();
    onRefresh?.();
  };

  const confirmDelete = async (id: number) => {
    setConfirmingId(null);
    setDeletingId(id);
    try {
      await deleteBookspot(id);
      setBookspots((prev) => prev.filter((s) => s.id !== id));
    } catch {
      setError("No se pudo eliminar la propuesta. Inténtalo de nuevo.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          alignItems: "center",
          padding: 16,
        }}
      >
        <View
          style={{
            backgroundColor: "#fdfbf7",
            borderRadius: 24,
            width: "100%",
            maxHeight: "85%",
            overflow: "hidden",
          }}
        >
          {/* Header */}
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
              Mis propuestas
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

          {/* Content */}
          <ScrollView
            contentContainerStyle={{ padding: 24, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
          >
            {loading && !bookspots.length ? (
              <View style={{ alignItems: "center", paddingVertical: 24 }}>
                <ActivityIndicator size="large" color="#e07a5f" />
              </View>
            ) : error ? (
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
            ) : bookspots.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 32 }}>
                <Text
                  style={{
                    fontSize: 16,
                    color: "#8B7355",
                    marginBottom: 8,
                    textAlign: "center",
                  }}
                >
                  No tienes propuestas pendientes
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: "#c9b5a3",
                    textAlign: "center",
                  }}
                >
                  Las nuevas propuestas aparecerán aquí
                </Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {bookspots.map((spot) => {
                  const isDeleting = deletingId === spot.id;
                  const isConfirming = confirmingId === spot.id;
                  const progress = Math.min(
                    spot.validationCount / spot.requiredValidations,
                    1,
                  );
                  const remaining =
                    spot.requiredValidations - spot.validationCount;

                  return (
                    <View
                      key={spot.id}
                      style={{
                        borderWidth: 1,
                        borderColor: "#F3E9E0",
                        borderRadius: 12,
                        padding: 16,
                        backgroundColor: "#ffffff",
                        opacity: isDeleting ? 0.5 : 1,
                      }}
                    >
                      {/* Name row */}
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: 4,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "900",
                            color: "#3e2723",
                            flex: 1,
                            marginRight: 8,
                          }}
                        >
                          {spot.nombre}
                        </Text>
                        {isDeleting ? (
                          <ActivityIndicator size="small" color="#ef4444" />
                        ) : (
                          <TouchableOpacity
                            onPress={() =>
                              setConfirmingId(isConfirming ? null : spot.id)
                            }
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 14,
                              borderWidth: 1.5,
                              borderColor: "#fca5a5",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <FontAwesome
                              name="trash"
                              size={12}
                              color="#ef4444"
                            />
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Address */}
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#9e9aad",
                          marginBottom: 14,
                        }}
                        numberOfLines={2}
                      >
                        📍 {spot.addressText}
                      </Text>

                      {/* Inline delete confirmation */}
                      {isConfirming && (
                        <View
                          style={{
                            backgroundColor: "#fff5f5",
                            borderWidth: 1,
                            borderColor: "#fca5a5",
                            borderRadius: 10,
                            padding: 12,
                            marginBottom: 14,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              color: "#3e2723",
                              fontWeight: "700",
                              marginBottom: 4,
                            }}
                          >
                            ¿Eliminar esta propuesta?
                          </Text>
                          <Text
                            style={{
                              fontSize: 12,
                              color: "#9e9aad",
                              marginBottom: 12,
                            }}
                          >
                            Se liberará uno de tus cupos del mes. Esta acción no
                            se puede deshacer.
                          </Text>
                          <View style={{ flexDirection: "row", gap: 8 }}>
                            <TouchableOpacity
                              onPress={() => setConfirmingId(null)}
                              style={{
                                flex: 1,
                                borderWidth: 1.5,
                                borderColor: "#e07a5f",
                                borderRadius: 8,
                                padding: 9,
                                alignItems: "center",
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 13,
                                  fontWeight: "700",
                                  color: "#e07a5f",
                                }}
                              >
                                Cancelar
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => confirmDelete(spot.id)}
                              style={{
                                flex: 1,
                                backgroundColor: "#ef4444",
                                borderRadius: 8,
                                padding: 9,
                                alignItems: "center",
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 13,
                                  fontWeight: "700",
                                  color: "#ffffff",
                                }}
                              >
                                Eliminar
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}

                      {/* Progress label */}
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "900",
                          letterSpacing: 1,
                          color: "#e07a5f",
                          marginBottom: 8,
                          textTransform: "uppercase",
                        }}
                      >
                        Validaciones
                      </Text>

                      {/* Progress bar */}
                      <View
                        style={{
                          height: 8,
                          backgroundColor: "#F3E9E0",
                          borderRadius: 4,
                          overflow: "hidden",
                          marginBottom: 8,
                        }}
                      >
                        <View
                          style={{
                            height: "100%",
                            backgroundColor: "#e07a5f",
                            width: `${progress * 100}%`,
                            borderRadius: 4,
                          }}
                        />
                      </View>

                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
                          color: "#3e2723",
                        }}
                      >
                        {spot.validationCount}/{spot.requiredValidations}{" "}
                        personas han validado tu BookSpot
                      </Text>

                      {remaining > 0 ? (
                        <Text
                          style={{
                            fontSize: 12,
                            color: "#c9b5a3",
                            marginTop: 3,
                          }}
                        >
                          Aún quedan {remaining} persona
                          {remaining !== 1 ? "s" : ""} más por validarlo
                        </Text>
                      ) : (
                        <Text
                          style={{
                            fontSize: 12,
                            color: "#4caf50",
                            marginTop: 3,
                            fontWeight: "600",
                          }}
                        >
                          ✓ BookSpot validado — ¡Próximamente activo!
                        </Text>
                      )}

                      <Text
                        style={{
                          fontSize: 11,
                          color: "#d4c4b9",
                          marginTop: 10,
                        }}
                      >
                        Propuesto el{" "}
                        {new Date(spot.createdAt).toLocaleDateString("es-ES")}
                      </Text>
                    </View>
                  );
                })}
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
              onPress={handleRefresh}
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
                {loading ? "..." : "Actualizar"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClose}
              disabled={loading}
              style={{
                flex: 1,
                borderRadius: 999,
                padding: 14,
                alignItems: "center",
                backgroundColor: "#e07a5f",
              }}
            >
              <Text
                style={{ color: "#ffffff", fontWeight: "900", fontSize: 15 }}
              >
                Cerrar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
