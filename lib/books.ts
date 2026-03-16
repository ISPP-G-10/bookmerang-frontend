import { apiRequest } from "./api";
import supabase from "./supabase";

export const MIN_BOOK_PHOTOS = 1;
export const MAX_BOOK_PHOTOS = 1;

export type BookListItem = {
  id: number;
  titulo?: string;
  autor?: string;
  title?: string;
  author?: string;
  condition?: "LikeNew" | "VeryGood" | "Good" | "Acceptable" | "Poor" | null;
  thumbnailUrl?: string | null;
};

export type BookDetail = {
  id: number;
  isbn?: string | null;
  titulo?: string;
  autor?: string;
  editorial?: string | null;
  numPaginas?: number | null;
  cover?: "Hardcover" | "Paperback" | null;
  condition?: "LikeNew" | "VeryGood" | "Good" | "Acceptable" | "Poor" | null;
  observaciones?: string | null;
  languages: string[];
  genres: string[];
  photos: { url?: string | null; order?: number | null }[];
};

export type BookDraftSummary = {
  id: number;
  titulo?: string;
  autor?: string;
  thumbnailUrl?: string | null;
  updatedAt?: string | null;
};

export type GenreOption = {
  id: number;
  name: string;
};

export type LanguageOption = {
  id: number;
  name: string;
};

function extractLibraryItems(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.books)) return data.books;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.books)) return data.data.books;
  if (Array.isArray(data?.data?.results)) return data.data.results;
  return [];
}

function normalizeBookItem(raw: any): BookListItem {
  const conditionRaw = raw?.condition ?? raw?.estado ?? null;

  return {
    id: Number(raw?.id ?? raw?.bookId),
    titulo: raw?.titulo ?? raw?.title,
    autor: raw?.autor ?? raw?.author,
    title: raw?.title ?? raw?.titulo,
    author: raw?.author ?? raw?.autor,
    condition: normalizeCondition(conditionRaw),
    thumbnailUrl:
      raw?.thumbnailUrl ??
      raw?.imageUrl ??
      raw?.coverUrl ??
      raw?.photoUrl ??
      raw?.image ??
      raw?.photos?.[0]?.url ??
      null,
  };
}

function normalizeCondition(value: string | null): BookListItem["condition"] {
  if (!value) return null;

  const normalized = String(value).toLowerCase().replace(/[\s-]+/g, "_");
  if (
    normalized === "likenew" ||
    normalized === "like_new" ||
    normalized === "como_nuevo"
  )
    return "LikeNew";
  if (
    normalized === "verygood" ||
    normalized === "very_good" ||
    normalized === "muy_bueno"
  )
    return "VeryGood";
  if (normalized === "good" || normalized === "bueno") return "Good";
  if (normalized === "acceptable" || normalized === "aceptable")
    return "Acceptable";
  if (normalized === "poor" || normalized === "malo") return "Poor";

  return null;
}

function toDetailCondition(
  value: string | null,
): BookDetail["condition"] {
  const normalized = normalizeCondition(value);
  return normalized;
}

function normalizeCover(value: string | null): BookDetail["cover"] {
  if (!value) return null;
  const normalized = String(value).toLowerCase().replace(/[\s-]+/g, "_");
  if (
    normalized === "hardcover" ||
    normalized === "hard_cover"
  )
    return "Hardcover";
  if (
    normalized === "paperback" ||
    normalized === "paper_back"
  )
    return "Paperback";
  return null;
}

function toDbCondition(
  value?: BookDetail["condition"],
): "LIKE_NEW" | "VERY_GOOD" | "GOOD" | "ACCEPTABLE" | "POOR" | null {
  if (!value) return null;
  if (value === "LikeNew") return "LIKE_NEW";
  if (value === "VeryGood") return "VERY_GOOD";
  if (value === "Good") return "GOOD";
  if (value === "Acceptable") return "ACCEPTABLE";
  return "POOR";
}

function toDbCover(
  value?: BookDetail["cover"],
): "HARDCOVER" | "PAPERBACK" | null {
  if (!value) return null;
  return value === "Hardcover" ? "HARDCOVER" : "PAPERBACK";
}

async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

