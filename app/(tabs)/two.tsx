import PersonalLibrary from "@/components/PersonalLibrary";
import { apiRequest } from "@/lib/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";


type LibraryBook = {
  id: number;
  title: string;
  author: string;
  condition: string;
  image?: string;
  pages?: number;
  coverType?: string;
  description?: string;
  status?: string;
  language?: string;
};

type BackendListItem = {
  id: number;
  titulo?: string;
  autor?: string;
  status?: string;
  condition?: string;
  cover?: string;
  thumbnailUrl?: string;
  updatedAt?: string;
};

type BackendDetail = {
  id: number;
  titulo?: string;
  autor?: string;
  status?: string;
  condition?: string;
  cover?: string;
  numPaginas?: number;
  observaciones?: string;
  photos?: { url: string; order: number }[];
  languages?: string[];
};

const conditionMap: Record<string, string> = {
  LIKE_NEW: "Como nuevo",
  VERY_GOOD: "Muy bueno",
  GOOD: "Bueno",
  ACCEPTABLE: "Aceptable",
  POOR: "Malo",
  LikeNew: "Como nuevo",
  VeryGood: "Muy bueno",
  Good: "Bueno",
  Acceptable: "Aceptable",
  Poor: "Malo",
  Como_Nuevo: "Como nuevo",
  Bueno: "Bueno",
  Aceptable: "Aceptable",
  Malo: "Malo",
  Nuevo: "Como nuevo",
};

const reverseConditionMap: Record<string, string> = {
  "Como nuevo": "Como_Nuevo",
  "Muy bueno": "Bueno",
  Bueno: "Bueno",
  Aceptable: "Aceptable",
  Malo: "Malo",
};

const coverMap: Record<string, string> = {
  HARDCOVER: "Tapa dura",
  PAPERBACK: "Tapa blanda",
  Hardcover: "Tapa dura",
  Paperback: "Tapa blanda",
};

const statusMap: Record<string, string> = {
  "0": "PUBLISHED",
  "1": "DRAFT",
  "2": "PAUSED",
  "3": "RESERVED",
  "4": "EXCHANGED",
  "5": "DELETED",
  Published: "PUBLISHED",
  Draft: "DRAFT",
  Paused: "PAUSED",
  Reserved: "RESERVED",
  Exchanged: "EXCHANGED",
  Deleted: "DELETED",
  PUBLISHED: "PUBLISHED",
  DRAFT: "DRAFT",
  PAUSED: "PAUSED",
  RESERVED: "RESERVED",
  EXCHANGED: "EXCHANGED",
  DELETED: "DELETED",
};

const normalizeListBook = (book: BackendListItem): LibraryBook => ({
  id: book.id,
  title: book.titulo ?? "Sin título",
  author: book.autor ?? "Autor desconocido",
  condition: conditionMap[book.condition ?? ""] ?? "Bueno",
  coverType: coverMap[book.cover ?? ""] ?? "-",
  image:
    book.thumbnailUrl ??
    "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=80",
  status: statusMap[String(book.status ?? "")] ?? String(book.status ?? ""),
});


async function getBackendErrorMessage(response: Response, fallback: string) {
  try {
    const data = await response.clone().json();
    if (typeof data === "string") return data;
    if (data?.error) return String(data.error);
    if (data?.message) return String(data.message);
  } catch {
    // ignore JSON parse errors
  }

  try {
    const text = await response.text();
    if (text) return text;
  } catch {
    // ignore text parse errors
  }

  return fallback;
}

const normalizeDetailBook = (book: BackendDetail): LibraryBook => ({
  id: book.id,
  title: book.titulo ?? "Sin título",
  author: book.autor ?? "Autor desconocido",
  condition: conditionMap[book.condition ?? ""] ?? "Bueno",
  coverType: coverMap[book.cover ?? ""] ?? "-",
  pages: book.numPaginas,
  description: book.observaciones,
  image:
    book.photos?.sort((a, b) => a.order - b.order)?.[0]?.url ??
    "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=80",
  language: book.languages?.[0] ?? "-",
  status: statusMap[String(book.status ?? "")] ?? String(book.status ?? ""),
});

