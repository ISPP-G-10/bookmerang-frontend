import { BookDetailsScreen } from '@/components/matcher/BookDetails';
import { MOCK_CARDS } from '@/components/matcher/mockData';
import TinderSwiper, { TinderSwiperRef } from '@/components/matcher/TinderSwiper';
import { CARD_SIZE_CONFIG, LAYOUT_CONFIG } from '@/constants/matcherLayout';
import { useDeviceType } from '@/hooks/useDeviceType';
import type { MatcherCard } from '@/types/matcher';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

export default function MatcherScreen() {
  const swiperRef = useRef<TinderSwiperRef>(null);
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const { deviceType, orientation, isMobile } = useDeviceType();
  const [selectedCard, setSelectedCard] = useState<MatcherCard | null>(null);

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
    const layoutConfig = LAYOUT_CONFIG[deviceType][orientation];
    return {
      dislike: layoutConfig.dislikeButtonSize * 0.5,
      like: layoutConfig.likeButtonSize * 0.5,
    };
  }, [deviceType, orientation]);

  const handleSwipeLeft = (card: MatcherCard) => {
    console.log('Dislike:', card.book.titulo);
  };

  const handleSwipeRight = (card: MatcherCard) => {
    console.log('Like:', card.book.titulo);
  };

  const handleTap = (card: MatcherCard) => {
    setSelectedCard(card);
  };

  const handleCloseDetails = () => {
    setSelectedCard(null);
  };

  const handleChat = (card: MatcherCard) => {
    console.log('Chat con:', card.book.titulo);
    setSelectedCard(null);
    // Aquí iría la navegación al chat
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
          <Ionicons name="close" size={iconSize.dislike} color="#E2725B" />
        </Pressable>

        <Pressable
          onPress={() => swiperRef.current?.swipeRight()}
          style={[styles.actionButton, styles.likeButton]}
        >
          <Ionicons name="heart" size={iconSize.like} color="#fff" />
        </Pressable>
      </View>

      <BookDetailsScreen
        visible={!!selectedCard}
        card={selectedCard}
        onClose={handleCloseDetails}
        onChat={handleChat}
      />
    </View>
  );
}