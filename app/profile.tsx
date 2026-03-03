import { getProfile as fetchProfile, getMyLibrary, toConditionLabel, type BookListItem, type UserProfile } from '@/lib/books';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';

export default function ProfileScreen() {
  const params = useLocalSearchParams<{ message?: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [books, setBooks] = useState<BookListItem[]>([]);
  const [error, setError] = useState('');

  const bannerText = useMemo(() => {
    if (params.message === 'updated') return 'Libro actualizado correctamente';
    if (params.message === 'deleted') return 'Libro eliminado de tu biblioteca';
    return '';
  }, [params.message]);

  const loadData = async () => {
    try {
      setError('');
      const [profileData, booksData] = await Promise.all([fetchProfile(), getMyLibrary()]);
      setProfile(profileData);
      setBooks(booksData);
    } catch (e) {
      setError('No se pudieron cargar tus datos.');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <View className="flex-1 bg-[#fdfbf7]">
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        <View className="bg-white px-4 py-4 flex-row items-center justify-between border-b border-[#f2cc8f]">
          <TouchableOpacity onPress={() => router.back()}>
            <FontAwesome name="arrow-left" size={22} color="#3d405b" />
          </TouchableOpacity>
          <Text style={{ fontFamily: 'Outfit_700Bold', color: '#e07a5f', fontSize: 30 }}>Bookmerang</Text>
          <View className="w-5" />
        </View>

        {!!bannerText && (
          <View className="mx-4 mt-4 rounded-xl border border-[#f2cc8f] bg-[#fdfbf7] p-4 flex-row items-center gap-3">
            <FontAwesome name="check-circle" size={18} color="#1f497d" />
            <Text className="text-[#1f497d] font-semibold">{bannerText}</Text>
          </View>
        )}

        <View className="items-center pt-8 px-6">
          <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 42, color: '#3e2723' }}>Mi Perfil</Text>
          <View className="w-36 h-36 rounded-full bg-[#f2cc8f] mt-5 items-center justify-center overflow-hidden border-4 border-white">
            {profile?.profilePhoto ? (
              <Image source={{ uri: profile.profilePhoto }} className="w-full h-full" />
            ) : (
              <FontAwesome name="user" size={48} color="#e07a5f" />
            )}
          </View>
          <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 40, color: '#3e2723' }} className="mt-5 text-center">
            {profile?.name ?? 'Usuario'}
          </Text>
          <Text className="text-[#3d405b] text-2xl mt-1">@{profile?.username ?? 'usuario'}</Text>
        </View>

        <View className="mt-8 px-4">
          <View className="rounded-full border-2 border-[#e07a5f] py-4 items-center">
            <Text style={{ fontFamily: 'Outfit_700Bold', color: '#e07a5f', fontSize: 36 }}>Tu Biblioteca</Text>
          </View>
        </View>

        {error ? <Text className="text-red-500 px-5 mt-4">{error}</Text> : null}

        <View className="px-4 mt-5 flex-row flex-wrap justify-between">
          {books.map((book) => (
            <TouchableOpacity
              key={book.id}
              className="mb-4 w-[48%] overflow-hidden rounded-2xl bg-white border border-[#f2cc8f]"
              onPress={() => router.push(`/books/${book.id}` as any)}>
              <View className="h-60 bg-[#f2cc8f]">
                {book.thumbnailUrl ? (
                  <Image source={{ uri: book.thumbnailUrl }} className="w-full h-full" />
                ) : (
                  <View className="h-full items-center justify-center"><FontAwesome name="book" size={36} color="#3d405b" /></View>
                )}
              </View>
              <View className="absolute left-3 top-52 rounded-full bg-[#ea7b5e] px-3 py-1">
                <Text className="text-white font-semibold text-xs">{toConditionLabel(book.condition)}</Text>
              </View>
              <View className="p-3 pt-4">
                <Text style={{ fontFamily: 'Outfit_700Bold' }} className="text-[#3e2723] text-2xl">{book.titulo}</Text>
                <Text className="text-[#3d405b] text-xl">{book.autor}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}