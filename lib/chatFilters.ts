import { ChatDto } from "@/types/chat";
import { ExchangeStatus, ExchangeWithMatchDto } from "@/types/exchange";

export type ChatTab = "Nuevos matches" | "En curso" | "Finalizados";

/**
 * Determina si un exchange pertenece a la pestaña de chats indicada.
 * Función pura para poder testearla y para usar en `useMemo` durante el render.
 */
export function exchangeMatchesTab(
  exchange: ExchangeWithMatchDto | undefined,
  tab: ChatTab,
): boolean {
  if (!exchange) return false;

  const status = exchange.status as ExchangeStatus;

  if (tab === "Nuevos matches") {
    return (
      status === "NEGOTIATING" ||
      status === "ACCEPTED_BY_1" ||
      status === "ACCEPTED_BY_2"
    );
  }

  if (tab === "En curso") {
    return status === "ACCEPTED";
  }

  // Finalizados
  return (
    status === "COMPLETED" || status === "REJECTED" || status === "INCIDENT"
  );
}

/**
 * Devuelve los chats que se deben mostrar en la pestaña actual aplicando
 * filtro por texto y por estado del exchange asociado. Síncrona: se invoca
 * desde `useMemo` para evitar el render intermedio con datos desactualizados
 * (causa del parpadeo al cambiar de pestaña).
 */
export function filterChatsForTab(params: {
  allChats: ChatDto[];
  exchanges: ExchangeWithMatchDto[];
  currentUserId: string | null;
  activeTab: ChatTab;
  search: string;
}): ChatDto[] {
  const { allChats, exchanges, currentUserId, activeTab, search } = params;
  const normalizedSearch = search.trim().toLowerCase();

  const nonCommunityChats = allChats.filter((c) => c.type !== "COMMUNITY");

  const bySearch = nonCommunityChats.filter((c) => {
    const other = c.participants.find((p) => p.userId !== currentUserId);
    const name = (other?.username ?? "Usuario desconocido").toLowerCase();
    return name.includes(normalizedSearch);
  });

  return bySearch.filter((chat) => {
    const currentExchange = exchanges.find(
      (e) => String(e.chatId) === String(chat.id),
    );
    return exchangeMatchesTab(currentExchange, activeTab);
  });
}
