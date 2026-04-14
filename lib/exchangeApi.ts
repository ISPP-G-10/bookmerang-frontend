import { apiRequest } from "@/lib/api";
import {
  ExchangeMeetingDto,
  ExchangeMode,
  ExchangeWithMatchDto,
} from "@/types/exchange";

type CreateExchangeMeetingPayload = {
  exchangeId: number;
  exchangeMode: ExchangeMode;
  bookspotId?: number | null;
  customLocation?: number[] | null;
  scheduledAt: string;
};

type CounterProposeMeetingPayload = {
  exchangeMode: ExchangeMode;
  bookspotId?: number | null;
  customLocation?: number[] | null;
  scheduledAt: string;
};

async function readApiError(
  response: Response,
  fallback: string,
): Promise<string> {
  const raw = await response.text();
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.message === "string") return parsed.message;
    if (typeof parsed?.error === "string") return parsed.error;
  } catch {
    // Keep raw text if response is not JSON.
  }

  return raw;
}

async function parseJsonOrNull<T>(response: Response): Promise<T | null> {
  const raw = await response.text();
  if (!raw) return null;
  return JSON.parse(raw) as T;
}

function toNullableNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function normalizeExchange(raw: any): ExchangeWithMatchDto {
  return {
    exchangeId: Number(raw?.exchangeId ?? raw?.ExchangeId ?? 0),
    chatId: raw?.chatId ?? raw?.ChatId ?? null,
    matchId: toNullableNumber(raw?.matchId ?? raw?.MatchId),
    user1Id: toNullableString(raw?.user1Id ?? raw?.User1Id),
    user2Id: toNullableString(raw?.user2Id ?? raw?.User2Id),
    book1Id: toNullableNumber(raw?.book1Id ?? raw?.Book1Id),
    book2Id: toNullableNumber(raw?.book2Id ?? raw?.Book2Id),
    status: String(
      raw?.status ?? raw?.Status ?? "NEGOTIATING",
    ).toUpperCase() as ExchangeWithMatchDto["status"],
    createdAt: toNullableString(raw?.createdAt ?? raw?.CreatedAt),
    updatedAt: toNullableString(raw?.updatedAt ?? raw?.UpdatedAt),
  };
}

function normalizeMeeting(raw: any): ExchangeMeetingDto {
  const latitud = Number(raw?.latitud ?? raw?.Latitud);
  const longitud = Number(raw?.longitud ?? raw?.Longitud);
  const hasCustomLocation =
    Number.isFinite(latitud) && Number.isFinite(longitud);

  return {
    exchangeMeetingId: Number(
      raw?.exchangeMeetingId ?? raw?.ExchangeMeetingId ?? 0,
    ),
    exchangeId: Number(raw?.exchangeId ?? raw?.ExchangeId ?? 0),
    exchangeMode: String(
      raw?.exchangeMode ?? raw?.ExchangeMode ?? "CUSTOM",
    ).toUpperCase() as ExchangeMode,
    bookspotId: toNullableNumber(raw?.bookspotId ?? raw?.BookspotId),
    customLocation: hasCustomLocation ? [longitud, latitud] : null,
    scheduledAt: String(raw?.scheduledAt ?? raw?.ScheduledAt ?? ""),
    proposerId: String(raw?.proposerId ?? raw?.ProposerId ?? ""),
    proposerName: toNullableString(raw?.proposerName ?? raw?.ProposerName),
    meetingStatus: String(
      raw?.meetingStatus ?? raw?.MeetingStatus ?? "PROPOSAL",
    ).toUpperCase() as ExchangeMeetingDto["meetingStatus"],
    markAsCompletedByUser1: Boolean(
      raw?.markAsCompletedByUser1 ?? raw?.MarkAsCompletedByUser1,
    ),
    markAsCompletedByUser2: Boolean(
      raw?.markAsCompletedByUser2 ?? raw?.MarkAsCompletedByUser2,
    ),
    pin: toNullableString(raw?.pin ?? raw?.Pin),
    bookDropStatus: toNullableString(
      raw?.bookDropStatus ?? raw?.BookDropStatus,
    ) as ExchangeMeetingDto["bookDropStatus"],
  };
}

export async function getExchange(
  exchangeId: number,
): Promise<ExchangeWithMatchDto | null> {
  const res = await apiRequest(`/Exchange/${exchangeId}`);

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error(
      await readApiError(res, `Error al obtener el intercambio ${exchangeId}`),
    );
  }

  const raw = await parseJsonOrNull<any>(res);
  return raw ? normalizeExchange(raw) : null;
}

