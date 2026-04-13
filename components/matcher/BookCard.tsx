import { Badge, BadgeText } from '@/components/ui/badge';
import { Box } from '@/components/ui/box';
import { Card } from '@/components/ui/card';
import { HStack } from '@/components/ui/hstack';
import { Image } from '@/components/ui/image';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { MATCHER_LAYOUT, getEffectiveWidth } from '@/constants/matcherLayout';
import type { BookCondition, MatcherCard } from '@/types/matcher';
import React, { useMemo } from 'react';
import { View, useColorScheme, useWindowDimensions } from 'react-native';

const CONDITION_LABELS: Record<BookCondition, string> = {
  LIKE_NEW: 'Como nuevo',
  VERY_GOOD: 'Muy bueno',
  GOOD: 'Bueno',
  ACCEPTABLE: 'Aceptable',
  POOR: 'Malo',
};

const normalizeText = (value: string) => value.replace(/\s+/g, ' ').trim();

const pickVisibleGenres = (
  genres: Array<{ id: number; name: string }>,
  compact: boolean,
) => {
  // Normalizamos y eliminamos duplicados para que las etiquetas sean consistentes.
  const unique: Array<{ id: number; name: string }> = [];
  const seen = new Set<string>();
  for (const genre of genres) {
    const name = normalizeText(genre.name);
    if (name.length === 0) continue;

    const key = name.toLocaleLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    unique.push({ id: genre.id, name });
  }

  const maxSlots = compact ? 2 : 3;
  const visible = unique.slice(0, maxSlots);

  return {
    visibleGenres: visible,
    hiddenGenresCount: Math.max(0, unique.length - visible.length),
  };
};

interface BookCardProps {
  card: MatcherCard;
  onTap?: () => void;
}

export default function BookCard({ card, onTap }: BookCardProps) {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { cardWidth, cardHeight } = useMemo(() => {
    const config = MATCHER_LAYOUT;
    const W = getEffectiveWidth(SCREEN_WIDTH, SCREEN_HEIGHT);

    const width = W * config.card.widthPercent;
    const height = width * config.card.heightRatio;

    return {
      cardWidth: width,
      cardHeight: height,
    };
  }, [SCREEN_WIDTH, SCREEN_HEIGHT]);

  const { book, owner, distanceKm } = card;
  const heroPhoto = book.photos[0]?.url;

  const isCompact = getEffectiveWidth(SCREEN_WIDTH, SCREEN_HEIGHT) < 390;

  // Reducido para quitar hueco blanco excesivo.
  const adjustedCardHeight = isCompact ? cardHeight * 1.02 : cardHeight * 1.04;

  // Rebalanceo de alturas.
  const imageHeightPercent = isCompact ? '68%' : '70%';
  const footerHeightPercent = isCompact ? '32%' : '30%';

  const { visibleGenres, hiddenGenresCount } = useMemo(
    () => pickVisibleGenres(book.genres, isCompact),
    [book.genres, isCompact],
  );

  return (
    <Card
      variant="elevated"
      size="md"
      className="overflow-hidden rounded-3xl p-0 shadow-hard-2 bg-white"
      style={{
        width: cardWidth,
        height: adjustedCardHeight,
        borderWidth: 1,
        borderColor: isDark ? '#3e2723' : '#fdfbf7',
      }}
    >
      <Box style={{ height: imageHeightPercent, width: '100%' }}>
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
              className="rounded-full bg-[#e07a5f] border-0 px-3 py-1.5"
            >
              <BadgeText className="text-white text-xs normal-case font-medium">
                {CONDITION_LABELS[book.condition]}
              </BadgeText>
            </Badge>
          )}
        </HStack>
      </Box>

      <VStack
        className="bg-[#fdfbf7] p-4 gap-1.5 rounded-b-3xl"
        style={{ height: footerHeightPercent }}
      >
        <View style={{ minWidth: 0, width: '100%' }}>
          <Text
            size="xl"
            className="text-[#3e2723] font-bold leading-tight web:block web:w-full web:truncate"
            numberOfLines={1}
            ellipsizeMode="tail"
            allowFontScaling={false}
            style={{ width: '100%', flexShrink: 1 }}
          >
            {book.titulo ?? 'Sin titulo'}
          </Text>
        </View>

        <Text size="sm" className="text-[#3e2723] font-medium" numberOfLines={1}>
          por {book.autor ?? 'Autor desconocido'}
        </Text>

        <HStack className="items-center gap-2 mt-auto" style={{ minWidth: 0 }}>
          <View className="w-6 h-6 rounded-full bg-[#e07a5f] overflow-hidden border border-white shadow-sm">
            {owner.fotoPerfilUrl ? (
              <Image
                source={{ uri: owner.fotoPerfilUrl }}
                alt={owner.username}
                size="none"
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <View className="w-full h-full bg-[#e07a5f] items-center justify-center">
                <Text className="text-white text-[10px] font-bold">
                  {owner.username.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <Text
            size="xs"
            className="text-[#3e2723] font-bold"
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{ flexShrink: 1, minWidth: 0 }}
          >
            {owner.username}
          </Text>
        </HStack>

        <HStack
          className="items-center gap-1.5 mt-1"
          style={{
            minWidth: 0,
            flexWrap: 'nowrap',
            overflow: 'hidden',
          }}
        >
          {visibleGenres.map((genre) => (
            <Badge
              key={genre.id}
              action="muted"
              variant="solid"
              className="rounded-full bg-[#f2cc8f] border-0 px-2.5 py-1"
              style={{ maxWidth: isCompact ? 92 : 124 }}
            >
              <BadgeText
                className="text-[#3e2723] text-[10px] normal-case font-medium"
                numberOfLines={1}
              >
                {genre.name}
              </BadgeText>
            </Badge>
          ))}

          {hiddenGenresCount > 0 ? (
            <Badge
              action="muted"
              variant="solid"
              className="rounded-full bg-[#f2cc8f] border-0 px-2.5 py-1"
            >
              <BadgeText className="text-[#3e2723] text-[10px] normal-case font-medium">
                +{hiddenGenresCount}
              </BadgeText>
            </Badge>
          ) : null}
        </HStack>
      </VStack>
    </Card>
  );
}