function normalizeDraftItem(raw: any): BookDraftSummary {
  return {
    id: Number(raw?.id ?? raw?.bookId),
    titulo: raw?.titulo ?? raw?.title,
    autor: raw?.autor ?? raw?.author,
    thumbnailUrl:
      raw?.thumbnailUrl ??
      raw?.imageUrl ??
      raw?.coverUrl ??
      raw?.photoUrl ??
      raw?.image ??
      raw?.photos?.[0]?.url ??
      null,
    updatedAt: raw?.updatedAt ?? raw?.updated_at ?? null,
  };
}

function isPublishedStatus(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const normalized = value.toLowerCase().replace(/[\s-]+/g, "_");
  return normalized === "published";
}

function mapSupabaseBookDetail(
  book: any,
  photos: any[] = [],
  languages: string[] = [],
  genres: string[] = [],
): BookDetail {
  const normalizedPhotos = Array.isArray(photos)
    ? [...photos]
        .sort((a, b) => (a?.orden ?? 0) - (b?.orden ?? 0))
        .map((photo) => ({
          url: photo?.url ?? null,
          order: photo?.orden ?? null,
        }))
    : [];

  return {
    id: Number(book?.id),
    isbn: book?.isbn ?? null,
    titulo: book?.titulo ?? "",
    autor: book?.autor ?? "",
    editorial: book?.editorial ?? null,
    numPaginas: book?.num_paginas ?? null,
    cover: normalizeCover(book?.cover ?? null),
    condition: normalizeCondition(book?.condition ?? null),
    observaciones: book?.observaciones ?? null,
    languages,
    genres,
    photos: normalizedPhotos,
  };
}

function mapApiBookDetail(raw: any): BookDetail {
  const normalizedPhotos = Array.isArray(raw?.photos)
    ? [...raw.photos]
        .sort((a: any, b: any) => (a?.order ?? 0) - (b?.order ?? 0))
        .map((photo: any) => ({
          url: photo?.url ?? null,
          order: photo?.order ?? null,
        }))
    : [];

  return {
    id: Number(raw?.id),
    isbn: raw?.isbn ?? null,
    titulo: raw?.titulo ?? "",
    autor: raw?.autor ?? "",
    editorial: raw?.editorial ?? null,
    numPaginas: raw?.numPaginas ?? null,
    cover: normalizeCover(raw?.cover ?? null),
    condition: toDetailCondition(raw?.condition ?? null),
    observaciones: raw?.observaciones ?? null,
    languages: Array.isArray(raw?.languages) ? raw.languages : [],
    genres: Array.isArray(raw?.genres) ? raw.genres : [],
    photos: normalizedPhotos,
  };
}

async function getMyLibraryFromSupabase(
  pageSize: number,
): Promise<BookListItem[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from("books")
    .select(
      "id, titulo, autor, condition, status, created_at, book_photos(url, orden)",
    )
    .eq("owner_id", userId)
    .eq("status", "PUBLISHED")
    .order("created_at", { ascending: false })
    .limit(pageSize);

  if (error) {
    console.warn("Error cargando biblioteca desde Supabase", error.message);
    return [];
  }

  return (data ?? [])
    .map((book: any): BookListItem => {
      const photos: Array<{ url?: string | null; orden?: number | null }> =
        Array.isArray(book?.book_photos)
          ? [...book.book_photos].sort(
              (a: { orden?: number | null }, b: { orden?: number | null }) =>
                (a?.orden ?? 0) - (b?.orden ?? 0),
            )
          : [];

      return normalizeBookItem({
        ...book,
        thumbnailUrl: photos[0]?.url ?? null,
      });
    })
    .filter((book: BookListItem) => Number.isFinite(book.id));
}

