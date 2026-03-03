import {
    getBookDetail,
    toConditionEnum,
    toConditionLabel,
    toCoverEnum,
    toCoverLabel,
    updateBook,
    type BookDetail,
} from '@/lib/books';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function EditBookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [book, setBook] = useState<BookDetail | null>(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [condition, setCondition] = useState('Como nuevo');
  const [language, setLanguage] = useState('Español');
  const [pages, setPages] = useState('');
  const [cover, setCover] = useState('Tapa dura');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        if (!id) return;
        const detail = await getBookDetail(Number(id));
        setBook(detail);
        setTitle(detail.titulo ?? '');
        setAuthor(detail.autor ?? '');
        setCondition(toConditionLabel(detail.condition));
        setLanguage(detail.languages?.[0] ?? 'Español');
        setPages(String(detail.numPaginas ?? ''));
        setCover(toCoverLabel(detail.cover));
        setDescription(detail.observaciones ?? '');
      } catch {
        setError('No se pudo cargar el libro.');
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
      router.replace('/profile?message=updated' as any);
    } catch {
      setError('No se pudo guardar el libro.');
    }
  };

  return (
    <View className="flex-1 bg-[#fdfbf7]">
      <View className="bg-white px-4 py-4 flex-row items-center gap-4 border-b border-[#f2cc8f]">
        <TouchableOpacity onPress={() => router.back()}><FontAwesome name="arrow-left" size={22} color="#3d405b" /></TouchableOpacity>
        <Text style={{ fontFamily: 'Outfit_700Bold' }} className="text-[#3e2723] text-4xl">Editar libro</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {error ? <Text className="text-red-500 mb-3">{error}</Text> : null}
        <Field label="Título del libro *" value={title} onChangeText={setTitle} />
        <Field label="Autor *" value={author} onChangeText={setAuthor} />
        <Field label="Estado del libro *" value={condition} onChangeText={setCondition} />
        <Field label="Idioma" value={language} onChangeText={setLanguage} />
        <Field label="Número de páginas" value={pages} onChangeText={setPages} keyboardType="number-pad" />
        <Field label="Tipo de tapa" value={cover} onChangeText={setCover} />
        <Field label="Descripción" value={description} onChangeText={setDescription} multiline />
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 border-t border-[#f2cc8f] bg-white p-4">
        <TouchableOpacity className="bg-[#e07a5f] rounded-full py-4 items-center" onPress={handleSave}>
          <Text style={{ fontFamily: 'Outfit_700Bold' }} className="text-white text-3xl">💾 Guardar cambios</Text>
        </TouchableOpacity>
      </View>
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
  keyboardType?: 'default' | 'number-pad';
}) {
  return (
    <View className="mb-4">
      <Text style={{ fontFamily: 'Outfit_700Bold' }} className="text-[#3e2723] text-3xl mb-2">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? 'default'}
        multiline={multiline}
        className="bg-white rounded-3xl border border-[#f2cc8f] px-4 py-4 text-[#3e2723] text-3xl"
        style={multiline ? { minHeight: 120, textAlignVertical: 'top' } : undefined}
      />
    </View>
  );
}