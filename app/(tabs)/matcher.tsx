import TinderSwiper, { type TinderSwiperRef } from '@/components/matcher/TinderSwiper';
import { MOCK_CARDS } from '@/components/matcher/mockData';
import { CARD_SIZE_CONFIG, LAYOUT_CONFIG } from '@/constants/matcherLayout';
import { useDeviceType } from '@/hooks/useDeviceType';
import type { MatcherCard } from '@/types/matcher';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

export default function MatcherScreen() {
  const swiperRef = useRef<TinderSwiperRef>(null);
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const { deviceType, orientation, isMobile } = useDeviceType();

  const styles = useMemo(() => {
    const sizeConfig = CARD_SIZE_CONFIG[deviceType][orientation];
    const layoutConfig = LAYOUT_CONFIG[deviceType][orientation];
    
    const cardWidth = SCREEN_WIDTH * sizeConfig.widthRatio;
    const cardHeight = cardWidth * sizeConfig.heightRatio;
    
    // Para móvil usa porcentaje, para tablet/desktop usa offset fijo desde la carta
    const buttonBottom = isMobile 
      ? SCREEN_HEIGHT * 0.03 
      : (SCREEN_HEIGHT - cardHeight) / 2 - layoutConfig.buttonOffsetFromCard;

    return StyleSheet.create({
      actionsContainer: {
        position: 'absolute',
        bottom: buttonBottom,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: layoutConfig.buttonGap,
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
        width: layoutConfig.dislikeButtonSize,
        height: layoutConfig.dislikeButtonSize,
        backgroundColor: '#fff',
      },
      likeButton: {
        width: layoutConfig.likeButtonSize,
        height: layoutConfig.likeButtonSize,
        backgroundColor: '#E2725B',
      },
    });
  }, [SCREEN_WIDTH, SCREEN_HEIGHT, deviceType, orientation, isMobile]);

  const iconSize = useMemo(() => {
    return LAYOUT_CONFIG[deviceType][orientation].iconSize;
  }, [deviceType, orientation]);

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
          <Ionicons name="close" size={iconSize} color="#ef4444" />
        </Pressable>

        <Pressable
          onPress={() => swiperRef.current?.swipeRight()}
          style={[styles.actionButton, styles.likeButton]}
        >
          <Ionicons name="heart" size={iconSize} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}