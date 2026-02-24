import TinderSwiper from '@/components/matcher/TinderSwiper';
import { MOCK_CARDS } from '@/components/matcher/mockData';
import type { MatcherCard } from '@/types/matcher';
import React from 'react';
import { View } from 'react-native';

export default function MatcherScreen() {
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
        cards={MOCK_CARDS}
        onSwipeLeft={handleSwipeLeft}
        onSwipeRight={handleSwipeRight}
        onTap={handleTap}
      />
    </View>
  );
}
