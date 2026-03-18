import {
  deleteBook,
  getBookDetail,
  toConditionLabel,
  toCoverLabel,
  type BookDetail,
} from "@/lib/books";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const [book, setBook] = useState<BookDetail | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [error, setError] = useState("");
  const isDesktop = width >= 1024;
  const contentMaxWidth = isDesktop ? 1080 : 420;
  const coverWidth = isDesktop ? 420 : undefined;
  const photoUrls = (book?.photos ?? [])
    .map((photo) => (typeof photo?.url === "string" ? photo.url.trim() : ""))
    .filter((url) => url.length > 0);
  const hasMultiplePhotos = photoUrls.length > 1;
  const activePhotoUrl = photoUrls[currentPhotoIndex] ?? null;

  useEffect(() => {
    const load = async () => {
      try {
        if (!id) return;
        setLoading(true);
        setBook(await getBookDetail(Number(id)));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Error desconocido";
        if (errorMessage.startsWith("403")) {
          setError("No tienes permiso para ver este libro.");
        } else if (errorMessage.startsWith("404")) {
          setError("Este libro no existe.")
        } else {
          setError("No se pudo cargar el detalle del libro.");
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  useEffect(() => {
    setCurrentPhotoIndex(0);
  }, [book?.id]);

  const handleDelete = async () => {
    try {
      if (!id) return;
      await deleteBook(Number(id));
      setShowDeleteModal(false);
      router.replace("/profile?message=deleted" as any);
    } catch {
      setError("No se pudo eliminar el libro.");
    }
  };

  const handleShowPreviousPhoto = () => {
    if (photoUrls.length <= 1) return;
    setCurrentPhotoIndex((previousIndex) =>
      previousIndex === 0 ? photoUrls.length - 1 : previousIndex - 1,
    );
  };

  const handleShowNextPhoto = () => {
    if (photoUrls.length <= 1) return;
    setCurrentPhotoIndex((previousIndex) =>
      previousIndex === photoUrls.length - 1 ? 0 : previousIndex + 1,
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fdfbf7" }}>
      <View className="bg-white px-4 py-4 flex-row items-center gap-4 border-b border-[#F3E9E0]">
        <TouchableOpacity onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={22} color="#e07a5f" />
        </TouchableOpacity>
        <Text
          style={{ fontFamily: "Outfit_700Bold" }}
          className="text-[#3e2723] text-2xl"
        >
          Detalles del libro
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#e07a5f" />
        </View>
      ) : null}

      {!loading && error ? (
        <Text className="text-red-500 px-4 mt-3">{error}</Text>
      ) : null}

      {!loading && book ? (
        <>
          <ScrollView
            contentContainerStyle={{
              padding: 20,
              paddingBottom: 120,
              alignItems: "center",
            }}
          >
            <View style={{ width: "100%", maxWidth: contentMaxWidth }}>
              <View
                style={{
                  flexDirection: isDesktop ? "row" : "column",
                  gap: 24,
                  alignItems: isDesktop ? "flex-start" : "stretch",
                }}
              >
                <View
                  className="relative"
                  style={{ width: coverWidth ?? "100%", flexShrink: 0 }}
                >
                  <TouchableOpacity
                    activeOpacity={0.9}
                    disabled={!activePhotoUrl}
                    onPress={() => setShowGalleryModal(true)}
                  >
                    <View className="h-96 rounded-3xl overflow-hidden bg-[#F3E9E0]">
                      {activePhotoUrl ? (
                        <Image
                          source={{ uri: activePhotoUrl }}
                          className="w-full h-full"
                        />
                      ) : null}
                    </View>
                  </TouchableOpacity>
                  {activePhotoUrl ? (
                    <View
                      style={{
                        position: "absolute",
                        bottom: 12,
                        alignSelf: "center",
                        backgroundColor: "rgba(0,0,0,0.45)",
                        borderRadius: 999,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                      }}
                    >
                      <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 12 }}>
                        {hasMultiplePhotos
                          ? `${currentPhotoIndex + 1}/${photoUrls.length} · Pulsa para ampliar`
                          : "Pulsa para ampliar"}
                      </Text>
                    </View>
                  ) : null}
                  <View className="absolute top-4 right-4 rounded-full bg-[#e07a5f] px-4 py-2">
                    <Text className="text-white font-semibold">
                      {toConditionLabel(book.condition)}
                    </Text>
                  </View>
                </View>

                <View style={{ flex: 1, width: "100%" }}>
                  <Text
                    style={{ fontFamily: "Outfit_700Bold" }}
                    className={`text-[#3e2723] mt-6 ${isDesktop ? "text-5xl text-left mt-0" : "text-4xl text-center"}`}
                  >
                    {book.titulo}
                  </Text>
                  <Text
                    style={{ fontFamily: "Outfit_700Bold" }}
                    className={`text-[#8B7355] mt-2 ${isDesktop ? "text-3xl text-left" : "text-2xl text-center"}`}
                  >
                    por {book.autor}
                  </Text>

                  <View className="w-full rounded-2xl border border-[#F3E9E0] bg-white p-4 mt-5">
                    <Row
                      label="Idioma"
                      value={book.languages?.[0] ?? "No especificado"}
                    />
                    <Row label="Páginas" value={String(book.numPaginas ?? "-")} />
                    <Row label="Tipo de tapa" value={toCoverLabel(book.cover)} />
                    <Row label="Estado" value={toConditionLabel(book.condition)} />
                  </View>

                  <View className="w-full rounded-2xl border border-[#F3E9E0] bg-white p-4 mt-4">
                    <Text
                      style={{ fontFamily: "Outfit_700Bold" }}
                      className="text-[#3e2723] text-xl"
                    >
                      Descripción
                    </Text>
                    <Text className="text-[#8B7355] text-xl mt-2">
                      {book.observaciones || "Sin descripción"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>

          <View className="absolute bottom-0 left-0 right-0 border-t border-[#F3E9E0] bg-white p-4 items-center">
            <View style={{ width: "100%", maxWidth: contentMaxWidth }} className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 border-2 border-[#e07a5f] rounded-full py-3 items-center flex-row justify-center gap-2"
                onPress={() => router.push(`/books/${id}/edit` as any)}
              >
                <FontAwesome name="pencil" size={18} color="#e07a5f" />
                <Text
                  style={{ fontFamily: "Outfit_700Bold" }}
                  className="text-[#e07a5f] text-lg"
                >
                  Editar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-[#e07a5f] rounded-full py-3 items-center flex-row justify-center gap-2"
                onPress={() => setShowDeleteModal(true)}
              >
                <FontAwesome name="trash-o" size={18} color="white" />
                <Text
                  style={{ fontFamily: "Outfit_700Bold" }}
                  className="text-white text-lg"
                >
                  Eliminar
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Modal visible={showGalleryModal} transparent animationType="fade">
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.94)" }}>
              <TouchableOpacity
                onPress={() => setShowGalleryModal(false)}
                style={{
                  position: "absolute",
                  top: 40,
                  right: 20,
                  zIndex: 30,
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  backgroundColor: "rgba(255,255,255,0.18)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FontAwesome name="close" size={22} color="#ffffff" />
              </TouchableOpacity>

              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: isDesktop ? 24 : 16,
                  paddingVertical: isDesktop ? 24 : 28,
                }}
              >
                {activePhotoUrl ? (
                  <Image
                    source={{ uri: activePhotoUrl }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="contain"
                  />
                ) : null}
              </View>

              {hasMultiplePhotos ? (
                <>
                  <TouchableOpacity
                    onPress={handleShowPreviousPhoto}
                    style={{
                      position: "absolute",
                      left: 16,
                      top: "50%",
                      marginTop: -22,
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: "rgba(255,255,255,0.22)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <FontAwesome name="chevron-left" size={20} color="#ffffff" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleShowNextPhoto}
                    style={{
                      position: "absolute",
                      right: 16,
                      top: "50%",
                      marginTop: -22,
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: "rgba(255,255,255,0.22)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <FontAwesome name="chevron-right" size={20} color="#ffffff" />
                  </TouchableOpacity>
                </>
              ) : null}

              {activePhotoUrl ? (
                <View
                  style={{
                    position: "absolute",
                    bottom: 28,
                    alignSelf: "center",
                    backgroundColor: "rgba(0,0,0,0.5)",
                    borderRadius: 999,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  }}
                >
                  <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "700" }}>
                    {hasMultiplePhotos
                      ? `${currentPhotoIndex + 1}/${photoUrls.length}`
                      : "1/1"}
                  </Text>
                </View>
              ) : null}
            </View>
          </Modal>

          <Modal visible={showDeleteModal} transparent animationType="fade">
            <View className="flex-1 bg-black/50 justify-center px-6">
              <View className="bg-white rounded-2xl p-4 max-w-sm self-center">
                <View className="w-14 h-14 rounded-full bg-[#FFF5F0] items-center justify-center self-center mb-3">
                  <FontAwesome name="trash-o" size={24} color="#e07a5f" />
                </View>

                <Text
                  style={{ fontFamily: "Outfit_700Bold" }}
                  className="text-[#3e2723] text-2xl text-center"
                >
                  ¿Eliminar libro?
                </Text>
                <Text className="text-[#8B7355] text-base text-center mt-2">
                  Esta acción no se puede deshacer. El libro "{book.titulo}" se
                  eliminará permanentemente.
                </Text>
                <View className="flex-row gap-3 mt-4">
                  <TouchableOpacity
                    className="flex-1 rounded-full bg-[#F3E9E0] py-3 items-center"
                    onPress={() => setShowDeleteModal(false)}
                  >
                    <Text
                      style={{ fontFamily: "Outfit_700Bold" }}
                      className="text-[#8B7355] text-lg"
                    >
                      Cancelar
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 rounded-full bg-[#e07a5f] py-3 items-center"
                    onPress={handleDelete}
                  >
                    <Text
                      style={{ fontFamily: "Outfit_700Bold" }}
                      className="text-white text-lg"
                    >
                      Eliminar
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </>
      ) : null}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between mb-3 last:mb-0">
      <Text
        style={{ fontFamily: "Outfit_700Bold" }}
        className="text-[#8B7355] text-xl"
      >
        {label}
      </Text>
      <Text
        style={{ fontFamily: "Outfit_700Bold" }}
        className="text-[#3e2723] text-xl"
      >
        {value}
      </Text>
    </View>
  );
}