async function getBookDetailFromSupabase(
  bookId: number,
): Promise<BookDetail | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const baseSelect =
    "id, isbn, titulo, autor, editorial, num_paginas, cover, condition, observaciones, owner_id, status";

  let bookData: any = null;

  const ownedQuery = await supabase
    .from("books")
    .select(baseSelect)
    .eq("id", bookId)
    .eq("owner_id", userId)
    .neq("status", "DELETED")
    .maybeSingle();

  if (ownedQuery.data) {
    bookData = ownedQuery.data;
  } else {
    const byIdQuery = await supabase
      .from("books")
      .select(baseSelect)
      .eq("id", bookId)
      .neq("status", "DELETED")
      .maybeSingle();

    if (byIdQuery.data) {
      bookData = byIdQuery.data;
    }
  }

  if (!bookData) {
    console.warn("No se encontró detalle de libro en Supabase", {
      bookId,
      userId,
    });
    return null;
  }

  const [photosRes, langsRes, genresRes] = await Promise.all([
    supabase
      .from("book_photos")
      .select("url, orden")
      .eq("book_id", bookId)
      .order("orden", { ascending: true }),
    supabase
      .from("books_languages")
      .select("language_id")
      .eq("book_id", bookId),
    supabase.from("books_genres").select("genre_id").eq("book_id", bookId),
  ]);

  const languageIds = (langsRes.data ?? [])
    .map((row: any) => row?.language_id)
    .filter(Boolean);
  const genreIds = (genresRes.data ?? [])
    .map((row: any) => row?.genre_id)
    .filter(Boolean);

  const [languageNamesRes, genreNamesRes] = await Promise.all([
    languageIds.length > 0
      ? supabase.from("languages").select("id, language").in("id", languageIds)
      : Promise.resolve({ data: [] as any[] } as any),
    genreIds.length > 0
      ? supabase.from("genres").select("id, name").in("id", genreIds)
      : Promise.resolve({ data: [] as any[] } as any),
  ]);

  const languageNames = (languageNamesRes.data ?? [])
    .map((row: any) => row?.language)
    .filter(Boolean);
  const genreNames = (genreNamesRes.data ?? [])
    .map((row: any) => row?.name)
    .filter(Boolean);

  return mapSupabaseBookDetail(
    bookData,
    photosRes.data ?? [],
    languageNames,
    genreNames,
  );
}

async function parseResponseBody(response: Response): Promise<any> {
  if (response.status === 204) return [];

  const text = await response.text();
  if (!text) return [];

  try {
    return JSON.parse(text);
  } catch {
    return [];
  }
}

async function parseApiError(
  response: Response,
  fallbackMessage: string,
): Promise<string> {
  try {
    const text = await response.text();
    if (!text) return fallbackMessage;

    try {
      const parsed = JSON.parse(text);
      if (typeof parsed?.error === "string" && parsed.error.trim().length > 0)
        return parsed.error;
      if (
        typeof parsed?.message === "string" &&
        parsed.message.trim().length > 0
      )
        return parsed.message;
    } catch {
      // Si no es JSON devolvemos el texto tal cual.
    }

    return text;
  } catch {
    return fallbackMessage;
  }
}

export async function getMyLibrary(pageSize = 50): Promise<BookListItem[]> {
  const endpoints = [
    `/books/my-library?page=1&pageSize=${pageSize}&status=Published`,
    `/books/my-library?page=1&pageSize=${pageSize}&status=PUBLISHED`,
    `/books/my-library?page=1&page_size=${pageSize}&status=Published`,
    `/books/my-library?PageNumber=1&PageSize=${pageSize}&status=Published`,
    `/books/my-library?pageNumber=1&pageSize=${pageSize}&status=Published`,
    "/books/my-library",
    "/books/my-books",
    "/books/mine",
    "/books/library/me",
    "/books/me/library",
  ];

  const failures: string[] = [];

  for (const endpoint of endpoints) {
    const response = await apiRequest(endpoint);

    if (!response.ok) {
      failures.push(`${endpoint} -> ${response.status}`);
      continue;
    }

    const data = await parseResponseBody(response);
    const extracted = extractLibraryItems(data);
    const hasStatusField = extracted.some(
      (raw) =>
        raw &&
        (Object.prototype.hasOwnProperty.call(raw, "status") ||
          Object.prototype.hasOwnProperty.call(raw, "estado") ||
          Object.prototype.hasOwnProperty.call(raw, "bookStatus") ||
          Object.prototype.hasOwnProperty.call(raw, "book_status")),
    );
    const sourceItems = hasStatusField
      ? extracted.filter((raw) =>
          isPublishedStatus(
            raw?.status ?? raw?.estado ?? raw?.bookStatus ?? raw?.book_status,
          ),
        )
      : extracted;

    const items = sourceItems
      .map(normalizeBookItem)
      .filter((book) => Number.isFinite(book.id));

    return items;
  }

  console.warn("Error cargando biblioteca en API", failures);

  const supabaseBooks = await getMyLibraryFromSupabase(pageSize);
  if (supabaseBooks.length > 0) return supabaseBooks;

  throw new Error("No se pudo cargar tu biblioteca.");
}

