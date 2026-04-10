import { CommunityRankingDto, InkdropsHistoryDto } from "@/types/community";
import { apiRequest } from "./api";

export const getMyInkdrops = async (): Promise<{
  inkdrops: number;
  month: string;
}> => {
  const res = await apiRequest("/inkdrops/me");
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error al cargar inkdrops: ${res.status} ${errorText}`);
  }
  return res.json();
};

export const getCommunityRanking = async (
  communityId: number,
): Promise<CommunityRankingDto> => {
  const res = await apiRequest(`/inkdrops/community/${communityId}/ranking`);
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error al cargar ranking: ${res.status} ${errorText}`);
  }
  return res.json();
};

export const getInkdropsHistory = async (): Promise<InkdropsHistoryDto[]> => {
  const res = await apiRequest("/inkdrops/history");
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error al cargar histórial: ${res.status} ${errorText}`);
  }
  return res.json();
};
