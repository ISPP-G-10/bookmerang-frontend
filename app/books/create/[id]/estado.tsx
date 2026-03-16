import Header from "@/components/Header";
import FlowFooter from "@/components/book-upload/FlowFooter";
import FlowHeader from "@/components/book-upload/FlowHeader";
import FlowInfoModal from "@/components/book-upload/FlowInfoModal";
import {
  MIN_BOOK_PHOTOS,
  deleteBook,
  getBookDetail,
  getMyDrafts,
  publishBook,
  toCoverLabel,
  toConditionLabel,
  updateBookDetailsStep,
  type BookDetail,
  type BookDraftSummary,
} from "@/lib/books";
import { getStateStepValidationError } from "@/lib/bookUploadValidation";
import { markUploadFlowResetNeeded } from "@/lib/uploadFlowState";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const conditionOptions: Array<{
  value: "LikeNew" | "VeryGood" | "Good" | "Acceptable" | "Poor";
  title: string;
  subtitle: string;
}> = [
  { value: "LikeNew", title: "Como nuevo", subtitle: "Sin marcas ni desgaste" },
  { value: "VeryGood", title: "Muy bueno", subtitle: "Uso mínimo visible" },
  { value: "Good", title: "Bueno", subtitle: "Marcas leves de uso" },
  { value: "Acceptable", title: "Aceptable", subtitle: "Marcas visibles pero completo" },
  { value: "Poor", title: "Malo", subtitle: "Desgaste notable" },
];

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) return error.message;
  return "No se pudo completar la operación.";
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

