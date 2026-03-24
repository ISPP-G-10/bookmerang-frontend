import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Camera, CameraView, type CameraType } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiRequest } from "../lib/api";
import { authService } from "../lib/authService";
import {
  getStoredAuthSession,
  updateStoredAuthUser,
} from "../lib/authSession";
import supabase from "../lib/supabase";

const PROFILE_STORAGE_BUCKET =
  process.env.EXPO_PUBLIC_PROFILE_IMAGES_BUCKET ??
  process.env.EXPO_PUBLIC_BOOK_IMAGES_BUCKET ??
  "images";

const resolveFileExtension = (asset: ImagePicker.ImagePickerAsset): string => {
  const fromName = asset.fileName?.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName;

  const fromMime = asset.mimeType?.split("/").pop()?.toLowerCase();
  if (fromMime && /^[a-z0-9]+$/.test(fromMime)) return fromMime;

  return "jpg";
};

const isRemoteAvatarUrl = (value: string | null | undefined): value is string =>
  Boolean(value && /^https?:\/\//i.test(value));

const normalizeAvatarValue = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const extractStoragePathFromPublicUrl = (publicUrl: string): string | null => {
  try {
    const url = new URL(publicUrl);
    const marker = `/storage/v1/object/public/${PROFILE_STORAGE_BUCKET}/`;
    const markerIndex = url.pathname.indexOf(marker);

    if (markerIndex === -1) return null;

    return decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
};

const toImageDataUrl = (value: string, mimeType?: string): string => {
  const trimmed = value.trim();
  if (/^data:image\/[a-z0-9.+-]+;base64,/i.test(trimmed)) {
    return trimmed;
  }

  return `data:${mimeType ?? "image/jpeg"};base64,${trimmed}`;
};

const readBlobAsDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error("No se pudo leer la imagen seleccionada."));
    };

    reader.onloadend = () => {
      if (typeof reader.result === "string" && reader.result.length > 0) {
        resolve(reader.result);
        return;
      }

      reject(new Error("No se pudo convertir la imagen seleccionada."));
    };

    reader.readAsDataURL(blob);
  });

// ── Switch custom ────────────────────────────────────────────────────
function CustomSwitch({
  value,
  onValueChange,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <TouchableOpacity
      onPress={() => onValueChange(!value)}
      activeOpacity={0.8}
      style={{
        width: 48,
        height: 28,
        borderRadius: 14,
        backgroundColor: value ? "#E2725B" : "#D1C4B8",
        justifyContent: "center",
        paddingHorizontal: 3,
      }}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: "#ffffff",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.2,
          shadowRadius: 2,
          elevation: 2,
          transform: [{ translateX: value ? 20 : 0 }],
        }}
      />
    </TouchableOpacity>
  );
}

// ── Input de contraseña con toggle ───────────────────────────────────
function PasswordInput({
  value,
  onChange,
  placeholder,
  show,
  onToggle,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fdfbf7",
        borderRadius: 12,
        marginBottom: 4,
        paddingRight: 14,
      }}
    >
      <TextInput
        style={{ flex: 1, padding: 14, fontSize: 14, color: "#3e2723" }}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#c4a882"
        secureTextEntry={!show}
      />
      <TouchableOpacity onPress={onToggle}>
        <FontAwesome
          name={show ? "eye-slash" : "eye"}
          size={16}
          color="#8B7355"
        />
      </TouchableOpacity>
    </View>
  );
}

