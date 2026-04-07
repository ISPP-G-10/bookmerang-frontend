import { getInkdropsHistory } from "@/lib/inkdropsApi";
import { InkdropsHistoryDto } from "@/types/community";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
};

function getActionLabel(actionType: string): string {
  switch (actionType) {
    case "EXCHANGE_COMPLETED":
      return "Intercambio completado";
    case "MEETUP_ATTENDED":
      return "Quedada asistida";
    default:
      return "Evento";
  }
}

function getActionIcon(actionType: string): keyof typeof Ionicons.glyphMap {
  switch (actionType) {
    case "EXCHANGE_COMPLETED":
      return "swap-horizontal-outline";
    case "MEETUP_ATTENDED":
      return "people-outline";
    default:
      return "gift-outline";
  }
}

function groupHistoryByMonth(history: InkdropsHistoryDto[]): {
  [month: string]: InkdropsHistoryDto[];
} {
  const grouped: { [month: string]: InkdropsHistoryDto[] } = {};

  history.forEach((item) => {
    const date = new Date(item.createdAt);
    // Usar año-mes como key para agrupar correctamente
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    if (!grouped[monthKey]) {
      grouped[monthKey] = [];
    }
    grouped[monthKey].push(item);
  });

  return grouped;
}

// Función para mostrar el nombre del mes sin año
function getMonthDisplayName(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  const monthName = date.toLocaleDateString("es-ES", { month: "long" });
  return monthName.charAt(0).toUpperCase() + monthName.slice(1);
}

function HistoryItem({ item }: { item: InkdropsHistoryDto }) {
  const date = new Date(item.createdAt);
  const dayMonth = date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  });

  return (
    <View style={styles.historyItem}>
      <View style={styles.itemLeft}>
        <View style={styles.iconCircle}>
          <Ionicons
            name={getActionIcon(item.actionType)}
            size={16}
            color="#e07a5f"
          />
        </View>

        <View style={styles.itemInfo}>
          <Text style={styles.itemLabel}>
            {getActionLabel(item.actionType)}
          </Text>
          <Text style={styles.itemDate}>{dayMonth}</Text>
        </View>
      </View>

      <View style={styles.pointsContainer}>
        <Text style={styles.pointsText}>+{item.pointsGranted}</Text>
        <Ionicons name="flame" size={12} color="#e07a5f" />
      </View>
    </View>
  );
}

