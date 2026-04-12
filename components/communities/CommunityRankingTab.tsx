import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useAuth } from "@/contexts/AuthContext";
import { getCommunityRanking } from "@/lib/inkdropsApi";
import {
  CommunityRankingDto,
  CommunityRankingEntryDto,
} from "@/types/community";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";

type Props = {
  communityId: number;
};

// ─── Helper: colores por posición ────────────────────────────────────────────

function getPositionStyle(position: number) {
  switch (position) {
    case 1:
      return { bg: "#f59e0b", text: "#ffffff" };
    case 2:
      return { bg: "#c0c0c0", text: "#4b5563" };
    case 3:
      return { bg: "#cd7f32", text: "#ffffff" };
    default:
      return { bg: "#d1d5db", text: "#6b7280" };
  }
}

// ─── Leader Card ─────────────────────────────────────────────────────────────

function LeaderCard({
  entry,
  isMe,
}: {
  entry: CommunityRankingEntryDto;
  isMe: boolean;
}) {
  const displayName = isMe ? "Tú" : (entry.name ?? entry.username);

  const cardBg = "#fef3c7";
  const cardBorder = "#f59e0b";

  return (
    <View
      className="mx-3 mb-2 rounded-2xl p-3 flex-row items-center border-2"
      style={{ backgroundColor: cardBg, borderColor: cardBorder }}
    >
      {/* Círculo dorado con icono de corona */}
      <View
        className="w-11 h-11 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: "#f59e0b" }}
      >
        <Ionicons name="trophy" size={20} color="#ffffff" />
      </View>

      <VStack className="flex-1 gap-0.5">
        <HStack className="items-center gap-2 flex-wrap">
          <Text className="text-sm font-bold text-[#1f2937]">
            {displayName}
          </Text>
          <View
            className="rounded-md px-1.5 py-0.5"
            style={{ backgroundColor: "#fde68a" }}
          >
            <Text className="text-[10px] font-extrabold text-amber-800 tracking-wide">
              LÍDER
            </Text>
          </View>
        </HStack>

        <HStack className="items-center gap-1">
          <Ionicons name="flame" size={11} color="#e4715f" />
          <Text className="text-xs font-semibold text-[#e4715f]">
            {entry.inkdropsThisMonth} InkDrops
          </Text>
        </HStack>
      </VStack>
    </View>
  );
}

// ─── Ranking Row ──────────────────────────────────────────────────────────────

