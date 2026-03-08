import Header from "@/components/Header";
import FlowFooter from "@/components/book-upload/FlowFooter";
import FlowHeader from "@/components/book-upload/FlowHeader";
import FlowInfoModal from "@/components/book-upload/FlowInfoModal";
import {
  MAX_BOOK_PHOTOS,
  deleteBook,
  getBookDetail,
  getGenres,
  getLanguages,
  getMyDrafts,
  updateBookDataStep,
  type BookDraftSummary,
  type BookDetail,
  type GenreOption,
  type LanguageOption,
} from "@/lib/books";
import {
  buildMissingFieldsMessage,
  getDataStepMissingFields,
} from "@/lib/bookUploadValidation";
import { markUploadFlowResetNeeded } from "@/lib/uploadFlowState";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  Camera,
  CameraView,
  type BarcodeScanningResult,
} from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type CoverSelection = "Hardcover" | "Paperback";

const coverOptions: Array<{ value: CoverSelection; label: string }> = [
  { value: "Hardcover", label: "Tapa dura" },
  { value: "Paperback", label: "Tapa blanda" },
];

function normalize(value?: string | null): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

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

function mapDetailToCover(detail: BookDetail): CoverSelection | null {
  if (detail.cover === "Hardcover") return "Hardcover";
  if (detail.cover === "Paperback") return "Paperback";
  return null;
}

function mapCoverToApi(selection: CoverSelection | null): BookDetail["cover"] | null {
  if (!selection) return null;
  return selection === "Hardcover" ? "Hardcover" : "Paperback";
}

function normalizeIsbnInput(value: string): string {
  return value.replace(/[^0-9xX]/g, "").toUpperCase();
}

function isValidIsbn10(isbn: string): boolean {
  if (!/^\d{9}[\dX]$/.test(isbn)) return false;

  const checksum = isbn.split("").reduce((sum, char, index) => {
    const value = char === "X" ? 10 : Number(char);
    return sum + value * (10 - index);
  }, 0);

  return checksum % 11 === 0;
}

function isValidIsbn13(isbn: string): boolean {
  if (!/^\d{13}$/.test(isbn)) return false;
  if (!isbn.startsWith("978") && !isbn.startsWith("979")) return false;

  const checksumBase = isbn
    .slice(0, 12)
    .split("")
    .reduce((sum, digit, index) => sum + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);

  const checksum = (10 - (checksumBase % 10)) % 10;
  return checksum === Number(isbn[12]);
}

function parseScannedIsbn(rawValue: string): string | null {
  const normalized = normalizeIsbnInput(rawValue);
  if (normalized.length === 13 && isValidIsbn13(normalized)) return normalized;
  if (normalized.length === 10 && isValidIsbn10(normalized)) return normalized;
  return null;
}