export async function getExchangeByChatIdWithMatch(
  chatId: string | number,
): Promise<ExchangeWithMatchDto | null> {
  const res = await apiRequest(`/Exchange/byChat/${chatId}/withMatch`);

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error(
      await readApiError(
        res,
        `Error al obtener exchange con chat id ${chatId}`,
      ),
    );
  }

  const raw = await parseJsonOrNull<any>(res);
  return raw ? normalizeExchange(raw) : null;
}

export async function acceptExchange(
  exchangeId: number,
): Promise<ExchangeWithMatchDto> {
  const res = await apiRequest(`/Exchange/${exchangeId}/accept`, {
    method: "PATCH",
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    throw new Error(
      await readApiError(res, `Error al aceptar el intercambio ${exchangeId}`),
    );
  }

  return normalizeExchange(await res.json());
}

export async function rejectExchange(
  exchangeId: number,
): Promise<ExchangeWithMatchDto> {
  const res = await apiRequest(`/Exchange/${exchangeId}/reject`, {
    method: "PATCH",
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    throw new Error(
      await readApiError(res, `Error al rechazar el intercambio ${exchangeId}`),
    );
  }

  return normalizeExchange(await res.json());
}

export async function deleteExchange(_exchangeId: number): Promise<boolean> {
  throw new Error(
    "deleteExchange no está soportado por ExchangeController. Ese controlador no expone DELETE /api/exchange/{exchangeId}.",
  );
}

export async function getExchangeMeeting(
  meetingId: number,
): Promise<ExchangeMeetingDto | null> {
  const res = await apiRequest(`/ExchangeMeeting/${meetingId}`);

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error(
      await readApiError(res, `Error al obtener el meeting ${meetingId}`),
    );
  }

  const raw = await parseJsonOrNull<any>(res);
  return raw ? normalizeMeeting(raw) : null;
}

export async function getMeetingByExchangeId(
  exchangeId: number,
): Promise<ExchangeMeetingDto | null> {
  const res = await apiRequest(`/ExchangeMeeting/byExchange/${exchangeId}`);

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error(
      await readApiError(
        res,
        `Error al obtener el meeting del exchange ${exchangeId}`,
      ),
    );
  }

  const raw = await parseJsonOrNull<any>(res);
  return raw ? normalizeMeeting(raw) : null;
}

export async function createExchangeMeeting(
  payload: CreateExchangeMeetingPayload,
): Promise<ExchangeMeetingDto> {
  const res = await apiRequest("/ExchangeMeeting", {
    method: "POST",
    body: JSON.stringify({
      exchangeId: payload.exchangeId,
      exchangeMode: payload.exchangeMode,
      bookspotId: payload.bookspotId ?? null,
      latitud: payload.customLocation?.[1] ?? null,
      longitud: payload.customLocation?.[0] ?? null,
      scheduledAt: payload.scheduledAt,
    }),
  });

  if (!res.ok) {
    throw new Error(
      await readApiError(res, "Error al crear la propuesta de quedada"),
    );
  }

  return normalizeMeeting(await res.json());
}

export async function counterProposeExchangeMeeting(
  meetingId: number,
  payload: CounterProposeMeetingPayload,
): Promise<ExchangeMeetingDto> {
  const res = await apiRequest(
    `/ExchangeMeeting/${meetingId}/counter-propose`,
    {
      method: "PATCH",
      body: JSON.stringify({
        exchangeMode: payload.exchangeMode,
        bookspotId: payload.bookspotId ?? null,
        latitud: payload.customLocation?.[1] ?? null,
        longitud: payload.customLocation?.[0] ?? null,
        scheduledAt: payload.scheduledAt,
      }),
    },
  );

  if (!res.ok) {
    throw new Error(
      await readApiError(res, "Error al contra-proponer la quedada"),
    );
  }

  return normalizeMeeting(await res.json());
}

export async function acceptExchangeMeeting(
  meetingId: number,
): Promise<ExchangeMeetingDto> {
  const res = await apiRequest(`/ExchangeMeeting/${meetingId}/accept`, {
    method: "PUT",
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    throw new Error(
      await readApiError(res, "Error al aceptar la propuesta de quedada"),
    );
  }

  return normalizeMeeting(await res.json());
}

export async function completeExchangeMeeting(meetingId: number): Promise<ExchangeMeetingDto> {
  const res = await apiRequest(`/ExchangeMeeting/${meetingId}/complete`, {
    method: "PUT",
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    throw new Error(
      await readApiError(
        res,
        `Error al confirmar el intercambio del meeting ${meetingId}`,
      ),
    );
  }

  return normalizeMeeting(await res.json());
}

export async function reportExchange(
  exchangeId: number,
): Promise<ExchangeWithMatchDto> {
  const res = await apiRequest(`/Exchange/${exchangeId}/report`, {
    method: "PATCH",
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    throw new Error(
      await readApiError(res, `Error al reportar el intercambio ${exchangeId}`),
    );
  }

  return normalizeExchange(await res.json());
}