export default function InkdropsHistoryModal({ visible, onClose }: Props) {
  const [history, setHistory] = useState<InkdropsHistoryDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await getInkdropsHistory();
      setHistory(data);
      // Establecer el año actual seleccionado por defecto
      if (data.length > 0) {
        const years = getAvailableYears(data);
        const currentYear = new Date().getFullYear();
        const yearToSelect = years.includes(currentYear)
          ? currentYear
          : years[0];
        setSelectedYear(yearToSelect);

        // Establecer el mes actual seleccionado por defecto
        const grouped = groupHistoryByYear(data, yearToSelect);
        const months = Object.keys(grouped);
        if (months.length > 0) {
          setSelectedMonth(months[0]);
        }
      }
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoading(false);
    }
  };

  // Función para extraer años disponibles del historial
  const getAvailableYears = (data: InkdropsHistoryDto[]): number[] => {
    const years = new Set<number>();
    data.forEach((item) => {
      const year = new Date(item.createdAt).getFullYear();
      years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a); // Ordenar descendente
  };

  // Función para agrupar por año
  const groupHistoryByYear = (
    data: InkdropsHistoryDto[],
    year: number,
  ): { [month: string]: InkdropsHistoryDto[] } => {
    const filtered = data.filter((item) => {
      const itemYear = new Date(item.createdAt).getFullYear();
      return itemYear === year;
    });
    return groupHistoryByMonth(filtered);
  };

  useEffect(() => {
    if (visible) {
      fetchHistory();
    }
  }, [visible]);

  const grouped = selectedYear ? groupHistoryByYear(history, selectedYear) : {};
  const months = Object.keys(grouped).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  );
  const currentMonthData = selectedMonth ? grouped[selectedMonth] : [];
  const totalPoints = currentMonthData.reduce(
    (sum, item) => sum + item.pointsGranted,
    0,
  );
  const availableYears = getAvailableYears(history);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable
        style={{ flex: 1 }}
        onPress={() => yearDropdownOpen && setYearDropdownOpen(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Historial de InkDrops</Text>

              {/* Year Selector */}
              {availableYears.length > 0 && (
                <View style={styles.yearSelectorContainer}>
                  <Pressable
                    onPress={() => setYearDropdownOpen(!yearDropdownOpen)}
                    style={styles.selectWrapper}
                  >
                    <Text style={styles.yearValue}>{selectedYear}</Text>
                    <Ionicons
                      name={yearDropdownOpen ? "chevron-up" : "chevron-down"}
                      size={14}
                      color="#e07a5f"
                    />
                  </Pressable>

                  {/* Year Dropdown */}
                  {yearDropdownOpen && (
                    <View style={styles.yearDropdown}>
                      {availableYears.map((year) => (
                        <Pressable
                          key={year}
                          onPress={() => {
                            setSelectedYear(year);
                            setYearDropdownOpen(false);

                            // Resetear el mes seleccionado al cambiar de año
                            const grouped = groupHistoryByYear(history, year);
                            const months = Object.keys(grouped);
                            if (months.length > 0) {
                              setSelectedMonth(months[0]);
                            }
                          }}
                          style={[
                            styles.yearOption,
                            selectedYear === year && styles.yearOptionActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.yearOptionText,
                              selectedYear === year &&
                                styles.yearOptionTextActive,
                            ]}
                          >
                            {year}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              )}

              <Pressable onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#333" />
              </Pressable>
            </View>

            {loading ? (
              <View style={styles.centerContent}>
                <ActivityIndicator size="large" color="#e07a5f" />
                <Text style={styles.loadingText}>Cargando historial...</Text>
              </View>
            ) : history.length === 0 ? (
              <View style={styles.centerContent}>
                <Ionicons name="flame-outline" size={48} color="#d1ccc3" />
                <Text style={styles.emptyText}>Sin historial de InkDrops</Text>
              </View>
            ) : (
              <>
                {/* Month Selector */}
                <View style={styles.monthSelectorContainer}>
                  <FlatList
                    data={months}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    scrollEventThrottle={16}
                    contentContainerStyle={styles.monthSelectorContent}
                    renderItem={({ item: month }) => {
                      const isSelected = month === selectedMonth;
                      const monthPoints = grouped[month].reduce(
                        (sum, item) => sum + item.pointsGranted,
                        0,
                      );

                      return (
                        <Pressable
                          key={month}
                          style={[
                            styles.monthButton,
                            isSelected && styles.monthButtonActive,
                          ]}
                          onPress={() => setSelectedMonth(month)}
                        >
                          <Text
                            style={[
                              styles.monthButtonText,
                              isSelected && styles.monthButtonTextActive,
                            ]}
                          >
                            {getMonthDisplayName(month)}
                          </Text>
                          <Text
                            style={[
                              styles.monthPoints,
                              isSelected && styles.monthPointsActive,
                            ]}
                          >
                            +{monthPoints}
                          </Text>
                        </Pressable>
                      );
                    }}
                    keyExtractor={(item) => item}
                  />
                </View>

                {/* Stats */}
                {selectedMonth && (
                  <View style={styles.statsContainer}>
                    <View style={styles.statBox}>
                      <Ionicons name="flame" size={20} color="#e07a5f" />
                      <View>
                        <Text style={styles.statLabel}>Total este mes</Text>
                        <Text style={styles.statValue}>{totalPoints}</Text>
                      </View>
                    </View>
                    <View style={styles.statBox}>
                      <Ionicons name="list-outline" size={20} color="#4b5563" />
                      <View>
                        <Text style={styles.statLabel}>Eventos</Text>
                        <Text style={styles.statValue}>
                          {currentMonthData.length}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* History List */}
                <FlatList
                  data={currentMonthData}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => <HistoryItem item={item} />}
                  scrollEnabled={true}
                  style={styles.list}
                  ListEmptyComponent={
                    <View style={styles.centerContent}>
                      <Text style={styles.emptyText}>Sin eventos este mes</Text>
                    </View>
                  }
                />
              </>
            )}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#fdfbf7",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    flexDirection: "column",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0ece4",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
  },
  closeButton: {
    padding: 4,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 12,
    color: "#9ca3af",
    fontSize: 14,
  },
  emptyText: {
    color: "#9ca3af",
    fontSize: 14,
    textAlign: "center",
  },
  monthSelectorContainer: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0ece4",
  },
  monthSelectorContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  monthButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f0ece4",
    minWidth: 100,
  },
  monthButtonActive: {
    backgroundColor: "#e07a5f",
    borderColor: "#e07a5f",
  },
  monthButtonText: {
    color: "#4b5563",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  monthButtonTextActive: {
    color: "#fff",
  },
  monthPoints: {
    color: "#e07a5f",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
    textAlign: "center",
  },
  monthPointsActive: {
    color: "#fff",
  },
  statsContainer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0ece4",
  },
  statBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f0ece4",
  },
  statLabel: {
    fontSize: 11,
    color: "#9ca3af",
    fontWeight: "500",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    marginTop: 2,
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  historyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f0ece4",
  },
  itemLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fee2e2",
    justifyContent: "center",
    alignItems: "center",
  },
  itemInfo: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  itemDate: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
  },
  pointsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  pointsText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#e07a5f",
  },
  yearSelectorContainer: {
    flex: 1,
    marginHorizontal: 12,
    position: "relative",
  },
  selectWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f0ece4",
  },
  yearValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1f2937",
  },
  yearDropdown: {
    position: "absolute",
    top: 40,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#f0ece4",
    paddingVertical: 4,
    zIndex: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 80,
  },
  yearOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  yearOptionActive: {
    backgroundColor: "#FFE4D6",
  },
  yearOptionText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#4b5563",
    textAlign: "center",
  },
  yearOptionTextActive: {
    color: "#e07a5f",
    fontWeight: "700",
  },
});