function RankingRow({
  entry,
  position,
  isMe,
}: {
  entry: CommunityRankingEntryDto;
  position: number;
  isMe: boolean;
}) {
  const displayName = isMe ? "Tú" : (entry.name ?? entry.username);
  const { bg, text } = getPositionStyle(position);

  const cardBg = isMe ? "#fff8f7" : "#ffffff";
  const cardBorder = isMe ? "#e4715f" : "#f0ece4";

  return (
    <View
      className="flex-row items-center rounded-xl p-3 mb-2 border"
      style={{ backgroundColor: cardBg, borderColor: cardBorder }}
    >
      {/* Círculo con posición coloreada por medalla */}
      <View
        className="w-11 h-11 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: bg }}
      >
        <Text className="text-sm font-bold" style={{ color: text }}>
          #{position}
        </Text>
      </View>

      <VStack className="flex-1 gap-1">
        <Text
          className="text-sm font-semibold"
          style={{ color: isMe ? "#e4715f" : "#1f2937" }}
        >
          {displayName}
        </Text>
        <HStack className="items-center gap-1">
          <Ionicons name="flame" size={11} color="#e4715f" />
          <Text className="text-xs font-semibold text-[#e4715f]">
            {entry.inkdropsThisMonth} InkDrops
          </Text>
        </HStack>
      </VStack>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CommunityRankingTab({ communityId }: Props) {
  const { currentUserId, userPlan } = useAuth();
  const [ranking, setRanking] = useState<CommunityRankingDto | null>(null);
  const [loading, setLoading] = useState(true);

  const isFreeUser = userPlan === "FREE";

  const fetchRanking = useCallback(async () => {
    if (isFreeUser) return;
    try {
      setLoading(true);
      const data = await getCommunityRanking(communityId);
      setRanking(data);
    } catch (error: any) {
      console.error("Error loading ranking:", error.message);
    } finally {
      setLoading(false);
    }
  }, [communityId, isFreeUser]);

  useFocusEffect(
    useCallback(() => {
      fetchRanking();
    }, [fetchRanking]),
  );

  if (isFreeUser) {
    return (
      <VStack className="flex-1 items-center justify-center px-10 gap-3">
        <Ionicons name="trophy-outline" size={48} color="#e4715f" />
        <Text className="text-lg font-bold text-[#1f2937]">
          Funcionalidad Premium
        </Text>
        <Text className="text-sm text-[#6b7280] text-center">
          El ranking mensual solo está disponible para usuarios con suscripción
          Premium.
        </Text>
      </VStack>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#e4715f" />
        <Text className="mt-4 text-xs text-gray-500">Cargando ranking...</Text>
      </View>
    );
  }

  if (!ranking) {
    return (
      <VStack className="flex-1 items-center justify-center gap-3 px-10">
        <Ionicons name="warning-outline" size={48} color="#d1d5db" />
        <Text className="text-sm text-[#9ca3af] text-center">
          No se pudo cargar el ranking
        </Text>
      </VStack>
    );
  }

  if (!ranking?.ranking || ranking.ranking.length === 0) {
    return (
      <VStack className="flex-1 items-center justify-center gap-3 px-10">
        <Ionicons name="trophy-outline" size={48} color="#d1d5db" />
        <Text className="text-sm text-[#9ca3af] text-center">
          Aún no hay datos de ranking este mes
        </Text>
      </VStack>
    );
  }

  const leader = ranking.ranking[0];
  const rest = ranking.ranking.slice(1);

  return (
    <>
      <FlatList
        data={rest}
        keyExtractor={(item) => item.userId.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListHeaderComponent={
          <VStack className="gap-0">
            {/* Banner */}
            <View className="mx-3 mt-3 mb-2 bg-amber-50 rounded-2xl p-3.5 border border-amber-200">
              <HStack className="items-center gap-1.5 mb-1">
                <Ionicons name="trophy" size={18} color="#f59e0b" />
                <Text className="text-base font-bold text-[#1f2937]">
                  Clasificación Mensual
                </Text>
              </HStack>
              <Text className="text-sm text-[#4b5563] leading-snug">
                El 1º del ranking al final de mes obtiene{" "}
                <Text className="text-[#e4715f] font-bold">Premium gratis</Text>{" "}
                el próximo mes
              </Text>
            </View>

            {/* How to earn */}
            <View className="mx-3 mb-3 bg-white rounded-xl p-3 border border-[#f0ece4]">
              <Text className="text-xs font-semibold text-[#374151] mb-1.5">
                Cómo ganar InkDrops:
              </Text>
              <HStack className="items-center gap-1.5 mb-1">
                <View className="w-1.5 h-1.5 rounded-full bg-[#e4715f]" />
                <Text className="text-xs text-[#4b5563]">
                  +100 por cada intercambio completado
                </Text>
              </HStack>
              <HStack className="items-center gap-1.5">
                <View className="w-1.5 h-1.5 rounded-full bg-[#e4715f]" />
                <Text className="text-xs text-[#4b5563]">
                  +200 por asistir a una quedada
                </Text>
              </HStack>
            </View>

            {/* Leader */}
            <LeaderCard entry={leader} isMe={leader.userId === currentUserId} />
          </VStack>
        }
        renderItem={({ item, index }) => (
          <View className="px-3">
            <RankingRow
              entry={item}
              position={index + 2}
              isMe={item.userId === currentUserId}
            />
          </View>
        )}
      />
    </>
  );
}
