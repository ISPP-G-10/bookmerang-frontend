import {
  BookspotPendingDTO,
  deleteBookspot,
  getUserActiveBookspots,
  getUserPendingBookspots,
  updateBookspotName,
} from "@/lib/bookspotApi";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

function LocationPin({
  color = "#9e9aad",
  size = 12,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="10" r="3" stroke={color} strokeWidth={2.5} />
    </Svg>
  );
}

type Section = "pending" | "active";

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
  const [section, setSection] = useState<Section>("pending");
  const [pendingSpots, setPendingSpots] = useState<BookspotPendingDTO[]>([]);
  const [activeSpots, setActiveSpots] = useState<BookspotPendingDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pending, active] = await Promise.all([
        getUserPendingBookspots(),
        getUserActiveBookspots(),
      ]);
      setPendingSpots(pending);
      setActiveSpots(active);
    } catch {
      setError("No se pudieron cargar tus bookspots");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!visible) {
      setConfirmingId(null);
      setEditingId(null);
      setEditName("");
      return;
    }
    fetchAll();
  }, [visible]);

  const handleRefresh = async () => {
    setConfirmingId(null);
    setEditingId(null);
    setEditName("");
    await fetchAll();
    onRefresh?.();
  };

  const confirmDelete = async (id: number) => {
    setConfirmingId(null);
    setDeletingId(id);
    try {
      await deleteBookspot(id);
      setPendingSpots((prev) => prev.filter((s) => s.id !== id));
      setActiveSpots((prev) => prev.filter((s) => s.id !== id));
      onRefresh?.();
    } catch {
      setError("No se pudo eliminar. Inténtalo de nuevo.");
    } finally {
      setDeletingId(null);
    }
  };

  const startEdit = (spot: BookspotPendingDTO) => {
    setEditingId(spot.id);
    setEditName(spot.nombre);
    setConfirmingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const saveEdit = async (id: number) => {
    const trimmed = editName.trim();
    if (!trimmed || trimmed.length < 3) return;
    setSavingId(id);
    try {
      const updated = await updateBookspotName(id, trimmed);
      setPendingSpots((prev) =>
        prev.map((s) => (s.id === id ? { ...s, nombre: updated.nombre } : s)),
      );
      setEditingId(null);
      setEditName("");
      onRefresh?.();
    } catch {
      setError("No se pudo guardar el nombre. Inténtalo de nuevo.");
    } finally {
      setSavingId(null);
    }
  };

  const spots = section === "pending" ? pendingSpots : activeSpots;
  const isValidated = section === "active";

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
            maxHeight: "88%",
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
              Mis BookSpots
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

          {/* Section tabs */}
          <View
            style={{
              flexDirection: "row",
              paddingHorizontal: 24,
              paddingTop: 16,
              paddingBottom: 4,
              gap: 8,
            }}
          >
            <TouchableOpacity
              onPress={() => {
                setSection("pending");
                setConfirmingId(null);
                setEditingId(null);
              }}
              style={{
                flex: 1,
                paddingVertical: 9,
                borderRadius: 10,
                alignItems: "center",
                backgroundColor: section === "pending" ? "#e07a5f" : "#f5f3ef",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "800",
                  color: section === "pending" ? "#fff" : "#9e9aad",
                }}
              >
                Propuestas
                {pendingSpots.length > 0 ? ` (${pendingSpots.length})` : ""}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setSection("active");
                setConfirmingId(null);
                setEditingId(null);
              }}
              style={{
                flex: 1,
                paddingVertical: 9,
                borderRadius: 10,
                alignItems: "center",
                backgroundColor: section === "active" ? "#4caf50" : "#f5f3ef",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "800",
                  color: section === "active" ? "#fff" : "#9e9aad",
                }}
              >
                Validados
                {activeSpots.length > 0 ? ` (${activeSpots.length})` : ""}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            contentContainerStyle={{ padding: 24, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
          >
            {loading && !spots.length ? (
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
            ) : spots.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 32 }}>
                <Text
                  style={{
                    fontSize: 16,
                    color: "#8B7355",
                    marginBottom: 8,
                    textAlign: "center",
                  }}
                >
                  {isValidated
                    ? "Aún no tienes BookSpots validados"
                    : "No tienes propuestas pendientes"}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: "#c9b5a3",
                    textAlign: "center",
                  }}
                >
                  {isValidated
                    ? "Cuando la comunidad valide tus propuestas aparecerán aquí"
                    : "Las nuevas propuestas aparecerán aquí"}
                </Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {spots.map((spot) => {
                  const isDeleting = deletingId === spot.id;
                  const isConfirming = confirmingId === spot.id;
                  const isEditing = editingId === spot.id;
                  const isSaving = savingId === spot.id;
                  const count = spot.validationCount ?? 0;
                  const required = spot.requiredValidations ?? 5;
                  const progress = Math.min(count / required, 1);
                  const remaining = required - count;

                  return (
                    <View
                      key={spot.id}
                      style={{
                        borderWidth: 1.5,
                        borderColor: isValidated ? "#a5d6a7" : "#F3E9E0",
                        borderRadius: 12,
                        padding: 16,
                        backgroundColor: isValidated ? "#f9fef9" : "#ffffff",
                        opacity: isDeleting ? 0.5 : 1,
                      }}
                    >
                      {/* Status badge */}
                      <View
                        style={{
                          alignSelf: "flex-start",
                          backgroundColor: isValidated ? "#e8f5e9" : "#fffbeb",
                          borderRadius: 6,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          marginBottom: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: "800",
                            letterSpacing: 0.8,
                            color: isValidated ? "#2e7d32" : "#d97706",
                            textTransform: "uppercase",
                          }}
                        >
                          {isValidated
                            ? "✓ Validado"
                            : "Pendiente de validación"}
                        </Text>
                      </View>

                      {/* Name row */}
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: isEditing ? 10 : 4,
                        }}
                      >
                        {isEditing ? (
                          <View style={{ flex: 1 }}>
                            <TextInput
                              value={editName}
                              onChangeText={setEditName}
                              autoFocus
                              style={{
                                borderWidth: 1.5,
                                borderColor: "#e07a5f",
                                borderRadius: 10,
                                padding: 10,
                                fontSize: 15,
                                fontWeight: "600",
                                color: "#3e2723",
                                marginBottom: 8,
                                backgroundColor: "#fff",
                              }}
                              placeholder="Nombre del lugar"
                              placeholderTextColor="#ccc"
                            />
                            <View style={{ flexDirection: "row", gap: 8 }}>
                              <TouchableOpacity
                                onPress={cancelEdit}
                                disabled={isSaving}
                                style={{
                                  flex: 1,
                                  borderWidth: 1.5,
                                  borderColor: "#e0d5cc",
                                  borderRadius: 8,
                                  padding: 9,
                                  alignItems: "center",
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 13,
                                    fontWeight: "700",
                                    color: "#9e9aad",
                                  }}
                                >
                                  Cancelar
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => saveEdit(spot.id)}
                                disabled={
                                  isSaving || editName.trim().length < 3
                                }
                                style={{
                                  flex: 1,
                                  backgroundColor:
                                    editName.trim().length < 3
                                      ? "#f4c4b8"
                                      : "#e07a5f",
                                  borderRadius: 8,
                                  padding: 9,
                                  alignItems: "center",
                                }}
                              >
                                {isSaving ? (
                                  <ActivityIndicator
                                    size="small"
                                    color="#fff"
                                  />
                                ) : (
                                  <Text
                                    style={{
                                      fontSize: 13,
                                      fontWeight: "700",
                                      color: "#ffffff",
                                    }}
                                  >
                                    Guardar
                                  </Text>
                                )}
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : (
                          <>
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
                            <View style={{ flexDirection: "row", gap: 6 }}>
                              {/* Edit button — solo visible para propuestas pendientes */}
                              {!isValidated && (
                                <TouchableOpacity
                                  onPress={() => startEdit(spot)}
                                  disabled={isDeleting}
                                  style={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: 8,
                                    borderWidth: 1.5,
                                    borderColor: "#e0d5cc",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <FontAwesome
                                    name="pencil"
                                    size={12}
                                    color="#9e9aad"
                                  />
                                </TouchableOpacity>
                              )}
                              {/* Delete button */}
                              {isDeleting ? (
                                <ActivityIndicator
                                  size="small"
                                  color="#ef4444"
                                />
                              ) : (
                                <TouchableOpacity
                                  onPress={() =>
                                    setConfirmingId(
                                      isConfirming ? null : spot.id,
                                    )
                                  }
                                  style={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: 8,
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
                          </>
                        )}
                      </View>

                      {/* Address */}
                      {!isEditing && (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                            marginBottom: 14,
                          }}
                        >
                          <LocationPin
                            color={isValidated ? "#81c784" : "#9e9aad"}
                            size={12}
                          />
                          <Text
                            style={{
                              fontSize: 12,
                              color: isValidated ? "#81c784" : "#9e9aad",
                              flex: 1,
                            }}
                            numberOfLines={2}
                          >
                            {spot.addressText}
                          </Text>
                        </View>
                      )}

                      {/* Delete confirmation */}
                      {isConfirming && !isEditing && (
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
                            ¿Estás seguro de querer borrarlo?
                          </Text>
                          <Text
                            style={{
                              fontSize: 12,
                              color: "#9e9aad",
                              marginBottom: 12,
                            }}
                          >
                            {isValidated
                              ? "En caso de eliminarlo, tendrá que volver a ser validado por la comunidad para reaparecer en el mapa."
                              : "Se liberará uno de tus cupos del mes. Esta acción no se puede deshacer."}
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

                      {/* Validated: green badge */}
                      {!isEditing && isValidated && (
                        <View
                          style={{
                            backgroundColor: "#e8f5e9",
                            borderWidth: 1,
                            borderColor: "#a5d6a7",
                            borderRadius: 10,
                            padding: 12,
                            marginBottom: 12,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text
                              style={{
                                fontSize: 13,
                                fontWeight: "800",
                                color: "#2e7d32",
                              }}
                            >
                              BookSpot validado
                            </Text>
                            <Text
                              style={{
                                fontSize: 12,
                                color: "#4caf50",
                                marginTop: 1,
                              }}
                            >
                              Ya aparece en el mapa para la comunidad
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* Pending: progress */}
                      {!isEditing &&
                        !isValidated &&
                        (() => {
                          return (
                            <>
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 5,
                                  marginBottom: 8,
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 11,
                                    fontWeight: "700",
                                    letterSpacing: 1,
                                    color: "#e07a5f",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  Validaciones
                                </Text>
                              </View>

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
                                {count}/{required} personas han validado tu
                                BookSpot
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
                            </>
                          );
                        })()}

                      {/* Dates */}
                      {!isEditing && (
                        <View style={{ marginTop: 10, gap: 2 }}>
                          <Text style={{ fontSize: 11, color: "#d4c4b9" }}>
                            Propuesto el{" "}
                            {new Date(spot.createdAt).toLocaleDateString(
                              "es-ES",
                            )}
                          </Text>
                          {isValidated && spot.validatedAt && (
                            <Text
                              style={{
                                fontSize: 11,
                                color: "#81c784",
                                fontWeight: "600",
                              }}
                            >
                              Validado e incorporado el{" "}
                              {new Date(spot.validatedAt).toLocaleDateString(
                                "es-ES",
                              )}
                            </Text>
                          )}
                        </View>
                      )}
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
