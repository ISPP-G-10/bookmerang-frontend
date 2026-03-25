import { MIN_BOOK_PHOTOS, MAX_BOOK_PHOTOS } from "@/lib/books";

type DataStepValidationInput = {
  title: string;
  author: string;
  isbn: string;
  pageCount: string;
  hasCover: boolean;
  genreCount: number;
  hasLanguage: boolean;
};

export function getPhotoStepValidationError(photoCount: number): string | null {
  if (photoCount >= MIN_BOOK_PHOTOS && photoCount <= MAX_BOOK_PHOTOS) return null;
  if (photoCount < MIN_BOOK_PHOTOS) {
    return `Debes subir una foto para continuar.`;
  }
  return `Máximo ${MAX_BOOK_PHOTOS} fotos permitidas. Actualmente tienes ${photoCount}.`;
}

export function getDataStepMissingFields(
  input: DataStepValidationInput,
): string[] {
  const missing: string[] = [];

  if (!input.title.trim()) missing.push("Título");
  if (!input.author.trim()) missing.push("Autor");
  if (!input.isbn.trim()) missing.push("ISBN");

  const parsedPageCount = Number(input.pageCount.trim());
  if (!Number.isFinite(parsedPageCount) || parsedPageCount <= 0) {
    missing.push("Número de páginas");
  }

  if (!input.hasCover) missing.push("Tipo de tapa");
  if (input.genreCount <= 0) missing.push("Género");
  if (!input.hasLanguage) missing.push("Idioma");

  return missing;
}

export function buildMissingFieldsMessage(fields: string[]): string {
  if (fields.length === 0) return "Todos los campos obligatorios están completos.";
  return `Completa los campos obligatorios: ${fields.join(", ")}.`;
}

export function getStateStepValidationError(
  hasCondition: boolean,
): string | null {
  if (hasCondition) return null;
  return "Debes seleccionar el estado del libro antes de publicarlo.";
}
