import { MATCHER_LAYOUT } from '@/constants/matcherLayout';
import type { MatcherCard } from '@/types/matcher';
import { BlurView } from 'expo-blur';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
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

const SWIPE_THRESHOLD_RATIO = 0.3;
const MAX_ROTATION = 15;
const SWIPE_DURATION = 300;
const BLUR_FADE_DURATION = 700;

interface TinderSwiperProps {
  cards: MatcherCard[];
  onSwipeLeft?: (card: MatcherCard) => void;
  onSwipeRight?: (card: MatcherCard) => void;
  onTap?: (card: MatcherCard) => void;
  onEmpty?: () => void;
}

export interface TinderSwiperRef {
  swipeLeft: () => void;
  swipeRight: () => void;
}

const TinderSwiper = forwardRef<TinderSwiperRef, TinderSwiperProps>(
  ({ cards, onSwipeLeft, onSwipeRight, onTap, onEmpty }, ref) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
    const config = MATCHER_LAYOUT;

    const SWIPE_THRESHOLD = useMemo(() => SCREEN_WIDTH * SWIPE_THRESHOLD_RATIO, [SCREEN_WIDTH]);
    
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const isAnimating = useSharedValue(false);

    const topCardBlurIntensity = useSharedValue(0);

    const advanceToNext = useCallback(
      (direction: 'left' | 'right') => {
        if (currentIndex >= cards.length) return;
        const card = cards[currentIndex];
        if (!card) return;

        if (direction === 'right') {
          onSwipeRight?.(card);
        } else {
          onSwipeLeft?.(card);
        }

        requestAnimationFrame(() => {
          setCurrentIndex((prev) => prev + 1);

          requestAnimationFrame(() => {
            translateX.value = 0;
            translateY.value = 0;
            isAnimating.value = false;
            
            topCardBlurIntensity.value = 1;
            topCardBlurIntensity.value = withTiming(0, { duration: BLUR_FADE_DURATION });
          });
        });
      },
      [currentIndex, cards, onSwipeLeft, onSwipeRight, translateX, translateY, isAnimating, topCardBlurIntensity]
    );

    const triggerSwipe = useCallback(
      (direction: 'left' | 'right') => {
        if (currentIndex >= cards.length || isAnimating.value) return;

        isAnimating.value = true;
        const targetX = direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;

        translateX.value = withTiming(
          targetX,
          { duration: SWIPE_DURATION },
          (finished) => {
            if (finished) {
              runOnJS(advanceToNext)(direction);
            }
          }
        );
        translateY.value = withTiming(0, { duration: SWIPE_DURATION });
      },
      [currentIndex, cards.length, advanceToNext, translateX, translateY, isAnimating, SCREEN_WIDTH]
    );

    useImperativeHandle(ref, () => ({
      swipeLeft: () => triggerSwipe('left'),
      swipeRight: () => triggerSwipe('right'),
    }));

    // Gesture para arrastrar con el dedo
    const panGesture = Gesture.Pan()
      .onUpdate((e) => {
        if (isAnimating.value) return;
        translateX.value = e.translationX;
        translateY.value = e.translationY;
      })
      .onEnd((e) => {
        if (isAnimating.value) return;

        if (Math.abs(translateX.value) > SWIPE_THRESHOLD) {
          isAnimating.value = true;
          const direction = translateX.value > 0 ? 'right' : 'left';
          const targetX = direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;

          translateX.value = withTiming(
            targetX,
            { duration: SWIPE_DURATION },
            (finished) => {
              if (finished) {
                runOnJS(advanceToNext)(direction);
              }
            }
          );
          translateY.value = withTiming(e.translationY, { duration: SWIPE_DURATION });
        } else {
          translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
          translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
        }
      });

    const tapGesture = Gesture.Tap().onEnd(() => {
      if (currentIndex >= cards.length || isAnimating.value) return;
      const card = cards[currentIndex];
      if (card && onTap) {
        runOnJS(onTap)(card);
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
        [0, 8],
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
        zIndex: 10,
      };
    });

    const topCardBlurStyle = useAnimatedStyle(() => {
      return {
        opacity: topCardBlurIntensity.value,
      };
    });

    const nextCardStyle = useAnimatedStyle(() => {
      const scale = interpolate(
        Math.abs(translateX.value),
        [0, SWIPE_THRESHOLD],
        [0.95, 1],
        'clamp'
      );

      return {
        transform: [{ scale }],
        zIndex: 5,
      };
    });

    const nextCardBlurStyle = useAnimatedStyle(() => {
      return {
        opacity: 1,
      };
    });

    const topCardIndex = currentIndex;
    const nextCardIndex = currentIndex + 1;
    const hasCards = topCardIndex < cards.length;

    useEffect(() => {
      if (!hasCards) {
        onEmpty?.();
      }
    }, [hasCards, onEmpty]);

    if (!hasCards) return null;

    return (
      <View style={styles.container}>
        {nextCardIndex < cards.length && (
          <Animated.View
            style={[styles.cardContainer, nextCardStyle, { marginTop: SCREEN_HEIGHT * config.card.marginTopPercent }]}
            pointerEvents="none"
          >
            <View style={styles.blurContainer}>
              <BookCard card={cards[nextCardIndex]} />
              <Animated.View style={[StyleSheet.absoluteFill, nextCardBlurStyle]}>
                <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="light" />
              </Animated.View>
            </View>
          </Animated.View>
        )}

        <GestureDetector gesture={composedGesture}>
          <Animated.View style={[styles.cardContainer, topCardStyle, { marginTop: SCREEN_HEIGHT * config.card.marginTopPercent }]}>
            <View style={styles.blurContainer}>
              <Animated.View style={borderStyle}>
                <BookCard card={cards[topCardIndex]} />
              </Animated.View>
              <Animated.View style={[StyleSheet.absoluteFill, topCardBlurStyle]} pointerEvents="none">
                <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="light" />
              </Animated.View>
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    );
  }
);

TinderSwiper.displayName = 'TinderSwiper';

export default TinderSwiper;

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContainer: {
    position: 'absolute',
    alignSelf: 'center',
  },
  blurContainer: {
    overflow: 'hidden',
    borderRadius: 24,
  },
});