export default function UploadDataScreen() {
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

  const [genres, setGenres] = useState<GenreOption[]>([]);
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [isbn, setIsbn] = useState("");
  const [numPages, setNumPages] = useState("");
  const [selectedGenreIds, setSelectedGenreIds] = useState<number[]>([]);
  const [selectedLanguageId, setSelectedLanguageId] = useState<number | null>(null);
  const [cover, setCover] = useState<CoverSelection | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [photoCount, setPhotoCount] = useState(0);
  const [showIsbnScanner, setShowIsbnScanner] = useState(false);
  const [scannerLocked, setScannerLocked] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [infoModal, setInfoModal] = useState<{ title: string; message: string } | null>(null);

  const selectedLanguageLabel = useMemo(() => {
    if (!selectedLanguageId) return "Selecciona idioma";
    return languages.find((language) => language.id === selectedLanguageId)?.name ?? "Selecciona idioma";
  }, [languages, selectedLanguageId]);
  const saveDraftSummary = useMemo(() => {
    const titleText = title.trim() || "Sin título";
    const authorText = author.trim() || "Sin autor";
    const isbnText = isbn.trim() || "Sin ISBN";
    const pagesText = numPages.trim() || "Sin páginas";
    const genreText = `${selectedGenreIds.length} género(s)`;
    const languageText =
      selectedLanguageLabel === "Selecciona idioma"
        ? "Idioma sin seleccionar"
        : `Idioma: ${selectedLanguageLabel}`;

    return [
      "Se guardará el borrador con la información actual:",
      `Título: ${titleText}`,
      `Autor: ${authorText}`,
      `ISBN: ${isbnText}`,
      `Páginas: ${pagesText}`,
      genreText,
      languageText,
    ].join("\n");
  }, [author, isbn, numPages, selectedGenreIds.length, selectedLanguageLabel, title]);

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
        const [detail, genresResult, languagesResult] = await Promise.all([
          getBookDetail(bookId),
          getGenres(),
          getLanguages(),
        ]);

        if (!active) return;

        setGenres(genresResult);
        setLanguages(languagesResult);

        setTitle(detail.titulo ?? "");
        setAuthor(detail.autor ?? "");
        setIsbn(detail.isbn ?? "");
        setNumPages(detail.numPaginas ? String(detail.numPaginas) : "");
        setCover(mapDetailToCover(detail));
        setCoverPreviewUrl(detail.photos?.[0]?.url ?? null);
        setPhotoCount((detail.photos ?? []).length);

        const genreMap = new Map(
          genresResult.map((genre) => [normalize(genre.name), genre.id]),
        );
        const selectedFromDetail = (detail.genres ?? [])
          .map((genreName) => genreMap.get(normalize(genreName)))
          .filter((value): value is number => Number.isFinite(value));
        setSelectedGenreIds(Array.from(new Set(selectedFromDetail)));

        const languageMap = new Map(
          languagesResult.map((language) => [normalize(language.name), language.id]),
        );
        const firstLanguageName = detail.languages?.[0];
        const languageId = firstLanguageName
          ? languageMap.get(normalize(firstLanguageName))
          : null;
        setSelectedLanguageId(languageId ?? languagesResult[0]?.id ?? null);
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

  const toggleGenre = (genreId: number) => {
    setSelectedGenreIds((current) =>
      current.includes(genreId)
        ? current.filter((value) => value !== genreId)
        : [...current, genreId],
    );
  };

  const saveData = async () => {
    if (!Number.isFinite(bookId) || bookId <= 0) return;
    if (photoCount <= 0) {
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
      await updateBookDataStep(bookId, {
        titulo: title.trim(),
        autor: author.trim(),
        isbn: isbn.trim(),
        numPaginas: numPages.trim() ? Number(numPages.trim()) : null,
        cover: mapCoverToApi(cover),
        genreIds: selectedGenreIds,
        languageIds: selectedLanguageId ? [selectedLanguageId] : [],
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
    if (photoCount <= 0) {
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
    saveData();
  };

  const handleNext = async () => {
    if (!Number.isFinite(bookId) || bookId <= 0) return;
    const missingFields = getDataStepMissingFields({
      title,
      author,
      isbn,
      pageCount: numPages,
      hasCover: Boolean(cover),
      genreCount: selectedGenreIds.length,
      hasLanguage: Boolean(selectedLanguageId),
    });

    if (missingFields.length > 0) {
      setInfoModal({
        title: "Campos obligatorios pendientes",
        message: buildMissingFieldsMessage(missingFields),
      });
      return;
    }

    if (photoCount !== MAX_BOOK_PHOTOS) {
      setInfoModal({
        title: "Fotos incompletas",
        message: `Debes tener exactamente ${MAX_BOOK_PHOTOS} fotos antes de continuar al estado del libro.`,
      });
      return;
    }

    const parsedPages = Number(numPages.trim());

    setSaving(true);
    setError(null);
    setFeedback(null);

    try {
      await updateBookDataStep(bookId, {
        titulo: title.trim(),
        autor: author.trim(),
        isbn: isbn.trim(),
        numPaginas: parsedPages,
        cover: mapCoverToApi(cover),
        genreIds: selectedGenreIds,
        languageIds: [selectedLanguageId!],
      });

      router.push(`/books/create/${bookId}/estado` as any);
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
    router.replace(`/books/create/${draft.id}/datos` as any);
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

  const handleBack = () => {
    if (!Number.isFinite(bookId) || bookId <= 0) return;
    router.replace(`/subir?draftId=${bookId}` as any);
  };

  const closeIsbnScanner = () => {
    setShowIsbnScanner(false);
    setScannerLocked(false);
  };

  const handleOpenIsbnScanner = async () => {
    const permission = await Camera.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permiso de cámara necesario",
        "Para escanear el ISBN debes permitir el acceso a la cámara.",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Abrir ajustes",
            onPress: () => {
              Linking.openSettings().catch(() => undefined);
            },
          },
        ],
      );
      return;
    }

    setScannerLocked(false);
    setShowIsbnScanner(true);
  };

  const handleIsbnScanned = ({ data }: BarcodeScanningResult) => {
    if (scannerLocked) return;
    setScannerLocked(true);

    const parsedIsbn = parseScannedIsbn(data);

    if (!parsedIsbn) {
      closeIsbnScanner();
      setInfoModal({
        title: "ISBN no válido",
        message:
          "El código detectado no corresponde a un ISBN válido. Prueba a escanear de nuevo la tapa del libro.",
      });
      return;
    }

    setIsbn(parsedIsbn);
    setError(null);
    setFeedback("ISBN detectado correctamente desde el escáner.");
    closeIsbnScanner();
  };

  return (
    <View style={styles.container}>
      <Header />
      <FlowHeader
        stepState={{ active: "datos", photosDone: true }}
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
            <Text style={styles.sectionTitle}>Datos del libro</Text>
            <Text style={styles.subtitle}>
              Los campos con <Text style={styles.required}>*</Text> son obligatorios
            </Text>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>TITULO <Text style={styles.required}>*</Text></Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Título del libro"
                placeholderTextColor="#a79a89"
                style={styles.input}
              />
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>AUTOR <Text style={styles.required}>*</Text></Text>
              <TextInput
                value={author}
                onChangeText={setAuthor}
                placeholder="Autor"
                placeholderTextColor="#a79a89"
                style={styles.input}
              />
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>ISBN <Text style={styles.required}>*</Text></Text>
              <View style={styles.isbnRow}>
                <TextInput
                  value={isbn}
                  onChangeText={setIsbn}
                  placeholder="ISBN"
                  placeholderTextColor="#a79a89"
                  style={[styles.input, styles.isbnInput]}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
                <TouchableOpacity style={styles.scanIsbnButton} onPress={handleOpenIsbnScanner}>
                  <FontAwesome name="barcode" size={16} color="#fff" />
                  <Text style={styles.scanIsbnButtonText}>Escanear</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>GENERO <Text style={styles.required}>*</Text></Text>
              <View style={styles.chipsWrap}>
                {genres.map((genre) => {
                  const selected = selectedGenreIds.includes(genre.id);
                  return (
                    <TouchableOpacity
                      key={genre.id}
                      style={[styles.genreChip, selected && styles.genreChipSelected]}
                      onPress={() => toggleGenre(genre.id)}
                    >
                      <Text style={[styles.genreChipText, selected && styles.genreChipTextSelected]}>
                        {genre.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>TIPO DE TAPA <Text style={styles.required}>*</Text></Text>
              <View style={styles.coverRow}>
                {coverOptions.map((option) => {
                  const selected = cover === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.coverChip, selected && styles.coverChipSelected]}
                      onPress={() => setCover(option.value)}
                    >
                      <Text style={[styles.coverChipText, selected && styles.coverChipTextSelected]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>IDIOMA <Text style={styles.required}>*</Text></Text>
              <TouchableOpacity
                style={styles.selectInput}
                onPress={() => setShowLanguageSelector((current) => !current)}
              >
                <Text style={styles.selectInputText}>{selectedLanguageLabel}</Text>
                <FontAwesome
                  name={showLanguageSelector ? "angle-up" : "angle-down"}
                  size={18}
                  color="#857665"
                />
              </TouchableOpacity>
              {showLanguageSelector ? (
                <View style={styles.selectMenu}>
                  {languages.map((language) => {
                    const selected = selectedLanguageId === language.id;
                    return (
                      <TouchableOpacity
                        key={language.id}
                        style={[styles.selectOption, selected && styles.selectOptionSelected]}
                        onPress={() => {
                          setSelectedLanguageId(language.id);
                          setShowLanguageSelector(false);
                        }}
                      >
                        <Text style={[styles.selectOptionText, selected && styles.selectOptionTextSelected]}>
                          {language.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>NUMERO DE PAGINAS <Text style={styles.required}>*</Text></Text>
              <TextInput
                value={numPages}
                onChangeText={(value) => setNumPages(value.replace(/[^0-9]/g, ""))}
                placeholder="Número de páginas"
                placeholderTextColor="#a79a89"
                keyboardType="number-pad"
                style={styles.input}
              />
            </View>

            {coverPreviewUrl ? (
              <View style={styles.previewCard}>
                <Image source={{ uri: coverPreviewUrl }} style={styles.previewImage} />
                <View style={styles.previewTextContainer}>
                  <Text style={styles.previewTitle}>{title.trim() || "Título pendiente"}</Text>
                  <Text style={styles.previewSubtitle}>{author.trim() || "Autor pendiente"}</Text>
                </View>
              </View>
            ) : null}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {feedback ? <Text style={styles.feedbackText}>{feedback}</Text> : null}
          </ScrollView>

          <FlowFooter
            loading={saving}
            nextLabel="Siguiente"
            onBack={handleBack}
            onSave={openSaveDraftModal}
            onNext={handleNext}
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

      <Modal
        visible={showIsbnScanner}
        animationType="slide"
        onRequestClose={closeIsbnScanner}
      >
        <View style={styles.scannerModalContainer}>
          <CameraView
            style={styles.scannerPreview}
            facing="back"
            onBarcodeScanned={scannerLocked ? undefined : handleIsbnScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128"],
            }}
          />
          <View pointerEvents="none" style={styles.scannerFrameWrapper}>
            <View style={styles.scannerFrame} />
          </View>

          <View style={styles.scannerTopBar}>
            <TouchableOpacity style={styles.scannerCloseButton} onPress={closeIsbnScanner}>
              <FontAwesome name="times" size={18} color="#fff" />
              <Text style={styles.scannerCloseText}>Cerrar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.scannerBottomBar}>
            <Text style={styles.scannerHintText}>
              Enfoca el código de barras de la tapa trasera para completar el ISBN.
            </Text>
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
    fontSize: 37,
    color: "#3d352d",
  },
  subtitle: {
    marginTop: 4,
    fontFamily: "Outfit_400Regular",
    color: "#7a6e5f",
    fontSize: 17,
  },
  required: {
    color: "#d5785f",
  },
  fieldBlock: {
    marginTop: 16,
  },
  fieldLabel: {
    fontFamily: "Outfit_700Bold",
    color: "#8a7c6b",
    fontSize: 12,
    letterSpacing: 1,
  },
  input: {
    marginTop: 8,
    minHeight: 52,
    borderWidth: 2,
    borderColor: "#e9dfd4",
    borderRadius: 18,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    color: "#3d352d",
    fontFamily: "Outfit_400Regular",
    fontSize: 17,
  },
  isbnRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  isbnInput: {
    flex: 1,
    marginTop: 0,
  },
  scanIsbnButton: {
    minHeight: 52,
    borderRadius: 14,
    paddingHorizontal: 6,
    backgroundColor: "#d5785f",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  scanIsbnButtonText: {
    color: "#fff",
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
  },
  chipsWrap: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  genreChip: {
    borderWidth: 2,
    borderColor: "#e9dfd4",
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 15,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  genreChipSelected: {
    backgroundColor: "#d5785f",
    borderColor: "#d5785f",
  },
  genreChipText: {
    fontFamily: "Outfit_700Bold",
    color: "#857765",
    fontSize: 15,
  },
  genreChipTextSelected: {
    color: "#fff",
  },
  coverRow: {
    marginTop: 8,
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  coverChip: {
    flex: 1,
    minWidth: 104,
    borderWidth: 2,
    borderColor: "#e9dfd4",
    borderRadius: 18,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
  },
  coverChipSelected: {
    borderColor: "#d5785f",
    backgroundColor: "#d5785f",
  },
  coverChipText: {
    fontFamily: "Outfit_700Bold",
    color: "#857765",
    fontSize: 16,
  },
  coverChipTextSelected: {
    color: "#fff",
  },
  selectInput: {
    marginTop: 8,
    minHeight: 52,
    borderWidth: 2,
    borderColor: "#e9dfd4",
    borderRadius: 18,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
  },
  selectInputText: {
    fontFamily: "Outfit_400Regular",
    color: "#3d352d",
    fontSize: 17,
  },
  selectMenu: {
    marginTop: 6,
    borderWidth: 2,
    borderColor: "#e9dfd4",
    borderRadius: 16,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  selectOption: {
    minHeight: 42,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  selectOptionSelected: {
    backgroundColor: "#f9ede8",
  },
  selectOptionText: {
    fontFamily: "Outfit_400Regular",
    color: "#3d352d",
    fontSize: 16,
  },
  selectOptionTextSelected: {
    fontFamily: "Outfit_700Bold",
    color: "#b9634d",
  },
  previewCard: {
    marginTop: 20,
    borderWidth: 2,
    borderColor: "#eadfd4",
    borderRadius: 20,
    backgroundColor: "#fff",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  previewImage: {
    width: 58,
    height: 58,
    borderRadius: 10,
    backgroundColor: "#efe8de",
  },
  previewTextContainer: {
    flex: 1,
  },
  previewTitle: {
    fontFamily: "Outfit_700Bold",
    color: "#3d352d",
    fontSize: 17,
  },
  previewSubtitle: {
    fontFamily: "Outfit_400Regular",
    color: "#7f7365",
    fontSize: 14,
    marginTop: 2,
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
  scannerModalContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  scannerPreview: {
    flex: 1,
  },
  scannerFrameWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  scannerFrame: {
    width: 250,
    height: 150,
    borderWidth: 2,
    borderColor: "#fff",
    borderRadius: 16,
    backgroundColor: "transparent",
  },
  scannerTopBar: {
    position: "absolute",
    top: 48,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  scannerCloseButton: {
    minHeight: 40,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  scannerCloseText: {
    color: "#fff",
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
  },
  scannerBottomBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 30,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  scannerHintText: {
    color: "#fff",
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    textAlign: "center",
  },
});
