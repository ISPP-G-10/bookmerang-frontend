import { deleteBook, getBookDetail, toConditionLabel, toCoverLabel, type BookDetail } from '@/lib/books';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Modal, Text, TouchableOpacity, View } from 'react-native';

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [book, setBook] = useState<BookDetail | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        if (!id) return;
        setBook(await getBookDetail(Number(id)));
      } catch {
        setError('No se pudo cargar el detalle del libro.');
      }
    };
    load();
  }, [id]);

  const handleDelete = async () => {
    try {
      if (!id) return;
      await deleteBook(Number(id));
      setShowDeleteModal(false);
      router.replace('/profile?message=deleted' as any);
    } catch {
      setError('No se pudo eliminar el libro.');
    }
  };

  return (
    <View className="flex-1 bg-[#fdfbf7]">
      <View className="bg-white px-4 py-4 flex-row items-center gap-4 border-b border-[#f2cc8f]">
        <TouchableOpacity onPress={() => router.back()}><FontAwesome name="arrow-left" size={22} color="#3d405b" /></TouchableOpacity>
        <Text style={{ fontFamily: 'Outfit_700Bold' }} className="text-[#3e2723] text-4xl">Detalles del libro</Text>
      </View>

      {error ? <Text className="text-red-500 px-4 mt-3">{error}</Text> : null}
      {book ? (
        <>
          <View className="p-5">
            <View className="h-96 rounded-3xl overflow-hidden bg-[#f2cc8f]">
              {book.photos?.[0]?.url ? <Image source={{ uri: book.photos[0].url }} className="w-full h-full" /> : null}
            </View>
            <View className="absolute right-10 top-9 rounded-full bg-[#ea7b5e] px-4 py-2"><Text className="text-white font-semibold">{toConditionLabel(book.condition)}</Text></View>
            <Text style={{ fontFamily: 'Outfit_700Bold' }} className="text-[#3e2723] text-5xl text-center mt-6">{book.titulo}</Text>
            <Text style={{ fontFamily: 'Outfit_700Bold' }} className="text-[#3d405b] text-4xl text-center mt-2">por {book.autor}</Text>

            <View className="rounded-2xl border border-[#f2cc8f] bg-white p-4 mt-5">
              <Row label="Idioma" value={book.languages?.[0] ?? 'No especificado'} />
              <Row label="Páginas" value={String(book.numPaginas ?? '-')} />
              <Row label="Tipo de tapa" value={toCoverLabel(book.cover)} />
              <Row label="Estado" value={toConditionLabel(book.condition)} />
            </View>

            <View className="rounded-2xl border border-[#f2cc8f] bg-white p-4 mt-4">
              <Text style={{ fontFamily: 'Outfit_700Bold' }} className="text-[#3e2723] text-3xl">Descripción</Text>
              <Text className="text-[#3d405b] text-3xl mt-2">{book.observaciones || 'Sin descripción'}</Text>
            </View>
          </View>

          <View className="border-t border-[#f2cc8f] bg-white p-4 flex-row gap-3">
            <TouchableOpacity className="flex-1 border-2 border-[#ea7b5e] rounded-full py-4 items-center" onPress={() => router.push(`/books/${id}/edit` as any)}>
              <Text style={{ fontFamily: 'Outfit_700Bold' }} className="text-[#ea7b5e] text-3xl">✎ Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 bg-[#ff2a3d] rounded-full py-4 items-center" onPress={() => setShowDeleteModal(true)}>
              <Text style={{ fontFamily: 'Outfit_700Bold' }} className="text-white text-3xl">🗑 Eliminar</Text>
            </TouchableOpacity>
          </View>

          <Modal visible={showDeleteModal} transparent animationType="fade">
            <View className="flex-1 bg-black/50 justify-center px-6">
              <View className="bg-white rounded-3xl p-6">
                <Text style={{ fontFamily: 'Outfit_700Bold' }} className="text-[#3e2723] text-5xl text-center">¿Eliminar libro?</Text>
                <Text className="text-[#3d405b] text-3xl text-center mt-3">Esta acción no se puede deshacer.</Text>
                <View className="flex-row gap-3 mt-6">
                  <TouchableOpacity className="flex-1 rounded-full bg-[#fdfbf7] py-4 items-center" onPress={() => setShowDeleteModal(false)}><Text style={{ fontFamily: 'Outfit_700Bold' }} className="text-[#3d405b] text-3xl">Cancelar</Text></TouchableOpacity>
                  <TouchableOpacity className="flex-1 rounded-full bg-[#ff2a3d] py-4 items-center" onPress={handleDelete}><Text style={{ fontFamily: 'Outfit_700Bold' }} className="text-white text-3xl">Eliminar</Text></TouchableOpacity>
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
      <Text style={{ fontFamily: 'Outfit_700Bold' }} className="text-[#3d405b] text-3xl">{label}</Text>
      <Text style={{ fontFamily: 'Outfit_700Bold' }} className="text-[#3e2723] text-3xl">{value}</Text>
    </View>
  );
}