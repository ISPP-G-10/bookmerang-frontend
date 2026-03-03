import { getProfile as fetchProfile, getMyLibrary, toConditionLabel, type BookListItem, type UserProfile } from '@/lib/books';
import FontAwesome from '@expo/vector-icons/FontAwesome';
<<<<<<< HEAD
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
=======
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
>>>>>>> 74955fa07932b8d36cf4afc83c60f2f1ad1799e2
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ProfileScreen() {
  const params = useLocalSearchParams<{ message?: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [books, setBooks] = useState<BookListItem[]>([]);
  const [libraryError, setLibraryError] = useState('');
<<<<<<< HEAD
  const [isLoadingLibrary, setIsLoadingLibrary] = useState<boolean>(false);
=======
>>>>>>> 74955fa07932b8d36cf4afc83c60f2f1ad1799e2

  const bannerText = useMemo(() => {
    if (params.message === 'updated') return 'Libro actualizado correctamente';
    if (params.message === 'deleted') return 'Libro eliminado de tu biblioteca';
    return '';
  }, [params.message]);

<<<<<<< HEAD
  const loadData = useCallback(async () => {
    setLibraryError('');
    setIsLoadingLibrary(true);
    try {
      const [profileResult, booksResult] = await Promise.allSettled([fetchProfile(), getMyLibrary()]);

    if (profileResult.status === 'fulfilled') {
      setProfile(profileResult.value);
    }

    if (booksResult.status === 'fulfilled') {
      setBooks(booksResult.value);
    } else {
      setBooks([]);
      setLibraryError('No se pudo cargar tu biblioteca. Revisa backend/token e inténtalo de nuevo.');
    }
    } finally {
      setIsLoadingLibrary(false);
    }  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );
=======
  useEffect(() => {
    const loadData = async () => {
      setLibraryError('');

      const [profileResult, booksResult] = await Promise.allSettled([fetchProfile(), getMyLibrary()]);

      if (profileResult.status === 'fulfilled') {
        setProfile(profileResult.value);
      }

      if (booksResult.status === 'fulfilled') {
        setBooks(booksResult.value);
      } else {
        setLibraryError('No se pudo cargar tu biblioteca. Revisa backend/token e inténtalo de nuevo.');
      }
    };

    loadData();
  }, []);
>>>>>>> 74955fa07932b8d36cf4afc83c60f2f1ad1799e2

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <FontAwesome name="arrow-left" size={18} color="#e07a5f" />
          </TouchableOpacity>

          <View style={styles.brandWrap}>
            <View style={styles.brandIcon}><FontAwesome name="book" size={15} color="#fdfbf7" /></View>
            <Text style={styles.brandText}>Bookmerang</Text>
          </View>

          <View style={{ width: 36 }} />
        </View>

        {!!bannerText && (
          <View style={styles.successBanner}>
            <FontAwesome name="check-circle" size={16} color="#0a8f47" />
            <Text style={styles.successText}>{bannerText}</Text>
          </View>
        )}

        <View style={styles.profileTop}>
          <View style={styles.profileTitleRow}>
            <Text style={styles.profileTitle}>Mi Perfil</Text>
            <FontAwesome name="gear" size={26} color="#8c7559" />
          </View>

          <View style={styles.avatarWrap}>
            {profile?.profilePhoto ? (
              <Image source={{ uri: profile.profilePhoto }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}><FontAwesome name="user" size={38} color="#e07a5f" /></View>
            )}
          </View>

          <Text style={styles.nameText}>{profile?.name ?? 'Usuario'}</Text>
          <Text style={styles.usernameText}>@{profile?.username ?? 'usuario'}</Text>
          <View style={styles.locationRow}>
            <FontAwesome name="map-marker" size={16} color="#e07a5f" />
            <Text style={styles.locationText}>Madrid, España</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statMain}>6</Text>
            <Text style={styles.statLabel}>Nivel</Text>
            <Text style={styles.statSub}>BRONCE</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statMain}>250</Text>
            <Text style={styles.statLabel}>InkDrops{`\n`}MENSUALES</Text>
            <Text style={styles.statTiny}>Reinicia en 12 días</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.sectionButton}><Text style={styles.sectionButtonText}>Editar Preferencias</Text></TouchableOpacity>
        <TouchableOpacity style={styles.sectionButton}><Text style={styles.sectionButtonText}>Tu Biblioteca</Text></TouchableOpacity>

        {libraryError ? <Text style={styles.errorText}>{libraryError}</Text> : null}
<<<<<<< HEAD
        {!libraryError && !isLoadingLibrary && books.length === 0 ? (
          <Text style={styles.emptyText}>
            Aún no tienes libros en tu biblioteca. Sube uno y volverá a aparecer aquí al entrar de nuevo en tu perfil.
          </Text>
        ) : null}

        {!libraryError && !isLoadingLibrary && books.length === 0 ? (
          <TouchableOpacity style={styles.createBookButton} onPress={() => router.push('/(tabs)/subir' as any)}>
            <FontAwesome name="plus" size={16} color="#fdfbf7" />
            <Text style={styles.createBookButtonText}>Subir tu primer libro</Text>
          </TouchableOpacity>
        ) : null}
=======

