import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import {
  confirmBookdropExchangeDrop,
  confirmBookdropExchangePickup,
  confirmBookdropExchangeSwap,
  deleteBookdropProfile,
  getBookdropExchanges,
  getBookdropProfile,
  updateBookdropProfile,
  type BookdropExchange,
  type BookdropExchangeStatus,
  type BookdropProfile,
} from "@/lib/bookdropApi";
import { GeocodingSuggestion, searchGeocodingSuggestions } from "@/lib/geocodingApi";
import { Ionicons } from "@expo/vector-icons";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFocusEffect } from "@react-navigation/native";
import { Camera, CameraView, type CameraType } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type EditableFields = {
  nombreEstablecimiento: string;
  addressText: string;
  profilePhoto: string;
};

type ExchangeParticipantKey = "firstParticipant" | "secondParticipant";

type ExchangeDisplayBookStatus =
  | "AWAITING_DROP"
  | "AWAITING_PICKUP"
  | "COLLECTED"
  | "WAITING_FOR_OTHER_BOOK"
  | "WAITING_FOR_IDENTIFICATION";

type ParticipantShelfBook = {
  title: string;
  originalOwner: string;
  status: ExchangeDisplayBookStatus;
};

type ParticipantShelfView = {
  ownerLabel: string;
  books: ParticipantShelfBook[];
  emptyMessage?: string;
};

type ExchangeActionKind = "confirm-drop" | "confirm-swap" | "confirm-pickup";

const resolveFileExtension = (asset: ImagePicker.ImagePickerAsset): string => {
  const fromName = asset.fileName?.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName;

  const fromMime = asset.mimeType?.split("/").pop()?.toLowerCase();
  if (fromMime && /^[a-z0-9]+$/.test(fromMime)) return fromMime;

  return "jpg";
};

const toImageDataUrl = (value: string, mimeType?: string): string => {
  const trimmed = value.trim();
  if (/^data:image\/[a-z0-9.+-]+;base64,/i.test(trimmed)) {
    return trimmed;
  }

  return `data:${mimeType ?? "image/jpeg"};base64,${trimmed}`;
};

const readBlobAsDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error("No se pudo leer la imagen seleccionada."));
    };

    reader.onloadend = () => {
      if (typeof reader.result === "string" && reader.result.length > 0) {
        resolve(reader.result);
        return;
      }

      reject(new Error("No se pudo convertir la imagen seleccionada."));
    };

    reader.readAsDataURL(blob);
  });

function getExchangeStatusMeta(status: BookdropExchangeStatus) {
  switch (status) {
    case "AWAITING_DROP_1":
      return {
        label: "Esperando primera entrega",
        color: "#b76b00",
        backgroundColor: "#fff4e5",
        icon: "time-outline" as const,
      };
    case "BOOK_1_HELD":
      return {
        label: "Primer libro en custodia",
        color: "#1f8f5f",
        backgroundColor: "#e8f7ef",
        icon: "archive-outline" as const,
      };
    case "BOOK_2_HELD":
      return {
        label: "Pendiente de recogida final",
        color: "#375dfb",
        backgroundColor: "#eef4ff",
        icon: "swap-horizontal-outline" as const,
      };
    case "COMPLETED":
      return {
        label: "Completado",
        color: "#1f8f5f",
        backgroundColor: "#e8f7ef",
        icon: "checkmark-circle-outline" as const,
      };
  }
}

function getExchangeDisplayBookStatusMeta(status: ExchangeDisplayBookStatus) {
  switch (status) {
    case "AWAITING_DROP":
      return {
        label: "Esperando entrega",
        color: "#b76b00",
        backgroundColor: "#fff4e5",
      };
    case "AWAITING_PICKUP":
      return {
        label: "Pendiente de recogida",
        color: "#375dfb",
        backgroundColor: "#eef4ff",
      };
    case "COLLECTED":
      return {
        label: "Recogido",
        color: "#1f8f5f",
        backgroundColor: "#e8f7ef",
      };
    case "WAITING_FOR_OTHER_BOOK":
      return {
        label: "Pendiente del otro usuario",
        color: "#7b768f",
        backgroundColor: "#f1eef5",
      };
    case "WAITING_FOR_IDENTIFICATION":
      return {
        label: "Pendiente de identificar",
        color: "#7b768f",
        backgroundColor: "#f1eef5",
      };
  }
}

function getExchangeParticipantName(
  exchange: BookdropExchange,
  participantKey: ExchangeParticipantKey,
) {
  return participantKey === "firstParticipant" ? exchange.user1Name || "Usuario 1" : exchange.user2Name || "Usuario 2";
}

function getExchangeParticipantBookTitle(
  exchange: BookdropExchange,
  participantKey: ExchangeParticipantKey,
) {
  return participantKey === "firstParticipant" ? exchange.book1Title || "Libro 1" : exchange.book2Title || "Libro 2";
}

function getOtherParticipantKey(participantKey: ExchangeParticipantKey): ExchangeParticipantKey {
  return participantKey === "firstParticipant" ? "secondParticipant" : "firstParticipant";
}

function getParticipantShelfView(
  exchange: BookdropExchange,
  participantKey: ExchangeParticipantKey,
  firstDepositorKey?: ExchangeParticipantKey | null,
): ParticipantShelfView {
  const currentName = getExchangeParticipantName(exchange, participantKey);
  const otherKey = getOtherParticipantKey(participantKey);
  const otherName = getExchangeParticipantName(exchange, otherKey);
  const currentBookTitle = getExchangeParticipantBookTitle(exchange, participantKey);
  const otherBookTitle = getExchangeParticipantBookTitle(exchange, otherKey);

  if (exchange.status === "AWAITING_DROP_1") {
    return {
      ownerLabel: currentName,
      books: [
        {
          title: currentBookTitle,
          originalOwner: currentName,
          status: "AWAITING_DROP" as const,
        },
      ],
    };
  }

  if (!firstDepositorKey) {
    return {
      ownerLabel: currentName,
      books: [],
      emptyMessage: "Introduce el PIN y selecciona quien entrego primero para reconstruir este intercambio.",
    };
  }

  const secondParticipantKey = getOtherParticipantKey(firstDepositorKey);

  if (exchange.status === "BOOK_1_HELD") {
    if (participantKey === firstDepositorKey) {
      return {
        ownerLabel: currentName,
        books: [],
        emptyMessage: "Tu libro ya esta en custodia y queda pendiente la llegada del otro usuario.",
      };
    }

    return {
      ownerLabel: currentName,
      books: [
        {
          title: currentBookTitle,
          originalOwner: currentName,
          status: "AWAITING_DROP" as const,
        },
        {
          title: otherBookTitle,
          originalOwner: otherName,
          status: "AWAITING_PICKUP" as const,
        },
      ],
    };
  }

  if (exchange.status === "BOOK_2_HELD") {
    if (participantKey === firstDepositorKey) {
      return {
        ownerLabel: currentName,
        books: [
          {
            title: otherBookTitle,
            originalOwner: otherName,
            status: "AWAITING_PICKUP" as const,
          },
        ],
      };
    }

    return {
      ownerLabel: currentName,
      books: [
        {
          title: otherBookTitle,
          originalOwner: otherName,
          status: "COLLECTED" as const,
        },
      ],
    };
  }

  if (exchange.status === "COMPLETED") {
    return {
      ownerLabel: currentName,
      books: [
        {
          title: participantKey === secondParticipantKey ? otherBookTitle : otherBookTitle,
          originalOwner: otherName,
          status: "COLLECTED" as const,
        },
      ],
    };
  }

  return {
    ownerLabel: currentName,
    books: [
      {
        title: currentBookTitle,
        originalOwner: currentName,
        status: "WAITING_FOR_IDENTIFICATION" as const,
      },
    ],
  };
}

