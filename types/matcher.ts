// ──────────────────────────────────────────────
// Enums (alineados con el modelo de datos)
// ──────────────────────────────────────────────

export type CoverType = 'HARDCOVER' | 'PAPERBACK';

export type BookCondition =
  | 'LIKE_NEW'
  | 'VERY_GOOD'
  | 'GOOD'
  | 'ACCEPTABLE'
  | 'POOR';

export type BookStatus =
  | 'PUBLISHED'
  | 'DRAFT'
  | 'PAUSED'
  | 'RESERVED'
  | 'EXCHANGED'
  | 'DELETED';

export type SwipeDirection = 'LEFT' | 'RIGHT';

export type PricingPlan = 'FREE' | 'PREMIUM';

// ──────────────────────────────────────────────
// Entidades de apoyo
// ──────────────────────────────────────────────

export interface Genre {
  id: number;
  name: string;
}

export interface Language {
  id: number;
  language: string;
}

export interface BookPhoto {
  id: number;
  bookId: number;
  url: string;
  orden: number;
}

// ──────────────────────────────────────────────
// Usuario (solo utilizamos lo que necesita el Matcher)
// ──────────────────────────────────────────────

/** Campos de base_users + users + user_progress necesarios en la tarjeta */
export interface BookOwner {
  id: number;
  username: string;
  nombre: string;
  fotoPerfilUrl: string | null;
  plan: PricingPlan;
  ratingMean: number;
  finishedExchanges: number;
  xpTotal: number; 
}

// ──────────────────────────────────────────────
// Libro — tabla books + relaciones
// ──────────────────────────────────────────────

export interface Book {
  id: number;
  ownerId: number;
  isbn: string | null;
  titulo: string | null;
  autor: string | null;
  editorial: string | null;
  numPaginas: number | null;
  cover: CoverType | null;
  condition: BookCondition | null;
  observaciones: string | null;
  status: BookStatus;
  createdAt: string;         // ISO 8601
  updatedAt: string;         // ISO 8601
  genres: Genre[];           // via books_genres
  languages: Language[];     // via books_languages
  photos: BookPhoto[];       // via book_photos (ordenadas por "orden")
}

// ──────────────────────────────────────────────
// MatcherCard — DTO que el backend envía al feed
// ──────────────────────────────────────────────

/** Representa una tarjeta individual en el feed del Matcher.
 *  Combina datos del libro + owner + score calculado por el backend. */
export interface MatcherCard {
  book: Book;
  owner: BookOwner;
  distanceKm: number;        // calculado en backend desde location del user
  score: number;             // score dinámico del algoritmo de recomendación
}

// ──────────────────────────────────────────────
// Swipe — reflejo de la tabla swipes
// ──────────────────────────────────────────────

export interface Swipe {
  id: number;
  swiperId: number;
  bookId: number;
  direction: SwipeDirection;
  createdAt: string;         // ISO 8601
}

// ──────────────────────────────────────────────
// Acciones del Matcher (uso interno para el frontend)
// ──────────────────────────────────────────────

export type MatchAction = 'like' | 'nope' | 'tap_detail';
