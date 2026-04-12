/**
 * IsbnScannerWeb – Escáner de códigos ISBN para plataforma web.
 *
 * Usa `getUserMedia` directamente (sin expo-camera) para evitar el
 * problema del espejo que aplica expo-camera en escritorio, y emplea
 * la BarcodeDetector API (con polyfill `barcode-detector` para
 * compatibilidad en Firefox/Safari) para detectar EAN-13, EAN-8,
 * UPC-A, UPC-E y Code 128.
 *
 * Este componente solo se renderiza en web (Platform.OS === "web").
 */
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type IsbnScannerWebProps = {
  visible: boolean;
  onClose: () => void;
  /** Called with the raw barcode string when a code is detected. */
  onScanned: (data: string) => void;
};

/* ------------------------------------------------------------------ */
/*  Barcode detector helper (lazy-loaded polyfill)                     */
/* ------------------------------------------------------------------ */

let detectorPromise: Promise<any> | null = null;

async function getDetector(): Promise<any> {
  if (detectorPromise) return detectorPromise;

  detectorPromise = (async () => {
    // Use native BarcodeDetector if available, otherwise load polyfill
    if (typeof window !== "undefined" && "BarcodeDetector" in window) {
      return new (window as any).BarcodeDetector({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
      });
    }

    // Dynamically import the polyfill
    const { BarcodeDetector } = await import("barcode-detector");
    return new BarcodeDetector({
      formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
    });
  })();

  return detectorPromise;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function IsbnScannerWeb({
  visible,
  onClose,
  onScanned,
}: IsbnScannerWebProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ---------- Start camera stream ---------- */
  const startCamera = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
      }

      setLoading(false);
    } catch (err) {
      console.warn("IsbnScannerWeb: camera error", err);
      setError(
        "No se pudo acceder a la cámara. Comprueba los permisos del navegador."
      );
      setLoading(false);
    }
  }, []);

  /* ---------- Stop camera stream ---------- */
  const stopCamera = useCallback(() => {
    // Stop scan loop
    cancelAnimationFrame(scanLoopRef.current);
    scanLoopRef.current = 0;

    // Stop all media tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  /* ---------- Scan loop ---------- */
  const startScanning = useCallback(async () => {
    let detector: any;
    try {
      detector = await getDetector();
    } catch (err) {
      console.warn("IsbnScannerWeb: BarcodeDetector not available", err);
      setError(
        "Tu navegador no soporta la detección de códigos de barras. Prueba con Chrome."
      );
      return;
    }

    let active = true;

    const scan = async () => {
      if (!active || !videoRef.current) return;

      try {
        if (videoRef.current.readyState >= videoRef.current.HAVE_ENOUGH_DATA) {
          const barcodes = await detector.detect(videoRef.current);

          if (barcodes.length > 0) {
            const first = barcodes[0];
            active = false;
            onScanned(first.rawValue);
            return; // Stop scanning after first hit
          }
        }
      } catch {
        // Detection can occasionally throw – just retry
      }

      if (active) {
        scanLoopRef.current = requestAnimationFrame(scan);
      }
    };

    // Small delay to let the camera warm up
    setTimeout(() => {
      if (active) scan();
    }, 500);

    // Return cleanup
    return () => {
      active = false;
    };
  }, [onScanned]);

  /* ---------- Lifecycle ---------- */
  useEffect(() => {
    if (!visible) {
      stopCamera();
      return;
    }

    let cleanupScan: (() => void) | undefined;

    const init = async () => {
      await startCamera();
      const cleanup = await startScanning();
      cleanupScan = cleanup;
    };

    init();

    return () => {
      cleanupScan?.();
      stopCamera();
    };
  }, [visible, startCamera, startScanning, stopCamera]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Video element rendered directly (web-only) */}
        <View style={styles.videoWrapper}>
          <video
            ref={videoRef as any}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            autoPlay
            playsInline
            muted
          />
        </View>

        {/* Scan frame overlay */}
        <View pointerEvents="none" style={styles.frameWrapper}>
          <View style={styles.frame} />
        </View>

        {/* Loading indicator */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Iniciando cámara…</Text>
          </View>
        )}

        {/* Error message */}
        {error && (
          <View style={styles.errorOverlay}>
            <FontAwesome name="exclamation-triangle" size={32} color="#f5a623" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.errorButton} onPress={onClose}>
              <Text style={styles.errorButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <FontAwesome name="times" size={18} color="#fff" />
            <Text style={styles.closeText}>Cerrar</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom hint */}
        <View style={styles.bottomBar}>
          <Text style={styles.hintText}>
            Enfoca el código de barras de la tapa trasera para completar el ISBN.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  videoWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  frameWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  frame: {
    width: 250,
    height: 150,
    borderWidth: 2,
    borderColor: "#fff",
    borderRadius: 16,
    backgroundColor: "transparent",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  loadingText: {
    color: "#fff",
    fontFamily: "Outfit_400Regular",
    fontSize: 16,
    marginTop: 12,
  },
  errorOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.85)",
    paddingHorizontal: 32,
  },
  errorText: {
    color: "#fff",
    fontFamily: "Outfit_400Regular",
    fontSize: 16,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: "#d5785f",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  errorButtonText: {
    color: "#fff",
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
  },
  topBar: {
    position: "absolute",
    top: 48,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  closeButton: {
    minHeight: 40,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  closeText: {
    color: "#fff",
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
  },
  bottomBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 30,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  hintText: {
    color: "#fff",
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    textAlign: "center",
  },
});