>>>>>>> 74955fa07932b8d36cf4afc83c60f2f1ad1799e2
        <View style={styles.grid}>
          {books.map((book) => (
            <TouchableOpacity key={book.id} style={styles.bookCard} onPress={() => router.push(`/books/${book.id}` as any)}>
              <View style={styles.bookImageWrap}>
                {book.thumbnailUrl ? (
                  <Image source={{ uri: book.thumbnailUrl }} style={styles.bookImage} />
                ) : (
                  <View style={styles.bookFallback}><FontAwesome name="book" size={30} color="#3d405b" /></View>
                )}
                <View style={styles.badge}><Text style={styles.badgeText}>{toConditionLabel(book.condition)}</Text></View>
              </View>
              <View style={styles.bookInfo}>
                <Text style={styles.bookTitle} numberOfLines={1}>{book.titulo ?? 'Sin título'}</Text>
                <Text style={styles.bookAuthor} numberOfLines={1}>{book.autor ?? 'Autor desconocido'}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f3f0' },
  scrollContent: { paddingBottom: 24 },
  header: { backgroundColor: '#fdfbf7', borderBottomWidth: 1, borderBottomColor: '#ece6df', paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f1ec' },
  brandWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#e07a5f', alignItems: 'center', justifyContent: 'center' },
  brandText: { fontFamily: 'Outfit_700Bold', color: '#e07a5f', fontSize: 20 },
  successBanner: { width: '100%', maxWidth: 560, alignSelf: 'center', marginTop: 14, borderRadius: 12, borderWidth: 1, borderColor: '#9be4b9',
  backgroundColor: '#dbf7e5', 
  paddingHorizontal: 14, 
  paddingVertical: 12, 
  flexDirection: 'row', 
  alignItems: 'center', 
  gap: 8 },  
  successText: { color: '#0b7f3f', fontFamily: 'Outfit_700Bold', fontSize: 15 },
  profileTop: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 20, alignItems: 'center' },
  profileTitleRow: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  profileTitle: { fontFamily: 'Outfit_700Bold', color: '#3e2723', fontSize: 24 },
  avatarWrap: { marginTop: 12 },
  avatar: { width: 130, height: 130, borderRadius: 65 },
  avatarFallback: { backgroundColor: '#f2cc8f', alignItems: 'center', justifyContent: 'center' },
  nameText: { marginTop: 16, fontFamily: 'Outfit_700Bold', fontSize: 20, color: '#3e2723' },
  usernameText: { marginTop: 2, fontFamily: 'Outfit_700Bold', fontSize: 14, color: '#8c6a53' },
  locationRow: { marginTop: 8, flexDirection: 'row', gap: 8, alignItems: 'center' },
  locationText: { fontSize: 14, color: '#8c6a53' },
  statsRow: { width: '100%', maxWidth: 560, alignSelf: 'center', marginTop: 18, paddingHorizontal: 20, flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, borderRadius: 18, backgroundColor: '#fdfbf7', borderWidth: 1, borderColor: '#ece6df', padding: 14 },
  statMain: { fontFamily: 'Outfit_700Bold', fontSize: 18, color: '#3e2723' },
  statLabel: { marginTop: 4, fontFamily: 'Outfit_700Bold', fontSize: 14, color: '#3e2723' },
  statSub: { marginTop: 2, fontFamily: 'Outfit_700Bold', fontSize: 13, color: '#cc7725' },
  statTiny: { marginTop: 4, fontSize: 12, color: '#e07a5f' },
  sectionButton: { width: '100%', maxWidth: 520, alignSelf: 'center', marginTop: 14, borderRadius: 999, borderWidth: 2, borderColor: '#e07a5f', backgroundColor: '#f5f3f0', paddingVertical: 12, alignItems: 'center' },
  sectionButtonText: { fontFamily: 'Outfit_700Bold', color: '#e07a5f', fontSize: 18 },
  errorText: { color: '#ff2f2f', paddingHorizontal: 22, marginTop: 14, fontSize: 14 },
<<<<<<< HEAD
  emptyText: { color: '#8c6a53', paddingHorizontal: 22, marginTop: 14, fontSize: 14 },
  createBookButton: { width: '100%', maxWidth: 520, alignSelf: 'center', marginTop: 14, borderRadius: 999, backgroundColor: '#e07a5f', paddingVertical: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  createBookButtonText: { fontFamily: 'Outfit_700Bold', color: '#fdfbf7', fontSize: 18 },
=======
>>>>>>> 74955fa07932b8d36cf4afc83c60f2f1ad1799e2
  grid: { paddingHorizontal: 20, marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  bookCard: { width: '48%', marginBottom: 14, borderRadius: 14, overflow: 'hidden', backgroundColor: '#fdfbf7', borderWidth: 1, borderColor: '#ece6df' },
  bookImageWrap: { height: 220, backgroundColor: '#f2cc8f' },
  bookImage: { width: '100%', height: '100%' },
  bookFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', left: 10, bottom: 10, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, backgroundColor: '#ea7b5e' },
  badgeText: { color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 14 },
  bookInfo: { paddingHorizontal: 10, paddingVertical: 10 },
  bookTitle: { fontFamily: 'Outfit_700Bold', color: '#3e2723', fontSize: 18 },
  bookAuthor: { color: '#8c6a53', fontSize: 14, marginTop: 3 },
});