export async function getMyDrafts(pageSize = 20): Promise<BookDraftSummary[]> {
  const endpoints = [
    `/books/my-drafts?page=1&pageSize=${pageSize}`,
    `/books/my-drafts?page=1&page_size=${pageSize}`,
    `/books/my-drafts?PageNumber=1&PageSize=${pageSize}`,
    "/books/my-drafts",
  ];

  const failures: string[] = [];

  for (const endpoint of endpoints) {
    const response = await apiRequest(endpoint);
    if (!response.ok) {
      failures.push(`${endpoint} -> ${response.status}`);
      continue;
    }

    const data = await parseResponseBody(response);
    return extractLibraryItems(data)
      .map(normalizeDraftItem)
      .filter((draft) => Number.isFinite(draft.id));
  }

  console.warn("Error cargando borradores en API", failures);
  throw new Error("No se pudieron cargar tus borradores.");
}

export async function getGenres(): Promise<GenreOption[]> {
  const response = await apiRequest("/genres");
  if (response.ok) {
    const data = await parseResponseBody(response);
    if (Array.isArray(data)) {
      return data
        .map((raw) => ({
          id: Number(raw?.id),
          name: String(raw?.name ?? raw?.nombre ?? ""),
        }))
        .filter((genre) => Number.isFinite(genre.id) && genre.name.length > 0);
    }
  }

  const { data } = await supabase.from("genres").select("id, name").order("id");
  return (data ?? [])
    .map((raw: any) => ({
      id: Number(raw?.id),
      name: String(raw?.name ?? ""),
    }))
    .filter((genre: GenreOption) => Number.isFinite(genre.id) && genre.name.length > 0);
}

const defaultLanguages: LanguageOption[] = [
  { id: 1, name: "Español" },
  { id: 2, name: "English" },
  { id: 3, name: "Français" },
  { id: 4, name: "Deutsch" },
  { id: 5, name: "Italiano" },
  { id: 6, name: "Português" },
];

export async function getLanguages(): Promise<LanguageOption[]> {
  const { data, error } = await supabase
    .from("languages")
    .select("id, language")
    .order("id");

  if (!error && Array.isArray(data) && data.length > 0) {
    return data
      .map((raw: any) => ({
        id: Number(raw?.id),
        name: String(raw?.language ?? ""),
      }))
      .filter((language: LanguageOption) => Number.isFinite(language.id) && language.name.length > 0);
  }

  return defaultLanguages;
}

export async function getBookDetail(bookId: number): Promise<BookDetail> {
  const response = await apiRequest(`/books/${bookId}`);
  if (response.ok) {
    const raw = await response.json();
    return mapApiBookDetail(raw);
  }

  const supabaseBook = await getBookDetailFromSupabase(bookId);
  if (supabaseBook) return supabaseBook;

  throw new Error("No se pudo cargar el libro");
}

type CreateBookDraftPayload = {
  isbn?: string;
  titulo?: string;
  autor?: string;
  editorial?: string;
  numPaginas?: number | null;
  cover?: BookDetail["cover"];
  condition?: BookDetail["condition"];
  observaciones?: string;
  genreIds?: number[];
  languageIds?: number[];
};

export async function createBookDraft(
  payload: CreateBookDraftPayload = {},
): Promise<BookDetail> {
  const response = await apiRequest("/books/draft", {
    method: "POST",
    body: JSON.stringify({
      isbn: payload.isbn,
      titulo: payload.titulo,
      autor: payload.autor,
      editorial: payload.editorial,
      numPaginas: payload.numPaginas ?? null,
      cover: payload.cover ? toDbCover(payload.cover) : null,
      condition: payload.condition ? toDbCondition(payload.condition) : null,
      observaciones: payload.observaciones,
      genreIds: payload.genreIds ?? [],
      languageIds: payload.languageIds ?? [],
    }),
  });

  if (!response.ok) {
    const message = await parseApiError(
      response,
      "No se pudo crear el borrador.",
    );
    throw new Error(message);
  }

  const raw = await response.json();
  return mapApiBookDetail(raw);
}

