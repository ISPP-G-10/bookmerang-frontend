import FontAwesome from "@expo/vector-icons/FontAwesome";
import { type ComponentProps } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type StepKey = "fotos" | "datos" | "estado";

type StepState = {
  active: StepKey;
  photosDone?: boolean;
  dataDone?: boolean;
};

type FlowHeaderProps = {
  stepState: StepState;
  loadingDrafts?: boolean;
  onLoadDrafts: () => void;
  onCancel: () => void;
};

type StepChipProps = {
  icon: ComponentProps<typeof FontAwesome>["name"];
  label: string;
  active?: boolean;
  completed?: boolean;
};

function StepChip({ icon, label, active, completed }: StepChipProps) {
  const iconName: ComponentProps<typeof FontAwesome>["name"] = completed
    ? "check"
    : icon;

  return (
    <View style={[styles.stepChip, active ? styles.stepChipActive : styles.stepChipInactive]}>
      <FontAwesome name={iconName} size={12} color={active ? "#fff" : "#beaf9e"} />
      <Text style={[styles.stepChipText, active ? styles.stepChipTextActive : styles.stepChipTextInactive]}>
        {label}
      </Text>
    </View>
  );
}

export default function FlowHeader({
  stepState,
  loadingDrafts,
  onLoadDrafts,
  onCancel,
}: FlowHeaderProps) {
  const isPhotosActive = stepState.active === "fotos";
  const isDataActive = stepState.active === "datos";
  const isStatusActive = stepState.active === "estado";

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Sube un libro</Text>
        <View style={styles.actions}>
          <TouchableOpacity disabled={loadingDrafts} onPress={onLoadDrafts}>
            {loadingDrafts ? (
              <ActivityIndicator size="small" color="#d5785f" />
            ) : (
              <Text style={styles.loadDrafts}>Cargar Borradores</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.separator}>|</Text>
          <TouchableOpacity onPress={onCancel}>
            <Text style={styles.cancel}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.stepRow}>
        <StepChip
          icon="camera"
          label="Fotos"
          active={isPhotosActive}
          completed={Boolean(stepState.photosDone)}
        />
        <View style={styles.stepLine} />
        <StepChip
          icon="file-text-o"
          label="Datos"
          active={isDataActive}
          completed={Boolean(stepState.dataDone)}
        />
        <View style={styles.stepLine} />
        <StepChip icon="clipboard" label="Estado" active={isStatusActive} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee5db",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
  },
  title: {
    fontFamily: "Outfit_700Bold",
    color: "#3d352d",
    fontSize: 28,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loadDrafts: {
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
    color: "#d5785f",
  },
  separator: {
    color: "#d7cfc3",
    fontSize: 14,
  },
  cancel: {
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
    color: "#8e8171",
  },
  stepRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  stepLine: {
    flex: 1,
    height: 1,
    marginHorizontal: 8,
    backgroundColor: "#e9e0d6",
  },
  stepChip: {
    minWidth: 92,
    height: 34,
    borderRadius: 999,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  stepChipActive: {
    backgroundColor: "#d5785f",
  },
  stepChipInactive: {
    backgroundColor: "#f3eee8",
  },
  stepChipText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
  },
  stepChipTextActive: {
    color: "#fff",
  },
  stepChipTextInactive: {
    color: "#beaf9e",
  },
});

