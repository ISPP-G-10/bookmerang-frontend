// DTOs de respuesta

export interface ExchangeWithMatchDto {
    exchangeId: number,
    chatId: number,
    matchId: number,
    user1Id: string,
    user2Id: string,
    book1Id: number,
    book2Id: number,
    status: ExchangeStatus,
    createdAt: string,
    updatedAt: string
}

export type ExchangeStatus = "NEGOTIATING" | "ACCEPTED_BY_1" | "ACCEPTED_BY_2" | "ACCEPTED" | "REJECTED" | "COMPLETED" | "INCIDENT";

export interface ExchangeMeetingDto {
    exchangeMeetingId: number,
    exchangeId: number,
    exchangeMode: ExchangeMode,
    bookspotId: number,
    customLocation: number, // coordenadas en forma de lista [x, y]
    scheduledAt: string,
    proposerId: string,
    proposerName: string,
    meetingStatus: string,
    markAsCompletedByUser1: boolean,
    markAsCompletedByUser2: boolean
}

export type ExchangeMode = "BOOKSPOT" | "BOOKDROP" | "CUSTOM";

export type MeetingStatus = "PROPOSAL" | "ACCEPTED" | "REFUSED";