export async function upsertBookPhotos(
  bookId: number,
  photoUrls: string[],
): Promise<void> {
  if (photoUrls.length > MAX_BOOK_PHOTOS) {
    throw new Error(`Solo puedes subir hasta ${MAX_BOOK_PHOTOS} fotos.`);
  }

  const response = await apiRequest(`/books/${bookId}/photos`, {
    method: "PUT",
    body: JSON.stringify({
      // Endpoint REPLACE: enviamos la lista final completa con su orden.
      photos: photoUrls.map((url, index) => ({
        url,
        order: index,
      })),
    }),
  });

  if (!response.ok) {
    const message = await parseApiError(
      response,
      "No se pudieron guardar las fotos del libro.",
    );
    throw new Error(message);
  }
}

type UpdateBookDataPayload = {
  isbn?: string | null;
  titulo?: string | null;
  autor?: string | null;
  editorial?: string | null;
  numPaginas?: number | null;
  cover?: BookDetail["cover"] | null;
  genreIds?: number[];
  languageIds?: number[];
};

export async function updateBookDataStep(
  bookId: number,
  payload: UpdateBookDataPayload,
): Promise<BookDetail> {
  const response = await apiRequest(`/books/${bookId}/data`, {
    method: "PUT",
    body: JSON.stringify({
      isbn: payload.isbn ?? null,
      titulo: payload.titulo ?? null,
      autor: payload.autor ?? null,
      editorial: payload.editorial ?? null,
      numPaginas: payload.numPaginas ?? null,
      cover: toDbCover(payload.cover ?? null),
      genreIds: payload.genreIds ?? [],
      languageIds: payload.languageIds ?? [],
    }),
  });

  if (!response.ok) {
    const message = await parseApiError(
      response,
      "No se pudieron guardar los datos del libro.",
    );
    throw new Error(message);
  }

  return mapApiBookDetail(await response.json());
}

type UpdateBookDetailsPayload = {
  condition?: BookDetail["condition"] | null;
  observaciones?: string | null;
};

export async function updateBookDetailsStep(
  bookId: number,
  payload: UpdateBookDetailsPayload,
): Promise<BookDetail> {
  const response = await apiRequest(`/books/${bookId}/details`, {
    method: "PUT",
    body: JSON.stringify({
      condition: toDbCondition(payload.condition ?? null),
      observaciones: payload.observaciones ?? null,
    }),
  });

  if (!response.ok) {
    const message = await parseApiError(
      response,
      "No se pudo guardar el estado del libro.",
    );
    throw new Error(message);
  }

  return mapApiBookDetail(await response.json());
}

export async function publishBook(bookId: number): Promise<BookDetail> {
  const response = await apiRequest(`/books/${bookId}/publish`, {
    method: "POST",
  });

  if (!response.ok) {
    const message = await parseApiError(
      response,
      "No se pudo publicar el libro.",
    );
    throw new Error(message);
  }

  return mapApiBookDetail(await response.json());
}

export async function deleteBook(bookId: number): Promise<void> {
  const response = await apiRequest(`/books/${bookId}`, { method: "DELETE" });
  if (response.ok) return;

  const userId = await getCurrentUserId();
  if (!userId) throw new Error("No se pudo eliminar el libro");

  const { error } = await supabase
    .from("books")
    .update({ status: "DELETED", updated_at: new Date().toISOString() })
    .eq("id", bookId)
    .eq("owner_id", userId);

  if (error) throw new Error("No se pudo eliminar el libro");
}

const languageNameToId: Record<string, number> = {
  Español: 1,
  English: 2,
  Français: 3,
  Deutsch: 4,
  Italiano: 5,
  Português: 6,
};

const genreNameToId: Record<string, number> = {
  Fantasía: 1,
  "Ciencia Ficción": 2,
  Romance: 3,
  Terror: 4,
  Thriller: 5,
  Historia: 6,
  Biografía: 7,
  Autoayuda: 8,
  Infantil: 9,
  Poesía: 10,
};

