import type { MatcherCard, SwipeDirection } from '@/types/matcher';
import { apiRequest } from './api';

interface FeedBookDto {
  id: number;
  ownerId: string;
  ownerUsername: string;
  titulo: string | null;
  autor: string | null;
  editorial: string | null;
  numPaginas: number | null;
  cover: string | null;
  condition: string | null;
  observaciones: string | null;
  genres: string[];
  languages: string[];
  photos: string[];
  score: number;
  isPriority: boolean;
  distanceKm: number;
}

interface FeedResultDto {
  items: FeedBookDto[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface SwipeResultDto {
  outcome: 'Recorded' | 'MatchCreated' | 'BookUnavailable';
  match: MatchCreatedDto | null;
}

export interface MatchCreatedDto {
  matchId: number;
  chatId: string;
  otherUserId: string;
  otherUsername: string;
}

function mapFeedBookToMatcherCard(dto: FeedBookDto): MatcherCard {
  return {
    book: {
      id: dto.id,
      ownerId: 0,
      isbn: null,
      titulo: dto.titulo,
      autor: dto.autor,
      editorial: dto.editorial,
      numPaginas: dto.numPaginas,
      cover: (dto.cover as MatcherCard['book']['cover']) ?? null,
      condition: (dto.condition as MatcherCard['book']['condition']) ?? null,
      observaciones: dto.observaciones,
      status: 'PUBLISHED',
      createdAt: '',
      updatedAt: '',
      genres: dto.genres.map((name, i) => ({ id: i, name })),
      languages: (dto.languages ?? []).map((language, i) => ({
        id: i,
        language,
      })),
      photos: dto.photos.map((url, i) => ({
        id: i,
        bookId: dto.id,
        url,
        orden: i,
      })),
    },
    owner: {
      id: 0,
      username: dto.ownerUsername,
      nombre: dto.ownerUsername,
      fotoPerfilUrl: null,
      plan: 'FREE',
      ratingMean: 0,
      finishedExchanges: 0,
      xpTotal: 0,
    },
    distanceKm: dto.distanceKm ?? 0,
    score: dto.score,
  };
}

export interface FeedResult {
  cards: MatcherCard[];
  hasMore: boolean;
}

export async function fetchFeed(
  page: number = 0,
  size: number = 20,
): Promise<FeedResult> {
  const res = await apiRequest(`/matcher/feed?page=${page}&size=${size}`);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Error al cargar el feed (${res.status})`);
  }

  const data: FeedResultDto = await res.json();
  return {
    cards: data.items.map(mapFeedBookToMatcherCard),
    hasMore: data.hasMore,
  };
}

export async function sendSwipe(
  bookId: number,
  direction: SwipeDirection,
): Promise<SwipeResultDto> {
  const res = await apiRequest('/matcher/swipe', {
    method: 'POST',
    body: JSON.stringify({ bookId, direction }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Error al enviar swipe (${res.status})`);
  }

  return res.json();
}
