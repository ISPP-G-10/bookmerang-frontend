import type { MatcherCard } from '@/types/matcher';
import React, { useCallback, useState } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import BookCard from './BookCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;
const MAX_ROTATION = 15;

interface TinderSwiperProps {
  cards: MatcherCard[];
  onSwipeLeft?: (card: MatcherCard) => void;
  onSwipeRight?: (card: MatcherCard) => void;
  onTap?: (card: MatcherCard) => void;
}

export default function TinderSwiper({
  cards,
  onSwipeLeft,
  onSwipeRight,
  onTap,
}: TinderSwiperProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const goToNext = useCallback(
    (direction: 'left' | 'right') => {
      const card = cards[currentIndex];
      if (!card) return;
      if (direction === 'right') {
        onSwipeRight?.(card);
      } else {
        onSwipeLeft?.(card);
      }
      setCurrentIndex((prev) => prev + 1);
    },
    [currentIndex, cards, onSwipeLeft, onSwipeRight]
  );

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (Math.abs(translateX.value) > SWIPE_THRESHOLD) {
        const direction = translateX.value > 0 ? 'right' : 'left';
        const targetX = direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;

        translateX.value = withTiming(targetX, { duration: 300 }, () => {
          runOnJS(goToNext)(direction);
        });
        translateY.value = withTiming(e.translationY * 1.5, { duration: 300 });
      } else {
        translateX.value = withSpring(0, { damping: 15, stiffness: 120 });
        translateY.value = withSpring(0, { damping: 15, stiffness: 120 });
      }
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    if (cards[currentIndex]) {
      runOnJS(onTap ?? (() => {}))(cards[currentIndex]);
    }
  });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

  // Top card: draggable with rotation
  const topCardStyle = useAnimatedStyle(() => {
    const rotateZ = interpolate(
      translateX.value,
      [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
      [-MAX_ROTATION, 0, MAX_ROTATION]
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotateZ: `${rotateZ}deg` },
      ],
    };
  });

  // Next card: scales up as top card is dragged away
  const nextCardStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      Math.abs(translateX.value),
      [0, SWIPE_THRESHOLD],
      [0.95, 1],
      'clamp'
    );
    const opacity = interpolate(
      Math.abs(translateX.value),
      [0, SWIPE_THRESHOLD],
      [0.7, 1],
      'clamp'
    );

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  // Third card: subtle scale
  const thirdCardStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      Math.abs(translateX.value),
      [0, SWIPE_THRESHOLD],
      [0.9, 0.95],
      'clamp'
    );

    return {
      transform: [{ scale }],
      opacity: 0.5,
    };
  });

  const renderCard = (index: number) => {
    if (index >= cards.length) return null;
    return <BookCard card={cards[index]} />;
  };

  // Reset position when currentIndex changes
  React.useEffect(() => {
    translateX.value = 0;
    translateY.value = 0;
  }, [currentIndex, translateX, translateY]);

  if (currentIndex >= cards.length) {
    return null;
  }

  return (
    <>
      {/* Third card (bottom of stack) */}
      {currentIndex + 2 < cards.length && (
        <Animated.View style={[styles.cardContainer, thirdCardStyle]}>
          {renderCard(currentIndex + 2)}
        </Animated.View>
      )}

      {/* Next card (middle of stack) */}
      {currentIndex + 1 < cards.length && (
        <Animated.View style={[styles.cardContainer, nextCardStyle]}>
          {renderCard(currentIndex + 1)}
        </Animated.View>
      )}

      {/* Top card (draggable) */}
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.cardContainer, topCardStyle]}>
          {renderCard(currentIndex)}
        </Animated.View>
      </GestureDetector>
    </>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    position: 'absolute',
    alignSelf: 'center',
  },
});
