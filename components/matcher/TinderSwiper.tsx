import type { MatcherCard } from '@/types/matcher';
import { BlurView } from 'expo-blur';
import React, { forwardRef, useCallback, useImperativeHandle, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  interpolateColor,
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

export interface TinderSwiperRef {
  swipeLeft: () => void;
  swipeRight: () => void;
}

const TinderSwiper = forwardRef<TinderSwiperRef, TinderSwiperProps>(
  ({ cards, onSwipeLeft, onSwipeRight, onTap }, ref) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const nextCardBlurOpacity = useSharedValue(1);

    // NOTA: Se intentó resetear las animaciones antes del cambio de índice para
    // eliminar el parpadeo visual, pero no funcionó debido a que React Reanimated
    // trabaja en un thread separado (UI thread) mientras que setCurrentIndex se
    // ejecuta en el JS thread, causando un frame intermedio con geometría incorrecta.
    const goToNext = useCallback(
      (direction: 'left' | 'right') => {
        const card = cards[currentIndex % cards.length];
        if (!card) return;

        // Resetear valores animados antes del cambio de índice
        translateX.value = 0;
        translateY.value = 0;
        nextCardBlurOpacity.value = 1;

        // Actualizar índice de la carta actual
        setCurrentIndex((prev) => prev + 1);

        // Ejecutar callbacks
        if (direction === 'right') {
          onSwipeRight?.(card);
        } else {
          onSwipeLeft?.(card);
        }
      },
      [currentIndex, cards, onSwipeLeft, onSwipeRight, translateX, translateY, nextCardBlurOpacity]
    );

    const triggerSwipe = useCallback(
      (direction: 'left' | 'right') => {
        const targetX =
          direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;

        nextCardBlurOpacity.value = withTiming(0, { duration: 250 });

        translateX.value = withTiming(targetX, { duration: 500 }, (finished) => {
          if (finished) {
            runOnJS(goToNext)(direction);
          }
        });
        translateY.value = withTiming(0, { duration: 500 });
      },
      [goToNext, nextCardBlurOpacity, translateX, translateY]
    );

    useImperativeHandle(ref, () => ({
      swipeLeft: () => triggerSwipe('left'),
      swipeRight: () => triggerSwipe('right'),
    }));

    const panGesture = Gesture.Pan()
      .onUpdate((e) => {
        translateX.value = e.translationX;
        translateY.value = e.translationY;
      })
      .onEnd((e) => {
        if (Math.abs(translateX.value) > SWIPE_THRESHOLD) {
          const direction = translateX.value > 0 ? 'right' : 'left';
          const targetX =
            direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;

          nextCardBlurOpacity.value = withTiming(0, { duration: 180 });

          translateX.value = withTiming(targetX, { duration: 300 }, (finished) => {
            if (finished) {
              runOnJS(goToNext)(direction);
            }
          });
          translateY.value = withTiming(e.translationY * 1.5, { duration: 300 });
        } else {
          translateX.value = withSpring(0, { damping: 15, stiffness: 120 });
          translateY.value = withSpring(0, { damping: 15, stiffness: 120 });

          nextCardBlurOpacity.value = withTiming(1, { duration: 120 });
        }
      });

    const tapGesture = Gesture.Tap().onEnd(() => {
      const card = cards[currentIndex % cards.length];
      if (card) {
        runOnJS(onTap ?? (() => {}))(card);
      }
    });

    const composedGesture = Gesture.Race(panGesture, tapGesture);

    const borderStyle = useAnimatedStyle(() => {
      const borderColor = interpolateColor(
        translateX.value,
        [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD],
        ['rgba(239, 68, 68, 1)', 'rgba(255, 255, 255, 0)', 'rgba(34, 197, 94, 1)']
      );

      const borderWidth = interpolate(
        Math.abs(translateX.value),
        [0, SWIPE_THRESHOLD],
        [0, 4],
        'clamp'
      );

      return {
        borderColor,
        borderWidth,
        borderRadius: 24,
      };
    });

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

    const nextCardBlurIntensity = useAnimatedStyle(() => {
      return {
        opacity: nextCardBlurOpacity.value,
      };
    });

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

    // Calcular índices de las cartas visibles
    const topCardIndex = currentIndex % cards.length;
    const nextCardIndex = (currentIndex + 1) % cards.length;
    const thirdCardIndex = (currentIndex + 2) % cards.length;

    return (
      <>
        {/* Third card (fondo del stack) */}
        <Animated.View style={[styles.cardContainer, thirdCardStyle]}>
          <View style={styles.blurContainer}>
            <BookCard key={`third-${thirdCardIndex}`} card={cards[thirdCardIndex]} />
            <BlurView intensity={25} style={StyleSheet.absoluteFill} tint="light" />
          </View>
        </Animated.View>

        {/* Next card (medio del stack) */}
        <Animated.View style={[styles.cardContainer, nextCardStyle]}>
          <View style={styles.blurContainer}>
            <BookCard key={`next-${nextCardIndex}`} card={cards[nextCardIndex]} />
            <Animated.View style={[StyleSheet.absoluteFill, nextCardBlurIntensity]}>
              <BlurView intensity={15} style={StyleSheet.absoluteFill} tint="light" />
            </Animated.View>
          </View>
        </Animated.View>

        {/* Top card (carta principal draggable) */}
        <GestureDetector gesture={composedGesture}>
          <Animated.View style={[styles.cardContainer, topCardStyle]}>
            <Animated.View style={borderStyle}>
              <BookCard key={`top-${topCardIndex}`} card={cards[topCardIndex]} />
            </Animated.View>
          </Animated.View>
        </GestureDetector>
      </>
    );
  }
);

TinderSwiper.displayName = 'TinderSwiper';

export default TinderSwiper;

const styles = StyleSheet.create({
  cardContainer: {
    position: 'absolute',
    alignSelf: 'center',
  },
  blurContainer: {
    overflow: 'hidden',
    borderRadius: 24,
  },
});