export default function UploadStatusScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookId = Number(id);

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [deletingDraftId, setDeletingDraftId] = useState<number | null>(null);
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [showSaveDraftModal, setShowSaveDraftModal] = useState(false);
  const [pendingDeleteDraft, setPendingDeleteDraft] = useState<BookDraftSummary | null>(null);
  const [drafts, setDrafts] = useState<BookDraftSummary[]>([]);

  const [bookDetail, setBookDetail] = useState<BookDetail | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<
    "LikeNew" | "VeryGood" | "Good" | "Acceptable" | "Poor" | null
  >(null);
  const [observations, setObservations] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [infoModal, setInfoModal] = useState<{ title: string; message: string } | null>(null);
  const photoCount = bookDetail?.photos?.length ?? 0;
  const saveDraftSummary = [
    "Se guardará el borrador con la información actual:",
    `Fotos: ${photoCount}`,
    `Estado: ${toConditionLabel(selectedCondition ?? undefined)}`,
    observations.trim()
      ? `Observaciones: ${observations.trim()}`
      : "Observaciones: sin contenido",
  ].join("\n");

  const closeInfoModal = () => {
    setInfoModal(null);
  };

  useEffect(() => {
    if (!Number.isFinite(bookId) || bookId <= 0) {
      setError("No se pudo abrir el borrador.");
      setLoadingInitial(false);
      return;
    }

    let active = true;

    const loadData = async () => {
      setLoadingInitial(true);
      setError(null);
      setFeedback(null);

      try {
        const detail = await getBookDetail(bookId);
        if (!active) return;

        setBookDetail(detail);
        const initialCondition =
          conditionOptions.find((option) => option.value === detail.condition)?.value ?? null;
        setSelectedCondition(initialCondition);
        setObservations(detail.observaciones ?? "");
      } catch (err) {
        if (!active) return;
        setError(errorMessage(err));
      } finally {
        if (active) setLoadingInitial(false);
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [bookId]);

  const handleSave = async () => {
    if (!Number.isFinite(bookId) || bookId <= 0) return;
    if (photoCount < MIN_BOOK_PHOTOS) {
      setInfoModal({
        title: "Fotos insuficientes",
        message: `Necesitas al menos ${MIN_BOOK_PHOTOS} fotos. Actualmente tienes ${photoCount}.`,
      });
      return;
    }

    setSaving(true);
    setError(null);
    setFeedback(null);

    try {
      await updateBookDetailsStep(bookId, {
        condition: selectedCondition ?? null,
        observaciones: observations.trim(),
      });
      await markUploadFlowResetNeeded();
      router.replace("/subir" as any);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const openSaveDraftModal = () => {
    if (saving) return;
    if (photoCount < MIN_BOOK_PHOTOS) {
      setInfoModal({
        title: "Fotos insuficientes",
        message: `Necesitas al menos ${MIN_BOOK_PHOTOS} fotos. Actualmente tienes ${photoCount}.`,
      });
      return;
    }
    setShowSaveDraftModal(true);
  };

  const confirmSaveDraft = () => {
    setShowSaveDraftModal(false);
    handleSave();
  };

  const handlePublish = async () => {
    if (!Number.isFinite(bookId) || bookId <= 0) return;
    const stateError = getStateStepValidationError(Boolean(selectedCondition));
    if (stateError) {
      setInfoModal({
        title: "Estado obligatorio",
        message: stateError,
      });
      return;
    }

    setSaving(true);
    setError(null);
    setFeedback(null);

    try {
      await updateBookDetailsStep(bookId, {
        condition: selectedCondition,
        observaciones: observations.trim(),
      });
      await publishBook(bookId);
      await markUploadFlowResetNeeded();

      router.replace("/(tabs)/matcher" as any);
      setTimeout(() => {
        router.push("/profile?message=published" as any);
      }, 0);
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
      const draftsResult = await getMyDrafts(20);
      setDrafts(draftsResult);
      setShowDraftsModal(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoadingDrafts(false);
    }
  };

  const handleLoadDraft = (draft: BookDraftSummary) => {
    setShowDraftsModal(false);
    router.replace(`/books/create/${draft.id}/estado` as any);
  };

  const performDeleteDraft = async (draft: BookDraftSummary) => {
    setDeletingDraftId(draft.id);
    setError(null);
    setPendingDeleteDraft(null);

    try {
      await deleteBook(draft.id);
      setDrafts((current) => current.filter((item) => item.id !== draft.id));
      setFeedback("Borrador eliminado correctamente.");

      if (draft.id === bookId) {
        setShowDraftsModal(false);
        router.replace("/subir" as any);
      }
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

  const handleBack = () => {
    if (!Number.isFinite(bookId) || bookId <= 0) return;
    router.replace(`/books/create/${bookId}/datos` as any);
  };

  const handleCancel = () => {
    Alert.alert(
      "Cancelar",
      "Se perderán los cambios no guardados de este paso.",
      [
        { text: "Seguir editando", style: "cancel" },
        { text: "Salir", style: "destructive", onPress: () => router.replace("/subir" as any) },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <Header />
      <FlowHeader
        stepState={{ active: "estado", photosDone: true, dataDone: true }}
        loadingDrafts={loadingDrafts}
        onLoadDrafts={handleOpenDrafts}
        onCancel={handleCancel}
      />

      {loadingInitial ? (
        <View style={styles.loaderBox}>
          <ActivityIndicator size="small" color="#d5785f" />
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.sectionTitle}>Estado y detalles</Text>
            <Text style={styles.subtitle}>
              Selecciona el estado del libro y añade observaciones si lo deseas.
            </Text>

            <Text style={styles.fieldLabel}>ESTADO DEL LIBRO <Text style={styles.required}>*</Text></Text>
            <View style={styles.conditionsWrap}>
              {conditionOptions.map((option) => {
                const selected = selectedCondition === option.value;
                return (
                  <TouchableOpacity
                    key={option.value ?? "none"}
                    style={[styles.conditionCard, selected && styles.conditionCardSelected]}
                    onPress={() => setSelectedCondition(option.value)}
                  >
                    <Text style={styles.conditionTitle}>{option.title}</Text>
                    <Text style={styles.conditionSubtitle}>{option.subtitle}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.observationsBlock}>
              <Text style={styles.fieldLabel}>
                OBSERVACIONES <Text style={styles.optional}>(OPCIONAL)</Text>
              </Text>
              <TextInput
                value={observations}
                onChangeText={setObservations}
                multiline
                placeholder="Añade cualquier detalle adicional: subrayados, dedicatorias, páginas sueltas..."
                placeholderTextColor="#9f9282"
                style={styles.observationsInput}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>RESUMEN</Text>
              <View style={styles.summaryRow}>
                {bookDetail?.photos?.[0]?.url ? (
                  <Image source={{ uri: bookDetail.photos[0].url }} style={styles.summaryImage} />
                ) : (
                  <View style={styles.summaryImagePlaceholder}>
                    <FontAwesome name="book" size={20} color="#b8ab9b" />
                  </View>
                )}

                <View style={styles.summaryTextWrap}>
                  <Text style={styles.summaryBookTitle}>{bookDetail?.titulo || "Sin título"}</Text>
                  <Text style={styles.summaryAuthor}>{bookDetail?.autor || "Autor pendiente"}</Text>
                  <View style={styles.summaryTags}>
                    <View style={styles.summaryTag}>
                      <Text style={styles.summaryTagText}>
                        {toCoverLabel(bookDetail?.cover)}
                      </Text>
                    </View>
                    <View style={styles.summaryTag}>
                      <Text style={styles.summaryTagText}>
                        {toConditionLabel(selectedCondition ?? undefined)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {feedback ? <Text style={styles.feedbackText}>{feedback}</Text> : null}
          </ScrollView>

          <FlowFooter
            loading={saving}
            nextLabel="Publicar"
            onBack={handleBack}
            onSave={openSaveDraftModal}
            onNext={handlePublish}
          />
        </>
      )}

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
                          <FontAwesome name="book" size={16} color="#b2a89b" />
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
        onPrimaryPress={closeInfoModal}
      />

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
  loaderBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 38,
    color: "#3d352d",
  },
  subtitle: {
    marginTop: 4,
    fontFamily: "Outfit_400Regular",
    color: "#7a6e5f",
    fontSize: 17,
    lineHeight: 23,
  },
  fieldLabel: {
    marginTop: 15,
    fontFamily: "Outfit_700Bold",
    color: "#8a7c6b",
    fontSize: 12,
    letterSpacing: 1,
  },
  required: {
    color: "#d5785f",
  },
  optional: {
    color: "#9b8f80",
    fontFamily: "Outfit_700Bold",
  },
  conditionsWrap: {
    marginTop: 8,
    gap: 10,
  },
  conditionCard: {
    borderWidth: 2,
    borderColor: "#e9dfd4",
    borderRadius: 20,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  conditionCardSelected: {
    borderColor: "#d5785f",
    backgroundColor: "#fffaf8",
  },
  conditionTitle: {
    fontFamily: "Outfit_700Bold",
    color: "#3d352d",
    fontSize: 19,
  },
  conditionSubtitle: {
    marginTop: 2,
    fontFamily: "Outfit_400Regular",
    color: "#7a6e5f",
    fontSize: 16,
  },
  observationsBlock: {
    marginTop: 16,
  },
  observationsInput: {
    marginTop: 8,
    minHeight: 144,
    borderWidth: 2,
    borderColor: "#e9dfd4",
    borderRadius: 20,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#3d352d",
    fontFamily: "Outfit_400Regular",
    fontSize: 17,
    lineHeight: 24,
  },
  summaryCard: {
    marginTop: 18,
    borderWidth: 2,
    borderColor: "#eadfd4",
    borderRadius: 20,
    backgroundColor: "#fff",
    padding: 16,
  },
  summaryTitle: {
    fontFamily: "Outfit_700Bold",
    color: "#8a7c6b",
    fontSize: 12,
    letterSpacing: 1,
  },
  summaryRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  summaryImage: {
    width: 78,
    height: 94,
    borderRadius: 12,
    backgroundColor: "#eee6dc",
  },
  summaryImagePlaceholder: {
    width: 78,
    height: 94,
    borderRadius: 12,
    backgroundColor: "#f3ece2",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryTextWrap: {
    flex: 1,
  },
  summaryBookTitle: {
    fontFamily: "Outfit_700Bold",
    color: "#3d352d",
    fontSize: 21,
  },
  summaryAuthor: {
    marginTop: 2,
    fontFamily: "Outfit_400Regular",
    color: "#7c7061",
    fontSize: 16,
  },
  summaryTags: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  summaryTag: {
    borderRadius: 999,
    backgroundColor: "#f2ebe3",
    paddingHorizontal: 10,
    minHeight: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryTagText: {
    fontFamily: "Outfit_700Bold",
    color: "#8c7f6f",
    fontSize: 13,
  },
  errorText: {
    marginTop: 12,
    color: "#b42318",
    fontFamily: "Outfit_400Regular",
    fontSize: 16,
  },
  feedbackText: {
    marginTop: 12,
    color: "#1a7f37",
    fontFamily: "Outfit_400Regular",
    fontSize: 16,
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
});