function normalizeExchangePin(value: string): string {
  return value.trim().toUpperCase();
}

function getExchangeActionKind(status: BookdropExchangeStatus): ExchangeActionKind | null {
  if (status === "AWAITING_DROP_1") return "confirm-drop";
  if (status === "BOOK_1_HELD") return "confirm-swap";
  if (status === "BOOK_2_HELD") return "confirm-pickup";
  return null;
}

function getExchangeActionLabel(
  exchange: BookdropExchange,
  leadParticipantKey: ExchangeParticipantKey,
): string {
  const leadName = getExchangeParticipantName(exchange, leadParticipantKey);
  const otherParticipantName = getExchangeParticipantName(
    exchange,
    getOtherParticipantKey(leadParticipantKey),
  );

  if (exchange.status === "AWAITING_DROP_1") {
    return `Confirmar entrega de ${leadName}`;
  }

  if (exchange.status === "BOOK_1_HELD") {
    return `Confirmar entrega de ${otherParticipantName} y recogida del libro de ${leadName}`;
  }

  if (exchange.status === "BOOK_2_HELD") {
    return `Confirmar recogida de ${leadName} del libro de ${otherParticipantName}`;
  }

  return "Sin acciones disponibles";
}

function getExchangeActionHelpText(
  exchange: BookdropExchange,
  leadParticipantKey: ExchangeParticipantKey,
): string {
  const leadName = getExchangeParticipantName(exchange, leadParticipantKey);
  const secondParticipantName = getExchangeParticipantName(
    exchange,
    getOtherParticipantKey(leadParticipantKey),
  );

  if (exchange.status === "AWAITING_DROP_1") {
    return `Selecciona que usuario esta entregando primero su libro en este intercambio.`;
  }

  if (exchange.status === "BOOK_1_HELD") {
    return `${leadName} ya dejo su libro. Ahora debe llegar ${secondParticipantName} para entregar el suyo y recoger el otro.`;
  }

  if (exchange.status === "BOOK_2_HELD") {
    return `${secondParticipantName} ya entrego y recogio. Solo queda confirmar la recogida final de ${leadName}.`;
  }

  return "Este intercambio no tiene acciones disponibles.";
}

function canSelectLeadParticipant(
  exchange: BookdropExchange,
  knownLeadParticipantKey?: ExchangeParticipantKey,
): boolean {
  if (exchange.status === "AWAITING_DROP_1") {
    return true;
  }

  return !knownLeadParticipantKey;
}

function getCurrentActorParticipantKey(
  exchange: BookdropExchange,
  leadParticipantKey: ExchangeParticipantKey,
): ExchangeParticipantKey {
  if (exchange.status === "BOOK_1_HELD") {
    return getOtherParticipantKey(leadParticipantKey);
  }

  return leadParticipantKey;
}

