import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type FlowInfoModalProps = {
  visible: boolean;
  title: string;
  message: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimaryPress: () => void;
  onSecondaryPress?: () => void;
  onRequestClose?: () => void;
};

export default function FlowInfoModal({
  visible,
  title,
  message,
  primaryLabel = "Entendido",
  secondaryLabel,
  onPrimaryPress,
  onSecondaryPress,
  onRequestClose,
}: FlowInfoModalProps) {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onRequestClose ?? onPrimaryPress}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actions}>
            {secondaryLabel && onSecondaryPress ? (
              <TouchableOpacity style={styles.secondaryButton} onPress={onSecondaryPress}>
                <Text style={styles.secondaryButtonText}>{secondaryLabel}</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity style={styles.primaryButton} onPress={onPrimaryPress}>
              <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: "#efe4d8",
    position: "relative",
  },
  title: {
    fontFamily: "Outfit_700Bold",
    color: "#3d352d",
    fontSize: 24,
  },
  message: {
    marginTop: 8,
    fontFamily: "Outfit_400Regular",
    color: "#6f6457",
    fontSize: 17,
    lineHeight: 24,
  },
  actions: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  secondaryButton: {
    minHeight: 44,
    minWidth: 120,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "#eadfd3",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  secondaryButtonText: {
    fontFamily: "Outfit_700Bold",
    color: "#8b7f6f",
    fontSize: 17,
  },
  primaryButton: {
    minHeight: 44,
    minWidth: 120,
    borderRadius: 13,
    backgroundColor: "#d5785f",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  primaryButtonText: {
    fontFamily: "Outfit_700Bold",
    color: "#fff",
    fontSize: 17,
  },
});
