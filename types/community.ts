export type CommunityStatus = 'CREATED' | 'ACTIVE' | 'ARCHIVED';

export interface CommunityDto {
  id: number;
  name: string;
  referenceBookspotId: number;
  status: CommunityStatus;
  creatorId: string;
  createdAt: string;
  chatId?: number;
  memberCount: number;
  avatarUrl?: string | null;
  profilePhoto?: string | null;
  iconUrl?: string | null;
  imageUrl?: string | null;
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
