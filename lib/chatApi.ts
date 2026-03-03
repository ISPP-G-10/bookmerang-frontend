import supabase from '@/lib/supabase';
import {
  ChatDto,
  CreateChatRequest,
  MessageDto,
  SendMessageRequest,
} from '@/types/chat';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5044/api';

/**
 * Dado un array de chats del usuario, deduce cuál es su userId interno.
 * El usuario autenticado es participante de TODOS sus chats, así que
 * intersectamos los participantes de cada chat para encontrar el ID común.
 */
export function resolveUserIdFromChats(chats: ChatDto[]): string | null {
  if (chats.length === 0) return null;

  // Empezar con los participantes del primer chat
  let candidateIds = new Set(chats[0].participants.map((p) => p.userId));

  // Intersectar con los participantes de los demás chats
  for (let i = 1; i < chats.length; i++) {
    const ids = new Set(chats[i].participants.map((p) => p.userId));
    candidateIds = new Set([...candidateIds].filter((id) => ids.has(id)));
  }

  // Si queda exactamente uno, ese es el usuario actual
  if (candidateIds.size === 1) {
    return [...candidateIds][0];
  }

  return null;
}

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
 * Lista todos los chats del usuario autenticado.
 * GET /api/chat
 */
export async function getMyChats(): Promise<ChatDto[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/chat`, { headers });

  if (!res.ok) {
    throw new Error(`Error al obtener chats: ${res.status}`);
  }

  return res.json();
}

/**
 * Obtiene un chat específico por ID.
 * GET /api/chat/{chatId}
 */
export async function getChat(chatId: number): Promise<ChatDto> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/chat/${chatId}`, { headers });

  if (!res.ok) {
    throw new Error(`Error al obtener chat ${chatId}: ${res.status}`);
  }

  return res.json();
}

/**
 * Obtiene los mensajes de un chat con paginación.
 * GET /api/chat/{chatId}/messages?page=1&pageSize=50
 */
export async function getMessages(
  chatId: number,
  page: number = 1,
  pageSize: number = 50
): Promise<MessageDto[]> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  });
  const res = await fetch(
    `${API_URL}/chat/${chatId}/messages?${params}`,
    { headers }
  );

  if (!res.ok) {
    throw new Error(`Error al obtener mensajes del chat ${chatId}: ${res.status}`);
  }

  return res.json();
}

/**
 * Envía un mensaje a un chat.
 * POST /api/chat/{chatId}/messages
 * Al enviar, el backend devuelve el MessageDto con el senderId del usuario actual:
 * esto nos permite resolver el userId de forma definitiva.
 */
export async function sendMessage(
  chatId: number,
  body: string
): Promise<MessageDto> {
  const headers = await getAuthHeaders();
  const request: SendMessageRequest = { body };

  const res = await fetch(`${API_URL}/chat/${chatId}/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    throw new Error(`Error al enviar mensaje: ${res.status}`);
  }

  return res.json();
}

/**
 * Crea un nuevo chat.
 * POST /api/chat
 */
export async function createChat(
  type: string,
  participantIds: string[]
): Promise<ChatDto> {
  const headers = await getAuthHeaders();
  const request: CreateChatRequest = { type, participantIds };

  const res = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    throw new Error(`Error al crear chat: ${res.status}`);
  }

  return res.json();
}
