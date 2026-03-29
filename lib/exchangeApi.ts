import { getAccessToken } from '@/lib/authSession';
import { ExchangeMeetingDto, ExchangeMode, ExchangeWithMatchDto } from '@/types/exchange';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5044/api';

/**
 * Obtiene el token JWT del usuario autenticado en Supabase.
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getAccessToken();

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Obtiene un exchange por el id de su chat asociado, con los atributos de match
 * GET /api/exchange/byChat/{chatId}
 */
export async function getExchangeByChatIdWithMatch(chatId: number): Promise<ExchangeWithMatchDto | null> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/exchange/byChat/${chatId}/withMatch`, { headers });
  
  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error(`Error al obtener exchange con chat id ${chatId}: ${res.status}`);
  }

  const chat: ExchangeWithMatchDto = await res.json();
  return chat;
}

/**
 * Acepta un intercambia, cambia su estado a accepted
 * GET /api/exchange/exchangeId/accept
 */
export async function acceptExchange(exchangeId: number): Promise<ExchangeWithMatchDto> {
  const headers = await getAuthHeaders();
  
  const res = await fetch(`${API_URL}/Exchange/${exchangeId}/accept`, {
    method: 'PATCH',
    headers: {
      ...headers,
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify({})
  });

  if(res.status == 403) {
    throw new Error ("No tienes permiso para aceptar este intercambio.")
  }
  if (!res.ok) {
    throw new Error(`Error al aceptar el exchange ${exchangeId}: ${res.status}`);
  }

  const exchange: ExchangeWithMatchDto = await res.json();
  return exchange;
}

export async function rejectExchange(exchangeId: number): Promise<ExchangeWithMatchDto> {
  const headers = await getAuthHeaders();
  
  const res = await fetch(`${API_URL}/Exchange/${exchangeId}/reject`, {
    method: 'PATCH',
    headers: {
      ...headers,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });

  if (!res.ok) {
    const errorText = await res.text();
    
    let errorMessage = errorText;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorJson.error || errorText;
    } catch {
      // Si no es JSON, usa el texto crudo
      errorMessage = `Error ${res.status}: ${errorText.substring(0, 200)}...`;
    }
    
    console.error('Respuesta completa del error:', errorText);
    throw new Error(errorMessage);
  }

  const exchange: ExchangeWithMatchDto = await res.json();
  return exchange;
}

export async function deleteExchange(exchangeId:number): Promise<boolean> {

  const headers = await getAuthHeaders();

  const res = await fetch(`${API_URL}/Exchange/${exchangeId}`, {
    method: 'DELETE',
    headers: {
      ...headers,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });

  if (!res.ok) {
    const errorText = await res.text();
    
    let errorMessage = errorText;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorJson.error || errorText;
    } catch {
      // Si no es JSON, usa el texto crudo
      errorMessage = `Error ${res.status}: ${errorText.substring(0, 200)}...`;
    }
    
    console.error('Respuesta completa del error:', errorText);
    throw new Error(errorMessage);
  }

  const deleted: boolean = await res.json();
  return deleted;
  
}

type CreateExchangeMeetingPayload = {
  exchangeId: number;
  exchangeMode: ExchangeMode;
  bookspotId?: number | null;
  customLocation?: number[] | null;
  scheduledAt: string;
};

export async function getMeetingByExchangeId(exchangeId: number): Promise<ExchangeMeetingDto | null> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/ExchangeMeeting/byExchange/${exchangeId}`, { headers });

  if (res.ok) {
    return (await res.json()) as ExchangeMeetingDto;
  }

  // Fallback para entornos donde el endpoint byExchange aún no está desplegado
  // o responde con Forbidden por validaciones de pertenencia.
  if (res.status === 404 || res.status === 403) {
    const allRes = await fetch(`${API_URL}/ExchangeMeeting/all`, { headers });

    if (allRes.status === 404) {
      return null;
    }

    if (!allRes.ok) {
      throw new Error(`Error al obtener meetings para fallback: ${allRes.status}`);
    }

    const meetings = (await allRes.json()) as ExchangeMeetingDto[];
    return meetings.find((meeting) => meeting.exchangeId === exchangeId) ?? null;
  }

  throw new Error(`Error al obtener meeting del exchange ${exchangeId}: ${res.status}`);
}

export async function createExchangeMeeting(payload: CreateExchangeMeetingPayload): Promise<ExchangeMeetingDto> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_URL}/ExchangeMeeting`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      exchangeId: payload.exchangeId,
      exchangeMode: payload.exchangeMode,
      bookspotId: payload.bookspotId ?? null,
      customLocation: payload.customLocation ?? null,
      scheduledAt: payload.scheduledAt,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Error al crear la propuesta de quedada: ${res.status}`);
  }

  return (await res.json()) as ExchangeMeetingDto;
}

export async function acceptExchangeMeeting(meetingId: number): Promise<ExchangeMeetingDto> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_URL}/ExchangeMeeting/${meetingId}/accept`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Error al aceptar la propuesta de quedada: ${res.status}`);
  }

  return (await res.json()) as ExchangeMeetingDto;
}

export async function rejectExchangeMeeting(meetingId: number): Promise<void> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_URL}/ExchangeMeeting/${meetingId}`, {
    method: 'DELETE',
    headers,
    body: JSON.stringify({}),
  });

  if (res.status === 404 || res.status === 204) {
    return;
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Error al rechazar la propuesta de quedada: ${res.status}`);
  }
}