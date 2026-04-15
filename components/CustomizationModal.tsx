import FontAwesome from "@expo/vector-icons/FontAwesome";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  DEFAULT_NAME_COLOR,
  REWARDS,
  getNameColorById,
  getUnlockedFrames,
  getUnlockedNameColors,
  type FrameReward,
  type NameColorReward,
} from "../lib/rewardsSystem";
import AvatarWithFrame from "./AvatarWithFrame";

// ─── Selector de marcos ────────────────────────────────────────────────────────

function FrameSelector({
  userLevel,
  selectedId,
  onSelect,
  previewAvatarUri,
}: {
  userLevel: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  previewAvatarUri?: string | null;
}) {
  const unlocked = getUnlockedFrames(userLevel);
  const locked = REWARDS.filter(
    (r): r is FrameReward => r.type === "frame" && userLevel < r.level,
  );

  return (
    <View>
      {/* Preview en tiempo real */}
      <View style={{ alignItems: "center", marginBottom: 20 }}>
        <AvatarWithFrame
          avatarUri={previewAvatarUri}
          size={88}
          activeFrameId={selectedId}
        />
        <Text style={{ fontSize: 12, color: "#8B7355", marginTop: 8 }}>
          {selectedId
            ? (unlocked.find((f) => f.id === selectedId)?.name ??
              "Marco activo")
            : "Sin marco"}
        </Text>
      </View>

      {/* Opción: sin marco */}
      <TouchableOpacity
        onPress={() => onSelect(null)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 14,
          borderRadius: 14,
          marginBottom: 8,
          borderWidth: selectedId === null ? 2 : 1,
          borderColor: selectedId === null ? "#e07a5f" : "#F3E9E0",
          backgroundColor: selectedId === null ? "#FFF5F2" : "#ffffff",
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "#F3E9E0",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <FontAwesome name="circle-o" size={18} color="#8B7355" />
        </View>
        <Text
          style={{ fontSize: 14, fontWeight: "700", color: "#3e2723", flex: 1 }}
        >
          Sin marco
        </Text>
        {selectedId === null && (
          <FontAwesome name="check-circle" size={20} color="#e07a5f" />
        )}
      </TouchableOpacity>

      {/* Marcos desbloqueados */}
      {unlocked.map((frame) => {
        const isSelected = selectedId === frame.id;
        const dotColor = frame.animated
          ? (frame.animationColors?.[0] ?? "#888")
          : (frame.borderColor ?? "#888");

        return (
          <TouchableOpacity
            key={frame.id}
            onPress={() => onSelect(frame.id)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 14,
              borderRadius: 14,
              marginBottom: 8,
              borderWidth: isSelected ? 2 : 1,
              borderColor: isSelected ? "#e07a5f" : "#F3E9E0",
              backgroundColor: isSelected ? "#FFF5F2" : "#ffffff",
            }}
          >
            {/* Muestra una pequeña bolita del color del marco */}
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                borderWidth: 4,
                borderColor: dotColor,
                backgroundColor: "#fdfbf7",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              {frame.animated && (
                <FontAwesome name="asterisk" size={10} color={dotColor} />
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 14, fontWeight: "700", color: "#3e2723" }}
              >
                {frame.name}
              </Text>
              <Text style={{ fontSize: 11, color: "#8B7355", marginTop: 2 }}>
                {frame.animated ? "Marco animado" : "Marco estático"} · Niv.{" "}
                {frame.level}
              </Text>
            </View>

            {isSelected && (
              <FontAwesome name="check-circle" size={20} color="#e07a5f" />
            )}
          </TouchableOpacity>
        );
      })}

      {/* Marcos bloqueados — mostrados con opacidad reducida */}
      {locked.map((frame) => {
        const dotColor = frame.animated
          ? (frame.animationColors?.[0] ?? "#888")
          : (frame.borderColor ?? "#888");

        return (
          <View
            key={frame.id}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 14,
              borderRadius: 14,
              marginBottom: 8,
              borderWidth: 1,
              borderColor: "#F3E9E0",
              backgroundColor: "#ffffff",
              opacity: 0.4,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                borderWidth: 4,
                borderColor: dotColor,
                backgroundColor: "#fdfbf7",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 14, fontWeight: "700", color: "#3e2723" }}
              >
                {frame.name}
              </Text>
              <Text style={{ fontSize: 11, color: "#8B7355", marginTop: 2 }}>
                Se desbloquea en nivel {frame.level}
              </Text>
            </View>
            <FontAwesome name="lock" size={16} color="#8B7355" />
          </View>
        );
      })}
    </View>
  );
}

