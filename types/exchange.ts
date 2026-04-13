export type ExchangeStatus =
  | "NEGOTIATING"
  | "ACCEPTED_BY_1"
  | "ACCEPTED_BY_2"
  | "ACCEPTED"
  | "REJECTED"
  | "COMPLETED"
  | "INCIDENT";

export interface ExchangeWithMatchDto {
  exchangeId: number;
  chatId: string | number | null;
  matchId: number | null;
  user1Id: string | null;
  user2Id: string | null;
  book1Id: number | null;
  book2Id: number | null;
  status: ExchangeStatus;
  createdAt: string | null;
  updatedAt: string | null;
}

export type BookdropExchangeStatus =
  | "AWAITING_DROP_1"
  | "BOOK_1_HELD"
  | "BOOK_2_HELD"
  | "COMPLETED";

export type ExchangeMode = "BOOKSPOT" | "BOOKDROP" | "CUSTOM";

export type MeetingStatus = "PROPOSAL" | "ACCEPTED" | "REFUSED";

export interface ExchangeMeetingDto {
  exchangeMeetingId: number;
  exchangeId: number;
  exchangeMode: ExchangeMode;
  bookspotId: number | null;
  customLocation: number[] | null;
  scheduledAt: string;
  proposerId: string;
  proposerName: string | null;
  meetingStatus: MeetingStatus;
  markAsCompletedByUser1: boolean;
  markAsCompletedByUser2: boolean;
  pin: string | null;
  bookDropStatus: BookdropExchangeStatus | null;
}

