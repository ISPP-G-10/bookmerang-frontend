import Header from '@/components/Header';
import { BookDetailsScreen } from '@/components/matcher/BookDetails';
import MatchOverlay, { type MatchOverlayData } from '@/components/matcher/MatchOverlay';
import TinderSwiper, { type TinderSwiperRef } from '@/components/matcher/TinderSwiper';
import { MATCHER_LAYOUT } from '@/constants/matcherLayout';
import { fetchFeed, sendSwipe, undoLastSwipe, type SwipeResultDto } from '@/lib/matcherApi';
import type { MatcherCard } from '@/types/matcher';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Image as RNImage, StatusBar, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PAGE_SIZE = 20;

export default function MatcherScreen() {
  const router = useRouter();
  const swiperRef = useRef<TinderSwiperRef>(null);
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [selectedCard, setSelectedCard] = useState<MatcherCard | null>(null);
  const [matchInfo, setMatchInfo] = useState<MatchOverlayData | null>(null);
  const [matchResult, setMatchResult] = useState<SwipeResultDto['match'] | null>(null);
  const [swipeError, setSwipeError] = useState<string | null>(null);
  const isSwiping = useRef(false);
  const [canUndo, setCanUndo] = useState(false);

  const [cards, setCards] = useState<MatcherCard[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [allSwiped, setAllSwiped] = useState(false);
  const loadingMore = useRef(false);

  const loadFeed = useCallback(async (pageNum: number, append = false) => {
    try {
      if (!append) setLoading(true);
      setError(null);
      
      const result = await fetchFeed(pageNum, PAGE_SIZE);
      
      setCards((prev) => (append ? [...prev, ...result.cards] : result.cards));
      setHasMore(result.hasMore);
      setPage(pageNum);
      if (!append) setAllSwiped(false);
    } catch (e: any) {
      setError(e.message ?? 'Error al cargar el feed');
    } finally {
      setLoading(false);
      loadingMore.current = false;
    }
  }, []);

  useEffect(() => {
    loadFeed(0);
  }, [loadFeed]);

  const prefetchedRef = useRef(new Set<string>());
  useEffect(() => {
    const upcoming = cards.slice(0, 5);
    for (const card of upcoming) {
      for (const photo of card.book.photos) {
        if (photo.url && !prefetchedRef.current.has(photo.url)) {
          prefetchedRef.current.add(photo.url);
          RNImage.prefetch(photo.url).catch(() => {});
        }
      }
    }
  }, [cards]);

  const styles = useMemo(() => {
    const config = MATCHER_LAYOUT;
    
    const cardWidth = SCREEN_WIDTH * config.card.widthPercent;
    const cardHeight = cardWidth * config.card.heightRatio;
    
    const dislikeButtonSize = SCREEN_WIDTH * config.buttons.dislikeButtonPercent;
    const likeButtonSize = SCREEN_WIDTH * config.buttons.likeButtonPercent;
    const buttonGap = SCREEN_WIDTH * config.buttons.buttonGapPercent;
    
    const buttonBottom = Math.max(
      insets.bottom - 10,
      SCREEN_HEIGHT * config.buttons.bottomPercent
    );

    return StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: '#fdfbf7',
      },
      actionsContainer: {
        position: 'absolute',
        bottom: buttonBottom,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: buttonGap,
        alignItems: 'center',
      },
      actionButton: {
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      dislikeButton: {
        width: dislikeButtonSize,
        height: dislikeButtonSize,
        backgroundColor: '#fdfbf7',
      },
      likeButton: {
        width: likeButtonSize,
        height: likeButtonSize,
        backgroundColor: '#e07a5f',
      },
    });
  }, [SCREEN_WIDTH, SCREEN_HEIGHT, insets]);

  const iconSize = useMemo(() => {
    const config = MATCHER_LAYOUT;
    const dislikeButtonSize = SCREEN_WIDTH * config.buttons.dislikeButtonPercent;
    const likeButtonSize = SCREEN_WIDTH * config.buttons.likeButtonPercent;
    
    return {
      dislike: dislikeButtonSize * config.buttons.iconSizeRatio,
      like: likeButtonSize * config.buttons.iconSizeRatio,
    };
  }, [SCREEN_WIDTH]);

  const maybeLoadMore = useCallback(
    (currentIndex: number) => {
      if (!hasMore || loadingMore.current) return;
      if (cards.length - currentIndex <= 5) {
        loadingMore.current = true;
        loadFeed(page + 1, true);
      }
    },
    [cards.length, hasMore, page, loadFeed],
  );

  const handleSwipe = useCallback(
    async (card: MatcherCard, direction: 'LEFT' | 'RIGHT') => {
      if (isSwiping.current) return;
      isSwiping.current = true;

      maybeLoadMore(cards.indexOf(card) + 1);

      try {
        console.log(`[SWIPE] Sending ${direction} on book ${card.book.id} (${card.book.titulo})`);
        const result: SwipeResultDto = await sendSwipe(card.book.id, direction);
        console.log(`[SWIPE] Result:`, JSON.stringify(result));
        
        if (result.outcome === 'MatchCreated' && result.match) {
          console.log('[SWIPE] MATCH! Showing notification for', result.match.otherUsername);
          setMatchResult(result.match);
          setMatchInfo({
            otherUsername: result.match.otherUsername,
            bookTitle: card.book.titulo,
            bookCoverUrl: card.book.photos?.[0]?.url ?? null,
          });
          setCanUndo(false);
        } else {
          setCanUndo(true);
        }
        setSwipeError(null);
      } catch (e: any) {
        console.warn('Error al registrar swipe:', e.message);
        setSwipeError(e.message ?? 'Error al registrar el swipe');
        setTimeout(() => setSwipeError(null), 3000);
        setCanUndo(false);
      } finally {
        isSwiping.current = false;
      }
    },
    [cards, maybeLoadMore],
  );

  const handleSwipeLeft = useCallback(
    (card: MatcherCard) => handleSwipe(card, 'LEFT'),
    [handleSwipe],
  );

  const handleSwipeRight = useCallback(
    (card: MatcherCard) => handleSwipe(card, 'RIGHT'),
    [handleSwipe],
  );

  const handleTap = (card: MatcherCard) => {
    setSelectedCard(card);
  };

  const handleCloseDetails = () => {
    setSelectedCard(null);
  };

  const handleEmpty = useCallback(() => {
    setAllSwiped(true);
  }, []);

  const handleUndo = useCallback(async () => {
    try {
      await undoLastSwipe();
      setCanUndo(false);
      await loadFeed(0);
    } catch (e: any) {
      setSwipeError(e.message ?? 'No se pudo deshacer el swipe');
      setTimeout(() => setSwipeError(null), 3000);
    }
  }, [loadFeed]);

  const handleChat = (card: MatcherCard) => {
    console.log('Chat con:', card.book.titulo);
    setSelectedCard(null);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <Header />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#e07a5f" />
          <Text style={{ marginTop: 12, color: '#8B7355' }}>Cargando libros…</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <Header />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Ionicons name="alert-circle-outline" size={48} color="#e07a5f" />
          <Text style={{ marginTop: 12, color: '#3e2723', fontSize: 16, textAlign: 'center' }}>
            {error}
          </Text>
          <Pressable
            onPress={() => loadFeed(0)}
            style={{
              marginTop: 16,
              backgroundColor: '#e07a5f',
              paddingHorizontal: 24,
              paddingVertical: 10,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: '#fdfbf7', fontWeight: '600' }}>Reintentar</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (cards.length === 0 || allSwiped) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <Header />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Ionicons name="book-outline" size={48} color="#8B7355" />
          <Text style={{ marginTop: 12, color: '#3e2723', fontSize: 16, textAlign: 'center' }}>
            No hay más libros disponibles por ahora.
          </Text>
          <Pressable
            onPress={() => loadFeed(0)}
            style={{
              marginTop: 16,
              backgroundColor: '#e07a5f',
              paddingHorizontal: 24,
              paddingVertical: 10,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: '#fdfbf7', fontWeight: '600' }}>Refrescar</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <Header />
      <View className="flex-1 items-center justify-center overflow-hidden">
        <View style={{ flex: 1, alignSelf: 'stretch' }}>
          <TinderSwiper
            ref={swiperRef}
            cards={cards}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
            onTap={handleTap}
            onEmpty={handleEmpty}
          />
        </View>

        <View style={styles.actionsContainer}>
          <Pressable
            onPress={() => swiperRef.current?.swipeLeft()}
            style={[styles.actionButton, styles.dislikeButton]}
          >
            <Ionicons name="close" size={iconSize.dislike} color="#e07a5f" />
          </Pressable>

          <Pressable
            onPress={handleUndo}
            disabled={!canUndo}
            style={[
              styles.actionButton,
              {
                width: SCREEN_WIDTH * MATCHER_LAYOUT.buttons.undoButtonPercent,
                height: SCREEN_WIDTH * MATCHER_LAYOUT.buttons.undoButtonPercent,
                backgroundColor: canUndo ? '#f2cc8f' : '#e8e8e8',
                opacity: canUndo ? 1 : 0.4,
              },
            ]}
          >
            <Ionicons
              name="arrow-undo"
              size={SCREEN_WIDTH * MATCHER_LAYOUT.buttons.undoButtonPercent * MATCHER_LAYOUT.buttons.iconSizeRatio}
              color={canUndo ? '#3e2723' : '#bbb'}
            />
          </Pressable>

          <Pressable
            onPress={() => swiperRef.current?.swipeRight()}
            style={[styles.actionButton, styles.likeButton]}
          >
            <Ionicons name="heart" size={iconSize.like} color="#fdfbf7" />
          </Pressable>
        </View>

        <BookDetailsScreen
          visible={!!selectedCard}
          card={selectedCard}
          onClose={handleCloseDetails}
          onChat={handleChat}
        />

        {matchInfo && (
          <MatchOverlay
            data={matchInfo}
            onClose={() => {
              setMatchInfo(null);
              setMatchResult(null);
            }}
            onChat={() => {
              setMatchInfo(null);
              if (matchResult?.chatId) {
                router.push(`/chat/${matchResult.chatId}` as any);
              }
              setMatchResult(null);
            }}
          />
        )}

        {swipeError && (
          <View style={{
            position: 'absolute',
            bottom: 100,
            left: 20,
            right: 20,
            backgroundColor: '#e07a5f',
            padding: 12,
            borderRadius: 8,
            alignItems: 'center',
          }}>
            <Text style={{ color: '#fdfbf7', fontWeight: '600' }}>{swipeError}</Text>
          </View>
        )}
      </View>
    </View>
  );
}