function getStatusMeta(rawStatus: string | number) {
  const normalized = String(rawStatus ?? "").trim().toUpperCase();

  if (normalized === "VALIDATED" || normalized === "ACTIVE" || normalized === "1") {
    return {
      label: "Activo",
      icon: "checkmark-circle-outline" as const,
      color: "#1f8f5f",
      backgroundColor: "#e8f7ef",
    };
  }

  if (normalized === "PENDING" || normalized === "0") {
    return {
      label: "Pendiente",
      icon: "time-outline" as const,
      color: "#b76b00",
      backgroundColor: "#fff4e5",
    };
  }

  if (normalized === "REJECTED" || normalized === "2") {
    return {
      label: "Rechazado",
      icon: "close-circle-outline" as const,
      color: "#b42318",
      backgroundColor: "#fdeaea",
    };
  }

  return {
    label: normalized || "Desconocido",
    icon: "help-circle-outline" as const,
    color: "#5f5b73",
    backgroundColor: "#f1eef5",
  };
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Fecha no disponible";

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

function toEditableFields(profile: BookdropProfile): EditableFields {
  return {
    nombreEstablecimiento: profile.nombreEstablecimiento ?? "",
    addressText: profile.addressText ?? "",
    profilePhoto: profile.profilePhoto ?? "",
  };
}

export default function BookDropControlPanelScreen() {
  const router = useRouter();
  const { signOut, isBookdropUser, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [processingExchange, setProcessingExchange] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [photoPickerOpen, setPhotoPickerOpen] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [capturingPhoto, setCapturingPhoto] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<CameraType>("back");
  const [editingEstablishment, setEditingEstablishment] = useState(false);
  const [exchangeActionModalOpen, setExchangeActionModalOpen] = useState(false);
  const [selectedExchange, setSelectedExchange] = useState<BookdropExchange | null>(null);
  const [selectedLeadParticipantKey, setSelectedLeadParticipantKey] =
    useState<ExchangeParticipantKey>("firstParticipant");
  const [exchangeLeadMap, setExchangeLeadMap] = useState<
    Record<number, ExchangeParticipantKey | undefined>
  >({});
  const [exchangeCodeInput, setExchangeCodeInput] = useState("");
  const [exchangeActionError, setExchangeActionError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState<BookdropProfile | null>(null);
  const [exchanges, setExchanges] = useState<BookdropExchange[]>([]);
  const [form, setForm] = useState<EditableFields>({
    nombreEstablecimiento: "",
    addressText: "",
    profilePhoto: "",
  });
  const [addressLocation, setAddressLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<GeocodingSuggestion[]>([]);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const addressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cameraRef = useRef<CameraView | null>(null);

  const statusMeta = useMemo(
    () => getStatusMeta(profile?.bookspotStatus ?? ""),
    [profile?.bookspotStatus],
  );
  const loadPanelData = useCallback(async () => {
    try {
      setError(null);
      const [nextProfile, nextExchanges] = await Promise.all([
        getBookdropProfile(),
        getBookdropExchanges(),
      ]);
      setProfile(nextProfile);
      setForm(toEditableFields(nextProfile));
      setExchanges(nextExchanges);
      setExchangeLeadMap((current) => {
        const next = { ...current };
        Object.keys(next).forEach((key) => {
          if (!nextExchanges.some((exchange) => exchange.meetingId === Number(key))) {
            delete next[Number(key)];
          }
        });
        return next;
      });
    } catch (e: any) {
      setError(e?.message ?? "No se pudo cargar el panel de control");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !isBookdropUser) {
      router.replace("/(tabs)/matcher" as any);
    }
  }, [authLoading, isBookdropUser, router]);

  useFocusEffect(
    useCallback(() => {
      if (!isBookdropUser) return;

      setLoading(true);
      void loadPanelData();
    }, [isBookdropUser, loadPanelData]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setSuccessMessage(null);
    void loadPanelData();
  }, [loadPanelData]);

  const openEditEstablishment = useCallback(() => {
    if (profile) {
      setForm(toEditableFields(profile));
    }
    setAddressLocation(null);
    setAddressSuggestions([]);
    setEditingEstablishment(true);
  }, [profile]);

  const closeEditEstablishment = useCallback(() => {
    if (saving || photoLoading) return;

    if (profile) {
      setForm(toEditableFields(profile));
    }
    setAddressLocation(null);
    setAddressSuggestions([]);
    setEditingEstablishment(false);
  }, [photoLoading, profile, saving]);

  const handleChange = useCallback((field: keyof EditableFields, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }, []);

  const openExchangeActionModal = useCallback((exchange: BookdropExchange) => {
    setExchangeActionError(null);
    setExchangeCodeInput("");
    setSelectedExchange(exchange);
    setSelectedLeadParticipantKey(exchangeLeadMap[exchange.meetingId] ?? "firstParticipant");
    setExchangeActionModalOpen(true);
  }, [exchangeLeadMap]);

  const closeExchangeActionModal = useCallback(() => {
    if (processingExchange) return;
    setExchangeActionModalOpen(false);
    setSelectedExchange(null);
    setExchangeActionError(null);
    setExchangeCodeInput("");
  }, [processingExchange]);

  const handleConfirmExchangeAction = useCallback(async () => {
    if (!selectedExchange) return;

    const normalizedPin = normalizeExchangePin(exchangeCodeInput);
    if (!normalizedPin) {
      setExchangeActionError("Introduce el PIN que te haya facilitado la persona usuaria.");
      return;
    }

    const actionKind = getExchangeActionKind(selectedExchange.status);
    if (!actionKind) return;

    const leadParticipantKey =
      exchangeLeadMap[selectedExchange.meetingId] ??
      selectedLeadParticipantKey;

    try {
      setProcessingExchange(true);
      setError(null);
      setSuccessMessage(null);
      setExchangeActionError(null);

      let updatedExchange: BookdropExchange;

      if (actionKind === "confirm-drop") {
        updatedExchange = await confirmBookdropExchangeDrop({
          meetingId: selectedExchange.meetingId,
          pin: normalizedPin,
        });
        setExchangeLeadMap((current) => ({
          ...current,
          [selectedExchange.meetingId]: leadParticipantKey,
        }));
      } else if (actionKind === "confirm-swap") {
        updatedExchange = await confirmBookdropExchangeSwap({
          meetingId: selectedExchange.meetingId,
          pin: normalizedPin,
        });
        setExchangeLeadMap((current) => ({
          ...current,
          [selectedExchange.meetingId]: leadParticipantKey,
        }));
      } else {
        updatedExchange = await confirmBookdropExchangePickup({
          meetingId: selectedExchange.meetingId,
          pin: normalizedPin,
        });
        setExchangeLeadMap((current) => {
          const next = { ...current };
          delete next[selectedExchange.meetingId];
          return next;
        });
      }

      setExchanges((current) => {
        if (updatedExchange.status === "COMPLETED") {
          return current.filter((exchange) => exchange.meetingId !== updatedExchange.meetingId);
        }

        return current.map((exchange) =>
          exchange.meetingId === updatedExchange.meetingId ? updatedExchange : exchange,
        );
      });

      setExchangeCodeInput("");
      setSelectedExchange(null);
      setExchangeActionModalOpen(false);
      setSuccessMessage("Intercambio actualizado correctamente");
    } catch (e: any) {
      setExchangeActionError(e?.message ?? "No se pudo actualizar el intercambio");
    } finally {
      setProcessingExchange(false);
    }
  }, [exchangeCodeInput, exchangeLeadMap, selectedExchange, selectedLeadParticipantKey]);

  const handleAddressSearch = useCallback(
    (query: string) => {
      handleChange("addressText", query);
      setAddressLocation(null);

      if (addressTimeoutRef.current) clearTimeout(addressTimeoutRef.current);

      addressTimeoutRef.current = setTimeout(async () => {
        if (query.trim().length < 3) {
          setAddressSuggestions([]);
          return;
        }
        try {
          setSearchingAddress(true);
          const results = await searchGeocodingSuggestions(query.trim());
          setAddressSuggestions(results);
        } catch {
          setAddressSuggestions([]);
        } finally {
          setSearchingAddress(false);
        }
      }, 500);
    },
    [handleChange],
  );

  const handleSelectAddress = useCallback(
    (suggestion: GeocodingSuggestion) => {
      handleChange("addressText", suggestion.label);
      setAddressLocation({ lat: suggestion.lat, lon: suggestion.lon });
      setAddressSuggestions([]);
    },
    [handleChange],
  );

  const uploadProfileBinary = useCallback(
    async (fileData: ArrayBuffer, extension: string, mimeType: string): Promise<string> => {
      void extension;

      return readBlobAsDataUrl(
        new Blob([fileData], {
          type: mimeType || "image/jpeg",
        }),
      );
    },
    [],
  );

  const uploadProfilePhoto = useCallback(
    async (asset: ImagePicker.ImagePickerAsset): Promise<string> => {
      if (typeof asset.base64 === "string" && asset.base64.trim().length > 0) {
        return toImageDataUrl(asset.base64, asset.mimeType);
      }

      if (typeof asset.uri === "string" && /^data:image\//i.test(asset.uri)) {
        return asset.uri;
      }

      const extension = resolveFileExtension(asset);
      const localFile = await fetch(asset.uri);
      if (!localFile.ok) {
        throw new Error("No se pudo leer la imagen seleccionada.");
      }

      const fileData = await localFile.arrayBuffer();

      return uploadProfileBinary(fileData, extension, asset.mimeType ?? "image/jpeg");
    },
    [uploadProfileBinary],
  );

  const pickPhotoFromWebCamera = useCallback(async (): Promise<File | null> => {
    if (typeof document === "undefined") return null;

    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.setAttribute("capture", "environment");

      input.onchange = () => {
        resolve(input.files?.[0] ?? null);
      };

      input.oncancel = () => {
        resolve(null);
      };

      input.click();
    });
  }, []);

  const applySelectedProfilePhoto = useCallback(
    async (result: ImagePicker.ImagePickerResult) => {
      if (result.canceled || result.assets.length === 0) return;

      setPhotoLoading(true);
      try {
        const nextProfilePhoto = await uploadProfilePhoto(result.assets[0]);
        handleChange("profilePhoto", nextProfilePhoto);
      } catch (e: any) {
        Alert.alert("Error", e?.message ?? "No se pudo actualizar la foto");
      } finally {
        setPhotoLoading(false);
      }
    },
    [handleChange, uploadProfilePhoto],
  );

  const handleSelectFromGallery = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permiso requerido", "Necesitas permitir acceso a la galeria.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsMultipleSelection: false,
      base64: true,
      quality: 0.8,
    });

    await applySelectedProfilePhoto(result);
  }, [applySelectedProfilePhoto]);

  const handleTakePhoto = useCallback(async () => {
    setPhotoPickerOpen(false);
    let permission;

    try {
      permission = await Camera.requestCameraPermissionsAsync();
    } catch {
      permission = null;
    }

    if (!permission?.granted) {
      const file = await pickPhotoFromWebCamera();
      if (!file) return;

      setPhotoLoading(true);
      try {
        const extension =
          file.name?.split(".").pop()?.toLowerCase() ||
          file.type?.split("/").pop()?.toLowerCase() ||
          "jpg";

        const nextProfilePhoto = await uploadProfileBinary(
          await file.arrayBuffer(),
          extension,
          file.type || "image/jpeg",
        );

        handleChange("profilePhoto", nextProfilePhoto);
      } catch (e: any) {
        Alert.alert("Error", e?.message ?? "No se pudo actualizar la foto");
      } finally {
        setPhotoLoading(false);
      }
      return;
    }

    setPhotoPickerOpen(false);
    setShowCameraModal(true);
  }, [handleChange, pickPhotoFromWebCamera, uploadProfileBinary]);

  const closeCameraModal = useCallback(() => {
    if (capturingPhoto) return;
    setShowCameraModal(false);
  }, [capturingPhoto]);

  const toggleCameraFacing = useCallback(() => {
    setCameraFacing((current) => (current === "back" ? "front" : "back"));
  }, []);

  const handleCapturePhoto = useCallback(async () => {
    if (!cameraRef.current || capturingPhoto) return;

    setCapturingPhoto(true);
    setPhotoLoading(true);

    try {
      const captured = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });

      if (captured?.uri) {
        const nextProfilePhoto = await uploadProfilePhoto({
          ...captured,
          mimeType: "image/jpeg",
        } as ImagePicker.ImagePickerAsset);

        handleChange("profilePhoto", nextProfilePhoto);
        setShowCameraModal(false);
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "No se pudo tomar la foto");
    } finally {
      setCapturingPhoto(false);
      setPhotoLoading(false);
    }
  }, [capturingPhoto, handleChange, uploadProfilePhoto]);

  const handleRemovePhoto = useCallback(() => {
    handleChange("profilePhoto", "");
    setPhotoPickerOpen(false);
  }, [handleChange]);

  const handleSave = useCallback(async () => {
    const trimmedNombre = form.nombreEstablecimiento.trim();
    const trimmedAddress = form.addressText.trim();
    const trimmedPhoto = form.profilePhoto.trim();

    if (trimmedNombre.length < 3) {
      setError("El nombre del establecimiento debe tener al menos 3 caracteres");
      return;
    }

    if (trimmedAddress.length < 5) {
      setError("La direccion debe tener al menos 5 caracteres");
      return;
    }

    const lat = addressLocation?.lat ?? profile?.latitud;
    const lon = addressLocation?.lon ?? profile?.longitud;

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      setError("Selecciona una direccion valida de la lista de sugerencias");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const updatedProfile = await updateBookdropProfile({
        nombreEstablecimiento: trimmedNombre,
        addressText: trimmedAddress,
        profilePhoto: trimmedPhoto,
        latitud: lat!,
        longitud: lon!,
      });

      setProfile(updatedProfile);
      setForm(toEditableFields(updatedProfile));
      setAddressLocation(null);
      setSuccessMessage("Perfil actualizado correctamente");
      setEditingEstablishment(false);
    } catch (e: any) {
      setError(e?.message ?? "No se pudo guardar el perfil");
    } finally {
      setSaving(false);
    }
  }, [form, addressLocation, profile]);

  const handleDelete = useCallback(async () => {
    if (deleting) return;

    try {
      setDeleting(true);
      setConfirmingDelete(false);
      setError(null);
      setSuccessMessage(null);
      await deleteBookdropProfile();
      await signOut();
    } catch (e: any) {
      setError(e?.message ?? "No se pudo eliminar el establecimiento");
      setDeleting(false);
    }
  }, [deleting, signOut]);

  if (authLoading) {
    return null;
  }

  if (!isBookdropUser) {
    return null;
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Header />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#e07a5f" />
          <Text style={styles.loadingText}>Cargando panel...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e07a5f" />
        }
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTextBlock}>
              <Text style={styles.heroTitle}>
                {profile?.nombreEstablecimiento ?? "Panel BookDrop"}
              </Text>
              <Text style={styles.heroSubtitle}>{profile?.email ?? "Sin email"}</Text>
            </View>

            <View style={[styles.statusBadge, { backgroundColor: statusMeta.backgroundColor }]}>
              <Ionicons name={statusMeta.icon} size={14} color={statusMeta.color} />
              <Text style={[styles.statusBadgeText, { color: statusMeta.color }]}>
                {statusMeta.label}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Resumen del establecimiento</Text>
          <View style={styles.summaryPhotoSection}>
            <View style={styles.summaryPhotoWrap}>
              {form.profilePhoto ? (
                <Image source={{ uri: form.profilePhoto }} style={styles.summaryPhotoImage} />
              ) : (
                <View style={styles.summaryPhotoPlaceholder}>
                  <FontAwesome name="camera" size={26} color="#e07a5f" />
                </View>
              )}
            </View>
          </View>
          <View style={styles.summaryGrid}>
            <InfoCard icon="person-outline" label="Responsable" value={profile?.name ?? "Sin nombre"} />
            <InfoCard icon="at-outline" label="Usuario" value={profile?.username ?? "Sin usuario"} />
            <InfoCard
              icon="calendar-outline"
              label="Alta"
              value={profile ? formatDate(profile.createdAt) : "Sin fecha"}
            />
            <InfoCard
              icon="swap-horizontal-outline"
              label="Intercambios en curso"
              value={String(exchanges.length)}
            />
          </View>
          <Pressable
            style={[styles.secondaryButton, styles.summaryEditButton]}
            onPress={openEditEstablishment}
            disabled={saving || deleting}
          >
            <Ionicons name="create-outline" size={18} color="#e07a5f" />
            <Text style={styles.secondaryButtonText}>Editar datos del establecimiento</Text>
          </Pressable>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={18} color="#b42318" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {successMessage ? (
          <View style={styles.successCard}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#1f8f5f" />
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Gestion de los intercambios</Text>
        <View style={styles.exchangeControlCard}>
          <Text style={styles.exchangeControlTitle}>Operar intercambios activos</Text>
          <Text style={styles.exchangeControlDescription}>
            Selecciona uno de los intercambios activos y, dentro de su ficha, introduce el PIN
            que te facilite la persona usuaria para confirmar cada paso.
          </Text>
        </View>

        <View style={styles.exchangesList}>
          {exchanges.map((exchange) => (
            <ExchangeCard
              key={exchange.meetingId}
              exchange={exchange}
              leadParticipantKey={exchangeLeadMap[exchange.meetingId]}
              onOpenActions={() => openExchangeActionModal(exchange)}
            />
          ))}
        </View>

        <Text style={styles.sectionTitle}>Acciones de cuenta</Text>
        <View style={styles.actionsCard}>
          <Pressable
            style={[styles.secondaryButton, (deleting || saving) && styles.buttonDisabled]}
            onPress={signOut}
            disabled={deleting || saving}
          >
            <Ionicons name="log-out-outline" size={18} color="#e07a5f" />
            <Text style={styles.secondaryButtonText}>Cerrar sesion</Text>
          </Pressable>

          <Pressable
            style={[styles.dangerButton, (deleting || saving) && styles.buttonDisabled]}
            onPress={() => setConfirmingDelete(true)}
            disabled={deleting || saving}
          >
            {deleting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={18} color="#fff" />
                <Text style={styles.dangerButtonText}>Eliminar establecimiento</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={confirmingDelete}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!deleting) {
            setConfirmingDelete(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="warning-outline" size={24} color="#b42318" />
            </View>

            <Text style={styles.modalTitle}>Confirmar eliminacion</Text>
            <Text style={styles.modalText}>
              Esta accion borrara el perfil bookdrop y su bookspot asociado. No se puede deshacer.
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.cancelButton, deleting && styles.buttonDisabled]}
                onPress={() => setConfirmingDelete(false)}
                disabled={deleting}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>

              <Pressable
                style={[styles.dangerButton, deleting && styles.buttonDisabled]}
                onPress={() => void handleDelete()}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={18} color="#fff" />
                    <Text style={styles.dangerButtonText}>Confirmar eliminacion</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <FloatingModal visible={exchangeActionModalOpen} onClose={closeExchangeActionModal}>
        <ScrollView contentContainerStyle={styles.editModalContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.editModalTitle}>Acciones del intercambio</Text>

          {selectedExchange ? (
            <>
              {(() => {
                const leadSelectionAllowed = canSelectLeadParticipant(
                  selectedExchange,
                  exchangeLeadMap[selectedExchange.meetingId],
                );
                const actionParticipantKey = getCurrentActorParticipantKey(
                  selectedExchange,
                  selectedLeadParticipantKey,
                );
                const highlightedParticipantKey = leadSelectionAllowed
                  ? selectedLeadParticipantKey
                  : actionParticipantKey;

                return (
                  <>
              <View style={styles.exchangeModalHeader}>
                <View style={styles.exchangeModalHeaderText}>
                  <Text style={styles.exchangeControlResultTitle}>
                    Intercambio #{selectedExchange.meetingId}
                  </Text>
                </View>

                <View
                  style={[
                    styles.exchangeStatusBadge,
                    {
                      backgroundColor: getExchangeStatusMeta(selectedExchange.status).backgroundColor,
                    },
                  ]}
                >
                  <Ionicons
                    name={getExchangeStatusMeta(selectedExchange.status).icon}
                    size={14}
                    color={getExchangeStatusMeta(selectedExchange.status).color}
                  />
                  <Text
                    style={[
                      styles.exchangeStatusText,
                      { color: getExchangeStatusMeta(selectedExchange.status).color },
                    ]}
                  >
                    {getExchangeStatusMeta(selectedExchange.status).label}
                  </Text>
                </View>
              </View>

              <Text style={styles.exchangeModalHelpText}>
                {getExchangeActionHelpText(selectedExchange, selectedLeadParticipantKey)}
              </Text>

              <TextInput
                value={exchangeCodeInput}
                onChangeText={(value) => {
                  setExchangeCodeInput(normalizeExchangePin(value));
                  setExchangeActionError(null);
                }}
                placeholder="Introduce el PIN compartido por la persona usuaria"
                placeholderTextColor="#a7a1b3"
                style={styles.input}
                autoCapitalize="characters"
                autoCorrect={false}
              />

              {exchangeActionError ? (
                <View style={styles.exchangeControlInfoBox}>
                  <Ionicons name="alert-circle-outline" size={18} color="#b42318" />
                  <Text style={[styles.exchangeControlInfoText, styles.exchangeControlErrorText]}>
                    {exchangeActionError}
                  </Text>
                </View>
              ) : null}

              <View style={styles.exchangeActionInfoBox}>
                <Ionicons name="person-outline" size={18} color="#e07a5f" />
                <Text style={styles.exchangeActionInfoText}>
                  {leadSelectionAllowed
                    ? "Selecciona quien entrega primero para fijar el flujo del intercambio."
                    : `En este paso solo puede actuar ${getExchangeParticipantName(
                        selectedExchange,
                        actionParticipantKey,
                      )}.`}
                </Text>
              </View>

              <View style={styles.exchangeModalPeople}>
                <Pressable
                  style={[
                    styles.exchangeOptionCard,
                    highlightedParticipantKey === "firstParticipant" &&
                      styles.exchangeOptionCardSelected,
                    !leadSelectionAllowed && styles.exchangeOptionCardLocked,
                  ]}
                  onPress={() => {
                    if (leadSelectionAllowed) {
                      setSelectedLeadParticipantKey("firstParticipant");
                    }
                  }}
                  disabled={!leadSelectionAllowed}
                >
                  <Text style={styles.exchangeOptionTitle}>
                    {getExchangeParticipantName(selectedExchange, "firstParticipant")}
                  </Text>
                  <Text style={styles.exchangeOptionText}>
                    {getExchangeParticipantBookTitle(selectedExchange, "firstParticipant")}
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.exchangeOptionCard,
                    highlightedParticipantKey === "secondParticipant" &&
                      styles.exchangeOptionCardSelected,
                    !leadSelectionAllowed && styles.exchangeOptionCardLocked,
                  ]}
                  onPress={() => {
                    if (leadSelectionAllowed) {
                      setSelectedLeadParticipantKey("secondParticipant");
                    }
                  }}
                  disabled={!leadSelectionAllowed}
                >
                  <Text style={styles.exchangeOptionTitle}>
                    {getExchangeParticipantName(selectedExchange, "secondParticipant")}
                  </Text>
                  <Text style={styles.exchangeOptionText}>
                    {getExchangeParticipantBookTitle(selectedExchange, "secondParticipant")}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.editModalActions}>
                <Pressable
                  style={[styles.cancelButton, processingExchange && styles.buttonDisabled]}
                  onPress={closeExchangeActionModal}
                  disabled={processingExchange}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </Pressable>

                <Pressable
                  style={[styles.primaryButton, processingExchange && styles.buttonDisabled]}
                  onPress={() => void handleConfirmExchangeAction()}
                  disabled={processingExchange}
                >
                  {processingExchange ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                      <Text style={styles.exchangeActionButtonText}>
                        {getExchangeActionLabel(selectedExchange, selectedLeadParticipantKey)}
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
                  </>
                );
              })()}
            </>
          ) : null}
        </ScrollView>
      </FloatingModal>

      <FloatingModal
        visible={editingEstablishment}
        onClose={closeEditEstablishment}
      >
        <ScrollView contentContainerStyle={styles.editModalContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.editModalTitle}>Editar datos del establecimiento</Text>

          <FieldLabel label="Nombre del establecimiento" />
          <TextInput
            value={form.nombreEstablecimiento}
            onChangeText={(value) => handleChange("nombreEstablecimiento", value)}
            placeholder="Nombre del establecimiento"
            placeholderTextColor="#a7a1b3"
            style={styles.input}
          />

          <FieldLabel label="Direccion" />
          <View style={styles.addressInputRow}>
            <TextInput
              value={form.addressText}
              onChangeText={handleAddressSearch}
              placeholder="Busca la direccion del establecimiento..."
              placeholderTextColor="#a7a1b3"
              style={styles.addressInput}
              autoCapitalize="none"
            />
            {searchingAddress && <ActivityIndicator size="small" color="#e07a5f" />}
            {addressLocation && <Ionicons name="checkmark-circle" size={20} color="#4caf50" />}
          </View>

          {addressSuggestions.length > 0 && (
            <View style={styles.addressSuggestionsCard}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
              >
                {addressSuggestions.map((item, index) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => handleSelectAddress(item)}
                    style={[
                      styles.addressSuggestionItem,
                      index < addressSuggestions.length - 1 && styles.addressSuggestionDivider,
                      index % 2 === 0
                        ? styles.addressSuggestionEven
                        : styles.addressSuggestionOdd,
                    ]}
                  >
                    <Text style={styles.addressSuggestionText} numberOfLines={2}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <FieldLabel label="Foto de perfil" />
          <View style={styles.profilePhotoSection}>
            <TouchableOpacity
              disabled={photoLoading}
              onPress={() => setPhotoPickerOpen(true)}
              style={styles.profilePhotoTrigger}
            >
              <View style={styles.profilePhotoPreviewWrap}>
                {form.profilePhoto ? (
                  <Image source={{ uri: form.profilePhoto }} style={styles.profilePhotoPreview} />
                ) : (
                  <View style={styles.profilePhotoPlaceholder}>
                    <FontAwesome name="camera" size={22} color="#e07a5f" />
                  </View>
                )}
              </View>

              <View style={styles.profilePhotoTextBlock}>
                <Text style={styles.profilePhotoTitle}>Cambiar foto del establecimiento</Text>
                <Text style={styles.profilePhotoText}>
                  {form.profilePhoto
                    ? "Abrir opciones de galeria, camara o borrar foto"
                    : "Selecciona una foto desde galeria o camara"}
                </Text>
              </View>

              {photoLoading ? (
                <ActivityIndicator size="small" color="#e07a5f" />
              ) : (
                <Ionicons name="chevron-forward" size={18} color="#a7a1b3" />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.editModalActions}>
            <Pressable
              style={[styles.cancelButton, (saving || photoLoading) && styles.buttonDisabled]}
              onPress={closeEditEstablishment}
              disabled={saving || photoLoading}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>

            <Pressable
              style={[styles.primaryButton, (saving || deleting) && styles.buttonDisabled]}
              onPress={() => void handleSave()}
              disabled={saving || deleting}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={18} color="#fff" />
                  <Text style={styles.primaryButtonText}>Guardar cambios</Text>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </FloatingModal>

      <PhotoPickerModal
        visible={photoPickerOpen}
        onClose={() => setPhotoPickerOpen(false)}
        onPickGallery={async () => {
          await handleSelectFromGallery();
          setPhotoPickerOpen(false);
        }}
        onPickCamera={async () => {
          await handleTakePhoto();
        }}
        onRemovePhoto={handleRemovePhoto}
        hasPhoto={Boolean(form.profilePhoto)}
        loading={photoLoading}
      />

      <Modal
        visible={showCameraModal}
        animationType="slide"
        onRequestClose={closeCameraModal}
      >
        <View style={styles.cameraScreen}>
          <CameraView ref={cameraRef} style={{ flex: 1 }} facing={cameraFacing} />

          <View style={styles.cameraTopBar}>
            <TouchableOpacity style={styles.cameraCloseButton} onPress={closeCameraModal}>
              <FontAwesome name="times" size={20} color="#fff" />
              <Text style={styles.cameraButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cameraBottomBar}>
            <TouchableOpacity style={styles.cameraSecondaryButton} onPress={toggleCameraFacing}>
              <FontAwesome name="refresh" size={18} color="#fff" />
              <Text style={styles.cameraButtonText}>Girar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cameraCaptureButton, capturingPhoto && styles.buttonDisabled]}
              onPress={handleCapturePhoto}
              disabled={capturingPhoto}
            >
              {capturingPhoto ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <FontAwesome name="camera" size={20} color="#fff" />
                  <Text style={styles.cameraButtonText}>Capturar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function FieldLabel({ label }: { label: string }) {
  return <Text style={styles.fieldLabel}>{label}</Text>;
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoCard}>
      <Ionicons name={icon} size={18} color="#e07a5f" />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function ExchangeCard({
  exchange,
  leadParticipantKey,
  onOpenActions,
}: {
  exchange: BookdropExchange;
  leadParticipantKey?: ExchangeParticipantKey;
  onOpenActions: () => void;
}) {
  const statusMeta = getExchangeStatusMeta(exchange.status);

  return (
    <View style={styles.exchangeCard}>
      <View style={styles.exchangeHeader}>
        <View style={styles.exchangeHeaderTextBlock}>
          <Text style={styles.exchangeTitle}>Intercambio #{exchange.meetingId}</Text>
        </View>
        <View style={[styles.exchangeStatusBadge, { backgroundColor: statusMeta.backgroundColor }]}>
          <Ionicons name={statusMeta.icon} size={14} color={statusMeta.color} />
          <Text style={[styles.exchangeStatusText, { color: statusMeta.color }]}>
            {statusMeta.label}
          </Text>
        </View>
      </View>

      <View style={styles.exchangeParticipants}>
        <ExchangeParticipantCard
          exchange={exchange}
          leadParticipantKey={leadParticipantKey}
          participantKey="firstParticipant"
        />
        <ExchangeParticipantCard
          exchange={exchange}
          leadParticipantKey={leadParticipantKey}
          participantKey="secondParticipant"
        />
      </View>

      <Pressable style={styles.exchangeCardActionButton} onPress={onOpenActions}>
        <Ionicons name="key-outline" size={16} color="#fff" />
        <Text style={styles.exchangeCardActionText}>Abrir acciones</Text>
      </Pressable>
    </View>
  );
}

function ExchangeParticipantCard({
  exchange,
  leadParticipantKey,
  participantKey,
}: {
  exchange: BookdropExchange;
  leadParticipantKey?: ExchangeParticipantKey;
  participantKey: ExchangeParticipantKey;
}) {
  const participantShelfView = getParticipantShelfView(exchange, participantKey, leadParticipantKey);
  const participantName = getExchangeParticipantName(exchange, participantKey);

  return (
    <View style={styles.exchangeParticipantCard}>
      <View style={styles.exchangeParticipantHeader}>
        <Text style={styles.exchangeParticipantValue}>{participantName}</Text>
      </View>

      {participantShelfView.books.length > 0 ? (
        <View style={styles.exchangeBooksList}>
          {participantShelfView.books.map((book: ParticipantShelfBook, index: number) => {
            const displayBookStatus = getExchangeDisplayBookStatusMeta(book.status);

            return (
              <View key={`${participantKey}-${book.title}-${index}`} style={styles.exchangeBookItem}>
                <Text style={styles.exchangeParticipantValue}>{book.title}</Text>
                <Text style={styles.exchangeBookOwnerText}>
                  Propietario original: {book.originalOwner}
                </Text>

                <View
                  style={[
                    styles.bookStatusBadge,
                    { backgroundColor: displayBookStatus.backgroundColor },
                  ]}
                >
                  <Text style={[styles.bookStatusText, { color: displayBookStatus.color }]}>
                    {displayBookStatus.label}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.exchangeEmptyState}>
          <Text style={styles.exchangeEmptyStateText}>
            {participantShelfView.emptyMessage ?? "No hay ningun libro en este lado por ahora."}
          </Text>
        </View>
      )}

    </View>
  );
}

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
      <Pressable style={styles.floatingModalBackdrop} onPress={onClose}>
        <Pressable
          style={styles.floatingModalCard}
          onPress={(event) => {
            event.stopPropagation();
          }}
        >
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function PhotoPickerModal({
  visible,
  onClose,
  onPickGallery,
  onPickCamera,
  onRemovePhoto,
  hasPhoto,
  loading,
}: {
  visible: boolean;
  onClose: () => void;
  onPickGallery: () => void;
  onPickCamera: () => void;
  onRemovePhoto?: () => void;
  hasPhoto?: boolean;
  loading: boolean;
}) {
  return (
    <FloatingModal visible={visible} onClose={onClose}>
      <View style={{ padding: 24 }}>
        <Text style={styles.photoPickerTitle}>Seleccionar foto</Text>

        <TouchableOpacity
          style={styles.photoPickerAction}
          onPress={onPickGallery}
          disabled={loading}
        >
          <View>
            <Text style={styles.photoPickerActionTitle}>Galeria</Text>
            <Text style={styles.photoPickerActionText}>Selecciona una foto de tu galeria</Text>
          </View>
          <FontAwesome name="image" size={20} color="#e07a5f" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.photoPickerAction, styles.photoPickerCameraAction]}
          onPress={onPickCamera}
          disabled={loading}
        >
          <View>
            <Text style={styles.photoPickerActionTitle}>Camara</Text>
            <Text style={styles.photoPickerActionText}>Toma una foto con tu camara</Text>
          </View>
          <FontAwesome name="camera" size={20} color="#e07a5f" />
        </TouchableOpacity>

        {hasPhoto ? (
          <TouchableOpacity
            style={styles.photoPickerDeleteAction}
            onPress={onRemovePhoto}
            disabled={loading}
          >
            <View>
              <Text style={styles.photoPickerDeleteTitle}>Borrar foto</Text>
              <Text style={styles.photoPickerActionText}>Quita tu foto actual del perfil</Text>
            </View>
            <FontAwesome name="trash" size={20} color="#b64b34" />
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity style={styles.photoPickerCancel} onPress={onClose} disabled={loading}>
          <Text style={styles.photoPickerCancelText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </FloatingModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fdfbf7",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#8B7355",
    fontSize: 14,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  heroCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f1e7df",
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  heroTextBlock: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#3d405b",
  },
  heroSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#7b768f",
  },
  heroDescription: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    color: "#4b5563",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  errorCard: {
    marginTop: 12,
    backgroundColor: "#fdeaea",
    borderColor: "#f6c9c9",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  errorText: {
    color: "#9f1d1d",
    fontSize: 13,
    flex: 1,
  },
  successCard: {
    marginTop: 12,
    backgroundColor: "#e8f7ef",
    borderColor: "#ccebd8",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  successText: {
    color: "#1f8f5f",
    fontSize: 13,
    flex: 1,
  },
  sectionTitle: {
    marginTop: 18,
    marginBottom: 10,
    fontSize: 16,
    fontWeight: "700",
    color: "#3d405b",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  summaryPhotoSection: {
    alignItems: "center",
    marginTop: 2,
    marginBottom: 14,
  },
  summaryPhotoWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: "hidden",
    backgroundColor: "#f8ede7",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#efe6de",
  },
  summaryPhotoImage: {
    width: 96,
    height: 96,
  },
  summaryPhotoPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryEditButton: {
    marginTop: 14,
  },
  infoCard: {
    width: "48%",
    backgroundColor: "#fdfbf7",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#efe6de",
    padding: 12,
  },
  infoLabel: {
    marginTop: 8,
    fontSize: 12,
    color: "#7a748b",
  },
  infoValue: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "600",
    color: "#2f2d3a",
  },
  exchangesList: {
    gap: 12,
    marginBottom: 4,
  },
  exchangeControlCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#efe6de",
    padding: 14,
    marginBottom: 12,
  },
  exchangeControlTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#3d405b",
  },
  exchangeControlDescription: {
    marginTop: 6,
    marginBottom: 12,
    fontSize: 13,
    lineHeight: 19,
    color: "#7a748b",
  },
  exchangeControlResult: {
    marginTop: 2,
    gap: 10,
  },
  exchangeControlHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  exchangeControlTextBlock: {
    flex: 1,
  },
  exchangeControlResultTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#3d405b",
  },
  exchangeControlResultSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#6a6175",
  },
  exchangeControlCodeText: {
    fontSize: 13,
    color: "#6a6175",
  },
  exchangeControlInfoBox: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e8dfd7",
    backgroundColor: "#fffdfa",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  exchangeControlInfoText: {
    flex: 1,
    fontSize: 13,
    color: "#7b768f",
  },
  exchangeControlErrorText: {
    color: "#9f1d1d",
  },
  exchangeModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  exchangeModalHeaderText: {
    flex: 1,
  },
  exchangeModalHelpText: {
    marginTop: 12,
    marginBottom: 14,
    fontSize: 13,
    lineHeight: 19,
    color: "#6a6175",
  },
  exchangeActionInfoBox: {
    marginBottom: 12,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f1ddd5",
    backgroundColor: "#fff8f4",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  exchangeActionInfoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: "#6a6175",
  },
  exchangeModalPeople: {
    gap: 10,
  },
  exchangeOptionCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e8dfd7",
    backgroundColor: "#fffdfa",
    padding: 12,
  },
  exchangeOptionCardSelected: {
    borderColor: "#e07a5f",
    backgroundColor: "#fff1ed",
  },
  exchangeOptionCardLocked: {
    opacity: 0.72,
  },
  exchangeOptionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2f2d3a",
  },
  exchangeOptionText: {
    marginTop: 4,
    fontSize: 12,
    color: "#7a748b",
  },
  exchangeCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#efe6de",
    padding: 14,
  },
  exchangeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  exchangeTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#3d405b",
    flex: 1,
  },
  exchangeHeaderTextBlock: {
    flex: 1,
  },
  exchangePinText: {
    marginTop: 4,
    fontSize: 12,
    color: "#7a748b",
  },
  exchangeStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  exchangeStatusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  exchangeParticipants: {
    flexDirection: "row",
    gap: 10,
  },
  exchangeCardActionButton: {
    marginTop: 14,
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: "#e07a5f",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  exchangeCardActionText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  exchangeParticipantCard: {
    flex: 1,
    backgroundColor: "#fdfbf7",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#efe6de",
    padding: 10,
  },
  exchangeParticipantHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  exchangeParticipantLabel: {
    fontSize: 12,
    color: "#7a748b",
  },
  exchangeBookLabel: {
    marginTop: 10,
  },
  exchangeCodeLabel: {
    marginTop: 10,
  },
  exchangeParticipantValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2f2d3a",
  },
  exchangeParticipantHint: {
    marginTop: 4,
    fontSize: 12,
    color: "#7a748b",
  },
  exchangeBooksList: {
    gap: 8,
  },
  exchangeBookItem: {
    marginTop: 2,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e8dfd7",
    backgroundColor: "#fffdfa",
  },
  exchangeBookOwnerText: {
    marginTop: 4,
    fontSize: 12,
    color: "#7a748b",
  },
  exchangeEmptyState: {
    marginTop: 2,
    minHeight: 74,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#d8c9c1",
    backgroundColor: "#fffdfa",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  exchangeEmptyStateText: {
    fontSize: 12,
    color: "#a7a1b3",
    textAlign: "center",
  },
  bookStatusBadge: {
    alignSelf: "flex-start",
    marginTop: 8,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  bookStatusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  floatingModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  floatingModalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    width: "100%",
    maxHeight: "85%",
    overflow: "hidden",
  },
  photoPickerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#3e2723",
    marginBottom: 20,
  },
  photoPickerAction: {
    backgroundColor: "#fdfbf7",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  photoPickerCameraAction: {
    marginBottom: 20,
  },
  photoPickerActionTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#3e2723",
  },
  photoPickerActionText: {
    fontSize: 12,
    color: "#8B7355",
    marginTop: 2,
  },
  photoPickerDeleteAction: {
    backgroundColor: "#fff1ed",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  photoPickerDeleteTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#b64b34",
  },
  photoPickerCancel: {
    backgroundColor: "#fdfbf7",
    borderRadius: 999,
    padding: 14,
    alignItems: "center",
  },
  photoPickerCancelText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#8B7355",
  },
  profilePhotoSection: {
    marginBottom: 12,
  },
  profilePhotoTrigger: {
    minHeight: 92,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e8dfd7",
    backgroundColor: "#fffdfa",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  profilePhotoPreviewWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#f8ede7",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  profilePhotoPreview: {
    width: 68,
    height: 68,
  },
  profilePhotoPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  profilePhotoTextBlock: {
    flex: 1,
  },
  profilePhotoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2f2d3a",
  },
  profilePhotoText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: "#7a748b",
  },
  cameraScreen: {
    flex: 1,
    backgroundColor: "#121212",
  },
  cameraTopBar: {
    position: "absolute",
    top: 48,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  cameraCloseButton: {
    minHeight: 40,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.48)",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cameraBottomBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cameraSecondaryButton: {
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.48)",
  },
  cameraCaptureButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: "#e07a5f",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  cameraButtonText: {
    color: "#fff",
    fontWeight: "900",
  },
  editModalContent: {
    padding: 24,
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#3e2723",
    marginBottom: 20,
  },
  addressInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e8dfd7",
    backgroundColor: "#fffdfa",
    paddingHorizontal: 14,
    marginBottom: 4,
    minHeight: 46,
  },
  addressInput: {
    flex: 1,
    color: "#2f2d3a",
    paddingVertical: 12,
  },
  addressSuggestionsCard: {
    borderWidth: 1,
    borderColor: "#e8dfd7",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 8,
    maxHeight: 160,
  },
  addressSuggestionItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  addressSuggestionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#e8dfd7",
  },
  addressSuggestionEven: {
    backgroundColor: "#ffffff",
  },
  addressSuggestionOdd: {
    backgroundColor: "#fdfbf7",
  },
  addressSuggestionText: {
    fontSize: 13,
    color: "#2f2d3a",
    lineHeight: 18,
  },
  editModalActions: {
    marginTop: 8,
    gap: 10,
  },
  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#efe6de",
    padding: 14,
  },
  fieldLabel: {
    marginBottom: 6,
    fontSize: 13,
    fontWeight: "600",
    color: "#4b5563",
  },
  input: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e8dfd7",
    backgroundColor: "#fffdfa",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    color: "#2f2d3a",
  },
  multilineInput: {
    minHeight: 88,
    textAlignVertical: "top",
  },
  actionsCard: {
    gap: 10,
    marginBottom: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(33, 24, 18, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fffdf9",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#f1ddd5",
  },
  modalIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fdeaea",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#8a1c13",
    textAlign: "center",
  },
  modalText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: "#7a4350",
    textAlign: "center",
  },
  modalActions: {
    marginTop: 18,
    gap: 10,
  },
  primaryButton: {
    marginTop: 4,
    minHeight: 48,
    backgroundColor: "#e07a5f",
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  exchangeActionButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    flexShrink: 1,
  },
  secondaryButton: {
    minHeight: 48,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e07a5f",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryButtonText: {
    color: "#e07a5f",
    fontSize: 15,
    fontWeight: "700",
  },
  cancelButton: {
    minHeight: 44,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d8c9c1",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    color: "#6a6175",
    fontSize: 14,
    fontWeight: "700",
  },
  dangerButton: {
    minHeight: 48,
    backgroundColor: "#b42318",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dangerButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
