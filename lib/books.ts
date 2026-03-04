import { apiRequest } from "./api";
import supabase from "./supabase";

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
  titulo?: string;
  autor?: string;
  numPaginas?: number | null;
  cover?: "Hardcover" | "Paperback" | null;
  condition?: "LikeNew" | "VeryGood" | "Good" | "Acceptable" | "Poor" | null;
  observaciones?: string | null;
  languages: string[];
  genres: string[];
  photos: { url?: string | null }[];
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

  const normalized = String(value).toLowerCase();
  if (
    normalized === "likenew" ||
    normalized === "like_new" ||
    normalized === "como nuevo"
  )
    return "LikeNew";
  if (
    normalized === "verygood" ||
    normalized === "very_good" ||
    normalized === "muy bueno"
  )
    return "VeryGood";
  if (normalized === "good" || normalized === "bueno") return "Good";
  if (normalized === "acceptable" || normalized === "aceptable")
    return "Acceptable";
  if (normalized === "poor" || normalized === "malo") return "Poor";

  return null;
}

function normalizeCover(value: string | null): BookDetail["cover"] {
  if (!value) return null;
  const normalized = String(value).toLowerCase();
  if (normalized === "hardcover" || normalized === "hard_cover")
    return "Hardcover";
  if (normalized === "paperback" || normalized === "paper_back")
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

function mapSupabaseBookDetail(
  book: any,
  photos: any[] = [],
  languages: string[] = [],
  genres: string[] = [],
): BookDetail {
  const normalizedPhotos = Array.isArray(photos)
    ? [...photos]
        .sort((a, b) => (a?.orden ?? 0) - (b?.orden ?? 0))
        .map((photo) => ({ url: photo?.url ?? null }))
    : [];

  return {
    id: Number(book?.id),
    titulo: book?.titulo ?? "",
    autor: book?.autor ?? "",
    numPaginas: book?.num_paginas ?? null,
    cover: normalizeCover(book?.cover ?? null),
    condition: normalizeCondition(book?.condition ?? null),
    observaciones: book?.observaciones ?? null,
    languages,
    genres,
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
    "id, titulo, autor, num_paginas, cover, condition, observaciones, owner_id, status";

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

export async function getMyLibrary(pageSize = 50): Promise<BookListItem[]> {
  const endpoints = [
    `/books/my-library?page=1&pageSize=${pageSize}`,
    `/books/my-library?page=1&page_size=${pageSize}`,
    `/books/my-library?PageNumber=1&PageSize=${pageSize}`,
    `/books/my-library?pageNumber=1&pageSize=${pageSize}`,
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
    const items = extractLibraryItems(data)
      .map(normalizeBookItem)
      .filter((book) => Number.isFinite(book.id));

    return items;
  }

  console.warn("Error cargando biblioteca en API", failures);

  const supabaseBooks = await getMyLibraryFromSupabase(pageSize);
  if (supabaseBooks.length > 0) return supabaseBooks;

  throw new Error("No se pudo cargar tu biblioteca.");
}

export async function getBookDetail(bookId: number): Promise<BookDetail> {
  const response = await apiRequest(`/books/${bookId}`);
  if (response.ok) return response.json();

  const supabaseBook = await getBookDetailFromSupabase(bookId);
  if (supabaseBook) return supabaseBook;

  throw new Error("No se pudo cargar el libro");
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
      cover: book.cover,
      languageIds: apiLanguageIds,
      genreIds: apiGenreIds,
    }),
  });

  const detailsResponse = await apiRequest(`/books/${book.id}/details`, {
    method: "PUT",
    body: JSON.stringify({
      condition: book.condition,
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