// ─── Selector de color de nombre ───────────────────────────────────────────────

function NameColorSelector({
  userLevel,
  selectedId,
  onSelect,
  previewName,
}: {
  userLevel: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  previewName: string;
}) {
  const unlocked = getUnlockedNameColors(userLevel);
  const locked = REWARDS.filter(
    (r): r is NameColorReward => r.type === "nameColor" && userLevel < r.level,
  );

  const activeColor = selectedId
    ? (getNameColorById(selectedId)?.color ?? DEFAULT_NAME_COLOR)
    : DEFAULT_NAME_COLOR;

  return (
    <View>
      {/* Preview nombre */}
      <View
        style={{
          alignItems: "center",
          marginBottom: 20,
          paddingVertical: 16,
          backgroundColor: "#ffffff",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "#F3E9E0",
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: "900", color: activeColor }}>
          {previewName || "Tu nombre"}
        </Text>
        <Text style={{ fontSize: 12, color: "#8B7355", marginTop: 4 }}>
          Vista previa
        </Text>
      </View>

      {/* Opción: color por defecto */}
      <TouchableOpacity
        onPress={() => onSelect(null)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 14,
          borderRadius: 14,
          marginBottom: 8,
          borderWidth: selectedId === null ? 2 : 1,
          borderColor: selectedId === null ? "#e07a5f" : "#F3E9E0",
          backgroundColor: selectedId === null ? "#FFF5F2" : "#ffffff",
        }}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: DEFAULT_NAME_COLOR,
            marginRight: 12,
          }}
        />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#3e2723" }}>
            Color por defecto
          </Text>
          <Text style={{ fontSize: 11, color: "#8B7355", marginTop: 2 }}>
            Marrón oscuro estándar
          </Text>
        </View>
        {selectedId === null && (
          <FontAwesome name="check-circle" size={20} color="#e07a5f" />
        )}
      </TouchableOpacity>

      {/* Colores desbloqueados */}
      {unlocked.map((c) => {
        const isSelected = selectedId === c.id;
        return (
          <TouchableOpacity
            key={c.id}
            onPress={() => onSelect(c.id)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 14,
              borderRadius: 14,
              marginBottom: 8,
              borderWidth: isSelected ? 2 : 1,
              borderColor: isSelected ? "#e07a5f" : "#F3E9E0",
              backgroundColor: isSelected ? "#FFF5F2" : "#ffffff",
            }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: c.color,
                marginRight: 12,
              }}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: c.color }}>
                {c.label}
              </Text>
              <Text style={{ fontSize: 11, color: "#8B7355", marginTop: 2 }}>
                Niv. {c.level}
              </Text>
            </View>
            {isSelected && (
              <FontAwesome name="check-circle" size={20} color="#e07a5f" />
            )}
          </TouchableOpacity>
        );
      })}

      {/* Colores bloqueados */}
      {locked.map((c) => (
        <View
          key={c.id}
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 14,
            borderRadius: 14,
            marginBottom: 8,
            borderWidth: 1,
            borderColor: "#F3E9E0",
            backgroundColor: "#ffffff",
            opacity: 0.4,
          }}
        >
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: c.color,
              marginRight: 12,
            }}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#3e2723" }}>
              {c.label}
            </Text>
            <Text style={{ fontSize: 11, color: "#8B7355", marginTop: 2 }}>
              Se desbloquea en nivel {c.level}
            </Text>
          </View>
          <FontAwesome name="lock" size={16} color="#8B7355" />
        </View>
      ))}
    </View>
  );
}

