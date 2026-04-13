import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { deleteBook, type BookDraftSummary } from '@/lib/books';
import FlowInfoModal from './FlowInfoModal';

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

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) return error.message;
  return "No se pudo completar la operación.";
}

type DraftsModalProps = {
  visible: boolean;
  onClose: () => void;
  drafts: BookDraftSummary[];
  onLoadDraft: (draft: BookDraftSummary) => void;
  onDraftDeleted: (draftId: number) => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
};

export default function DraftsModal({
  visible,
  onClose,
  drafts,
  onLoadDraft,
  onDraftDeleted,
  onError,
  onSuccess,
}: DraftsModalProps) {
  const [deletingDraftId, setDeletingDraftId] = useState<number | null>(null);
  const [pendingDeleteDraft, setPendingDeleteDraft] = useState<BookDraftSummary | null>(null);

  const performDeleteDraft = async (draft: BookDraftSummary) => {
    setDeletingDraftId(draft.id);
    setPendingDeleteDraft(null);

    try {
      await deleteBook(draft.id);
      onDraftDeleted(draft.id);
      onSuccess("Borrador eliminado correctamente.");
    } catch (err) {
      onError(errorMessage(err));
    } finally {
      setDeletingDraftId(null);
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
          {pendingDeleteDraft ? (
            <View>
              <Text style={styles.modalTitle}>Eliminar borrador</Text>
              <Text style={[styles.emptyDraftsText, { marginTop: 12 }]}>Esta acción eliminará el borrador de forma permanente.</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                <TouchableOpacity 
                  style={{ minHeight: 44, minWidth: 120, borderRadius: 13, borderWidth: 2, borderColor: "#eadfd3", backgroundColor: "#fff", alignItems: "center", justifyContent: "center", paddingHorizontal: 12 }} 
                  onPress={() => setPendingDeleteDraft(null)}
                >
                  <Text style={{ fontFamily: "Outfit_700Bold", color: "#8b7f6f", fontSize: 17 }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={{ minHeight: 44, minWidth: 120, borderRadius: 13, backgroundColor: "#d5785f", alignItems: "center", justifyContent: "center", paddingHorizontal: 12 }} 
                  onPress={() => performDeleteDraft(pendingDeleteDraft)}
                >
                  <Text style={{ fontFamily: "Outfit_700Bold", color: "#fff", fontSize: 17 }}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.headerRow}>
                <Text style={styles.modalTitle}>Tus borradores</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <FontAwesome name="times" size={24} color="#8e8171" />
                </TouchableOpacity>
              </View>
              {drafts.length === 0 ? (
                <Text style={styles.emptyDraftsText}>No tienes borradores guardados.</Text>
              ) : (
                <ScrollView style={styles.modalList}>
                  {drafts.map((draft) => (
                    <View key={draft.id} style={styles.draftItem}>
                      <TouchableOpacity
                        style={styles.draftMainArea}
                        onPress={() => onLoadDraft(draft)}
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
                        onPress={() => { if (!deletingDraftId) setPendingDeleteDraft(draft); }}
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
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontFamily: "Outfit_700Bold",
    color: "#3d352d",
    fontSize: 28,
  },
  closeButton: {
    padding: 4,
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