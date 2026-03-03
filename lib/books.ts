import { apiRequest } from './api';

export type BookListItem = {
  id: number;
  titulo?: string;
  autor?: string;
  condition?: 'LikeNew' | 'VeryGood' | 'Good' | 'Acceptable' | 'Poor' | null;
  thumbnailUrl?: string | null;
};

export type BookDetail = {
  id: number;
  titulo?: string;
  autor?: string;
  numPaginas?: number | null;
  cover?: 'Hardcover' | 'Paperback' | null;
  condition?: 'LikeNew' | 'VeryGood' | 'Good' | 'Acceptable' | 'Poor' | null;
  observaciones?: string | null;
  languages: string[];
  genres: string[];
  photos: { url?: string | null }[];
};

export async function getMyLibrary(pageSize = 50): Promise<BookListItem[]> {
  const response = await apiRequest(`/books/my-library?page=1&pageSize=${pageSize}`);
  if (!response.ok) throw new Error('No se pudo cargar la biblioteca');
  const data = await response.json();
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.books)) return data.books;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.books)) return data.data.books;

  return [];}

export async function getBookDetail(bookId: number): Promise<BookDetail> {
  const response = await apiRequest(`/books/${bookId}`);
  if (!response.ok) throw new Error('No se pudo cargar el libro');
  return response.json();
}

export async function deleteBook(bookId: number): Promise<void> {
  const response = await apiRequest(`/books/${bookId}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('No se pudo eliminar el libro');
}

const languageNameToId: Record<string, number> = {
  'Español': 1,
  English: 2,
  Français: 3,
  Deutsch: 4,
  Italiano: 5,
  'Português': 6,
};

const genreNameToId: Record<string, number> = {
  'Fantasía': 1,
  'Ciencia Ficción': 2,
  Romance: 3,
  Terror: 4,
  Thriller: 5,
  Historia: 6,
  'Biografía': 7,
  Autoayuda: 8,
  Infantil: 9,
  'Poesía': 10,
};

export async function updateBook(book: BookDetail): Promise<void> {
  const languageIds = (book.languages ?? [])
    .map((name) => languageNameToId[name])
    .filter(Boolean);
  const genreIds = (book.genres ?? []).map((name) => genreNameToId[name]).filter(Boolean);

  const dataResponse = await apiRequest(`/books/${book.id}/data`, {
    method: 'PUT',
    body: JSON.stringify({
      titulo: book.titulo,
      autor: book.autor,
      numPaginas: book.numPaginas,
      cover: book.cover,
      languageIds,
      genreIds,
    }),
  });

  if (!dataResponse.ok) throw new Error('No se pudo actualizar la información del libro');

  const detailsResponse = await apiRequest(`/books/${book.id}/details`, {
    method: 'PUT',
    body: JSON.stringify({
      condition: book.condition,
      observaciones: book.observaciones,
    }),
  });

  if (!detailsResponse.ok) throw new Error('No se pudo actualizar los detalles del libro');
}

export function toConditionLabel(condition?: BookDetail['condition']): string {
  switch (condition) {
    case 'LikeNew':
      return 'Como nuevo';
    case 'VeryGood':
      return 'Muy bueno';
    case 'Good':
      return 'Bueno';
    case 'Acceptable':
      return 'Aceptable';
    case 'Poor':
      return 'Malo';
    default:
      return 'Sin estado';
  }
}

export function toCoverLabel(cover?: BookDetail['cover']): string {
  return cover === 'Hardcover' ? 'Tapa dura' : cover === 'Paperback' ? 'Tapa blanda' : 'No especificado';
}

export function toConditionEnum(label: string): BookDetail['condition'] {
  if (label === 'Como nuevo') return 'LikeNew';
  if (label === 'Muy bueno') return 'VeryGood';
  if (label === 'Bueno') return 'Good';
  if (label === 'Aceptable') return 'Acceptable';
  return 'Poor';
}

export function toCoverEnum(label: string): BookDetail['cover'] {
  return label === 'Tapa dura' ? 'Hardcover' : 'Paperback';
}


export type UserProfile = {
  name: string;
  username: string;
  profilePhoto?: string | null;
};

export async function getProfile(): Promise<UserProfile> {
  const response = await apiRequest('/auth/perfil');
  if (!response.ok) throw new Error('No se pudo cargar el perfil');
  return response.json();
}