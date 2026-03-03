import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Stack, useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import React from "react";
import {
    Image,
    Modal,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import supabase from "../lib/supabase";

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
          onPress={() => {}}
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
}: {
  visible: boolean;
  onClose: () => void;
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
          onPress={onClose}
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
          onPress={onClose}
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
        <TouchableOpacity
          style={{
            backgroundColor: "#fdfbf7",
            borderRadius: 999,
            padding: 14,
            alignItems: "center",
          }}
          onPress={onClose}
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
}: {
  visible: boolean;
  onClose: () => void;
  profile: any;
  onSave: (data: {
    name: string;
    username: string;
    bio: string;
    location: string;
  }) => void;
}) {
  const [name, setName] = React.useState(profile?.name ?? "");
  const [username, setUsername] = React.useState(profile?.username ?? "");
  const [bio, setBio] = React.useState(profile?.bio ?? "");
  const [location, setLocation] = React.useState(profile?.location ?? "");
  const [photoModal, setPhotoModal] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (visible) {
      setName(profile?.name ?? "");
      setUsername(profile?.username ?? "");
      setBio(profile?.bio ?? "");
      setLocation(profile?.location ?? "");
    }
  }, [visible, profile]);

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
                {profile?.avatar ? (
                  <Image
                    source={{ uri: profile.avatar }}
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
          <Text style={labelStyle}>Biografía</Text>
          <TextInput
            style={[inputStyle, { height: 90, textAlignVertical: "top" }]}
            value={bio}
            onChangeText={setBio}
            placeholder="Cuéntanos sobre ti"
            placeholderTextColor="#c4a882"
            multiline
          />
          <Text style={labelStyle}>Ubicación</Text>
          <TextInput
            style={inputStyle}
            value={location}
            onChangeText={setLocation}
            placeholder="Tu ciudad"
            placeholderTextColor="#c4a882"
          />

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
                setSaving(true);
                await onSave({ name, username, bio, location });
                setSaving(false);
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
      />
    </>
  );
}

// ── Modal: Cambiar Email ─────────────────────────────────────────────
function ChangeEmailModal({
  visible,
  onClose,
  currentEmail,
}: {
  visible: boolean;
  onClose: () => void;
  currentEmail: string;
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
    if (!newEmail.trim()) return setError("Introduce el nuevo email");
    if (!password.trim()) return setError("Introduce tu contraseña actual");
    setSaving(true);
    setError("");
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentEmail,
        password,
      });
      if (signInError) throw new Error("Contraseña incorrecta");
      const { error: updateError } = await supabase.auth.updateUser({
        email: newEmail,
      });
      if (updateError) throw updateError;
      setSuccess(true);
    } catch (e: any) {
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
              ¡Email enviado!
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: "#8B7355",
                textAlign: "center",
                marginBottom: 24,
              }}
            >
              Revisa tu bandeja de entrada en {newEmail} para confirmar el
              cambio.
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
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentEmail,
        password: currentPassword,
      });
      if (signInError) throw new Error("Contraseña actual incorrecta");
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw updateError;
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

// ── Modal: Idioma ────────────────────────────────────────────────────
const LANGUAGES = [
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "pt", label: "Português", flag: "🇵🇹" },
];