// ─── Modal principal ───────────────────────────────────────────────────────────

type Tab = "frame" | "color";

interface CustomizationModalProps {
  visible: boolean;
  onClose: () => void;
  userLevel: number;
  currentFrameId: string | null;
  currentColorId: string | null;
  previewAvatarUri?: string | null;
  previewName?: string;
  onSave: (frameId: string | null, colorId: string | null) => Promise<void>;
}

export default function CustomizationModal({
  visible,
  onClose,
  userLevel,
  currentFrameId,
  currentColorId,
  previewAvatarUri,
  previewName = "Tu nombre",
  onSave,
}: CustomizationModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("frame");
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(
    currentFrameId,
  );
  const [selectedColorId, setSelectedColorId] = useState<string | null>(
    currentColorId,
  );
  const [saving, setSaving] = useState(false);

  // Sincronizar con los valores externos cuando se abre
  useEffect(() => {
    if (visible) {
      setSelectedFrameId(currentFrameId);
      setSelectedColorId(currentColorId);
      setActiveTab("frame");
    }
  }, [visible, currentFrameId, currentColorId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(selectedFrameId, selectedColorId);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const TAB_ITEMS: { key: Tab; label: string; icon: string }[] = [
    { key: "frame", label: "Marco", icon: "circle-o" },
    { key: "color", label: "Nombre", icon: "font" },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "flex-end",
        }}
        onPress={onClose}
      >
        <Pressable
          style={{
            backgroundColor: "#fdfbf7",
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            maxHeight: "88%",
            overflow: "hidden",
          }}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 24,
              paddingTop: 20,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: "#F3E9E0",
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: "900", color: "#3e2723" }}>
              Personalizar perfil
            </Text>
            <TouchableOpacity
              onPress={onClose}
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

          {/* Tabs */}
          <View
            style={{
              flexDirection: "row",
              marginHorizontal: 24,
              marginTop: 16,
              marginBottom: 4,
              backgroundColor: "#F3E9E0",
              borderRadius: 12,
              padding: 4,
            }}
          >
            {TAB_ITEMS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    paddingVertical: 10,
                    borderRadius: 9,
                    backgroundColor: isActive ? "#ffffff" : "transparent",
                  }}
                >
                  <FontAwesome
                    name={tab.icon as any}
                    size={14}
                    color={isActive ? "#e07a5f" : "#8B7355"}
                  />
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "700",
                      color: isActive ? "#3e2723" : "#8B7355",
                    }}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Contenido scrollable */}
          <ScrollView
            contentContainerStyle={{
              padding: 24,
              paddingTop: 16,
              paddingBottom: 8,
            }}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === "frame" ? (
              <FrameSelector
                userLevel={userLevel}
                selectedId={selectedFrameId}
                onSelect={setSelectedFrameId}
                previewAvatarUri={previewAvatarUri}
              />
            ) : (
              <NameColorSelector
                userLevel={userLevel}
                selectedId={selectedColorId}
                onSelect={setSelectedColorId}
                previewName={previewName}
              />
            )}
          </ScrollView>

          {/* Footer con botones */}
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
              onPress={onClose}
              disabled={saving}
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
              disabled={saving}
              style={{
                flex: 1,
                borderRadius: 999,
                padding: 14,
                alignItems: "center",
                backgroundColor: saving ? "#f4a896" : "#e07a5f",
              }}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text
                  style={{ color: "#ffffff", fontWeight: "900", fontSize: 15 }}
                >
                  Guardar
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
