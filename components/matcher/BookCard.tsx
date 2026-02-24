import { Badge, BadgeText } from '@/components/ui/badge';
import { Box } from '@/components/ui/box';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Image } from '@/components/ui/image';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { BookCondition, MatcherCard } from '@/types/matcher';
import React from 'react';
import { Dimensions, View } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_MOBILE = SCREEN_WIDTH < 768;

const CARD_WIDTH = IS_MOBILE ? SCREEN_WIDTH * 0.85 : Math.min(400, SCREEN_WIDTH * 0.45);
const CARD_HEIGHT = IS_MOBILE ? CARD_WIDTH * 1.6 : CARD_WIDTH * 1.4;

const CONDITION_LABELS: Record<BookCondition, string> = {
  LIKE_NEW: 'Como nuevo',
  VERY_GOOD: 'Muy bueno',
  GOOD: 'Bueno',
  ACCEPTABLE: 'Aceptable',
  POOR: 'Malo',
};

interface BookCardProps {
  card: MatcherCard;
  onTap?: () => void;
}

export default function BookCard({ card, onTap }: BookCardProps) {
  const { book, owner, distanceKm } = card;
  const heroPhoto = book.photos[0]?.url;

  return (
    <Card
      variant="elevated"
      size="md"
      className="overflow-hidden rounded-3xl p-0 shadow-hard-2 bg-white"
      style={{ 
        width: CARD_WIDTH, 
        height: CARD_HEIGHT,
        marginTop: IS_MOBILE ? 0 : -100
      }}
    >
      <Box style={{ height: '75%', width: '100%' }}>
        <Image
          source={{ uri: heroPhoto }}
          alt={book.titulo ?? 'Libro'}
          size="none"
          className="w-full h-full"
          resizeMode="cover"
        />

        <HStack className="absolute top-4 left-4 right-4 justify-between">
          <Badge
            action="info"
            variant="solid"
            className="rounded-full bg-black/40 border-0 px-3 py-1.5"
          >
            <BadgeText className="text-white text-xs normal-case font-medium">
              {distanceKm < 1
                ? `${Math.round(distanceKm * 1000)} m`
                : `${Math.round(distanceKm)} km`}
            </BadgeText>
          </Badge>

          {book.condition && (
            <Badge
              action="success"
              variant="solid"
              className="rounded-full bg-[#E2725B] border-0 px-3 py-1.5"
            >
              <BadgeText className="text-white text-xs normal-case font-medium">
                {CONDITION_LABELS[book.condition]}
              </BadgeText>
            </Badge>
          )}
        </HStack>
      </Box>

      <VStack 
        className="bg-white p-5 gap-2 rounded-b-3xl" 
        style={{ height: '25%' }}
      >
        <Heading
          size="lg"
          className="text-[#4A3B31] font-bold leading-tight"
          numberOfLines={2}
        >
          {book.titulo ?? 'Sin título'}
        </Heading>

        <Text size="sm" className="text-[#8B7355] font-medium">
          por {book.autor ?? 'Autor desconocido'}
        </Text>

        <HStack className="items-center justify-between gap-2 mt-auto">
          <HStack className="items-center gap-2 flex-shrink-0">
            <View className="w-6 h-6 rounded-full bg-[#E2725B] overflow-hidden border border-white shadow-sm">
              {owner.fotoPerfilUrl ? (
                <Image
                  source={{ uri: owner.fotoPerfilUrl }}
                  alt={owner.username}
                  size="none"
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-full h-full bg-[#E2725B] items-center justify-center">
                  <Text className="text-white text-[10px] font-bold">
                    {owner.username.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <Text size="xs" className="text-[#4A3B31] font-bold" numberOfLines={1}>
              {owner.username}
            </Text>
          </HStack>

          <HStack className="gap-1.5 flex-wrap justify-end flex-1">
            {book.genres.slice(0, 2).map((genre) => (
              <Badge
                key={genre.id}
                action="muted"
                variant="solid"
                className="rounded-full bg-[#F3E9E0] border-0 px-2.5 py-1"
              >
                <BadgeText className="text-[#4A3B31] text-[10px] normal-case font-medium">
                  {genre.name}
                </BadgeText>
              </Badge>
            ))}
          </HStack>
        </HStack>
      </VStack>
    </Card>
  );
}