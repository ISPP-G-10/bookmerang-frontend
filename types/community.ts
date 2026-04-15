export type CommunityStatus = "CREATED" | "ACTIVE" | "ARCHIVED";
export type CommunityRole = "MEMBER" | "MODERATOR";

export interface CommunityDto {
  id: number;
  name: string;
  referenceBookspotId: number;
  status: CommunityStatus;
  creatorId: string;
  createdAt: string;
  currentUserRole?: CommunityRole | null;
  chatId?: string;
  memberCount: number;
  avatarUrl?: string | null;
  profilePhoto?: string | null;
  iconUrl?: string | null;
  imageUrl?: string | null;
}

export interface CommunityMemberDto {
  communityId: number;
  userId: string;
  username: string;
  profilePhoto: string;
  role: CommunityRole;
  joinedAt: string;
}

export interface CreateCommunityRequest {
  name: string;
  referenceBookspotId: number;
}

export interface CommunityLibraryBookDto {
  bookId: number;
  ownerId: string;
  ownerUsername: string;
  titulo: string;
  autor: string;
  thumbnailUrl: string | null;
  genres: string[];
  likesCount: number;
  likedByMe: boolean;
}

export type MeetupStatus = "SCHEDULED" | "DONE" | "CANCELLED";

export interface CommunityMeetupAttendeeDto {
  userId: string;
  username: string;
  selectedBookId: number;
  selectedBookTitle: string;
  activeFrameId?: string | null;
  activeColorId?: string | null;
}

export interface CommunityMeetupDto {
  id: number;
  communityId: number;
  title: string;
  description?: string | null;
  otherBookSpotId?: number | null;
  otherLocation?: number[] | null;
  scheduledAt: string;
  status: MeetupStatus;
  creatorId?: string | null;
  createdAt: string;
  updatedAt: string;
  attendees: CommunityMeetupAttendeeDto[];
}

export interface CreateCommunityMeetupRequest {
  title: string;
  description?: string;
  otherBookSpotId?: number;
  otherLocation?: number[];
  scheduledAt: string;
}

export interface AttendCommunityMeetupRequest {
  selectedBookId: number;
}

export interface MeetupAttendanceDto {
  meetupId: number;
  userId: string;
  username: string;
  profilePhoto: string;
  selectedBookId: number;
  selectedBookTitle: string;
  status: "REGISTERED" | "ATTENDED" | "NO_SHOW" | "CANCELLED";
}

export interface CommunityRankingEntryDto {
  userId: string;
  username: string;
  name?: string;
  inkdropsThisMonth: number;
  exchangesCount?: number;
  streakDays?: number;
  activeFrameId?: string | null;
  activeColorId?: string | null;
}

export interface CommunityRankingDto {
  communityId: number;
  month: string;
  ranking: CommunityRankingEntryDto[];
}

export type InkdropsActionType =
  | "EXCHANGE_COMPLETED"
  | "MEETUP_ATTENDED"
  | "OTHER";

export interface InkdropsHistoryDto {
  id: number;
  actionType: InkdropsActionType;
  pointsGranted: number;
  createdAt: string;
}
