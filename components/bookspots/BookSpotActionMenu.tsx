import FontAwesome from "@expo/vector-icons/FontAwesome";
import React from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";

interface Props {
  visible: boolean;
  onClose: () => void;
  onProposeNew: () => void;
  onViewPending: () => void;
}

export default function BookSpotActionMenu({
  visible,
  onClose,
  onProposeNew,
  onViewPending,
}: Props) {
  return (
    <Modal visible={visible} animationType="fade" transparent>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
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
          style={{
            backgroundColor: "#fdfbf7",
            borderRadius: 24,
            width: "100%",
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
              BookSpots
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

          {/* Options */}
          <View style={{ padding: 24, gap: 12 }}>
            {/* Option 1: Propose new */}
            <TouchableOpacity
              onPress={() => {
                onClose();
                onProposeNew();
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 16,
                paddingVertical: 16,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: "#e07a5f",
                backgroundColor: "#fdfbf7",
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "#e07a5f",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <FontAwesome name="plus" size={18} color="#ffffff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "900",
                    color: "#3e2723",
                  }}
                >
                  Proponer nuevo
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: "#c9b5a3",
                    marginTop: 2,
                  }}
                >
                  Sugiere un nuevo lugar
                </Text>
              </View>
            </TouchableOpacity>

            {/* Option 2: View pending */}
            <TouchableOpacity
              onPress={() => {
                onClose();
                onViewPending();
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 16,
                paddingVertical: 16,
                borderRadius: 12,
                backgroundColor: "#e07a5f",
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "rgba(255,255,255,0.3)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <FontAwesome name="list" size={18} color="#ffffff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "900",
                    color: "#ffffff",
                  }}
                >
                  Ver mis propuestas
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.8)",
                    marginTop: 2,
                  }}
                >
                  Revisa el progreso
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
