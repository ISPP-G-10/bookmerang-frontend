import React from 'react';
import { View } from 'react-native';
import BookCard from '@/components/matcher/BookCard';
import { MOCK_CARDS } from '@/components/matcher/mockData';

export default function MatcherScreen() {
  const card = MOCK_CARDS[0];

  return (
    <View className="flex-1 bg-background-0 items-center justify-center">
      <BookCard card={card} />
    </View>
  );
}
