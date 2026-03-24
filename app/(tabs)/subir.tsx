import Header from "@/components/Header";
import FlowHeader from "@/components/book-upload/FlowHeader";
import FlowInfoModal from "@/components/book-upload/FlowInfoModal";
import {
  MIN_BOOK_PHOTOS,
  MAX_BOOK_PHOTOS,
  createBookDraft,
  deleteBook,
  getBookDetail,
  getMyDrafts,
  upsertBookPhotos,
  type BookDraftSummary,
} from "@/lib/books";
import { getPhotoStepValidationError } from "@/lib/bookUploadValidation";
import supabase from "@/lib/supabase";
import {
  consumeUploadFlowResetFlag,
  markUploadFlowResetNeeded,
} from "@/lib/uploadFlowState";
import { getStoredUserId } from "@/lib/authSession";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Camera, CameraView, type CameraType } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type LocalPhoto = {
  id: string;
  uri: string;
  fileName?: string | null;
  mimeType?: string;
  url?: string | null;
};

type InfoModalState = {
  title: string;
  message: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
};

const STORAGE_BUCKET = process.env.EXPO_PUBLIC_BOOK_IMAGES_BUCKET ?? "images";

function buildPhotoId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) return error.message;
  return "No se pudo completar la operación.";
}

function fileExtension(photo: LocalPhoto): string {
  const fromName = photo.fileName?.split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;

  if (photo.mimeType === "image/png") return "png";
  if (photo.mimeType === "image/webp") return "webp";
  return "jpg";
}

