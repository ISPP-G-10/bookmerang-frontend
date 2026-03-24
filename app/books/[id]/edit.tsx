import {
  getBookDetail,
  toConditionEnum,
  toConditionLabel,
  toCoverEnum,
  toCoverLabel,
  updateBook,
  type BookDetail,
} from "@/lib/books";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

export default function EditBookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const [book, setBook] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [condition, setCondition] = useState("Como nuevo");
  const [language, setLanguage] = useState("Español");
  const [pages, setPages] = useState("");
  const [cover, setCover] = useState("Tapa dura");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const isDesktop = width >= 1024;
  const contentMaxWidth = isDesktop ? 1080 : 420;
  const imageColumnWidth = isDesktop ? 320 : undefined;

  useEffect(() => {
    const load = async () => {
      try {
        if (!id) return;
        setLoading(true);
        const detail = await getBookDetail(Number(id));
        setBook(detail);
        setTitle(detail.titulo ?? "");
        setAuthor(detail.autor ?? "");
        setCondition(toConditionLabel(detail.condition));
        setLanguage(detail.languages?.[0] ?? "Español");
        setPages(String(detail.numPaginas ?? ""));
        setCover(toCoverLabel(detail.cover));
        setDescription(detail.observaciones ?? "");
      } catch {
        setError("No se pudo cargar el libro.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const handleSave = async () => {
    if (!book) return;

    try {
      await updateBook({
        ...book,
        titulo: title,
        autor: author,
        condition: toConditionEnum(condition),
        languages: [language],
        numPaginas: pages ? Number(pages) : null,
        cover: toCoverEnum(cover),
        observaciones: description,
      });
      router.replace("/profile?message=updated" as any);
    } catch {
      setError("No se pudo guardar el libro.");
    }
  };

  return (
    <View className="flex-1 bg-[#fdfbf7]">
      <View className="bg-white px-4 py-4 flex-row items-center gap-4 border-b border-[#F3E9E0]">
        <TouchableOpacity onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={22} color="#e07a5f" />
        </TouchableOpacity>
        <Text
          style={{ fontFamily: "Outfit_700Bold" }}
          className="text-[#3e2723] text-2xl"
        >
          Editar libro
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#e07a5f" />
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={{
              padding: 16,
              paddingBottom: 120,
              alignItems: "center",
            }}
          >
            <View style={{ width: "100%", maxWidth: contentMaxWidth }}>
              {error ? <Text className="text-red-500 mb-3">{error}</Text> : null}

              <View
                style={{
                  flexDirection: isDesktop ? "row" : "column",
                  gap: 24,
                  alignItems: isDesktop ? "flex-start" : "stretch",
                }}
              >
                {book?.photos?.[0]?.url ? (
                  <View
                    style={{ width: imageColumnWidth ?? "100%" }}
                    className="items-center mb-4"
                  >
                    <Image
                      source={{ uri: book.photos[0].url }}
                      className="h-72 w-48 rounded-3xl"
                    />
                  </View>
                ) : null}

                <View style={{ flex: 1 }}>
                  <Field
                    label="Título del libro *"
                    value={title}
                    onChangeText={setTitle}
                  />
                  <Field label="Autor *" value={author} onChangeText={setAuthor} />
                  <Field
                    label="Estado del libro *"
                    value={condition}
                    onChangeText={setCondition}
                  />
                  <Field label="Idioma" value={language} onChangeText={setLanguage} />
                  <Field
                    label="Número de páginas"
                    value={pages}
                    onChangeText={setPages}
                    keyboardType="number-pad"
                  />
                  <Field label="Tipo de tapa" value={cover} onChangeText={setCover} />
                  <Field
                    label="Descripción"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                  />
                </View>
              </View>
            </View>
          </ScrollView>

          <View className="absolute bottom-0 left-0 right-0 border-t border-[#F3E9E0] bg-white p-4 items-center">
            <View style={{ width: "100%", maxWidth: contentMaxWidth }}>
              <TouchableOpacity
                className="bg-[#e07a5f] rounded-full py-3 items-center flex-row justify-center gap-2"
                onPress={handleSave}
              >
                <FontAwesome name="save" size={18} color="white" />
                <Text
                  style={{ fontFamily: "Outfit_700Bold" }}
                  className="text-white text-lg"
                >
                  Guardar cambios
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  keyboardType?: "default" | "number-pad";
}) {
  return (
    <View className="mb-4">
      <Text
        style={{ fontFamily: "Outfit_700Bold" }}
        className="text-[#3e2723] text-xl mb-2"
      >
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? "default"}
        multiline={multiline}
        className="bg-white rounded-3xl border border-[#F3E9E0] px-4 py-4 text-[#3e2723] text-xl"
        style={
          multiline ? { minHeight: 120, textAlignVertical: "top" } : undefined
        }
      />
    </View>
  );
}