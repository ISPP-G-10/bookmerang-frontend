import { apiRequest } from "@/lib/api";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const SEEN_KEY = "bookspot_validated_ids";

export async function markSpotAsSeen(id: number) {
  try {
    const raw = await AsyncStorage.getItem(SEEN_KEY);
    const ids: number[] = raw ? JSON.parse(raw) : [];
    if (!ids.includes(id)) {
      ids.push(id);
      await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(ids));
    }
  } catch {}
}

export async function getSeenSpotIds(): Promise<number[]> {
  try {
    const raw = await AsyncStorage.getItem(SEEN_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

interface BookspotToValidate {
  id: number;
  nombre: string;
  addressText: string;
}

interface Props {
  spot: BookspotToValidate | null;
  onDone: () => void;
  userLocation?: { latitude: number; longitude: number } | null;
}

type Step = "questions" | "thankyou";

function AnswerButton({
  label,
  icon,
  selected,
  selectedColor,
  onPress,
}: {
  label: string;
  icon: "check" | "times";
  selected: boolean;
  selectedColor: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 2,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        borderColor: selected ? selectedColor : "#e8dfd6",
        backgroundColor: selected ? selectedColor : "#ffffff",
      }}
      activeOpacity={0.75}
    >
      <FontAwesome
        name={icon}
        size={13}
        color={selected ? "#ffffff" : "#c9b5a3"}
      />
      <Text
        style={{
          fontSize: 15,
          fontWeight: "800",
          color: selected ? "#ffffff" : "#8B7355",
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function ValidationCard({ spot, onDone, userLocation }: Props) {
  const [knowsPlace, setKnowsPlace] = useState<boolean | null>(null);
  const [safeForExchange, setSafeForExchange] = useState<boolean | null>(null);
  const [step, setStep] = useState<Step>("questions");
  const [submitting, setSubmitting] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(0.92));
  const [opacityAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (!spot) return;
    setKnowsPlace(null);
    setSafeForExchange(null);
    setStep("questions");
    scaleAnim.setValue(0.92);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 70,
        friction: 10,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [spot?.id]);

  useEffect(() => {
    if (step !== "thankyou") return;
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start(() => onDone());
    }, 2600);
    return () => clearTimeout(timer);
  }, [step]);

  const canSubmit =
    knowsPlace !== null && (knowsPlace === false || safeForExchange !== null);

  async function handleSubmit() {
    if (!canSubmit || submitting || !spot) return;
    setSubmitting(true);

    try {
      let status = 0;
      try {
        const res = await apiRequest(`/bookspots/${spot.id}/validations`, {
          method: "POST",
          body: JSON.stringify({
            bookspotId: spot.id,
            knowsPlace: knowsPlace ?? false,
            safeForExchange: safeForExchange ?? false,
          }),
        });
        status = res.status;
      } catch {
        // Network error — treat as success to not block the user
        status = 200;
      }

      // Marcar siempre como visto antes de continuar
      await markSpotAsSeen(spot.id);

      // Propio spot (403) o ya votado / inválido (400) — cerrar sin celebración
      if (status === 403 || status === 400) {
        onDone();
        return;
      }

      setStep("thankyou");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSkip() {
    if (spot) await markSpotAsSeen(spot.id);
    onDone();
  }

  if (!spot) return null;

  return (
    <Modal visible animationType="fade" transparent onRequestClose={handleSkip}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.45)",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 20,
        }}
      >
        <Animated.View
          style={{
            width: "100%",
            backgroundColor: "#fdfbf7",
            borderRadius: 24,
            overflow: "hidden",
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.18,
            shadowRadius: 20,
            elevation: 16,
          }}
        >
          {step === "thankyou" ? (
            <View
              style={{
                alignItems: "center",
                paddingHorizontal: 24,
                paddingVertical: 36,
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: "#e07a5f",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 4,
                }}
              >
                <FontAwesome name="check" size={30} color="#ffffff" />
              </View>
              <Text
                style={{
                  fontSize: 19,
                  fontWeight: "900",
                  color: "#3e2723",
                  textAlign: "center",
                }}
              >
                ¡Gracias por tu aportación!
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: "#9e9aad",
                  textAlign: "center",
                  lineHeight: 20,
                }}
              >
                Tu validación ayuda a la comunidad a descubrir nuevos BookSpots.
              </Text>
            </View>
          ) : (
            <View style={{ padding: 22 }}>
              {/* Header */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 18,
                }}
              >
                <View style={{ flex: 1, marginRight: 12 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                      marginBottom: 7,
                    }}
                  >
                    <View
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 4,
                        backgroundColor: "#f59e0b",
                      }}
                    />
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: "800",
                        color: "#d97706",
                        letterSpacing: 0.9,
                        textTransform: "uppercase",
                      }}
                    >
                      Validación comunitaria
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "900",
                      color: "#3e2723",
                      lineHeight: 24,
                      marginBottom: 5,
                    }}
                  >
                    Ayuda a validar este BookSpot
                  </Text>
                  <Text
                    style={{ fontSize: 13, color: "#8B7355", lineHeight: 19 }}
                  >
                    Alguien ha propuesto{" "}
                    <Text style={{ fontWeight: "800", color: "#3e2723" }}>
                      {spot.nombre}
                    </Text>{" "}
                    como BookSpot.
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleSkip}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    borderWidth: 1.5,
                    borderColor: "#e0d5cc",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <FontAwesome name="times" size={12} color="#c9b5a3" />
                </TouchableOpacity>
              </View>

              {/* Q1 */}
              <View
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: "#F3E9E0",
                  marginBottom: 10,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "800",
                    color: "#3e2723",
                    marginBottom: 12,
                  }}
                >
                  ¿Conoces este lugar?
                </Text>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <AnswerButton
                    label="Sí"
                    icon="check"
                    selected={knowsPlace === true}
                    selectedColor="#22c55e"
                    onPress={() => setKnowsPlace(true)}
                  />
                  <AnswerButton
                    label="No"
                    icon="times"
                    selected={knowsPlace === false}
                    selectedColor="#6b7280"
                    onPress={() => {
                      setKnowsPlace(false);
                      setSafeForExchange(null);
                    }}
                  />
                </View>
              </View>

              {/* Q2 (aparece tras responder que si a la primera pregunta) */}
              {knowsPlace === true && (
                <View
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: "#F3E9E0",
                    marginBottom: 10,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "800",
                      color: "#3e2723",
                      marginBottom: 12,
                    }}
                  >
                    ¿Es un lugar seguro y adecuado para intercambios?
                  </Text>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <AnswerButton
                      label="Sí"
                      icon="check"
                      selected={safeForExchange === true}
                      selectedColor="#22c55e"
                      onPress={() => setSafeForExchange(true)}
                    />
                    <AnswerButton
                      label="No"
                      icon="times"
                      selected={safeForExchange === false}
                      selectedColor="#ef4444"
                      onPress={() => setSafeForExchange(false)}
                    />
                  </View>
                </View>
              )}

              {/* Enviar */}
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!canSubmit || submitting}
                style={{
                  backgroundColor:
                    canSubmit && !submitting ? "#e07a5f" : "#f4c4b8",
                  borderRadius: 14,
                  paddingVertical: 14,
                  alignItems: "center",
                  marginTop: 4,
                  marginBottom: 8,
                }}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text
                    style={{
                      color: "#ffffff",
                      fontWeight: "900",
                      fontSize: 15,
                    }}
                  >
                    Enviar valoración
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSkip}
                style={{ alignItems: "center", paddingVertical: 4 }}
              >
                <Text style={{ fontSize: 13, color: "#c9b5a3" }}>
                  Saltar esta validación
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}
