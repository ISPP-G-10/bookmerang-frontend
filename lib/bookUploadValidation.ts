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

function normalizeIsbn(value: string): string {
  return value.replace(/[\s-]/g, "").toUpperCase();
}

function isValidIsbn10(isbn: string): boolean {
  if (!/^\d{9}[\dX]$/.test(isbn)) return false;

  const checksum = isbn.split("").reduce((sum, char, index) => {
    const digit = char === "X" ? 10 : Number(char);
    return sum + digit * (10 - index);
  }, 0);

  return checksum % 11 === 0;
}

function isValidIsbn13(isbn: string): boolean {
  if (!/^\d{13}$/.test(isbn)) return false;
  if (!isbn.startsWith("978") && !isbn.startsWith("979")) return false;

  const checksumBase = isbn
    .slice(0, 12)
    .split("")
    .reduce((sum, digit, index) => sum + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);

  const checksum = (10 - (checksumBase % 10)) % 10;
  return checksum === Number(isbn[12]);
}

export function parseScannedIsbn(rawValue: string): string | null {
  const normalized = rawValue.replace(/[^0-9xX]/g, "").toUpperCase();
  if (normalized.length === 13 && isValidIsbn13(normalized)) return normalized;
  if (normalized.length === 10 && isValidIsbn10(normalized)) return normalized;
  return null;
}

export function normalizeIsbnForSubmission(value: string): string | null {
  const trimmedValue = value.trim();
  if (!trimmedValue) return null;
  return normalizeIsbn(trimmedValue);
}

export function getIsbnValidationError(
  value: string,
  required = false,
): string | null {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return required ? "El ISBN es obligatorio." : null;
  }

  if (/[^0-9xX\s-]/.test(trimmedValue)) {
    return "El ISBN solo puede contener números, espacios, guiones y una X final.";
  }

  const normalized = normalizeIsbn(trimmedValue);
  if (normalized.length === 10 && isValidIsbn10(normalized)) return null;
  if (normalized.length === 13 && isValidIsbn13(normalized)) return null;

  return "Introduce un ISBN-10 o ISBN-13 válido.";
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
