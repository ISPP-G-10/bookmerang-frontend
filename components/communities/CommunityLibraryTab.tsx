import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { getCommunityLibrary, toggleBookLike } from '@/lib/communityApi';
import { CommunityLibraryBookDto } from '@/types/community';
import { useAuth } from '@/contexts/AuthContext';

const GENRE_ALL = 'Todos';

type Props = {
  communityId: number;
};

export default function CommunityLibraryTab({ communityId }: Props) {
  const { currentUserId } = useAuth();

  const [books, setBooks] = useState<CommunityLibraryBookDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState(GENRE_ALL);
  const [premiumRequired, setPremiumRequired] = useState(false);

  const fetchLibrary = useCallback(async () => {
    try {
      setLoading(true);
      setPremiumRequired(false);
      const data = await getCommunityLibrary(communityId, 1, 100);
      setBooks(data);
    } catch (error: any) {
      if (error.message?.includes('403')) {
        setPremiumRequired(true);
      } else {
        Alert.alert('Error', error.message || 'No se pudo cargar la biblioteca');
      }
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useFocusEffect(
    useCallback(() => {
      fetchLibrary();
    }, [fetchLibrary])
  );

  const handleToggleLike = async (bookId: number) => {
    setBooks(prev =>
      prev.map(b =>
        b.bookId === bookId
          ? {
              ...b,
              likedByMe: !b.likedByMe,
              likesCount: b.likedByMe ? b.likesCount - 1 : b.likesCount + 1,
            }
          : b
      )
    );

    try {
      await toggleBookLike(communityId, bookId);
    } catch (error: any) {
      setBooks(prev =>
        prev.map(b =>
          b.bookId === bookId
            ? {
                ...b,
                likedByMe: !b.likedByMe,
                likesCount: b.likedByMe ? b.likesCount - 1 : b.likesCount + 1,
              }
            : b
        )
      );
      Alert.alert('Error', error.message || 'No se pudo procesar el like');
    }
  };

  const allGenres = Array.from(new Set(books.flatMap(b => b.genres ?? []))).sort();
  const genreFilters = [GENRE_ALL, ...allGenres];

  const filteredBooks =
    selectedGenre === GENRE_ALL
      ? books
      : books.filter(b => (b.genres ?? []).includes(selectedGenre));

  const uniqueOwners = new Set(books.map(b => b.ownerId)).size;

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const renderBookCard = ({ item }: { item: CommunityLibraryBookDto }) => {
    const isOwner = item.ownerId === currentUserId;

    return (
      <View style={styles.card}>
        {item.thumbnailUrl ? (
          <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Ionicons name="book" size={28} color="#e4715f" />
          </View>
        )}

        <View style={styles.cardContent}>
          <Text style={styles.bookTitle} numberOfLines={1}>{item.titulo}</Text>
          <Text style={styles.bookAuthor} numberOfLines={1}>{item.autor}</Text>

          <View style={styles.ownerRow}>
            <View style={styles.ownerAvatar}>
              <Text style={styles.ownerAvatarText}>
                {getInitials(item.ownerUsername)}
              </Text>
            </View>
            <Text style={styles.ownerName} numberOfLines={1}>
              {isOwner ? 'Tú' : item.ownerUsername}
            </Text>
          </View>

        </View>

        <Pressable style={styles.likeButton} onPress={() => handleToggleLike(item.bookId)}>
          <Ionicons
            name={item.likedByMe ? 'heart' : 'heart-outline'}
            size={22}
            color={item.likedByMe ? '#e4715f' : '#9ca3af'}
          />
          <Text style={[styles.likeCount, item.likedByMe && styles.likeCountActive]}>
            {item.likesCount}
          </Text>
        </Pressable>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#e4715f" />
      </View>
    );
  }

  if (premiumRequired) {
    return (
      <View style={styles.centered}>
        <Ionicons name="lock-closed-outline" size={48} color="#e4715f" />
        <Text style={styles.premiumTitle}>Funcionalidad Premium</Text>
        <Text style={styles.premiumText}>
          La biblioteca compartida estará disponible para usuarios con suscripción premium.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Resumen */}
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryText}>
          <Text style={styles.summaryBold}>{filteredBooks.length} libros</Text>
          {' '}disponibles para intercambio de{' '}
          <Text style={styles.summaryBold}>{uniqueOwners} miembros</Text>
        </Text>
      </View>

      {/* Filtros de género (solo si hay géneros reales) */}
      {allGenres.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
          style={styles.filtersScroll}
        >
          {genreFilters.map(genre => (
            <Pressable
              key={genre}
              style={[
                styles.filterChip,
                selectedGenre === genre && styles.filterChipActive,
              ]}
              onPress={() => setSelectedGenre(genre)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedGenre === genre && styles.filterChipTextActive,
                ]}
              >
                {genre}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Lista de libros */}
      <FlatList
        data={filteredBooks}
        keyExtractor={(item) => item.bookId.toString()}
        renderItem={renderBookCard}
        contentContainerStyle={filteredBooks.length === 0 ? styles.listEmpty : styles.listContent}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Ionicons name="book-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No hay libros en esta biblioteca</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  summaryContainer: {
    backgroundColor: '#f5f0e8',
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  summaryText: {
    fontSize: 14,
    color: '#4b5563',
  },
  summaryBold: {
    fontWeight: '700',
    color: '#1f2937',
  },
  filtersScroll: {
    flexGrow: 0,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1ccc3',
    backgroundColor: '#fff',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#e4715f',
    borderColor: '#e4715f',
  },
  filterChipText: {
    fontSize: 13,
    color: '#4b5563',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f0ece4',
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#f5f0e8',
  },
  thumbnailPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#f5f0e8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
  },
  bookTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2937',
  },
  bookAuthor: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 1,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  ownerAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#e4715f',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  ownerAvatarText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  ownerName: {
    fontSize: 12,
    color: '#4b5563',
  },
  likeButton: {
    alignItems: 'center',
    paddingLeft: 12,
    minWidth: 40,
  },
  likeCount: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  likeCountActive: {
    color: '#e4715f',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 12,
  },
  premiumTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 16,
  },
  premiumText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
});