// ── Modal flotante genérico ──────────────────────────────────────────
function FloatingModal({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} animationType="fade" transparent>
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.55)",
          justifyContent: "center",
          alignItems: "center",
          padding: 16,
        }}
        onPress={onClose}
      >
        <Pressable
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 24,
            width: "100%",
            maxHeight: "85%",
            overflow: "hidden",
          }}
          onPress={(event) => {
            event.stopPropagation();
          }}
        >
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Sub-modal: Seleccionar foto ──────────────────────────────────────
function PhotoPickerModal({
  visible,
  onClose,
  onPickGallery,
  onPickCamera,
  onRemovePhoto,
  hasPhoto,
  loading,
}: {
  visible: boolean;
  onClose: () => void;
  onPickGallery: () => void;
  onPickCamera: () => void;
  onRemovePhoto?: () => void;
  hasPhoto?: boolean;
  loading: boolean;
}) {
  return (
    <FloatingModal visible={visible} onClose={onClose}>
      <View style={{ padding: 24 }}>
        <Text
          style={{
            fontSize: 20,
            fontWeight: "900",
            color: "#3e2723",
            marginBottom: 20,
          }}
        >
          Seleccionar foto
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: "#fdfbf7",
            borderRadius: 16,
            padding: 16,
            marginBottom: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
          onPress={onPickGallery}
          disabled={loading}
        >
          <View>
            <Text style={{ fontSize: 14, fontWeight: "900", color: "#3e2723" }}>
              Galería
            </Text>
            <Text style={{ fontSize: 12, color: "#8B7355", marginTop: 2 }}>
              Selecciona una foto de tu galería
            </Text>
          </View>
          <FontAwesome name="image" size={20} color="#e07a5f" />
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            backgroundColor: "#fdfbf7",
            borderRadius: 16,
            padding: 16,
            marginBottom: 20,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
          onPress={onPickCamera}
          disabled={loading}
        >
          <View>
            <Text style={{ fontSize: 14, fontWeight: "900", color: "#3e2723" }}>
              Cámara
            </Text>
            <Text style={{ fontSize: 12, color: "#8B7355", marginTop: 2 }}>
              Toma una foto con tu cámara
            </Text>
          </View>
          <FontAwesome name="camera" size={20} color="#e07a5f" />
        </TouchableOpacity>
        {hasPhoto ? (
          <TouchableOpacity
            style={{
              backgroundColor: "#fff1ed",
              borderRadius: 16,
              padding: 16,
              marginBottom: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
            onPress={onRemovePhoto}
            disabled={loading}
          >
            <View>
              <Text style={{ fontSize: 14, fontWeight: "900", color: "#b64b34" }}>
                Borrar foto
              </Text>
              <Text style={{ fontSize: 12, color: "#8B7355", marginTop: 2 }}>
                Quita tu foto actual del perfil
              </Text>
            </View>
            <FontAwesome name="trash" size={20} color="#b64b34" />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={{
            backgroundColor: "#fdfbf7",
            borderRadius: 999,
            padding: 14,
            alignItems: "center",
          }}
          onPress={onClose}
          disabled={loading}
        >
          <Text style={{ fontSize: 15, fontWeight: "900", color: "#8B7355" }}>
            Cancelar
          </Text>
        </TouchableOpacity>
      </View>
    </FloatingModal>
  );
}

// ── Modal: Editar Perfil ─────────────────────────────────────────────
function EditProfileModal({
  visible,
  onClose,
  profile,
  onSave,
  onSelectFromGallery,
  onTakePhoto,
  onRemovePhoto,
  photoLoading,
}: {
  visible: boolean;
  onClose: () => void;
  profile: any;
  onSave: (data: {
    name: string;
    username: string;
    avatar?: string | null;
  }) => Promise<void>;
  onSelectFromGallery: () => Promise<void>;
  onTakePhoto: () => Promise<void>;
  onRemovePhoto: () => void;
  photoLoading: boolean;
}) {
  const [name, setName] = React.useState(profile?.name ?? "");
  const [username, setUsername] = React.useState(profile?.username ?? "");
  const [avatar, setAvatar] = React.useState<string | null>(profile?.avatar ?? null);
  const [photoModal, setPhotoModal] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (visible) {
      setName(profile?.name ?? "");
      setUsername(profile?.username ?? "");
    }
  }, [visible]);

  React.useEffect(() => {
    if (!visible) return;

    if (!name && profile?.name) {
      setName(profile.name);
    }

    if (!username && profile?.username) {
      setUsername(profile.username);
    }
  }, [visible, profile?.name, profile?.username, name, username]);

  React.useEffect(() => {
    if (visible) {
      setAvatar(profile?.avatar ?? null);
    }
  }, [visible, profile?.avatar]);

  const inputStyle = {
    backgroundColor: "#fdfbf7",
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: "#3e2723",
    marginBottom: 4,
  };
  const labelStyle = {
    fontSize: 14,
    fontWeight: "900" as const,
    color: "#3e2723",
    marginBottom: 6,
    marginTop: 12,
  };

  return (
    <>
      <FloatingModal visible={visible} onClose={onClose}>
        <ScrollView
          contentContainerStyle={{ padding: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: "900",
              color: "#3e2723",
              marginBottom: 20,
            }}
          >
            Editar Perfil
          </Text>

          <View style={{ alignItems: "center", marginBottom: 8 }}>
            <TouchableOpacity
              disabled={photoLoading}
              onPress={() => setPhotoModal(true)}
              style={{ position: "relative" }}
            >
              <View
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 48,
                  backgroundColor: "#e07a5f",
                  overflow: "hidden",
                }}
              >
                {avatar ? (
                  <Image
                    source={{ uri: avatar }}
                    style={{ width: 96, height: 96 }}
                   />
                ) : (
                  <View
                    style={{
                      flex: 1,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 40 }}>👤</Text>
                  </View>
                )}
              </View>
              <View
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: "#e07a5f",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FontAwesome name="camera" size={14} color="#ffffff" />
              </View>
            </TouchableOpacity>
            <Text style={{ fontSize: 12, color: "#8B7355", marginTop: 8 }}>
              Toca para cambiar foto
            </Text>
          </View>

          <Text style={labelStyle}>Nombre</Text>
          <TextInput
            style={inputStyle}
            value={name}
            onChangeText={setName}
            placeholder="Tu nombre"
            placeholderTextColor="#c4a882"
          />
          <Text style={labelStyle}>Nombre de usuario</Text>
          <TextInput
            style={inputStyle}
            value={username}
            onChangeText={setUsername}
            placeholder="@usuario"
            placeholderTextColor="#c4a882"
            autoCapitalize="none"
          />
          {/* Removed Biografía and Ubicación fields as requested */}

          <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
            <TouchableOpacity
              onPress={onClose}
              style={{
                flex: 1,
                backgroundColor: "#fdfbf7",
                borderRadius: 999,
                padding: 14,
                alignItems: "center",
              }}
            >
              <Text
                style={{ fontSize: 15, fontWeight: "900", color: "#8B7355" }}
              >
                Cancelar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={async () => {
                  const trimmedName = name.trim();
                  const trimmedUsername = username.trim();
                  if (!trimmedName || !trimmedUsername) {
                    Alert.alert("Campos obligatorios", "Introduce tu nombre y tu nombre de usuario.");
                    return;
                  }

                  setSaving(true);
                  try {
                    await onSave({
                      name: trimmedName,
                      username: trimmedUsername,
                      avatar,
                    });
                  } finally {
                    setSaving(false);
                  }
                }}
              disabled={saving}
              style={{
                flex: 1,
                backgroundColor: saving ? "#f4a896" : "#e07a5f",
                borderRadius: 999,
                padding: 14,
                alignItems: "center",
              }}
            >
              <Text
                style={{ fontSize: 15, fontWeight: "900", color: "#ffffff" }}
              >
                {saving ? "Guardando..." : "Guardar"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </FloatingModal>
      <PhotoPickerModal
        visible={photoModal}
        onClose={() => setPhotoModal(false)}
        onPickGallery={async () => {
          await onSelectFromGallery();
          setPhotoModal(false);
        }}
        onPickCamera={async () => {
          await onTakePhoto();
          setPhotoModal(false);
        }}
        onRemovePhoto={() => {
          setAvatar(null);
          onRemovePhoto();
          setPhotoModal(false);
        }}
        hasPhoto={Boolean(avatar)}
        loading={photoLoading}
      />
    </>
  );
}

// ── Modal: Cambiar Email ─────────────────────────────────────────────
function ChangeEmailModal({
  visible,
  onClose,
  currentEmail,
  onEmailChanged,
}: {
  visible: boolean;
  onClose: () => void;
  currentEmail: string;
  onEmailChanged?: (email: string) => void;
}) {
  const [newEmail, setNewEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  React.useEffect(() => {
    if (visible) {
      setNewEmail("");
      setPassword("");
      setError("");
      setSuccess(false);
      setShowPassword(false);
    }
  }, [visible]);

  const handleSave = async () => {
    const normalizedEmail = newEmail.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (!normalizedEmail) return setError("Introduce el nuevo email");
    if (!normalizedPassword) return setError("Introduce tu contraseña actual");

    setSaving(true);
    setError("");
    try {
      const updatedUser = await authService.patchEmail(normalizedEmail, normalizedPassword);
      onEmailChanged?.(updatedUser?.email ?? normalizedEmail);
      setSuccess(true);
    } catch (e: any) {
      console.error("[ChangeEmailModal.handleSave]", e);
      setError(e?.message ?? "Error al cambiar el email");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    backgroundColor: "#fdfbf7",
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: "#3e2723",
    marginBottom: 4,
  };
  const labelStyle = {
    fontSize: 14,
    fontWeight: "900" as const,
    color: "#3e2723",
    marginBottom: 6,
    marginTop: 12,
  };

  return (
    /**TODO: mostrar el email actual real, no el nuevo 
        <Text style={{ fontSize: 13, color: "#8B7355", marginBottom: 16 }}>
          Email actual: {newEmail}
        </Text>*/

    <FloatingModal visible={visible} onClose={onClose}>
      <View style={{ padding: 24 }}>
        <Text
          style={{
            fontSize: 20,
            fontWeight: "900",
            color: "#3e2723",
            marginBottom: 4,
          }}
        >
          Cambiar Email
        </Text>

        {success ? (
          <View style={{ alignItems: "center", paddingVertical: 24 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: "#FFF0EB",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <FontAwesome name="check" size={28} color="#e07a5f" />
            </View>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "900",
                color: "#3e2723",
                marginBottom: 8,
              }}
            >
              ¡Email actualizado!
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: "#8B7355",
                textAlign: "center",
                marginBottom: 24,
              }}
            >
              Tu correo se ha actualizado correctamente a {newEmail}.
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={{
                backgroundColor: "#e07a5f",
                borderRadius: 999,
                padding: 14,
                paddingHorizontal: 32,
              }}
            >
              <Text
                style={{ fontSize: 15, fontWeight: "900", color: "#ffffff" }}
              >
                Cerrar
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={labelStyle}>Nuevo email</Text>
            <TextInput
              style={inputStyle}
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="nuevo@email.com"
              placeholderTextColor="#c4a882"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={labelStyle}>Contraseña actual</Text>
            <PasswordInput
              value={password}
              onChange={setPassword}
              placeholder="Tu contraseña"
              show={showPassword}
              onToggle={() => setShowPassword(!showPassword)}
            />
            {error ? (
              <View
                style={{
                  backgroundColor: "#fff0f0",
                  borderWidth: 1,
                  borderColor: "#fca5a5",
                  borderRadius: 8,
                  padding: 12,
                  marginTop: 8,
                }}
              >
                <Text style={{ color: "#dc2626", fontSize: 13 }}>{error}</Text>
              </View>
            ) : null}
            <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
              <TouchableOpacity
                onPress={onClose}
                style={{
                  flex: 1,
                  backgroundColor: "#fdfbf7",
                  borderRadius: 999,
                  padding: 14,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ fontSize: 15, fontWeight: "900", color: "#8B7355" }}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                style={{
                  flex: 1,
                  backgroundColor: saving ? "#f4a896" : "#e07a5f",
                  borderRadius: 999,
                  padding: 14,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ fontSize: 15, fontWeight: "900", color: "#ffffff" }}
                >
                  {saving ? "Guardando..." : "Guardar"}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </FloatingModal>
  );
}

// ── Modal: Cambiar Contraseña ────────────────────────────────────────
function ChangePasswordModal({
  visible,
  onClose,
  currentEmail,
}: {
  visible: boolean;
  onClose: () => void;
  currentEmail: string;
}) {
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState(false);
  const [showCurrent, setShowCurrent] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  React.useEffect(() => {
    if (visible) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError("");
      setSuccess(false);
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
    }
  }, [visible]);

  const getStrength = (pwd: string) => {
    if (pwd.length < 8) return 1;
    if (
      pwd.length >= 12 &&
      /[A-Z]/.test(pwd) &&
      /[0-9]/.test(pwd) &&
      /[^a-zA-Z0-9]/.test(pwd)
    )
      return 4;
    if (pwd.length >= 10 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) return 3;
    return 2;
  };
  const strengthLabel = ["", "Muy corta", "Aceptable", "Fuerte", "Muy fuerte"];
  const strengthColors = ["", "#dc2626", "#f97316", "#f59e0b", "#22c55e"];

  const handleSave = async () => {
    if (!currentPassword) return setError("Introduce tu contraseña actual");
    if (newPassword.length < 8)
      return setError("La nueva contraseña debe tener al menos 8 caracteres");
    if (newPassword !== confirmPassword)
      return setError("Las contraseñas no coinciden");
    setSaving(true);
    setError("");
    try {
      await authService.patchPassword(currentPassword, newPassword);
      setSuccess(true);
    } catch (e: any) {
      setError(e?.message ?? "Error al cambiar la contraseña");
    } finally {
      setSaving(false);
    }
  };

  const labelStyle = {
    fontSize: 14,
    fontWeight: "900" as const,
    color: "#3e2723",
    marginBottom: 6,
    marginTop: 12,
  };

  return (
    <FloatingModal visible={visible} onClose={onClose}>
      <View style={{ padding: 24 }}>
        <Text
          style={{
            fontSize: 20,
            fontWeight: "900",
            color: "#3e2723",
            marginBottom: 16,
          }}
        >
          Cambiar Contraseña
        </Text>

        {success ? (
          <View style={{ alignItems: "center", paddingVertical: 24 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: "#FFF0EB",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <FontAwesome name="check" size={28} color="#e07a5f" />
            </View>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "900",
                color: "#3e2723",
                marginBottom: 8,
              }}
            >
              ¡Contraseña actualizada!
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: "#8B7355",
                textAlign: "center",
                marginBottom: 24,
              }}
            >
              Tu contraseña se ha cambiado correctamente.
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={{
                backgroundColor: "#e07a5f",
                borderRadius: 999,
                padding: 14,
                paddingHorizontal: 32,
              }}
            >
              <Text
                style={{ fontSize: 15, fontWeight: "900", color: "#ffffff" }}
              >
                Cerrar
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={labelStyle}>Contraseña actual</Text>
            <PasswordInput
              value={currentPassword}
              onChange={setCurrentPassword}
              placeholder="Tu contraseña actual"
              show={showCurrent}
              onToggle={() => setShowCurrent(!showCurrent)}
            />
            <Text style={labelStyle}>Nueva contraseña</Text>
            <PasswordInput
              value={newPassword}
              onChange={setNewPassword}
              placeholder="Mínimo 8 caracteres"
              show={showNew}
              onToggle={() => setShowNew(!showNew)}
            />
            <Text style={labelStyle}>Confirmar contraseña</Text>
            <PasswordInput
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Repite la nueva contraseña"
              show={showConfirm}
              onToggle={() => setShowConfirm(!showConfirm)}
            />

            {newPassword.length > 0 && (
              <View style={{ marginTop: 8 }}>
                <View style={{ flexDirection: "row", gap: 4, marginBottom: 4 }}>
                  {[1, 2, 3, 4].map((i) => {
                    const strength = getStrength(newPassword);
                    return (
                      <View
                        key={i}
                        style={{
                          flex: 1,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor:
                            i <= strength
                              ? strengthColors[strength]
                              : "#F3E9E0",
                        }}
                      />
                    );
                  })}
                </View>
                <Text style={{ fontSize: 11, color: "#8B7355" }}>
                  {strengthLabel[getStrength(newPassword)]}
                </Text>
              </View>
            )}

            {error ? (
              <View
                style={{
                  backgroundColor: "#fff0f0",
                  borderWidth: 1,
                  borderColor: "#fca5a5",
                  borderRadius: 8,
                  padding: 12,
                  marginTop: 8,
                }}
              >
                <Text style={{ color: "#dc2626", fontSize: 13 }}>{error}</Text>
              </View>
            ) : null}

            <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
              <TouchableOpacity
                onPress={onClose}
                style={{
                  flex: 1,
                  backgroundColor: "#fdfbf7",
                  borderRadius: 999,
                  padding: 14,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ fontSize: 15, fontWeight: "900", color: "#8B7355" }}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                style={{
                  flex: 1,
                  backgroundColor: saving ? "#f4a896" : "#e07a5f",
                  borderRadius: 999,
                  padding: 14,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ fontSize: 15, fontWeight: "900", color: "#ffffff" }}
                >
                  {saving ? "Guardando..." : "Guardar"}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </FloatingModal>
  );
}

// ── Fila de ajuste ───────────────────────────────────────────────────
function SettingsRow({
  icon,
  label,
  subtitle,
  onPress,
  isLast = false,
  danger = false,
  right,
}: {
  icon: string;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  isLast?: boolean;
  danger?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: "#F3E9E0",
        gap: 12,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: "#FFF0EB",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <FontAwesome
          name={icon as any}
          size={18}
          color={danger ? "#dc2626" : "#e07a5f"}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "900",
            color: danger ? "#dc2626" : "#3e2723",
          }}
        >
          {label}
        </Text>
        {subtitle && (
          <Text style={{ fontSize: 12, color: "#8B7355", marginTop: 1 }}>
            {subtitle}
          </Text>
        )}
      </View>
      {right ??
        (onPress && !danger && (
          <FontAwesome name="chevron-right" size={14} color="#8B7355" />
        ))}
    </TouchableOpacity>
  );
}

