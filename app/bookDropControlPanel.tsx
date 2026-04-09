import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import {
  deleteBookdropProfile,
  getBookdropProfile,
  updateBookdropProfile,
  type BookdropProfile,
} from "@/lib/bookdropApi";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type EditableFields = {
  nombreEstablecimiento: string;
  addressText: string;
  profilePhoto: string;
  latitud: string;
  longitud: string;
};

function getStatusMeta(rawStatus: string | number) {
  const normalized = String(rawStatus ?? "").trim().toUpperCase();

  if (normalized === "VALIDATED" || normalized === "ACTIVE" || normalized === "1") {
    return {
      label: "Activo",
      icon: "checkmark-circle-outline" as const,
      color: "#1f8f5f",
      backgroundColor: "#e8f7ef",
    };
  }

  if (normalized === "PENDING" || normalized === "0") {
    return {
      label: "Pendiente",
      icon: "time-outline" as const,
      color: "#b76b00",
      backgroundColor: "#fff4e5",
    };
  }

  if (normalized === "REJECTED" || normalized === "2") {
    return {
      label: "Rechazado",
      icon: "close-circle-outline" as const,
      color: "#b42318",
      backgroundColor: "#fdeaea",
    };
  }

  return {
    label: normalized || "Desconocido",
    icon: "help-circle-outline" as const,
    color: "#5f5b73",
    backgroundColor: "#f1eef5",
  };
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Fecha no disponible";

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

function toEditableFields(profile: BookdropProfile): EditableFields {
  return {
    nombreEstablecimiento: profile.nombreEstablecimiento ?? "",
    addressText: profile.addressText ?? "",
    profilePhoto: profile.profilePhoto ?? "",
    latitud: String(profile.latitud ?? ""),
    longitud: String(profile.longitud ?? ""),
  };
}

export default function BookDropControlPanelScreen() {
  const router = useRouter();
  const { signOut, isBookdropUser, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState<BookdropProfile | null>(null);
  const [form, setForm] = useState<EditableFields>({
    nombreEstablecimiento: "",
    addressText: "",
    profilePhoto: "",
    latitud: "",
    longitud: "",
  });

  const statusMeta = useMemo(
    () => getStatusMeta(profile?.bookspotStatus ?? ""),
    [profile?.bookspotStatus],
  );

  const loadProfile = useCallback(async () => {
    try {
      setError(null);
      const nextProfile = await getBookdropProfile();
      setProfile(nextProfile);
      setForm(toEditableFields(nextProfile));
    } catch (e: any) {
      setError(e?.message ?? "No se pudo cargar el panel de control");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !isBookdropUser) {
      router.replace("/(tabs)/matcher" as any);
    }
  }, [authLoading, isBookdropUser, router]);

  useFocusEffect(
    useCallback(() => {
      if (!isBookdropUser) return;

      setLoading(true);
      void loadProfile();
    }, [isBookdropUser, loadProfile]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setSuccessMessage(null);
    void loadProfile();
  }, [loadProfile]);

  const handleChange = useCallback((field: keyof EditableFields, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }, []);

  const handleSave = useCallback(async () => {
    const trimmedNombre = form.nombreEstablecimiento.trim();
    const trimmedAddress = form.addressText.trim();
    const trimmedPhoto = form.profilePhoto.trim();
    const parsedLat = Number(form.latitud);
    const parsedLng = Number(form.longitud);

    if (trimmedNombre.length < 3) {
      setError("El nombre del establecimiento debe tener al menos 3 caracteres");
      return;
    }

    if (trimmedAddress.length < 5) {
      setError("La dirección debe tener al menos 5 caracteres");
      return;
    }

    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
      setError("La latitud y la longitud deben ser válidas");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const updatedProfile = await updateBookdropProfile({
        nombreEstablecimiento: trimmedNombre,
        addressText: trimmedAddress,
        profilePhoto: trimmedPhoto,
        latitud: parsedLat,
        longitud: parsedLng,
      });

      setProfile(updatedProfile);
      setForm(toEditableFields(updatedProfile));
      setSuccessMessage("Perfil actualizado correctamente");
    } catch (e: any) {
      setError(e?.message ?? "No se pudo guardar el perfil");
    } finally {
      setSaving(false);
    }
  }, [form]);

  const handleDelete = useCallback(async () => {
    if (deleting) return;

    try {
      setDeleting(true);
      setConfirmingDelete(false);
      setError(null);
      setSuccessMessage(null);
      await deleteBookdropProfile();
      await signOut();
    } catch (e: any) {
      setError(e?.message ?? "No se pudo eliminar el establecimiento");
      setDeleting(false);
    }
  }, [deleting, signOut]);

  if (authLoading) {
    return null;
  }

  if (!isBookdropUser) {
    return null;
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Header />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#e07a5f" />
          <Text style={styles.loadingText}>Cargando panel...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e07a5f" />
        }
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTextBlock}>
              <Text style={styles.heroTitle}>
                {profile?.nombreEstablecimiento ?? "Panel BookDrop"}
              </Text>
              <Text style={styles.heroSubtitle}>{profile?.email ?? "Sin email"}</Text>
            </View>

            <View style={[styles.statusBadge, { backgroundColor: statusMeta.backgroundColor }]}>
              <Ionicons name={statusMeta.icon} size={14} color={statusMeta.color} />
              <Text style={[styles.statusBadgeText, { color: statusMeta.color }]}>
                {statusMeta.label}
              </Text>
            </View>
          </View>

          <Text style={styles.heroDescription}>
            Gestiona el perfil público de tu establecimiento con la información expuesta por la API
            de bookdrop.
          </Text>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={18} color="#b42318" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {successMessage ? (
          <View style={styles.successCard}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#1f8f5f" />
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Resumen del establecimiento</Text>
        <View style={styles.summaryGrid}>
          <InfoCard icon="person-outline" label="Responsable" value={profile?.name ?? "Sin nombre"} />
          <InfoCard icon="at-outline" label="Usuario" value={profile?.username ?? "Sin usuario"} />
          <InfoCard icon="calendar-outline" label="Alta" value={profile ? formatDate(profile.createdAt) : "Sin fecha"} />
          <InfoCard
            icon="location-outline"
            label="Coordenadas"
            value={
              profile
                ? `${profile.latitud.toFixed(5)}, ${profile.longitud.toFixed(5)}`
                : "Sin coordenadas"
            }
          />
        </View>

        <Text style={styles.sectionTitle}>Editar perfil</Text>
        <View style={styles.formCard}>
          <FieldLabel label="Nombre del establecimiento" />
          <TextInput
            value={form.nombreEstablecimiento}
            onChangeText={(value) => handleChange("nombreEstablecimiento", value)}
            placeholder="Nombre del establecimiento"
            placeholderTextColor="#a7a1b3"
            style={styles.input}
          />

          <FieldLabel label="Dirección" />
          <TextInput
            value={form.addressText}
            onChangeText={(value) => handleChange("addressText", value)}
            placeholder="Dirección del establecimiento"
            placeholderTextColor="#a7a1b3"
            style={[styles.input, styles.multilineInput]}
            multiline
          />

          <FieldLabel label="Foto de perfil" />
          <TextInput
            value={form.profilePhoto}
            onChangeText={(value) => handleChange("profilePhoto", value)}
            placeholder="URL de la foto de perfil"
            placeholderTextColor="#a7a1b3"
            style={styles.input}
            autoCapitalize="none"
          />

          <View style={styles.coordinatesRow}>
            <View style={styles.coordinateColumn}>
              <FieldLabel label="Latitud" />
              <TextInput
                value={form.latitud}
                onChangeText={(value) => handleChange("latitud", value)}
                placeholder="37.3886"
                placeholderTextColor="#a7a1b3"
                style={styles.input}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.coordinateColumn}>
              <FieldLabel label="Longitud" />
              <TextInput
                value={form.longitud}
                onChangeText={(value) => handleChange("longitud", value)}
                placeholder="-5.9823"
                placeholderTextColor="#a7a1b3"
                style={styles.input}
                keyboardType="numeric"
              />
            </View>
          </View>

          <Pressable
            style={[styles.primaryButton, (saving || deleting) && styles.buttonDisabled]}
            onPress={() => void handleSave()}
            disabled={saving || deleting}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="save-outline" size={18} color="#fff" />
                <Text style={styles.primaryButtonText}>Guardar cambios</Text>
              </>
            )}
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Acciones de cuenta</Text>
        <View style={styles.actionsCard}>
          <Pressable
            style={[styles.secondaryButton, (deleting || saving) && styles.buttonDisabled]}
            onPress={signOut}
            disabled={deleting || saving}
          >
            <Ionicons name="log-out-outline" size={18} color="#e07a5f" />
            <Text style={styles.secondaryButtonText}>Cerrar sesión</Text>
          </Pressable>

          <Pressable
            style={[styles.dangerButton, (deleting || saving) && styles.buttonDisabled]}
            onPress={() => setConfirmingDelete(true)}
            disabled={deleting || saving}
          >
            {deleting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={18} color="#fff" />
                <Text style={styles.dangerButtonText}>Eliminar establecimiento</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={confirmingDelete}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!deleting) {
            setConfirmingDelete(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="warning-outline" size={24} color="#b42318" />
            </View>

            <Text style={styles.modalTitle}>Confirmar eliminación</Text>
            <Text style={styles.modalText}>
              Esta acción borrará el perfil bookdrop y su bookspot asociado. No se puede deshacer.
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.cancelButton, deleting && styles.buttonDisabled]}
                onPress={() => setConfirmingDelete(false)}
                disabled={deleting}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>

              <Pressable
                style={[styles.dangerButton, deleting && styles.buttonDisabled]}
                onPress={() => void handleDelete()}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={18} color="#fff" />
                    <Text style={styles.dangerButtonText}>Confirmar eliminación</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function FieldLabel({ label }: { label: string }) {
  return <Text style={styles.fieldLabel}>{label}</Text>;
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoCard}>
      <Ionicons name={icon} size={18} color="#e07a5f" />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fdfbf7",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#8B7355",
    fontSize: 14,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  heroCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f1e7df",
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  heroTextBlock: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#3d405b",
  },
  heroSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#7b768f",
  },
  heroDescription: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    color: "#4b5563",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  errorCard: {
    marginTop: 12,
    backgroundColor: "#fdeaea",
    borderColor: "#f6c9c9",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  errorText: {
    color: "#9f1d1d",
    fontSize: 13,
    flex: 1,
  },
  successCard: {
    marginTop: 12,
    backgroundColor: "#e8f7ef",
    borderColor: "#ccebd8",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  successText: {
    color: "#1f8f5f",
    fontSize: 13,
    flex: 1,
  },
  sectionTitle: {
    marginTop: 18,
    marginBottom: 10,
    fontSize: 16,
    fontWeight: "700",
    color: "#3d405b",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  infoCard: {
    width: "48%",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#efe6de",
    padding: 12,
  },
  infoLabel: {
    marginTop: 8,
    fontSize: 12,
    color: "#7a748b",
  },
  infoValue: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "600",
    color: "#2f2d3a",
  },
  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#efe6de",
    padding: 14,
  },
  fieldLabel: {
    marginBottom: 6,
    fontSize: 13,
    fontWeight: "600",
    color: "#4b5563",
  },
  input: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e8dfd7",
    backgroundColor: "#fffdfa",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    color: "#2f2d3a",
  },
  multilineInput: {
    minHeight: 88,
    textAlignVertical: "top",
  },
  coordinatesRow: {
    flexDirection: "row",
    gap: 10,
  },
  coordinateColumn: {
    flex: 1,
  },
  actionsCard: {
    gap: 10,
    marginBottom: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(33, 24, 18, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fffdf9",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#f1ddd5",
  },
  modalIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fdeaea",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#8a1c13",
    textAlign: "center",
  },
  modalText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: "#7a4350",
    textAlign: "center",
  },
  modalActions: {
    marginTop: 18,
    gap: 10,
  },
  primaryButton: {
    marginTop: 4,
    minHeight: 48,
    backgroundColor: "#e07a5f",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    minHeight: 48,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e07a5f",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryButtonText: {
    color: "#e07a5f",
    fontSize: 15,
    fontWeight: "700",
  },
  cancelButton: {
    minHeight: 44,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d8c9c1",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    color: "#6a6175",
    fontSize: 14,
    fontWeight: "700",
  },
  dangerButton: {
    minHeight: 48,
    backgroundColor: "#b42318",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dangerButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
