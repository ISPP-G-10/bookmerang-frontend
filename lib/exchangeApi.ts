import supabase from '@/lib/supabase';
import { ExchangeWithMatchDto } from '@/types/exchange';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5044/api';

/**
 * Obtiene el token JWT del usuario autenticado en Supabase.
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;

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