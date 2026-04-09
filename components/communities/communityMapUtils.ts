import { Bookspot } from '@/lib/mockBookspots';
import { CommunityDto } from '@/types/community';

export type CommunityWithSpot = CommunityDto & { spot: Bookspot };

export type GroupedCommunitySpot = {
  key: string;
  spot: Bookspot;
  communities: CommunityWithSpot[];
  hasMine: boolean;
};

export function groupCommunitiesBySpot(
  communities: CommunityWithSpot[],
  myCommunities: CommunityDto[]
): GroupedCommunitySpot[] {
  const grouped = new Map<number, GroupedCommunitySpot>();
  const myCommunityIds = new Set(myCommunities.map((community) => community.id));

  for (const community of communities) {
    const spotId = community.spot.id;
    const existingGroup = grouped.get(spotId);

    if (existingGroup) {
      existingGroup.communities.push(community);
      continue;
    }

    grouped.set(spotId, {
      key: `spot-${spotId}`,
      spot: community.spot,
      communities: [community],
      hasMine: false,
    });
  }

  return Array.from(grouped.values())
    .map((group) => {
      const sortedCommunities = [...group.communities].sort((left, right) => {
        const leftIsMine = myCommunityIds.has(left.id);
        const rightIsMine = myCommunityIds.has(right.id);

        if (leftIsMine !== rightIsMine) {
          return leftIsMine ? -1 : 1;
        }

        return left.name.localeCompare(right.name, 'es');
      });

      return {
        ...group,
        communities: sortedCommunities,
        hasMine: sortedCommunities.some((community) => myCommunityIds.has(community.id)),
      };
    })
    .sort((left, right) => left.spot.nombre.localeCompare(right.spot.nombre, 'es'));
}
