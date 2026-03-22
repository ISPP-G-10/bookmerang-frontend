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
}

export interface CreateCommunityRequest {
  name: string;
  referenceBookspotId: number;
}