async function resolveLanguageIds(names: string[]): Promise<number[]> {
  if (names.length === 0) return [];
  const { data } = await supabase
    .from("languages")
    .select("id, language")
    .in("language", names);
  return (data ?? []).map((row: any) => row.id).filter(Boolean);
}

async function resolveGenreIds(names: string[]): Promise<number[]> {
  if (names.length === 0) return [];
  const { data } = await supabase
    .from("genres")
    .select("id, name")
    .in("name", names);
  return (data ?? []).map((row: any) => row.id).filter(Boolean);
}

export async function updateBook(book: BookDetail): Promise<void> {
  const apiLanguageIds = (book.languages ?? [])
    .map((name) => languageNameToId[name])
    .filter(Boolean);
  const apiGenreIds = (book.genres ?? [])
    .map((name) => genreNameToId[name])
    .filter(Boolean);

  const dataResponse = await apiRequest(`/books/${book.id}/data`, {
    method: "PUT",
    body: JSON.stringify({
      titulo: book.titulo,
      autor: book.autor,
      numPaginas: book.numPaginas,
      cover: toDbCover(book.cover),
      languageIds: apiLanguageIds,
      genreIds: apiGenreIds,
    }),
  });

  const detailsResponse = await apiRequest(`/books/${book.id}/details`, {
    method: "PUT",
    body: JSON.stringify({
      condition: toDbCondition(book.condition),
      observaciones: book.observaciones,
    }),
  });

  if (dataResponse.ok && detailsResponse.ok) return;

  const userId = await getCurrentUserId();
  if (!userId) throw new Error("No se pudo guardar el libro.");

  const { error: updateError } = await supabase
    .from("books")
    .update({
      titulo: book.titulo,
      autor: book.autor,
      num_paginas: book.numPaginas,
      cover: toDbCover(book.cover),
      condition: toDbCondition(book.condition),
      observaciones: book.observaciones,
      updated_at: new Date().toISOString(),
    })
    .eq("id", book.id)
    .eq("owner_id", userId);

  if (updateError) throw new Error("No se pudo guardar el libro.");

  const [languageIds, genreIds] = await Promise.all([
    resolveLanguageIds(book.languages ?? []),
    resolveGenreIds(book.genres ?? []),
  ]);

  await supabase.from("books_languages").delete().eq("book_id", book.id);
  await supabase.from("books_genres").delete().eq("book_id", book.id);

  if (languageIds.length > 0) {
    const { error } = await supabase
      .from("books_languages")
      .insert(
        languageIds.map((languageId) => ({
          book_id: book.id,
          language_id: languageId,
        })),
      );
    if (error) throw new Error("No se pudo guardar el libro.");
  }

  if (genreIds.length > 0) {
    const { error } = await supabase
      .from("books_genres")
      .insert(
        genreIds.map((genreId) => ({ book_id: book.id, genre_id: genreId })),
      );
    if (error) throw new Error("No se pudo guardar el libro.");
  }
}

export function toConditionLabel(condition?: BookDetail["condition"]): string {
  switch (condition) {
    case "LikeNew":
      return "Como nuevo";
    case "VeryGood":
      return "Muy bueno";
    case "Good":
      return "Bueno";
    case "Acceptable":
      return "Aceptable";
    case "Poor":
      return "Malo";
    default:
      return "Sin estado";
  }
}

export function toCoverLabel(cover?: BookDetail["cover"]): string {
  return cover === "Hardcover"
    ? "Tapa dura"
    : cover === "Paperback"
      ? "Tapa blanda"
      : "No especificado";
}

export function toConditionEnum(label: string): BookDetail["condition"] {
  if (label === "Como nuevo") return "LikeNew";
  if (label === "Muy bueno") return "VeryGood";
  if (label === "Bueno") return "Good";
  if (label === "Aceptable") return "Acceptable";
  return "Poor";
}

export function toCoverEnum(label: string): BookDetail["cover"] {
  return label === "Tapa dura" ? "Hardcover" : "Paperback";
}

export type UserProfile = {
  name: string;
  username: string;
  profilePhoto?: string | null;
};

export async function getProfile(): Promise<UserProfile> {
  const response = await apiRequest("/Auth/perfil");
  if (!response.ok) throw new Error("No se pudo cargar el perfil");
  return response.json();
}
