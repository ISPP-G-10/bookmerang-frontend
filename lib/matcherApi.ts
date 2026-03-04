import type { MatcherCard, SwipeDirection } from '@/types/matcher';
import { apiRequest } from './api';

// ──────────────────────────────────────────────
// Tipos que devuelve el backend
// ──────────────────────────────────────────────

/** DTO plano que devuelve GET /api/matcher/feed */
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
  photos: string[];
  score: number;
  isPriority: boolean;
}

/** Resultado de POST /api/matcher/swipe */
export interface SwipeResultDto {
  outcome: 'Recorded' | 'MatchCreated' | 'BookUnavailable';
  match: MatchCreatedDto | null;
}

export interface MatchCreatedDto {
  matchId: number;
  chatId: number;
  otherUserId: string;
  otherUsername: string;
}

// ──────────────────────────────────────────────
// Mapeo backend → frontend
// ──────────────────────────────────────────────

function mapFeedBookToMatcherCard(dto: FeedBookDto): MatcherCard {
  return {
    book: {
      id: dto.id,
      ownerId: 0, // Guid del backend, no se usa visualmente
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
      languages: [],
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
    distanceKm: 0,
    score: dto.score,
  };
}

// ──────────────────────────────────────────────
// Llamadas a la API
// ──────────────────────────────────────────────

/**
 * Obtiene el feed paginado de libros candidatos para el matcher.
 */
export async function fetchFeed(
  page: number = 0,
  size: number = 20,
): Promise<MatcherCard[]> {
  const res = await apiRequest(`/matcher/feed?page=${page}&size=${size}`);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Error al cargar el feed (${res.status})`);
  }

  const data: FeedBookDto[] = await res.json();
  return data.map(mapFeedBookToMatcherCard);
}

/**
 * Envía un swipe (LEFT o RIGHT) sobre un libro.
 * Devuelve el resultado del swipe y, si hay match, los datos del match.
 */
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
