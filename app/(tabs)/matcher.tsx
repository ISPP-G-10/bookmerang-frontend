import TinderSwiper, { type TinderSwiperRef } from '@/components/matcher/TinderSwiper';
import { MOCK_CARDS } from '@/components/matcher/mockData';
import type { MatcherCard } from '@/types/matcher';
import { Ionicons } from '@expo/vector-icons';
import React, { useRef } from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_MOBILE = SCREEN_WIDTH < 768;

const CARD_WIDTH_DESKTOP = Math.min(380, SCREEN_WIDTH * 0.45);
const CARD_HEIGHT_DESKTOP = CARD_WIDTH_DESKTOP * 1.4;
const DESKTOP_BUTTON_BOTTOM = (SCREEN_HEIGHT - CARD_HEIGHT_DESKTOP) / 2 - 90;

export default function MatcherScreen() {
  const swiperRef = useRef<TinderSwiperRef>(null);

  const handleSwipeLeft = (card: MatcherCard) => {
    console.log('NOPE:', card.book.titulo);
  };

  const handleSwipeRight = (card: MatcherCard) => {
    console.log('LIKE:', card.book.titulo);
  };

  const handleTap = (card: MatcherCard) => {
    console.log('TAP:', card.book.titulo);
  };

  return (
    <View className="flex-1 bg-background-0 items-center justify-center">
      <TinderSwiper
        ref={swiperRef}
        cards={MOCK_CARDS}
        onSwipeLeft={handleSwipeLeft}
        onSwipeRight={handleSwipeRight}
        onTap={handleTap}
      />

      <View style={styles.actionsContainer}>
        <Pressable
          onPress={() => swiperRef.current?.swipeLeft()}
          style={[styles.actionButton, styles.dislikeButton]}
        >
          <Ionicons name="close" size={IS_MOBILE ? 50 : 42} color="#ef4444" />
        </Pressable>

        <Pressable
          onPress={() => swiperRef.current?.swipeRight()}
          style={[styles.actionButton, styles.likeButton]}
        >
          <Ionicons name="heart" size={IS_MOBILE ? 50 : 42} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionsContainer: {
    position: 'absolute',
    bottom: IS_MOBILE ? '3%' : DESKTOP_BUTTON_BOTTOM,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: IS_MOBILE ? 40 : 45,
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
    width: IS_MOBILE ? 66 : 72,
    height: IS_MOBILE ? 66 : 72,
    backgroundColor: '#fff',
  },
  likeButton: {
    width: IS_MOBILE ? 70 : 76,
    height: IS_MOBILE ? 70 : 76,
    backgroundColor: '#E2725B',
  },
});