// ── Pantalla principal Ajustes ───────────────────────────────────────
export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [editProfileOpen, setEditProfileOpen] = React.useState(false);
  const [changeEmailOpen, setChangeEmailOpen] = React.useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = React.useState(false);
  const [languageOpen, setLanguageOpen] = React.useState(false);
  const [profile, setProfile] = React.useState<any>(null);
  const [currentEmail, setCurrentEmail] = React.useState("");
  const [pushNotif, setPushNotif] = React.useState(true);
  const [selectedLanguage, setSelectedLanguage] = React.useState("es");
  const [toast, setToast] = React.useState("");
  const [photoLoading, setPhotoLoading] = React.useState(false);
  const [persistedAvatar, setPersistedAvatar] = React.useState<string | null>(null);
  const [showCameraModal, setShowCameraModal] = React.useState(false);
  const [cameraFacing, setCameraFacing] = React.useState<CameraType>("back");
  const [capturingPhoto, setCapturingPhoto] = React.useState(false);
  const [wasEditingProfile, setWasEditingProfile] = React.useState(false);
  const cameraRef = React.useRef<CameraView | null>(null);
  const hasUnsavedProfileDraft = React.useRef(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const handleSelectLanguage = (code: string) => {
    setSelectedLanguage(code);
    setLanguageOpen(false);
    showToast("Idioma actualizado correctamente");
  };

  const normalizeProfile = (
    source: any,
    fallbackUser?: {
      email?: string | null;
      username?: string | null;
      name?: string | null;
      profilePhoto?: string | null;
    } | null,
  ) => {
    const avatar =
      source?.avatar ??
      source?.profilePhoto ??
      fallbackUser?.profilePhoto ??
      null;

    return {
      ...source,
      email: source?.email ?? fallbackUser?.email ?? "",
      name: source?.name ?? fallbackUser?.name ?? "",
      username: source?.username ?? fallbackUser?.username ?? "",
      avatar: avatar || null,
    };
  };

  const removeStoredProfilePhoto = async (avatarUrl: string | null | undefined) => {
    if (!isRemoteAvatarUrl(avatarUrl)) return;

    const storagePath = extractStoragePathFromPublicUrl(avatarUrl);
    if (!storagePath) return;

    const { error } = await supabase.storage
      .from(PROFILE_STORAGE_BUCKET)
      .remove([storagePath]);

    if (error) {
      console.warn("No se pudo eliminar la foto previa del storage:", error.message);
    }
  };

  const loadProfile = React.useCallback(async () => {
    const session = await getStoredAuthSession();
    const user = session?.user;

    if (!user) return;

    setCurrentEmail(user.email ?? "");

    try {
      const res = await apiRequest("/Auth/perfil", { method: "GET" });
      if (res.ok) {
        const serverProfile = await res.json();
        const normalized = normalizeProfile(serverProfile, user);
        setPersistedAvatar(normalized.avatar);
        setProfile((current: any) => {
          if (!hasUnsavedProfileDraft.current) return normalized;

          const currentAvatar =
            current && Object.prototype.hasOwnProperty.call(current, "avatar")
              ? current.avatar
              : undefined;

          return {
            ...normalized,
            avatar: currentAvatar !== undefined ? currentAvatar : normalized.avatar,
          };
        });
        return;
      }
    } catch (error) {
      console.error("No se pudo cargar el perfil desde el backend:", error);
    }

    const normalized = normalizeProfile({}, user);
    setPersistedAvatar(normalized.avatar);
    setProfile((current: any) => {
      if (!hasUnsavedProfileDraft.current) return normalized;

      const currentAvatar =
        current && Object.prototype.hasOwnProperty.call(current, "avatar")
          ? current.avatar
          : undefined;

      return {
        ...normalized,
        avatar: currentAvatar !== undefined ? currentAvatar : normalized.avatar,
      };
    });
  }, []);

  const handleCloseEditProfile = React.useCallback(() => {
    setEditProfileOpen(false);

    if (hasUnsavedProfileDraft.current) {
      hasUnsavedProfileDraft.current = false;
      void loadProfile();
    }
  }, [loadProfile]);

  const uploadProfileBinary = async (
    fileData: ArrayBuffer,
    extension: string,
    mimeType: string,
  ): Promise<string> => {
    void extension;

    return readBlobAsDataUrl(
      new Blob([fileData], {
        type: mimeType || "image/jpeg",
      }),
    );
  };

  const uploadProfilePhoto = async (
    asset: ImagePicker.ImagePickerAsset,
  ): Promise<string> => {
    if (typeof asset.base64 === "string" && asset.base64.trim().length > 0) {
      return toImageDataUrl(asset.base64, asset.mimeType);
    }

    if (typeof asset.uri === "string" && /^data:image\//i.test(asset.uri)) {
      return asset.uri;
    }

    const extension = resolveFileExtension(asset);
    const localFile = await fetch(asset.uri);
    if (!localFile.ok) {
      throw new Error("No se pudo leer la imagen seleccionada.");
    }

    const fileData = await localFile.arrayBuffer();

    return uploadProfileBinary(
      fileData,
      extension,
      asset.mimeType ?? "image/jpeg",
    );
  };

  const pickPhotoFromWebCamera = async (): Promise<File | null> => {
    if (typeof document === "undefined") return null;

    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.setAttribute("capture", "environment");

      input.onchange = () => {
        resolve(input.files?.[0] ?? null);
      };

      input.oncancel = () => {
        resolve(null);
      };

      input.click();
    });
  };

  const applySelectedProfilePhoto = async (
    result: ImagePicker.ImagePickerResult,
  ) => {
    if (result.canceled || result.assets.length === 0) return;

    setPhotoLoading(true);
    try {
      const publicUrl = await uploadProfilePhoto(result.assets[0]);
      hasUnsavedProfileDraft.current = true;
      setProfile((current: any) => ({ ...(current ?? {}), avatar: publicUrl }));
      showToast("Foto de perfil actualizada");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "No se pudo actualizar la foto");
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleSelectFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permiso requerido", "Necesitas permitir acceso a la galería.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsMultipleSelection: false,
      base64: true,
      quality: 0.8,
    });

    await applySelectedProfilePhoto(result);
  };

  const handleTakePhoto = async () => {
    let permission;

    try {
      permission = await Camera.requestCameraPermissionsAsync();
    } catch {
      permission = null;
    }

    if (!permission?.granted) {
      // En web (y otros casos) puede fallar pedir permiso; caer a selector de archivos.
      const file = await pickPhotoFromWebCamera();
      if (!file) return;

      setPhotoLoading(true);
      try {
        const extension =
          file.name?.split(".").pop()?.toLowerCase() ||
          file.type?.split("/").pop()?.toLowerCase() ||
          "jpg";

        const publicUrl = await uploadProfileBinary(
          await file.arrayBuffer(),
          extension,
          file.type || "image/jpeg",
        );

        hasUnsavedProfileDraft.current = true;
        setProfile((current: any) => ({ ...(current ?? {}), avatar: publicUrl }));
        showToast("Foto de perfil actualizada");
      } catch (e: any) {
        Alert.alert("Error", e?.message ?? "No se pudo actualizar la foto");
      } finally {
        setPhotoLoading(false);
      }
      return;
    }

    // Si el modal de edición está abierto, ciérralo antes de abrir la cámara para evitar que quede por delante.
    if (editProfileOpen) {
      setWasEditingProfile(true);
      setEditProfileOpen(false);
    }

    setShowCameraModal(true);
  };

  const closeCameraModal = () => {
    if (capturingPhoto) return;
    setShowCameraModal(false);
    if (wasEditingProfile) {
      setWasEditingProfile(false);
      setEditProfileOpen(true);
    }
  };

  const toggleCameraFacing = () => {
    setCameraFacing((current) => (current === "back" ? "front" : "back"));
  };

  const handleCapturePhoto = async () => {
    if (!cameraRef.current || capturingPhoto) return;

    setCapturingPhoto(true);
    setPhotoLoading(true);

    try {
      const captured = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });
      if (captured?.uri) {
         const publicUrl = await uploadProfilePhoto({
           ...captured,
           mimeType: "image/jpeg",
         } as ImagePicker.ImagePickerAsset);
        hasUnsavedProfileDraft.current = true;
        setProfile((current: any) => ({ ...(current ?? {}), avatar: publicUrl }));
        showToast("Foto de perfil actualizada");
        closeCameraModal();
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "No se pudo tomar la foto");
    } finally {
      setCapturingPhoto(false);
      setPhotoLoading(false);
    }
  };

  React.useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useFocusEffect(
    React.useCallback(() => {
      void loadProfile();
    }, [loadProfile]),
  );

  const handleSaveProfile = async (data: {
    name: string;
    username: string;
    avatar?: string | null;
  }) => {
    try {
      const nextAvatar = normalizeAvatarValue(data.avatar);
      const nextName = data.name.trim();
      const nextUsername = data.username.trim();

      if (!nextName || !nextUsername) {
        Alert.alert("Campos obligatorios", "Introduce tu nombre y tu nombre de usuario.");
        return;
      }

      let savedProfile: any = null;

      // First: update backend app profile record
      try {
        const patchRes = await apiRequest("/Auth/perfil", {
          method: "PATCH",
          body: JSON.stringify({
            username: nextUsername,
            name: nextName,
            profilePhoto: nextAvatar === null ? "" : nextAvatar,
          }),
        });
        if (!patchRes.ok) {
          const txt = await patchRes.text().catch(() => "");
          throw new Error(txt || "Error actualizando perfil en el servidor");
        }
        savedProfile = await patchRes.json().catch(() => null);
      } catch (err: any) {
        console.error("Backend PATCH error:", err);
        Alert.alert("Error", err?.message || "No se pudo actualizar el perfil en el servidor");
        return;
      }

      // Update local state so Settings shows new values
      const out = normalizeProfile(
        {
          ...(profile ?? {}),
          ...(savedProfile ?? {}),
          name: nextName,
          username: nextUsername,
          avatar: nextAvatar,
          profilePhoto: nextAvatar ?? "",
        },
        {
          email: currentEmail,
          name: nextName,
          username: nextUsername,
          profilePhoto: nextAvatar ?? "",
        },
      );

      await updateStoredAuthUser({
        name: nextName,
        username: nextUsername,
        profilePhoto: nextAvatar ?? "",
      });

      if (persistedAvatar && persistedAvatar !== nextAvatar) {
        await removeStoredProfilePhoto(persistedAvatar);
      }

      hasUnsavedProfileDraft.current = false;
      setPersistedAvatar(nextAvatar);
      setProfile(out);
      setEditProfileOpen(false);
      showToast("Perfil actualizado correctamente");

      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/profile" as any);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSignOut = async () => {
    await authService.signOut();
    router.replace("/login" as any);
  };

  const sectionLabel = (text: string) => (
    <Text
      style={{
        fontSize: 11,
        fontWeight: "900",
        letterSpacing: 1.5,
        color: "#8B7355",
        marginHorizontal: 24,
        marginTop: 24,
        marginBottom: 8,
        textTransform: "uppercase",
      }}
    >
      {text}
    </Text>
  );

  const card = {
    marginHorizontal: 20,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F3E9E0",
    overflow: "hidden" as const,
  };

  const handleDeleteAccount = async () => {
    console.log('handleDeleteAccount invoked');

    // On web, Alert.alert with multiple buttons doesn't behave like native alerts.
    // Use window.confirm as a fallback so the user actually sees a confirmation dialog.
    if (Platform.OS === "web") {
      const ok = window.confirm(
        "¿Seguro que quieres eliminar tu cuenta? Esta acción no se puede deshacer."
      );
      if (!ok) return;

      try {
        const res = await apiRequest("/Auth/perfil", { method: "DELETE" });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || "Error borrando la cuenta en el servidor");
        }

        await authService.signOut();
        window.alert("Cuenta eliminada: Tu cuenta ha sido eliminada correctamente.");
      } catch (e: any) {
        console.error("Error borrando cuenta en backend:", e);
        window.alert(e?.message ?? "No se pudo eliminar la cuenta en el servidor.");
      }
      return;
    }

    // Native mobile path: keep using Alert.alert with buttons
    Alert.alert(
      "Eliminar cuenta",
      "¿Seguro que quieres eliminar tu cuenta? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            console.log('Eliminar: confirm pressed');
            try {
              // Llama al backend para borrar el baseUser; el backend debe encargarse
              // de eliminar el usuario en Supabase de forma administrativa.
              try {
                const res = await apiRequest("/Auth/perfil", { method: "DELETE" });
                if (!res.ok) {
                  const text = await res.text().catch(() => "");
                  throw new Error(text || "Error borrando la cuenta en el servidor");
                }

                // Si el backend respondió OK, cierra sesión y notifica.
                await authService.signOut();
                Alert.alert("Cuenta eliminada", "Tu cuenta ha sido eliminada correctamente.");
              } catch (e: any) {
                console.error("Error borrando cuenta en backend:", e);
                Alert.alert("Error", e?.message ?? "No se pudo eliminar la cuenta en el servidor.");
              }
            } catch (error) {
              console.error(error);
              Alert.alert("Error", "No se pudo eliminar la cuenta.");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fdfbf7" }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Toast ── */}
      {toast ? (
        <View
          style={{
            position: "absolute",
            top: 56,
            left: 16,
            right: 16,
            zIndex: 999,
            backgroundColor: "#f0fdf4",
            borderRadius: 14,
            padding: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: "#22c55e",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FontAwesome name="check" size={12} color="#ffffff" />
          </View>
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#166534" }}>
            {toast}
          </Text>
        </View>
      ) : null}

      {/* ── Header inline ── */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingTop: insets.top + 8,
          paddingBottom: 16,
          backgroundColor: "#fdfbf7",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: "#e07a5f",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <FontAwesome name="arrow-left" size={18} color="#fdfbf7" />
        </TouchableOpacity>
        <Text style={{ fontSize: 22, fontWeight: "900", color: "#3e2723" }}>
          Ajustes
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        {sectionLabel("Cuenta")}
        <View style={card}>
          <SettingsRow
            icon="user"
            label="Editar perfil"
            subtitle="Nombre, foto y biografía"
            onPress={() => setEditProfileOpen(true)}
          />
          <SettingsRow
            icon="envelope"
            label="Email"
            subtitle={currentEmail || "usuario@example.com"}
            onPress={() => setChangeEmailOpen(true)}
          />
          <SettingsRow
            icon="lock"
            label="Cambiar contraseña"
            subtitle="Actualiza tu contraseña"
            onPress={() => setChangePasswordOpen(true)}
            isLast
          />
        </View>

        {sectionLabel("Notificaciones")}
        <View style={card}>
          <SettingsRow
            icon="bell"
            label="Notificaciones push"
            subtitle="Recibe alertas en tu dispositivo"
            right={
              <CustomSwitch value={pushNotif} onValueChange={setPushNotif} />
            }
          />
        </View>

        {sectionLabel("Acciones")}
        <View style={card}>
          <SettingsRow
            icon="sign-out"
            label="Cerrar sesión"
            onPress={handleSignOut}
            danger
          />
          <SettingsRow
            icon="trash"
            label="Eliminar cuenta"
            onPress={() => {
              handleDeleteAccount();
            }}
            isLast
            danger
          />
        </View>

        <View style={{ alignItems: "center", marginTop: 32 }}>
          <Text style={{ fontSize: 12, color: "#8B7355" }}>
            Bookmerang v1.0.0
          </Text>
          <Text style={{ fontSize: 12, color: "#8B7355", marginTop: 4 }}>
            © 2026 Bookmerang. Todos los derechos reservados.
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={showCameraModal}
        animationType="slide"
        onRequestClose={closeCameraModal}
      >
        <View style={{ flex: 1, backgroundColor: "#121212" }}>
          <CameraView
            ref={cameraRef}
            style={{ flex: 1 }}
            facing={cameraFacing}
          />

          <View
            style={{
              position: "absolute",
              top: 48,
              left: 16,
              right: 16,
              flexDirection: "row",
              justifyContent: "flex-end",
            }}
          >
            <TouchableOpacity
              style={{
                minHeight: 40,
                borderRadius: 999,
                backgroundColor: "rgba(0,0,0,0.48)",
                paddingHorizontal: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
              onPress={closeCameraModal}
            >
              <FontAwesome name="times" size={20} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "900" }}>Cerrar</Text>
            </TouchableOpacity>
          </View>

          <View
            style={{
              position: "absolute",
              left: 16,
              right: 16,
              bottom: 28,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <TouchableOpacity
              style={{
                minHeight: 52,
                borderRadius: 16,
                paddingHorizontal: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: "rgba(0,0,0,0.48)",
              }}
              onPress={toggleCameraFacing}
            >
              <FontAwesome name="refresh" size={18} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "900" }}>Girar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                minHeight: 52,
                borderRadius: 16,
                backgroundColor: "#e07a5f",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
                opacity: capturingPhoto ? 0.6 : 1,
              }}
              onPress={handleCapturePhoto}
              disabled={capturingPhoto}
            >
              {capturingPhoto ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <FontAwesome name="camera" size={20} color="#fff" />
                  <Text style={{ color: "#fff", fontWeight: "900" }}>
                    Capturar
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <EditProfileModal
        visible={editProfileOpen}
        onClose={handleCloseEditProfile}
        profile={profile}
        onSave={handleSaveProfile}
        onSelectFromGallery={handleSelectFromGallery}
        onTakePhoto={handleTakePhoto}
        onRemovePhoto={() => {
          hasUnsavedProfileDraft.current = true;
          setProfile((current: any) => ({ ...(current ?? {}), avatar: null }));
        }}
        photoLoading={photoLoading}
      />
      <ChangeEmailModal
        visible={changeEmailOpen}
        onClose={() => setChangeEmailOpen(false)}
        currentEmail={currentEmail}
        onEmailChanged={(email) => setCurrentEmail(email)}
      />
      <ChangePasswordModal
        visible={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        currentEmail={currentEmail}
      />
    </View>
  );
}
