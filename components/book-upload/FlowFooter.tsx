import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

type FlowFooterProps = {
  loading?: boolean;
  nextLabel: string;
  onBack: () => void;
  onSave: () => void;
  onNext: () => void;
};

export default function FlowFooter({
  loading,
  nextLabel,
  onBack,
  onSave,
  onNext,
}: FlowFooterProps) {
  const { width } = useWindowDimensions();
  const compact = width < 390;
  const sideIconSize = compact ? 15 : 16;
  const nextIconSize = compact ? 15 : 17;

  return (
    <View style={styles.footer}>
      <TouchableOpacity
        style={[
          styles.backButton,
          compact && styles.compactButton,
          loading && styles.disabled,
        ]}
        onPress={onBack}
        disabled={loading}
      >
        <FontAwesome name="angle-left" size={sideIconSize} color="#8f8271" />
        <Text numberOfLines={1} style={[styles.sideText, compact && styles.sideTextCompact]}>
          Atrás
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.saveButton,
          compact && styles.compactButton,
          loading && styles.disabled,
        ]}
        onPress={onSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#8f8271" />
        ) : (
          <>
            <FontAwesome name="save" size={compact ? 12 : 13} color="#8f8271" />
            <Text numberOfLines={1} style={[styles.sideText, compact && styles.sideTextCompact]}>
              Guardar
            </Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.nextButton,
          compact && styles.nextButtonCompact,
          loading && styles.disabled,
        ]}
        onPress={onNext}
        disabled={loading}
      >
        <Text numberOfLines={1} style={[styles.nextText, compact && styles.nextTextCompact]}>
          {nextLabel}
        </Text>
        <FontAwesome name="angle-right" size={nextIconSize} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#ece2d8",
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    gap: 8,
  },
  backButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: "#f1ebe3",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    gap: 4,
  },
  saveButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#ebe1d7",
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    gap: 4,
  },
  sideText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
    color: "#8f8271",
  },
  nextButton: {
    flex: 1.2,
    minWidth: 0,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: "#d5785f",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    gap: 5,
  },
  nextText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    color: "#fff",
  },
  compactButton: {
    minHeight: 42,
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  sideTextCompact: {
    fontSize: 13,
  },
  nextButtonCompact: {
    minHeight: 42,
    borderRadius: 12,
    paddingHorizontal: 10,
  },
  nextTextCompact: {
    fontSize: 15,
  },
  disabled: {
    opacity: 0.65,
  },
});
