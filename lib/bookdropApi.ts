import { apiRequest } from "./api";
import { updateStoredAuthUser } from "./authSession";

export interface BookdropProfile {
  id: string;
  email: string;
  username: string;
  name: string;
  profilePhoto: string;
  nombreEstablecimiento: string;
  addressText: string;
  latitud: number;
  longitud: number;
  bookspotStatus: string | number;
  createdAt: string;
}

export interface UpdateBookdropProfileInput {
  nombreEstablecimiento?: string;
  addressText?: string;
  profilePhoto?: string | null;
  latitud?: number;
  longitud?: number;
}

export type BookdropExchangeStatus =
  | "AWAITING_DROP_1"
  | "BOOK_1_HELD"
  | "BOOK_2_HELD"
  | "COMPLETED";

export interface BookdropExchange {
  meetingId: number;
  status: BookdropExchangeStatus;
  book1Title: string;
  book2Title: string;
  user1Name: string;
  user2Name: string;
  scheduledAt: string | null;
}

export interface BookdropExchangeActionInput {
  meetingId: number;
  pin: string;
}

function normalizeBookdropProfile(raw: BookdropProfile): BookdropProfile {
  return {
    ...raw,
    profilePhoto: typeof raw.profilePhoto === "string" ? raw.profilePhoto : "",
    nombreEstablecimiento:
      typeof raw.nombreEstablecimiento === "string" ? raw.nombreEstablecimiento : "",
    addressText: typeof raw.addressText === "string" ? raw.addressText : "",
  };
}

function normalizeBookdropExchange(raw: any): BookdropExchange {
  const rawStatus = String(raw?.status ?? "").trim().toUpperCase();
  const status: BookdropExchangeStatus =
    rawStatus === "0"
      ? "AWAITING_DROP_1"
      : rawStatus === "1"
        ? "BOOK_1_HELD"
        : rawStatus === "2"
          ? "BOOK_2_HELD"
          : rawStatus === "3"
            ? "COMPLETED"
            : (rawStatus as BookdropExchangeStatus);

  const rawMeetingId = raw?.meetingId ?? raw?.exchangeMeetingId ?? 0;
  const rawScheduledAt = raw?.scheduledAt ?? raw?.meetingDate ?? null;

  return {
    meetingId: Number(rawMeetingId),
    status,
    book1Title: typeof raw?.book1Title === "string" ? raw.book1Title : "",
    book2Title: typeof raw?.book2Title === "string" ? raw.book2Title : "",
    user1Name: typeof raw?.user1Name === "string" ? raw.user1Name : "",
    user2Name: typeof raw?.user2Name === "string" ? raw.user2Name : "",
    scheduledAt: typeof rawScheduledAt === "string" && rawScheduledAt.trim()
      ? rawScheduledAt
      : null,
  };
}

async function readApiError(response: Response, fallback: string): Promise<string> {
  const raw = await response.text();
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.error === "string") return parsed.error;
    if (typeof parsed?.message === "string") return parsed.message;
  } catch {
    // Keep raw text if not JSON.
  }

  return raw;
}

export async function getBookdropProfile(): Promise<BookdropProfile> {
  const response = await apiRequest("/Bookdrop/perfil");

  if (!response.ok) {
    throw new Error(await readApiError(response, "No se pudo cargar el perfil del bookdrop"));
  }

  return normalizeBookdropProfile((await response.json()) as BookdropProfile);
}

export async function updateBookdropProfile(
  input: UpdateBookdropProfileInput,
): Promise<BookdropProfile> {
  const response = await apiRequest("/Bookdrop/perfil", {
    method: "PATCH",
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "No se pudo actualizar el perfil del bookdrop"));
  }

  const profile = (await response.json()) as BookdropProfile;
  const normalizedProfile = normalizeBookdropProfile(profile);

  await updateStoredAuthUser({
    email: normalizedProfile.email,
    username: normalizedProfile.username,
    name: normalizedProfile.name,
    profilePhoto: normalizedProfile.profilePhoto,
  });

  return normalizedProfile;
}

export async function deleteBookdropProfile(): Promise<{ message: string | null }> {
  const response = await apiRequest("/Bookdrop/perfil", {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "No se pudo eliminar el perfil del bookdrop"));
  }

  if (response.status === 204) {
    return { message: null };
  }

  const raw = await response.text();
  if (!raw) {
    return { message: null };
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      message:
        typeof parsed?.message === "string"
          ? parsed.message
          : typeof parsed?.error === "string"
            ? parsed.error
            : raw,
    };
  } catch {
    return { message: raw };
  }
}

export async function getBookdropExchanges(): Promise<BookdropExchange[]> {
  const response = await apiRequest("/Bookdrop/exchanges");

  if (!response.ok) {
    throw new Error(await readApiError(response, "No se pudieron cargar los intercambios"));
  }

  const exchanges = (await response.json()) as any[];
  return Array.isArray(exchanges) ? exchanges.map(normalizeBookdropExchange) : [];
}

async function executeBookdropExchangeAction(
  endpoint: string,
  input: BookdropExchangeActionInput,
  fallbackError: string,
): Promise<BookdropExchange> {
  const response = await apiRequest(endpoint, {
    method: "POST",
    body: JSON.stringify({ pin: input.pin }),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, fallbackError));
  }

  return normalizeBookdropExchange(await response.json());
}

export async function confirmBookdropExchangeDrop(
  input: BookdropExchangeActionInput,
): Promise<BookdropExchange> {
  return executeBookdropExchangeAction(
    `/Bookdrop/exchanges/${input.meetingId}/confirm-drop`,
    input,
    "No se pudo confirmar la entrega inicial",
  );
}

export async function confirmBookdropExchangeSwap(
  input: BookdropExchangeActionInput,
): Promise<BookdropExchange> {
  return executeBookdropExchangeAction(
    `/Bookdrop/exchanges/${input.meetingId}/confirm-swap`,
    input,
    "No se pudo confirmar el intercambio",
  );
}

export async function confirmBookdropExchangePickup(
  input: BookdropExchangeActionInput,
): Promise<BookdropExchange> {
  return executeBookdropExchangeAction(
    `/Bookdrop/exchanges/${input.meetingId}/confirm-pickup`,
    input,
    "No se pudo confirmar la recogida final",
  );
}