export default function ProfileLibraryScreen() {
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedBook, setSelectedBook] = useState<LibraryBook | null>(null);
  const [editingBook, setEditingBook] = useState<LibraryBook | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);

  const loadBooks = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiRequest("/books/my-library?page=1&pageSize=50");

      if (!response.ok) {
        const backendMessage = await getBackendErrorMessage(response, `Error del backend (${response.status}) al cargar biblioteca.`);

        if (response.status === 401) {
          throw new Error("No autenticado. Inicia sesión de nuevo.");
        }

        if (response.status === 404) {
          throw new Error(
            backendMessage ||
              "Tu usuario no existe en backend todavía. Regístrate en /auth/register antes de cargar biblioteca."
          );
        }

        throw new Error(backendMessage);
      }

      const payload = await response.json();
      const raw = Array.isArray(payload)
        ? payload
        : payload.items ?? payload.Items ?? payload.data ?? [];

      const normalized = raw.map((item: BackendListItem) => normalizeListBook(item));
      setBooks(normalized.filter((book: LibraryBook) => book.status === "PUBLISHED"));
    } catch (e: any) {
      setBooks([]);
      setError(e?.message ?? "No se pudo cargar tu biblioteca. Revisa conexión con backend.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const rows = useMemo(
    () => [
      ["Idioma", selectedBook?.language ?? "-"],
      ["Páginas", selectedBook?.pages?.toString() ?? "-"],
      ["Tipo de tapa", selectedBook?.coverType ?? "-"],
      ["Estado", selectedBook?.condition ?? "-"],
    ],
    [selectedBook]
  );

  const onBookPress = async (book: LibraryBook) => {
    try {
      const response = await apiRequest(`/books/${book.id}`);
      if (!response.ok) {
        const backendMessage = await getBackendErrorMessage(response, "No se pudo cargar el detalle del libro.");
        throw new Error(backendMessage);
      }
      const detail = await response.json();
      setSelectedBook(normalizeDetailBook(detail));
      setDetailsVisible(true);
    } catch (e: any) {
      setError(e?.message ?? "No se pudo cargar el detalle del libro.");
    }
  };

  const saveChanges = async () => {
    if (!editingBook) return;

    try {
      const response = await apiRequest(`/books/${editingBook.id}/details`, {
        method: "PUT",
        body: JSON.stringify({
          condition: reverseConditionMap[editingBook.condition] ?? editingBook.condition,
          observaciones: editingBook.description ?? "",
        }),
      });

      if (!response.ok) {
        const backendMessage = await getBackendErrorMessage(response, "No se pudieron guardar los cambios del libro.");
        throw new Error(backendMessage);
      }

      const updated = await response.json();
      const normalized = normalizeDetailBook(updated);
      setSelectedBook(normalized);
      setBooks((prev) => prev.map((b) => (b.id === normalized.id ? { ...b, condition: normalized.condition } : b)));
      setEditVisible(false);
    } catch (e: any) {
      setError(e?.message ?? "No se pudieron guardar los cambios del libro.");
    }
  };

  const deleteBook = async () => {
    if (!selectedBook) return;

    try {
      const response = await apiRequest(`/books/${selectedBook.id}`, { method: "DELETE" });
      if (!response.ok) {
        const backendMessage = await getBackendErrorMessage(response, "No se pudo eliminar el libro.");
        throw new Error(backendMessage);
      }

      setBooks((prev) => prev.filter((b) => b.id !== selectedBook.id));
      setDeleteVisible(false);
      setDetailsVisible(false);
      setSelectedBook(null);
    } catch (e: any) {
      setError(e?.message ?? "No se pudo eliminar el libro.");
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingVertical: 16 }}>
      {loading ? (
        <ActivityIndicator size="large" color="#e07a5f" />
      ) : (
        <PersonalLibrary books={books} title="Tu Biblioteca" onBookPress={onBookPress} />
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Modal visible={detailsVisible} animationType="slide" onRequestClose={() => setDetailsVisible(false)}>
        <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
          <Text style={styles.title}>Detalles del libro</Text>
          <Text style={styles.bookTitle}>{selectedBook?.title}</Text>
          <Text style={styles.bookAuthor}>por {selectedBook?.author}</Text>

          <View style={styles.box}>
            {rows.map(([label, value]) => (
              <View key={label} style={styles.row}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.value}>{value}</Text>
              </View>
            ))}
          </View>

          <View style={styles.box}>
            <Text style={styles.label}>Descripción</Text>
            <Text style={styles.description}>{selectedBook?.description || "Sin descripción"}</Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={styles.outlineBtn}
            onPress={() => {
              setEditingBook(selectedBook);
              setDetailsVisible(false);
              setEditVisible(true);
            }}
          >
            <Text style={styles.outlineText}>Editar</Text>
          </Pressable>
          <Pressable style={styles.dangerBtn} onPress={() => setDeleteVisible(true)}>
            <Text style={styles.dangerText}>Eliminar</Text>
          </Pressable>
        </View>
      </Modal>

      <Modal visible={editVisible} animationType="slide" onRequestClose={() => setEditVisible(false)}>
        <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
          <Text style={styles.title}>Editar libro</Text>

          <Text style={styles.inputLabel}>Título</Text>
          <TextInput style={styles.input} value={editingBook?.title} editable={false} />

          <Text style={styles.inputLabel}>Autor</Text>
          <TextInput style={styles.input} value={editingBook?.author} editable={false} />

          <Text style={styles.inputLabel}>Estado</Text>
          <TextInput
            style={styles.input}
            value={editingBook?.condition}
            onChangeText={(text) => setEditingBook((prev) => (prev ? { ...prev, condition: text } : prev))}
          />

          <Text style={styles.inputLabel}>Descripción</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            multiline
            value={editingBook?.description}
            onChangeText={(text) => setEditingBook((prev) => (prev ? { ...prev, description: text } : prev))}
          />

          <Text style={styles.hint}>
            Por ahora este backend solo permite editar aquí estado y descripción en /details.
          </Text>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable style={styles.outlineBtn} onPress={() => setEditVisible(false)}>
            <Text style={styles.outlineText}>Cancelar</Text>
          </Pressable>
          <Pressable style={styles.primaryBtn} onPress={saveChanges}>
            <Text style={styles.primaryText}>Guardar cambios</Text>
          </Pressable>
        </View>
      </Modal>

      <Modal visible={deleteVisible} transparent animationType="fade" onRequestClose={() => setDeleteVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.title}>¿Eliminar libro?</Text>
            <Text style={styles.description}>Esta acción no se puede deshacer.</Text>
            <View style={styles.footer}>
              <Pressable style={styles.outlineBtn} onPress={() => setDeleteVisible(false)}>
                <Text style={styles.outlineText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.dangerBtn} onPress={deleteBook}>
                <Text style={styles.dangerText}>Eliminar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fdfbf7" },
  modal: { flex: 1, backgroundColor: "#fdfbf7" },
  modalContent: { padding: 20, paddingBottom: 100 },
  title: { fontSize: 30, fontWeight: "800", color: "#3e2723", marginBottom: 12 },
  bookTitle: { fontSize: 28, fontWeight: "800", color: "#3e2723", textAlign: "center" },
  bookAuthor: { fontSize: 20, color: "#3d405b", textAlign: "center", marginBottom: 16 },
  box: { borderWidth: 1, borderColor: "#f2cc8f", borderRadius: 16, padding: 14, marginTop: 12 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  label: { fontWeight: "700", color: "#3e2723", fontSize: 18 },
  value: { fontWeight: "700", color: "#3d405b", fontSize: 18 },
  description: { color: "#3d405b", fontSize: 18, marginTop: 6 },
  footer: { flexDirection: "row", gap: 10, padding: 14 },
  outlineBtn: {
    flex: 1,
    borderColor: "#e07a5f",
    borderWidth: 2,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  outlineText: { color: "#e07a5f", fontWeight: "700", fontSize: 18 },
  dangerBtn: {
    flex: 1,
    backgroundColor: "#ff3047",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  dangerText: { color: "#fdfbf7", fontWeight: "700", fontSize: 18 },
  primaryBtn: {
    flex: 1,
    backgroundColor: "#e07a5f",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryText: { color: "#fdfbf7", fontWeight: "700", fontSize: 18 },
  error: { color: "#e07a5f", textAlign: "center", marginTop: 8, fontWeight: "700" },
  inputLabel: { color: "#3e2723", marginTop: 10, marginBottom: 6, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderColor: "#f2cc8f",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#3e2723",
    backgroundColor: "#fdfbf7",
  },
  textArea: { minHeight: 100, textAlignVertical: "top" },
  hint: { color: "#3d405b", marginTop: 12, fontSize: 13 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 20 },
  confirmCard: { backgroundColor: "#fdfbf7", borderRadius: 16, padding: 16 },
});