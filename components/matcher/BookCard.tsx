import { Badge, BadgeText } from '@/components/ui/badge';
import { Box } from '@/components/ui/box';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Image } from '@/components/ui/image';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { BookCondition, MatcherCard } from '@/types/matcher';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Dimensions, View } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.75;
const CARD_HEIGHT = CARD_WIDTH * 1.4;

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
  const firstGenre = book.genres[0]?.name;

  return (
    <Card
      variant="elevated"
      size="md"
      className="overflow-hidden rounded-3xl p-0 shadow-hard-2"
      style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
    >
      {/* Imagen */}
      <Image
        source={{ uri: heroPhoto }}
        alt={book.titulo ?? 'Libro'}
        size="none"
        className="absolute w-full h-full"
        resizeMode="cover"
      />

      {/* Degadado en el fondo */}
      <Box className="absolute bottom-0 left-0 right-0 h-[55%]">
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.85)']}
          style={{ flex: 1 }}
        />
      </Box>

      {/* Distancia + Condición en Cabecera */}
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
            className="rounded-full bg-black/40 border-0 px-3 py-1.5"
          >
            <BadgeText className="text-white text-xs normal-case font-medium">
              {CONDITION_LABELS[book.condition]}
            </BadgeText>
          </Badge>
        )}
      </HStack>

      {/* Contenido inferior */}
      <VStack className="absolute bottom-0 left-0 right-0 p-5 gap-2">
        {/* Título */}
        <Heading
          size="xl"
          className="text-white font-bold"
          numberOfLines={2}
        >
          {book.titulo ?? 'Sin título'}
        </Heading>

        {/* Autor */}
        <Text size="sm" className="text-white/70">
          {book.autor ?? 'Autor desconocido'}
        </Text>

        {/* Género + Portada */}
        <HStack className="gap-2 mt-1 flex-wrap">
          {firstGenre && (
            <Badge
              action="muted"
              variant="solid"
              className="rounded-full bg-white/20 border-0 px-3 py-1"
            >
              <BadgeText className="text-white text-xs normal-case">
                {firstGenre}
              </BadgeText>
            </Badge>
          )}
          {book.cover && (
            <Badge
              action="muted"
              variant="solid"
              className="rounded-full bg-white/20 border-0 px-3 py-1"
            >
              <BadgeText className="text-white text-xs normal-case">
                {book.cover === 'HARDCOVER' ? 'Tapa dura' : 'Bolsillo'}
              </BadgeText>
            </Badge>
          )}
        </HStack>

        {/* Usuario que publicó */}
        <HStack className="items-center gap-2 mt-2">
          <View className="w-7 h-7 rounded-full bg-white/30 overflow-hidden">
            {owner.fotoPerfilUrl && (
              <Image
                source={{ uri: owner.fotoPerfilUrl }}
                alt={owner.username}
                size="none"
                className="w-full h-full"
                resizeMode="cover"
              />
            )}
          </View>
          <Text size="xs" className="text-white/60">
            {owner.username}
          </Text>
        </HStack>
      </VStack>
    </Card>
  );
}