function formatUpdatedAt(value?: string | null): string {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function SubirScreen() {
  const { draftId: draftIdParam, reset: resetParam } = useLocalSearchParams<{
    draftId?: string;
    reset?: string;
  }>();
  const [draftId, setDraftId] = useState<number | null>(null);
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [deletingDraftId, setDeletingDraftId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<BookDraftSummary[]>([]);
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [showSaveDraftModal, setShowSaveDraftModal] = useState(false);
  const [pendingDeleteDraft, setPendingDeleteDraft] = useState<BookDraftSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [infoModal, setInfoModal] = useState<InfoModalState | null>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<CameraType>("back");
  const [capturingPhoto, setCapturingPhoto] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);

  const canAddMorePhotos = photos.length < MAX_BOOK_PHOTOS;
  const canProceedToData = photos.length >= MIN_BOOK_PHOTOS && photos.length <= MAX_BOOK_PHOTOS;
  const photoCounter = useMemo(
    () => `${photos.length}/${MAX_BOOK_PHOTOS}`,
    [photos.length],
  );
  const saveDraftSummary = useMemo(() => {
    const draftLabel = draftId ? `#${draftId}` : "nuevo";
    return `Se guardará el borrador ${draftLabel} con ${photos.length} de ${MAX_BOOK_PHOTOS} fotos cargadas.`;
  }, [draftId, photos.length]);

  const resetUploadScreen = useCallback((message?: string) => {
    setDraftId(null);
    setPhotos([]);
    setError(null);
    setFeedback(message ?? null);
    setShowDraftsModal(false);
    setShowSaveDraftModal(false);
    setPendingDeleteDraft(null);
    setInfoModal(null);
  }, []);

  const closeInfoModal = useCallback(() => {
    setInfoModal(null);
  }, []);

  useEffect(() => {
    if (!resetParam) return;
    resetUploadScreen("Flujo reiniciado. Puedes subir un libro nuevo.");
  }, [resetParam, resetUploadScreen]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const maybeResetFromFlow = async () => {
        const shouldReset = await consumeUploadFlowResetFlag();
        if (!active || !shouldReset) return;
        resetUploadScreen();
      };

      maybeResetFromFlow();

      return () => {
        active = false;
      };
    }, [resetUploadScreen]),
  );

  useEffect(() => {
    const parsed = Number(draftIdParam);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed === draftId) return;

    let active = true;

    const loadDraftFromParams = async () => {
      setSaving(true);
      setError(null);
      setFeedback(null);

      try {
        const detail = await getBookDetail(parsed);
        if (!active) return;

        const loadedPhotos: LocalPhoto[] = (detail.photos ?? [])
          .filter((photo) => typeof photo?.url === "string" && photo.url.trim().length > 0)
          .slice(0, MAX_BOOK_PHOTOS)
          .map((photo) => ({
            id: buildPhotoId(),
            uri: photo.url as string,
            url: photo.url as string,
          }));

        setDraftId(parsed);
        setPhotos(loadedPhotos);
        setFeedback("Borrador cargado correctamente.");
      } catch (err) {
        if (!active) return;
        setError(errorMessage(err));
      } finally {
        if (active) setSaving(false);
      }
    };

    loadDraftFromParams();

    return () => {
      active = false;
    };
  }, [draftIdParam, draftId]);

  const appendAssets = (assets: ImagePicker.ImagePickerAsset[]) => {
    if (assets.length === 0) return;

    const available = MAX_BOOK_PHOTOS - photos.length;
    if (available <= 0) {
      setInfoModal({
        title: "Límite alcanzado",
        message: `Solo puedes añadir ${MAX_BOOK_PHOTOS} fotos.`,
      });
      return;
    }

    const selected = assets.slice(0, available);
    const newPhotos: LocalPhoto[] = selected.map((asset) => ({
      id: buildPhotoId(),
      uri: asset.uri,
      fileName: asset.fileName,
      mimeType: asset.mimeType ?? undefined,
    }));

    setPhotos((current) => [...current, ...newPhotos]);
    setError(null);
    setFeedback(null);

    if (assets.length > available) {
      setInfoModal({
        title: "Límite alcanzado",
        message: `Solo puedes añadir ${MAX_BOOK_PHOTOS} fotos.`,
      });
    }
  };

  const handleOpenGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setInfoModal({
        title: "Permiso requerido",
        message: "Necesitas permitir acceso a la galería.",
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsMultipleSelection: true,
      selectionLimit: MAX_BOOK_PHOTOS - photos.length,
      quality: 0.8,
    });

    if (!result.canceled) appendAssets(result.assets);
  };

  const handleTakePhoto = async () => {
    const permission = await Camera.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setInfoModal({
        title: "Permiso de cámara necesario",
        message:
          "Para hacer una foto necesitas permitir el acceso a la cámara en los ajustes del dispositivo.",
        secondaryLabel: "Abrir ajustes",
        onSecondaryPress: () => {
          setInfoModal(null);
          Linking.openSettings().catch(() => undefined);
        },
      });
      return;
    }

    setShowCameraModal(true);
  };

  const toggleCameraFacing = () => {
    setCameraFacing((current) => (current === "back" ? "front" : "back"));
  };

  const closeCameraModal = () => {
    if (capturingPhoto) return;
    setShowCameraModal(false);
  };

  const handleCapturePhoto = async () => {
    if (!cameraRef.current || capturingPhoto) return;
    if (!canAddMorePhotos) {
      setInfoModal({
        title: "Límite alcanzado",
        message: `Solo puedes añadir ${MAX_BOOK_PHOTOS} fotos.`,
      });
      return;
    }

    setCapturingPhoto(true);

    try {
      const captured = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });

      if (captured?.uri) {
        const newPhoto: LocalPhoto = {
          id: buildPhotoId(),
          uri: captured.uri,
          mimeType: "image/jpeg",
        };

        setPhotos((current) => [...current, newPhoto]);
        setError(null);
        setFeedback(null);
      }

      setShowCameraModal(false);
    } catch (err) {
      setInfoModal({
        title: "Error al tomar la foto",
        message: errorMessage(err),
      });
    } finally {
      setCapturingPhoto(false);
    }
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos((current) => current.filter((photo) => photo.id !== id));
    setError(null);
    setFeedback(null);
  };

  const ensureDraft = async (): Promise<number> => {
    if (draftId) return draftId;

    // Creamos borrador solo cuando el usuario intenta guardar o avanzar.
    const created = await createBookDraft();
    setDraftId(created.id);
    return created.id;
  };

  const uploadPhotoToStorage = async (photo: LocalPhoto): Promise<string> => {
    const extension = fileExtension(photo);
    const owner = (await getStoredUserId()) ?? "anonymous";
    // Nombre único para evitar colisiones entre subidas repetidas.
    const path = `books/${owner}/${buildPhotoId()}.${extension}`;

    const localFile = await fetch(photo.uri);
    if (!localFile.ok) {
      throw new Error("No se pudo leer una de las fotos seleccionadas.");
    }

    const fileData = await localFile.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, fileData, {
        contentType: photo.mimeType ?? "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(
        `No se pudo subir la imagen al storage (${STORAGE_BUCKET}): ${uploadError.message}`,
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(path);

    if (!publicUrlData?.publicUrl) {
      throw new Error("No se pudo generar la URL pública de una imagen.");
    }

    return publicUrlData.publicUrl;
  };

  const syncPhotos = async (bookId: number): Promise<void> => {
    const currentPhotos = [...photos];
    const uploaded: LocalPhoto[] = [];
    const urls: string[] = [];

    for (const photo of currentPhotos) {
      if (photo.url) {
        uploaded.push(photo);
        urls.push(photo.url);
        continue;
      }

      const uploadedUrl = await uploadPhotoToStorage(photo);
      uploaded.push({ ...photo, url: uploadedUrl });
      urls.push(uploadedUrl);
    }

    // El backend reemplaza la colección completa en cada llamada.
    await upsertBookPhotos(bookId, urls);
    setPhotos(uploaded);
  };

  const handleSaveDraft = async () => {
    if (photos.length === 0) {
      setInfoModal({
        title: "Foto obligatoria",
        message: "No puedes guardar un borrador sin fotos. Añade al menos 1 foto.",
      });
      return;
    }

    setSaving(true);
    setError(null);
    setFeedback(null);

    try {
      const bookId = await ensureDraft();
      await syncPhotos(bookId);
      await markUploadFlowResetNeeded();
      resetUploadScreen("Borrador guardado correctamente.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const openSaveDraftModal = () => {
    if (saving) return;
    if (photos.length === 0) {
      setInfoModal({
        title: "Foto obligatoria",
        message: "No puedes guardar un borrador sin fotos. Añade al menos 1 foto.",
      });
      return;
    }
    setShowSaveDraftModal(true);
  };

  const confirmSaveDraft = () => {
    setShowSaveDraftModal(false);
    handleSaveDraft();
  };

  const handleNext = async () => {
    const photosError = getPhotoStepValidationError(photos.length);
    if (photosError) {
      setInfoModal({
        title: "Faltan fotos",
        message: photosError,
      });
      return;
    }

    setSaving(true);
    setError(null);
    setFeedback(null);

    try {
      const bookId = await ensureDraft();
      await syncPhotos(bookId);
      router.push(`/books/create/${bookId}/datos` as any);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDrafts = async () => {
    setLoadingDrafts(true);
    setError(null);
    setFeedback(null);

    try {
      const myDrafts = await getMyDrafts(20);
      setDrafts(myDrafts);
      setShowDraftsModal(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoadingDrafts(false);
    }
  };

  const handleLoadDraft = async (draft: BookDraftSummary) => {
    setSaving(true);
    setError(null);
    setFeedback(null);

    try {
      const detail = await getBookDetail(draft.id);
      const loadedPhotos: LocalPhoto[] = (detail.photos ?? [])
        .filter((photo) => typeof photo?.url === "string" && photo.url.trim().length > 0)
        .slice(0, MAX_BOOK_PHOTOS)
        .map((photo) => ({
          id: buildPhotoId(),
          uri: photo.url as string,
          url: photo.url as string,
        }));

      setDraftId(draft.id);
      setPhotos(loadedPhotos);
      setShowDraftsModal(false);
      setFeedback("Borrador cargado correctamente.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const performDeleteDraft = async (draft: BookDraftSummary) => {
    setDeletingDraftId(draft.id);
    setError(null);
    setPendingDeleteDraft(null);

    try {
      await deleteBook(draft.id);
      setDrafts((current) => current.filter((item) => item.id !== draft.id));

      if (draftId === draft.id) {
        setDraftId(null);
        setPhotos([]);
      }

      setFeedback("Borrador eliminado correctamente.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setDeletingDraftId(null);
    }
  };

  const handleDeleteDraft = (draft: BookDraftSummary) => {
    if (deletingDraftId) return;
    setPendingDeleteDraft(draft);
  };

  const closeDeleteDraftModal = () => {
    setPendingDeleteDraft(null);
  };

  const confirmDeleteDraft = () => {
    if (!pendingDeleteDraft) return;
    performDeleteDraft(pendingDeleteDraft);
  };

  const handleCancel = () => {
    Alert.alert(
      "Cancelar",
      "Se perderán los cambios no guardados de esta pantalla.",
      [
        { text: "Seguir editando", style: "cancel" },
        {
          text: "Cancelar subida",
          style: "destructive",
          onPress: () => {
            resetUploadScreen();
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <Header />
      <FlowHeader
        stepState={{ active: "fotos" }}
        loadingDrafts={loadingDrafts}
        onLoadDrafts={handleOpenDrafts}
        onCancel={handleCancel}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Fotos del libro</Text>
          <Text style={styles.sectionSubtitle}>
            Añade una foto para mostrar el estado del libro.
            <Text style={styles.required}> *</Text>
          </Text>
          <Text style={styles.counterText}>{photoCounter}</Text>

          <View style={styles.grid}>
            {canAddMorePhotos ? (
              <TouchableOpacity style={styles.placeholderTile} onPress={handleOpenGallery}>
                <View style={styles.placeholderIcon}>
                  <FontAwesome name="camera" size={22} color="#d5785f" />
                </View>
                <Text style={styles.placeholderText}>Añadir foto</Text>
              </TouchableOpacity>
            ) : null}

            {photos.map((photo) => (
              <View key={photo.id} style={styles.photoTile}>
                <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                <Pressable
                  style={styles.removeButton}
                  onPress={() => handleRemovePhoto(photo.id)}
                >
                  <FontAwesome name="times" size={12} color="#fff" />
                </Pressable>
              </View>
            ))}
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.primaryAction, (!canAddMorePhotos || saving) && styles.disabledAction]}
              onPress={handleTakePhoto}
              disabled={!canAddMorePhotos || saving}
            >
              <FontAwesome name="camera" size={17} color="#fff" />
              <Text style={styles.primaryActionText}>Hacer foto</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.secondaryAction,
                (!canAddMorePhotos || saving) && styles.disabledSecondaryAction,
              ]}
              onPress={handleOpenGallery}
              disabled={!canAddMorePhotos || saving}
            >
              <FontAwesome name="image" size={17} color="#d5785f" />
              <Text style={styles.secondaryActionText}>Galería</Text>
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {feedback ? <Text style={styles.feedbackText}>{feedback}</Text> : null}
          {draftId ? <Text style={styles.draftIdText}>Borrador activo: #{draftId}</Text> : null}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.footerSaveButton, saving && styles.footerButtonDisabled]}
          onPress={openSaveDraftModal}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#9a8e7d" />
          ) : (
            <>
              <FontAwesome name="save" size={16} color="#9a8e7d" />
              <Text style={styles.footerSaveText}>Guardar</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.footerNextButton,
            (saving || !canProceedToData) && styles.footerButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={saving || !canProceedToData}
        >
          <Text style={styles.footerNextText}>Siguiente</Text>
          <FontAwesome name="angle-right" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {!canProceedToData ? (
        <View style={styles.nextHintContainer}>
          <Text style={styles.nextHintText}>
            Debes subir una foto para continuar.
          </Text>
        </View>
      ) : null}

      <Modal
        transparent
        visible={showDraftsModal}
        animationType="slide"
        onRequestClose={() => setShowDraftsModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowDraftsModal(false)}>
          <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>Tus borradores</Text>
            {drafts.length === 0 ? (
              <Text style={styles.emptyDraftsText}>No tienes borradores guardados.</Text>
            ) : (
              <ScrollView style={styles.modalList}>
                {drafts.map((draft) => (
                  <View key={draft.id} style={styles.draftItem}>
                    <TouchableOpacity
                      style={styles.draftMainArea}
                      onPress={() => handleLoadDraft(draft)}
                      disabled={Boolean(deletingDraftId)}
                    >
                      {draft.thumbnailUrl ? (
                        <Image source={{ uri: draft.thumbnailUrl }} style={styles.draftThumb} />
                      ) : (
                        <View style={styles.draftThumbPlaceholder}>
                          <FontAwesome name="book" size={18} color="#b2a89b" />
                        </View>
                      )}
                      <View style={styles.draftInfo}>
                        <Text numberOfLines={1} style={styles.draftTitle}>
                          {draft.titulo?.trim() || "Sin título"}
                        </Text>
                        <Text numberOfLines={1} style={styles.draftSubtitle}>
                          {draft.autor?.trim() || "Autor sin definir"}
                        </Text>
                        <Text style={styles.draftDate}>{formatUpdatedAt(draft.updatedAt)}</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.draftDeleteButton}
                      onPress={() => handleDeleteDraft(draft)}
                      disabled={deletingDraftId === draft.id}
                    >
                      {deletingDraftId === draft.id ? (
                        <ActivityIndicator size="small" color="#d5785f" />
                      ) : (
                        <FontAwesome name="trash" size={16} color="#d5785f" />
                      )}
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <FlowInfoModal
        visible={Boolean(infoModal)}
        title={infoModal?.title ?? ""}
        message={infoModal?.message ?? ""}
        primaryLabel={infoModal?.primaryLabel}
        secondaryLabel={infoModal?.secondaryLabel}
        onPrimaryPress={closeInfoModal}
        onSecondaryPress={infoModal?.onSecondaryPress}
      />

      <Modal
        visible={showCameraModal}
        animationType="slide"
        onRequestClose={closeCameraModal}
      >
        <View style={styles.cameraModalContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.cameraPreview}
            facing={cameraFacing}
          />

          <View style={styles.cameraTopBar}>
            <TouchableOpacity style={styles.cameraTopButton} onPress={closeCameraModal}>
              <FontAwesome name="times" size={20} color="#fff" />
              <Text style={styles.cameraTopButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cameraBottomBar}>
            <TouchableOpacity style={styles.cameraSecondaryButton} onPress={toggleCameraFacing}>
              <FontAwesome name="refresh" size={18} color="#fff" />
              <Text style={styles.cameraSecondaryButtonText}>Girar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.cameraCaptureButton,
                (capturingPhoto || !canAddMorePhotos) && styles.cameraCaptureButtonDisabled,
              ]}
              onPress={handleCapturePhoto}
              disabled={capturingPhoto || !canAddMorePhotos}
            >
              {capturingPhoto ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <FontAwesome name="camera" size={20} color="#fff" />
                  <Text style={styles.cameraCaptureButtonText}>Capturar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <FlowInfoModal
        visible={showSaveDraftModal}
        title="Guardar borrador"
        message={saveDraftSummary}
        primaryLabel="Guardar"
        secondaryLabel="Cancelar"
        onPrimaryPress={confirmSaveDraft}
        onSecondaryPress={() => setShowSaveDraftModal(false)}
      />

      <FlowInfoModal
        visible={Boolean(pendingDeleteDraft)}
        title="Eliminar borrador"
        message="Esta acción eliminará el borrador de forma permanente."
        primaryLabel="Eliminar"
        secondaryLabel="Cancelar"
        onPrimaryPress={confirmDeleteDraft}
        onSecondaryPress={closeDeleteDraftModal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f4ef",
  },
  scrollContent: {
    paddingBottom: 24,
  },
  topCard: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#efe8de",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  screenTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 28,
    color: "#3d352d",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  linkText: {
    fontFamily: "Outfit_700Bold",
    color: "#d5785f",
    fontSize: 14,
  },
  cancelText: {
    fontFamily: "Outfit_700Bold",
    color: "#8e8171",
    fontSize: 14,
  },
  headerSeparator: {
    color: "#d7cfc3",
    fontSize: 14,
    marginTop: -1,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },
  stepChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    height: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stepChipActive: {
    backgroundColor: "#d5785f",
  },
  stepChipInactive: {
    backgroundColor: "#f1ece6",
  },
  stepChipText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
  },
  stepChipTextActive: {
    color: "#fff",
  },
  stepChipTextInactive: {
    color: "#b2a89b",
  },
  stepLine: {
    flex: 1,
    height: 1,
    marginHorizontal: 8,
    backgroundColor: "#e7dfd5",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 22,
  },
  sectionTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 28,
    color: "#3d352d",
  },
  sectionSubtitle: {
    marginTop: 4,
    fontFamily: "Outfit_400Regular",
    fontSize: 15,
    color: "#73675a",
    lineHeight: 22,
  },
  required: {
    color: "#d5785f",
    fontFamily: "Outfit_700Bold",
  },
  counterText: {
    marginTop: 8,
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
    color: "#9e9283",
  },
  grid: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  placeholderTile: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#efcfc5",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    gap: 6,
  },
  placeholderIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f9ede8",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 13,
    color: "#d5785f",
  },
  photoTile: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#ebe4d9",
    position: "relative",
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  removeButton: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(61,53,45,0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionRow: {
    marginTop: 18,
    flexDirection: "row",
    gap: 10,
  },
  primaryAction: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: "#d5785f",
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  secondaryAction: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#d5785f",
    backgroundColor: "#fff",
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  primaryActionText: {
    color: "#fff",
    fontFamily: "Outfit_700Bold",
    fontSize: 18,
  },
  secondaryActionText: {
    color: "#d5785f",
    fontFamily: "Outfit_700Bold",
    fontSize: 18,
  },
  disabledAction: {
    opacity: 0.55,
  },
  disabledSecondaryAction: {
    opacity: 0.55,
  },
  errorText: {
    marginTop: 14,
    color: "#b42318",
    fontFamily: "Outfit_400Regular",
    fontSize: 17,
  },
  feedbackText: {
    marginTop: 14,
    color: "#1a7f37",
    fontFamily: "Outfit_400Regular",
    fontSize: 17,
  },
  draftIdText: {
    marginTop: 10,
    fontFamily: "Outfit_400Regular",
    color: "#8e8171",
    fontSize: 15,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#ede4da",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  footerSaveButton: {
    minWidth: 100,
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e7dfd5",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    backgroundColor: "#fff",
  },
  footerSaveText: {
    fontFamily: "Outfit_700Bold",
    color: "#9a8e7d",
    fontSize: 14,
  },
  footerNextButton: {
    minWidth: 120,
    minHeight: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    backgroundColor: "#d5785f",
  },
  footerNextText: {
    color: "#fff",
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
  },
  footerButtonDisabled: {
    opacity: 0.6,
  },
  nextHintContainer: {
    paddingHorizontal: 18,
    paddingBottom: 14,
    backgroundColor: "#fff",
  },
  nextHintText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 15,
    color: "#8e8171",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 26,
    maxHeight: "70%",
  },
  modalTitle: {
    fontFamily: "Outfit_700Bold",
    color: "#3d352d",
    fontSize: 28,
    marginBottom: 12,
  },
  emptyDraftsText: {
    fontFamily: "Outfit_400Regular",
    color: "#8e8171",
    fontSize: 18,
    marginBottom: 8,
  },
  modalList: {
    maxHeight: 380,
  },
  draftItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3eee7",
  },
  draftMainArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  draftDeleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff5f1",
    borderWidth: 1,
    borderColor: "#f2ddd5",
  },
  draftThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: "#efe8de",
  },
  draftThumbPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: "#f7f2eb",
    alignItems: "center",
    justifyContent: "center",
  },
  draftInfo: {
    flex: 1,
    marginLeft: 10,
  },
  draftTitle: {
    fontFamily: "Outfit_700Bold",
    color: "#3d352d",
    fontSize: 17,
  },
  draftSubtitle: {
    marginTop: 2,
    fontFamily: "Outfit_400Regular",
    color: "#73675a",
    fontSize: 14,
  },
  draftDate: {
    marginTop: 4,
    fontFamily: "Outfit_400Regular",
    color: "#9e9283",
    fontSize: 13,
  },
  cameraModalContainer: {
    flex: 1,
    backgroundColor: "#121212",
  },
  cameraPreview: {
    flex: 1,
  },
  cameraTopBar: {
    position: "absolute",
    top: 48,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  cameraTopButton: {
    minHeight: 40,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.48)",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cameraTopButtonText: {
    fontFamily: "Outfit_700Bold",
    color: "#fff",
    fontSize: 15,
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
  cameraSecondaryButtonText: {
    fontFamily: "Outfit_700Bold",
    color: "#fff",
    fontSize: 16,
  },
  cameraCaptureButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: "#d5785f",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  cameraCaptureButtonDisabled: {
    opacity: 0.6,
  },
  cameraCaptureButtonText: {
    fontFamily: "Outfit_700Bold",
    color: "#fff",
    fontSize: 17,
  },
});