function LanguageModal({
  visible,
  onClose,
  selected,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  selected: string;
  onSelect: (code: string) => void;
}) {
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
          Seleccionar Idioma
        </Text>
        {LANGUAGES.map((lang) => {
          const isSelected = selected === lang.code;
          return (
            <TouchableOpacity
              key={lang.code}
              onPress={() => onSelect(lang.code)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                borderRadius: 14,
                padding: 16,
                marginBottom: 8,
                borderWidth: 1.5,
                backgroundColor: isSelected ? "#FFF0EB" : "#fdfbf7",
                borderColor: isSelected ? "#e07a5f" : "#F3E9E0",
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <Text style={{ fontSize: 24 }}>{lang.flag}</Text>
                <Text
                  style={{ fontSize: 15, fontWeight: "900", color: "#3e2723" }}
                >
                  {lang.label}
                </Text>
              </View>
              {isSelected && (
                <FontAwesome name="check" size={16} color="#e07a5f" />
              )}
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          onPress={onClose}
          style={{
            backgroundColor: "#fdfbf7",
            borderRadius: 999,
            padding: 14,
            alignItems: "center",
            marginTop: 4,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: "900", color: "#8B7355" }}>
            Cancelar
          </Text>
        </TouchableOpacity>
      </View>
    </FloatingModal>
  );
}

// ── Modal: Privacidad ────────────────────────────────────────────────
function PrivacyModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [visibility, setVisibility] = React.useState<
    "public" | "connections" | "private"
  >("public");
  const [showLocation, setShowLocation] = React.useState(true);
  const [showLibrary, setShowLibrary] = React.useState(true);

  const options = [
    {
      key: "public" as const,
      label: "Público",
      desc: "Todo el mundo puede ver tu perfil",
    },
    {
      key: "connections" as const,
      label: "Solo conexiones",
      desc: "Solo tus matches pueden ver tu perfil",
    },
    {
      key: "private" as const,
      label: "Privado",
      desc: "Solo tú puedes ver tu perfil",
    },
  ];

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
          Privacidad
        </Text>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "900",
            color: "#3e2723",
            marginBottom: 12,
          }}
        >
          Visibilidad del perfil
        </Text>

        {options.map((opt) => {
          const selected = visibility === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              onPress={() => setVisibility(opt.key)}
              style={{
                borderRadius: 12,
                padding: 14,
                marginBottom: 8,
                borderWidth: 1.5,
                backgroundColor: selected ? "#FFF0EB" : "#fdfbf7",
                borderColor: selected ? "#e07a5f" : "#F3E9E0",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View>
                <Text
                  style={{ fontSize: 14, fontWeight: "900", color: "#3e2723" }}
                >
                  {opt.label}
                </Text>
                <Text style={{ fontSize: 12, color: "#8B7355", marginTop: 2 }}>
                  {opt.desc}
                </Text>
              </View>
              {selected && (
                <FontAwesome name="check" size={16} color="#e07a5f" />
              )}
            </TouchableOpacity>
          );
        })}

        <View style={{ marginTop: 8 }}>
          {[
            {
              label: "Mostrar ubicación",
              desc: "Otros pueden ver tu ciudad",
              value: showLocation,
              set: setShowLocation,
            },
            {
              label: "Mostrar biblioteca",
              desc: "Otros pueden ver tus libros",
              value: showLibrary,
              set: setShowLibrary,
            },
          ].map((item) => (
            <View
              key={item.label}
              style={{
                backgroundColor: "#fdfbf7",
                borderRadius: 12,
                padding: 14,
                marginBottom: 8,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View>
                <Text
                  style={{ fontSize: 14, fontWeight: "900", color: "#3e2723" }}
                >
                  {item.label}
                </Text>
                <Text style={{ fontSize: 12, color: "#8B7355", marginTop: 2 }}>
                  {item.desc}
                </Text>
              </View>
              <CustomSwitch value={item.value} onValueChange={item.set} />
            </View>
          ))}
        </View>

        <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
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
            <Text style={{ fontSize: 15, fontWeight: "900", color: "#8B7355" }}>
              Cancelar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onClose}
            style={{
              flex: 1,
              backgroundColor: "#e07a5f",
              borderRadius: 999,
              padding: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "900", color: "#ffffff" }}>
              Guardar
            </Text>
          </TouchableOpacity>
        </View>
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
  const [editProfileOpen, setEditProfileOpen] = React.useState(false);
  const [changeEmailOpen, setChangeEmailOpen] = React.useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = React.useState(false);
  const [privacyOpen, setPrivacyOpen] = React.useState(false);
  const [languageOpen, setLanguageOpen] = React.useState(false);
  const [profile, setProfile] = React.useState<any>(null);
  const [currentEmail, setCurrentEmail] = React.useState("");
  const [pushNotif, setPushNotif] = React.useState(true);
  const [emailNotif, setEmailNotif] = React.useState(true);
  const [selectedLanguage, setSelectedLanguage] = React.useState("es");
  const [toast, setToast] = React.useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const handleSelectLanguage = (code: string) => {
    setSelectedLanguage(code);
    setLanguageOpen(false);
    showToast("Idioma actualizado correctamente");
  };

  const currentLanguageLabel =
    LANGUAGES.find((l) => l.code === selectedLanguage)?.label ?? "Español";

  React.useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setCurrentEmail(user.email ?? "");
        setProfile({
          name: user.user_metadata?.name ?? "",
          username: user.user_metadata?.username ?? "",
          avatar: user.user_metadata?.avatar_url ?? null,
        });
      }
    })();
  }, []);

  const handleSaveProfile = async (data: {
    name: string;
    username: string;
    bio: string;
    location: string;
  }) => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: { name: data.name, username: data.username },
      });
      if (!error) {
        setProfile({ ...profile, ...data });
        setEditProfileOpen(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
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
          paddingTop: 56,
          paddingBottom: 16,
          backgroundColor: "#fdfbf7",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginRight: 12 }}
        >
          <ChevronLeft size={24} color="#3e2723" />
        </TouchableOpacity>
        <Text style={{ fontSize: 22, fontWeight: "900", color: "#3e2723" }}>
          Ajustes
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
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
          <SettingsRow
            icon="envelope"
            label="Notificaciones por email"
            subtitle="Recibe novedades por correo"
            isLast
            right={
              <CustomSwitch value={emailNotif} onValueChange={setEmailNotif} />
            }
          />
        </View>

        {sectionLabel("Privacidad")}
        <View style={card}>
          <SettingsRow
            icon="eye"
            label="Privacidad"
            subtitle="Controla quién puede ver tu perfil"
            onPress={() => setPrivacyOpen(true)}
          />
          <SettingsRow
            icon="globe"
            label="Idioma"
            subtitle={currentLanguageLabel}
            onPress={() => setLanguageOpen(true)}
            isLast
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
            onPress={() => {}}
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

      <EditProfileModal
        visible={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        profile={profile}
        onSave={handleSaveProfile}
      />
      <ChangeEmailModal
        visible={changeEmailOpen}
        onClose={() => setChangeEmailOpen(false)}
        currentEmail={currentEmail}
      />
      <ChangePasswordModal
        visible={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        currentEmail={currentEmail}
      />
      <PrivacyModal
        visible={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
      />
      <LanguageModal
        visible={languageOpen}
        onClose={() => setLanguageOpen(false)}
        selected={selectedLanguage}
        onSelect={handleSelectLanguage}
      />
    </View>
  );
}
