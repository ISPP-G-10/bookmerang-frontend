import { Stack, useRouter } from "expo-router";
import React, { useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { ConfirmModal } from "@/components/ConfirmationModal";
import FontAwesome from "@expo/vector-icons/FontAwesome";

// WebView only works on native platforms
let WebView: any = null;
if (Platform.OS !== "web") {
  WebView = require("react-native-webview").WebView;
}

// For web: open Stripe in a popup window and detect when it closes
const openStripePopup = (
  url: string,
  onSuccess: () => void,
  onCancel: () => void
) => {
  const width = 500;
  const height = 700;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;

  const popup = window.open(
    url,
    "stripe_checkout",
    `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
  );

  if (!popup) {
    Alert.alert("Error", "No se pudo abrir la ventana de pago. Permite las ventanas emergentes.");
    onCancel();
    return;
  }

  // Check if popup was closed or redirected
  const checkPopup = setInterval(() => {
    try {
      if (popup.closed) {
        clearInterval(checkPopup);
        // User closed the popup manually
        onCancel();
        return;
      }

      // Try to read URL (will fail if still on Stripe domain due to CORS)
      const currentUrl = popup.location?.href;
      if (currentUrl && (currentUrl.includes("status=success") || currentUrl.includes("status=cancelled"))) {
        clearInterval(checkPopup);
        popup.close();
        if (currentUrl.includes("status=success")) {
          onSuccess();
        } else {
          onCancel();
        }
      }
    } catch {
      // Cross-origin - popup is still on Stripe, keep waiting
    }
  }, 500);

  // Safety timeout after 10 minutes
  setTimeout(() => {
    clearInterval(checkPopup);
    if (!popup.closed) {
      popup.close();
    }
  }, 600000);
};

export default function SubscriptionScreen() {
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const { userPlan } = useAuth();
  const {
    isPremium,
    subscriptionStatus,
    loading,
    getCheckoutUrl,
    cancelSubscription,
    refreshStatus,
    syncFromStripe,
  } = useSubscription();

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [showWebView, setShowWebView] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // ── Handle successful payment ──────────────────────────────────────

  const handlePaymentSuccess = useCallback(async () => {
    setTimeout(async () => {
      await syncFromStripe();
      Alert.alert(
        "¡Suscripción activada!",
        "Ahora eres un usuario Premium. Disfruta de todas las funciones."
      );
    }, 2000);
  }, [syncFromStripe]);

  // ── Checkout: WebView (native) or popup (web) ──────────────────────

  const handleStartCheckout = async () => {
    try {
      setIsCheckingOut(true);
      const url = await getCheckoutUrl();

      if (Platform.OS === "web") {
        // Web: use popup window (faster than iframe, Stripe blocks iframes)
        openStripePopup(
          url,
          handlePaymentSuccess,
          () => {} // onCancel - do nothing
        );
      } else {
        // Native: use WebView modal
        setCheckoutUrl(url);
        setShowWebView(true);
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "No se pudo iniciar el pago");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleWebViewNavigationChange = (navState: { url: string }) => {
    const { url } = navState;

    // Detect success/cancel redirect URLs
    if (url.includes("status=success")) {
      setShowWebView(false);
      setCheckoutUrl(null);
      handlePaymentSuccess();
    } else if (url.includes("status=cancelled")) {
      setShowWebView(false);
      setCheckoutUrl(null);
    }
  };

  // ── Cancel subscription ────────────────────────────────────────────

  const handleCancelSubscription = () => {
    if (subscriptionStatus?.subscription?.cancelsAtPeriodEnd) {
      Alert.alert(
        "Suscripción ya cancelada",
        "Tu suscripción ya está programada para cancelarse al final del período actual."
      );
      return;
    }
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async () => {
    setShowCancelModal(false);
    try {
      setIsCancelling(true);
      await cancelSubscription();
      Alert.alert(
        "Suscripción cancelada",
        "Tu suscripción se cancelará al final del período actual. Seguirás teniendo acceso a Premium hasta entonces."
      );
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || "No se pudo cancelar la suscripción"
      );
    } finally {
      setIsCancelling(false);
    }
  };

  // ── Styles ─────────────────────────────────────────────────────────

  const cardStyle = {
    backgroundColor: "#fdfbf7",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e8dcc8",
  };

  // ── Loading ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#faf8f3" }}>
        <ActivityIndicator size="large" color="#e07a5f" />
      </View>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header with back button */}
      <View
        style={{
          backgroundColor: "#faf8f3",
          paddingTop: 56,
          paddingBottom: 12,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <FontAwesome name="chevron-left" size={18} color="#8B7355" />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "900", color: "#2d2520" }}>
          Suscripción
        </Text>
      </View>

      <ScrollView
        style={{
          flex: 1,
          backgroundColor: "#faf8f3",
          paddingHorizontal: 16,
        }}
        contentContainerStyle={{ paddingBottom: bottom + 30 }}
      >
        {isPremium ? (
          /* ═══ PREMIUM VIEW ═══ */
          <>
            <View
              style={{
                backgroundColor: "#d4af37",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                marginBottom: 16,
                alignSelf: "flex-start",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 12 }}>
                PREMIUM
              </Text>
            </View>

            <Text
              style={{
                fontSize: 24,
                fontWeight: "900",
                color: "#2d2520",
                marginBottom: 8,
              }}
            >
              ¡Eres un usuario Premium!
            </Text>
            <Text style={{ fontSize: 14, color: "#8B7355", marginBottom: 20 }}>
              Disfruta de todas las características exclusivas de Bookmerang.
            </Text>

            {subscriptionStatus?.subscription && (
              <View style={cardStyle}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: "#8B7355",
                    marginBottom: 12,
                  }}
                >
                  Detalles de tu suscripción
                </Text>
                <View style={{ gap: 10 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ color: "#8B7355", fontSize: 13 }}>Estado:</Text>
                    <Text style={{ fontWeight: "600", color: "#2d2520", fontSize: 13 }}>
                      {subscriptionStatus.subscription.cancelsAtPeriodEnd
                        ? "Activa (cancelación pendiente)"
                        : subscriptionStatus.subscription.status === "ACTIVE"
                        ? "Activa"
                        : subscriptionStatus.subscription.status}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ color: "#8B7355", fontSize: 13 }}>
                      {subscriptionStatus.subscription.cancelsAtPeriodEnd
                        ? "Acceso Premium hasta:"
                        : "Próxima renovación:"}
                    </Text>
                    <Text style={{ fontWeight: "600", color: "#2d2520", fontSize: 13 }}>
                      {subscriptionStatus.subscription.periodEnd
                        ? new Date(
                            subscriptionStatus.subscription.periodEnd
                          ).toLocaleDateString("es-ES")
                        : "—"}
                    </Text>
                  </View>
                  {subscriptionStatus.subscription.cancelsAtPeriodEnd && (
                    <View
                      style={{
                        backgroundColor: "#fff8e0",
                        padding: 12,
                        borderRadius: 8,
                        marginTop: 4,
                      }}
                    >
                      <Text
                        style={{ color: "#b8860b", fontSize: 12, fontWeight: "600", textAlign: "center" }}
                      >
                        Tu suscripción no se renovará. Seguirás teniendo acceso Premium hasta la fecha indicada.
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Benefits */}
            <View style={cardStyle}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#2d2520",
                  marginBottom: 12,
                }}
              >
                Beneficios Premium
              </Text>
              <View style={{ gap: 10 }}>
                {[
                  "Acceso a la biblioteca virtual compartida",
                  "Crear comunidades ilimitadas",
                  "Participar en rankings de comunidad",
                  "Acceso prioritario a nuevas funciones",
                ].map((text) => (
                  <View key={text} style={{ flexDirection: "row", gap: 10 }}>
                    <FontAwesome name="check-circle" size={16} color="#d4af37" />
                    <Text style={{ color: "#2d2520", fontSize: 13, flex: 1 }}>
                      {text}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Cancel button - hidden if already scheduled to cancel */}
            {!subscriptionStatus?.subscription?.cancelsAtPeriodEnd && (
              <TouchableOpacity
                style={{
                  backgroundColor: "transparent",
                  borderWidth: 1.5,
                  borderColor: "#c41e3a",
                  borderRadius: 999,
                  padding: 14,
                  alignItems: "center",
                  marginTop: 8,
                }}
                onPress={handleCancelSubscription}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <ActivityIndicator size="small" color="#c41e3a" />
                ) : (
                  <Text
                    style={{ fontSize: 15, fontWeight: "900", color: "#c41e3a" }}
                  >
                    Cancelar suscripción
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </>
        ) : (
          /* ═══ FREE VIEW ═══ */
          <>
            <View
              style={{
                backgroundColor: "#c4a882",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                marginBottom: 16,
                alignSelf: "flex-start",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 12 }}>
                GRATIS
              </Text>
            </View>

            <Text
              style={{
                fontSize: 24,
                fontWeight: "900",
                color: "#2d2520",
                marginBottom: 8,
              }}
            >
              Mejora a Premium
            </Text>
            <Text style={{ fontSize: 14, color: "#8B7355", marginBottom: 20 }}>
              Desbloquea todas las funciones exclusivas de Bookmerang por solo
              €2.99/mes
            </Text>

            {/* Benefits */}
            <View style={cardStyle}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#2d2520",
                  marginBottom: 12,
                }}
              >
                Beneficios Premium
              </Text>
              <View style={{ gap: 10 }}>
                {[
                  "Acceso a la biblioteca virtual compartida",
                  "Crear múltiples comunidades",
                  "Participar en rankings de comunidad",
                  "Acceso prioritario a nuevas funciones",
                ].map((text) => (
                  <View key={text} style={{ flexDirection: "row", gap: 10 }}>
                    <FontAwesome name="lock" size={16} color="#c4a882" />
                    <Text style={{ color: "#2d2520", fontSize: 13, flex: 1 }}>
                      {text}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Price */}
            <View style={cardStyle}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "900",
                  color: "#d4af37",
                  marginBottom: 8,
                }}
              >
                €2.99/mes
              </Text>
              <Text style={{ fontSize: 12, color: "#8B7355" }}>
                Se renueva automáticamente cada mes. Cancela en cualquier momento.
              </Text>
            </View>

            {/* Subscribe button */}
            <TouchableOpacity
              style={{
                backgroundColor: "#e07a5f",
                borderRadius: 999,
                padding: 14,
                alignItems: "center",
              }}
              onPress={handleStartCheckout}
              disabled={isCheckingOut}
            >
              {isCheckingOut ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={{ fontSize: 15, fontWeight: "900", color: "#fff" }}>
                  Suscribirse ahora
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* ═══ STRIPE CHECKOUT MODAL (native only - web uses popup) ═══ */}
      {Platform.OS !== "web" && (
        <Modal
          visible={showWebView}
          animationType="slide"
          onRequestClose={() => {
            setShowWebView(false);
            setCheckoutUrl(null);
          }}
        >
          <View style={{ flex: 1, backgroundColor: "#fff" }}>
            {/* Header */}
            <View
              style={{
                paddingTop: 56,
                paddingBottom: 12,
                paddingHorizontal: 16,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "#faf8f3",
                borderBottomWidth: 1,
                borderBottomColor: "#e8dcc8",
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "900", color: "#2d2520" }}>
                Pago seguro
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowWebView(false);
                  setCheckoutUrl(null);
                }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <FontAwesome name="times" size={22} color="#8B7355" />
              </TouchableOpacity>
            </View>

            {/* Stripe Checkout WebView */}
            {checkoutUrl && WebView && (
              <WebView
                source={{ uri: checkoutUrl }}
                onNavigationStateChange={handleWebViewNavigationChange}
                startInLoadingState
                renderLoading={() => (
                  <View
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor: "#fff",
                    }}
                  >
                    <ActivityIndicator size="large" color="#e07a5f" />
                    <Text style={{ marginTop: 12, color: "#8B7355", fontSize: 14 }}>
                      Cargando pasarela de pago...
                    </Text>
                  </View>
                )}
              />
            )}
          </View>
        </Modal>
      )}

      {/* ═══ CANCEL SUBSCRIPTION CONFIRMATION MODAL ═══ */}
      <ConfirmModal
        visible={showCancelModal}
        title="Cancelar suscripción"
        message="Tu suscripción seguirá activa hasta el final del período actual. Después de esa fecha, perderás el acceso a las funciones Premium."
        confirmLabel="Sí, cancelar"
        cancelLabel="No, mantener"
        confirmColor="danger"
        onConfirm={handleConfirmCancel}
        onCancel={() => setShowCancelModal(false)}
      />
    </>
  );
}
