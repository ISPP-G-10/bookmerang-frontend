// ===== API Response DTOs (coinciden con el backend) =====

export interface ChatParticipantDto {
  userId: string;
  username: string;
  profilePhoto: string;
  joinedAt: string;
}

export interface MessageDto {
  id: number;
  chatId: number;
  senderId: string;
  senderUsername: string;
  body: string;
  sentAt: string;
}

export interface ChatDto {
  id: number;
  type: string;
  createdAt: string;
  participants: ChatParticipantDto[];
  lastMessage: MessageDto | null;
}

export interface TypingUserDto {
  userId: string;
  username: string;
}

// ===== API Request DTOs =====

export interface SendMessageRequest {
  body: string;
}

export interface CreateChatRequest {
  type: string;
  participantIds: string[];
}

// ===== Tipos legacy (usados por exchange/community) =====

export interface ChatUser {
  id: number;
  email?: string;
  username: string;
  nombre: string;
  foto_perfil_url: string;
}

export interface ChatParticipant {
  chat_id: number;
  user_id: number;
  joined_at: string;
  user: ChatUser;
}

export interface ChatMessage {
  id: number;
  chat_id: number;
  sender_id: number;
  body: string;
  sent_at: string;
}

export interface Book {
  id: number;
  owner_id: number;
  isbn: string;
  titulo: string;
  autor: string;
  editorial: string;
  tapa: string;
  estado: string;
  status: string;
}

export interface BookSpot {
  id: number;
  nombre: string;
  address_text: string;
  is_partner: boolean;
  status: string;
}

export interface Meeting {
  id: number;
  exchange_id: number;
  mode: string;
  book_spot_id: number | null;
  custom_location_text: string | null;
  scheduled_at: string;
  proposer_id: number;
  accepted_by_user_2: boolean;
  status: string;
  mark_as_completed_by_u1: boolean;
  mark_as_completed_by_u2: boolean;
  book_spot: BookSpot | null;
}

export interface Exchange {
  id: number;
  chat_id: number;
  user_1_id: number;
  user_2_id: number;
  book_1_id: number;
  book_2_id: number;
  status: string;
  created_at: string;
  updated_at: string;
  book_1: Book;
  book_2: Book;
  meeting: Meeting | null;
}

export interface Community {
  id: number;
  name: string;
  status: string;
  created_by_user_id: number;
  created_at: string;
}

export interface CommunityChat {
  community_id: number;
  chat_id: number;
  community: Community;
}

export type ChatType = 'DIRECT_EXCHANGE' | 'COMMUNITY';

export interface ChatData {
  id: number;
  type: ChatType;
  created_at: string;
  participants: ChatParticipant[];
  messages: ChatMessage[];
  exchange: Exchange | null;
  community_chat: CommunityChat | null;
}
