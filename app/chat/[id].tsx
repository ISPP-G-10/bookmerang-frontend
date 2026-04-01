import FontAwesome from "@expo/vector-icons/FontAwesome";
import { TouchableOpacity as GHTouchableOpacity } from "react-native-gesture-handler";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from "react-native";

import { ConfirmModal } from "@/components/ConfirmationModal";
import { Text, View } from "@/components/Themed";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/AuthContext";
import { fetchMyBackendUser } from "@/lib/api";
import { authService } from "@/lib/authService";
import { BookDetail, getBookDetail } from "@/lib/books";
import { BookspotDTO, getActiveBookspots } from "@/lib/bookspotApi";
import { reverseGeocode, searchGeocodingSuggestions } from "@/lib/geocodingApi";
import {
  sendMessage as apiSendMessage,
  getChat as fetchChat,
  getMessages as fetchMessages,
  getTypingUsers,
  startTyping,
  stopTyping,
} from "@/lib/chatApi";
import {
  acceptExchange,
  acceptExchangeMeeting,
  completeExchangeMeeting,
  createExchangeMeeting,
  getExchangeByChatIdWithMatch,
  getMeetingByExchangeId,
  rejectExchange,
  rejectExchangeMeeting,
  reportExchange,
} from "@/lib/exchangeApi";
import {
  ChatDto,
  ChatParticipantDto,
  MessageDto,
  TypingUserDto,
} from "@/types/chat";
import { ExchangeMeetingDto, ExchangeMode, ExchangeWithMatchDto } from "@/types/exchange";

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCondition(condition?: BookDetail["condition"] | null): string {
  switch (condition) {
    case "LikeNew":
      return "Como nuevo";
    case "VeryGood":
      return "Muy bueno";
    case "Good":
      return "Bueno";
    case "Acceptable":
      return "Aceptable";
    case "Poor":
      return "Deteriorado";
    default:
      return "";
  }
}

function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function parseApiMeetingDate(dateStr: string): Date {
  const hasTimeZoneInfo = /(?:Z|[+-]\d{2}:\d{2})$/i.test(dateStr);
  return new Date(hasTimeZoneInfo ? dateStr : `${dateStr}Z`);
}

function formatMeetingDateLabel(dateStr: string): string {
  return parseApiMeetingDate(dateStr).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatMeetingTimeLabel(dateStr: string): string {
  return parseApiMeetingDate(dateStr).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

const MONTHS_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const WEEKDAYS_SHORT_ES = ["L", "M", "X", "J", "V", "S", "D"];

type LocationSuggestion = {
  id: string;
  label: string;
  lat: number;
  lon: number;
};

type UserLocation = {
  latitude: number;
  longitude: number;
};

type RankedBookspot = {
  id: number;
  nombre: string;
  addressText: string;
  latitude: number;
  longitude: number;
  distanceUser1Km: number;
  distanceUser2Km: number;
  furthestDistanceKm: number;
  fairnessGapKm: number;
  averageDistanceKm: number;
};

const toRadians = (value: number) => (value * Math.PI) / 180;

const haversineDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) => {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

const rankBookspotsByFairDistance = (
  bookspots: BookspotDTO[],
  user1Location: UserLocation,
  user2Location: UserLocation,
): RankedBookspot[] =>
  bookspots
    .map((bookspot) => {
      const distanceUser1Km = haversineDistanceKm(
        user1Location.latitude,
        user1Location.longitude,
        bookspot.latitude,
        bookspot.longitude,
      );
      const distanceUser2Km = haversineDistanceKm(
        user2Location.latitude,
        user2Location.longitude,
        bookspot.latitude,
        bookspot.longitude,
      );

      return {
        id: bookspot.id,
        nombre: bookspot.nombre,
        addressText: bookspot.addressText,
        latitude: bookspot.latitude,
        longitude: bookspot.longitude,
        distanceUser1Km,
        distanceUser2Km,
        furthestDistanceKm: Math.max(distanceUser1Km, distanceUser2Km),
        fairnessGapKm: Math.abs(distanceUser1Km - distanceUser2Km),
        averageDistanceKm: (distanceUser1Km + distanceUser2Km) / 2,
      };
    })
    .sort((a, b) => {
      if (a.furthestDistanceKm !== b.furthestDistanceKm) {
        return a.furthestDistanceKm - b.furthestDistanceKm;
      }
      if (a.fairnessGapKm !== b.fairnessGapKm) {
        if (a.averageDistanceKm !== b.averageDistanceKm) {
          return a.averageDistanceKm - b.averageDistanceKm;
        }
        return a.fairnessGapKm - b.fairnessGapKm;
      }
      return a.averageDistanceKm - b.averageDistanceKm;
    });

const formatDistanceKm = (distanceKm: number) => `${distanceKm.toFixed(1)} km`;

export default function ChatDetailScreen() {
  const { id, draft } = useLocalSearchParams<{ id: string; draft?: string }>();
  const chatId = parseInt(id ?? "0", 10);
  const router = useRouter();
  const { backendUserId, currentUserId, setBackendUserId } = useAuth();

  const hasHandled404 = useRef(false);
  const handleChatDeleted = useCallback(() => {
    if (!hasHandled404.current) {
      hasHandled404.current = true;
      if (Platform.OS === "web") {
        window.alert(
          "Chat no disponible: El otro usuario ha desestimado el intercambio o el chat ya no existe.",
        );
        router.replace("/(tabs)/chat");
      } else {
        Alert.alert(
          "Chat no disponible",
          "El otro usuario ha desestimado el intercambio o el chat ya no existe.",
          [{ text: "OK", onPress: () => router.replace("/(tabs)/chat") }],
        );
      }
    }
  }, [router]);

  const [chat, setChat] = useState<ChatDto | null>(null);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [inputText, setInputText] = useState(draft ?? "");
  const [typingUsers, setTypingUsers] = useState<TypingUserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [exchange, setExchange] = useState<ExchangeWithMatchDto | null>(null);
  const [exchangeMeeting, setExchangeMeeting] = useState<ExchangeMeetingDto | null>(null);
  const [myBook, setMyBook] = useState<BookDetail | null>(null);
  const [otherBook, setOtherBook] = useState<BookDetail | null>(null);
  const [otherUsername, setOtherUsername] = useState<string>("");
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    (() => Promise<void>) | null
  >(null);
  const [confirmMode, setConfirmMode] = useState<
    "accept" | "reject" | "meeting-accept" | "meeting-reject" | null
  >(null);
  const [meetingFormVisible, setMeetingFormVisible] = useState(false);
  const [meetingSubmitting, setMeetingSubmitting] = useState(false);
  const [meetingCompletionSubmitting, setMeetingCompletionSubmitting] = useState(false);
  const [isCounterProposalMode, setIsCounterProposalMode] = useState(false);
  const [meetingType, setMeetingType] = useState<MeetingType>("ARBITRARY");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [meetingLocation, setMeetingLocation] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoadingLocationSuggestions, setLoadingLocationSuggestions] = useState(false);
  const [locationSuggestionFeedback, setLocationSuggestionFeedback] = useState<string | null>(null);
  const [selectedLocationSuggestion, setSelectedLocationSuggestion] = useState<LocationSuggestion | null>(null);
  const [rankedBookspots, setRankedBookspots] = useState<RankedBookspot[]>([]);
  const [recommendedBookspots, setRecommendedBookspots] = useState<RankedBookspot[]>([]);
  const [selectedBookspot, setSelectedBookspot] = useState<RankedBookspot | null>(null);
  const [bookspotSearchQuery, setBookspotSearchQuery] = useState("");
  const [isLoadingBookspots, setIsLoadingBookspots] = useState(false);
  const [bookspotSuggestionFeedback, setBookspotSuggestionFeedback] = useState<string | null>(null);
  const [rankedBookdrops, setRankedBookdrops] = useState<RankedBookspot[]>([]);
  const [recommendedBookdrops, setRecommendedBookdrops] = useState<RankedBookspot[]>([]);
  const [selectedBookdrop, setSelectedBookdrop] = useState<RankedBookspot | null>(null);
  const [bookdropSearchQuery, setBookdropSearchQuery] = useState("");
  const [isLoadingBookdrops, setIsLoadingBookdrops] = useState(false);
  const [bookdropSuggestionFeedback, setBookdropSuggestionFeedback] = useState<string | null>(null);
  const [bookspotsById, setBookspotsById] = useState<Record<number, BookspotDTO>>({});
  const [customLocationAddressByKey, setCustomLocationAddressByKey] = useState<Record<string, string>>({});
  const locationRequestSeqRef = useRef(0);
  const locationCacheRef = useRef<Record<string, LocationSuggestion[]>>({});
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [isTimePickerVisible, setTimePickerVisible] = useState(false);
  const [webDatePanelVisible, setWebDatePanelVisible] = useState(false);
  const [webTimePanelVisible, setWebTimePanelVisible] = useState(false);
  const [webDateCursor, setWebDateCursor] = useState(new Date());
  const [webHourDraft, setWebHourDraft] = useState(new Date().getHours());
  const [webMinuteDraft, setWebMinuteDraft] = useState(
    Math.ceil(new Date().getMinutes() / 5) * 5 % 60,
  );

  type MeetingType = "ARBITRARY" | "BOOKSPOT" | "BOOKDROP";

  const formatMeetingDate = (value: Date) =>
    value.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const formatMeetingTime = (value: Date) =>
    value.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

  const handleDateConfirm = (value: Date) => {
    setMeetingDate(formatMeetingDate(value));
    setDatePickerVisible(false);
  };

  const handleTimeConfirm = (value: Date) => {
    setMeetingTime(formatMeetingTime(value));
    setTimePickerVisible(false);
  };

  const parseMeetingDate = (value: string): Date | null => {
    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return null;
    const [, dd, mm, yyyy] = match;
    const parsed = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const parseMeetingTime = (value: string): { hour: number; minute: number } | null => {
    const match = value.match(/^(\d{2}):(\d{2})$/);
    if (!match) return null;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return { hour, minute };
  };

  const isSameCalendarDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const pad2 = (value: number) => value.toString().padStart(2, "0");
  const MIN_MEETING_LEAD_MINUTES = 5;

  const getCustomLocationKey = (coords: number[]) => {
    if (!Array.isArray(coords) || coords.length < 2) return null;
    const [lon, lat] = coords;
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
    return `${lon.toFixed(6)},${lat.toFixed(6)}`;
  };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const selectedDate = parseMeetingDate(meetingDate);

  const buildCalendarCells = () => {
    const year = webDateCursor.getFullYear();
    const month = webDateCursor.getMonth();

    // Convert JS week start (Sunday=0) to Monday-based index.
    const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: Array<{
      date: Date;
      inCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      disabled: boolean;
    }> = [];

    for (let i = firstWeekday - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, daysInPrevMonth - i);
      cells.push({
        date: d,
        inCurrentMonth: false,
        isToday: d.getTime() === todayStart.getTime(),
        isSelected: !!selectedDate && d.toDateString() === selectedDate.toDateString(),
        disabled: d < todayStart,
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      cells.push({
        date: d,
        inCurrentMonth: true,
        isToday: d.getTime() === todayStart.getTime(),
        isSelected: !!selectedDate && d.toDateString() === selectedDate.toDateString(),
        disabled: d < todayStart,
      });
    }

    while (cells.length < 42) {
      const nextDay = cells.length - (firstWeekday + daysInMonth) + 1;
      const d = new Date(year, month + 1, nextDay);
      cells.push({
        date: d,
        inCurrentMonth: false,
        isToday: d.getTime() === todayStart.getTime(),
        isSelected: !!selectedDate && d.toDateString() === selectedDate.toDateString(),
        disabled: d < todayStart,
      });
    }

    return cells;
  };

  const calendarCells = buildCalendarCells();

  const buildMeetingDateTime = (): Date | null => {
    const parsedDate = parseMeetingDate(meetingDate);
    const parsedTime = parseMeetingTime(meetingTime);
    if (!parsedDate || !parsedTime) return null;

    return new Date(
      parsedDate.getFullYear(),
      parsedDate.getMonth(),
      parsedDate.getDate(),
      parsedTime.hour,
      parsedTime.minute,
      0,
      0,
    );
  };

  const getTodayMinAllowedDateTime = () => {
    const min = new Date();
    min.setMinutes(min.getMinutes() + MIN_MEETING_LEAD_MINUTES);
    min.setSeconds(0, 0);
    return min;
  };

  const hasAvailableMinutesToday = () => {
    const selected = parseMeetingDate(meetingDate);
    const now = new Date();
    if (!selected || !isSameCalendarDay(selected, now)) return true;

    const endOfToday = new Date(
      selected.getFullYear(),
      selected.getMonth(),
      selected.getDate(),
      23,
      59,
      59,
      999,
    );
    return endOfToday >= getTodayMinAllowedDateTime();
  };

  const isWebTimeOptionDisabled = (hour: number, minute: number) => {
    const selected = parseMeetingDate(meetingDate);
    if (!selected) return false;

    const now = new Date();
    if (!isSameCalendarDay(selected, now)) return false;

    const candidate = new Date(
      selected.getFullYear(),
      selected.getMonth(),
      selected.getDate(),
      hour,
      minute,
      0,
      0,
    );

    return candidate < getTodayMinAllowedDateTime();
  };

  const getSameDayMinTimeLabel = () => {
    const selected = parseMeetingDate(meetingDate);
    const now = new Date();
    if (!selected || !isSameCalendarDay(selected, now)) return null;

    const min = getTodayMinAllowedDateTime();
    if (!isSameCalendarDay(min, selected)) return null;
    return `${pad2(min.getHours())}:${pad2(min.getMinutes())}`;
  };

  const validateMeetingDateTime = () => {
    const scheduledAt = buildMeetingDateTime();
    if (!scheduledAt) {
      setError("Debes indicar fecha y hora válidas para el encuentro.");
      return false;
    }

    const now = new Date();
    const minToday = getTodayMinAllowedDateTime();

    if (isSameCalendarDay(scheduledAt, now) && scheduledAt < minToday) {
      setError("Si propones para hoy, la hora debe ser al menos 5 minutos posterior a la actual.");
      return false;
    }

    if (scheduledAt <= now) {
      setError("La fecha y hora del encuentro debe ser posterior a la actual.");
      return false;
    }

    return true;
  };

  const openDateSelector = () => {
    if (Platform.OS === "web") {
      const current = parseMeetingDate(meetingDate);
      setWebDateCursor(current ?? new Date());
      setWebDatePanelVisible((prev) => !prev);
      setWebTimePanelVisible(false);
      return;
    }

    setDatePickerVisible(true);
  };

  const openTimeSelector = () => {
    const selectedDate = parseMeetingDate(meetingDate);
    const now = new Date();

    if (selectedDate && isSameCalendarDay(selectedDate, now) && !hasAvailableMinutesToday()) {
      setError("Para hoy ya no quedan horas disponibles. Elige una fecha posterior.");
      setWebTimePanelVisible(false);
      setTimePickerVisible(false);
      return;
    }

    if (Platform.OS === "web") {
      const parsed = parseMeetingTime(meetingTime);
      const minToday = getTodayMinAllowedDateTime();

      let initialHour = parsed?.hour ?? now.getHours();
      let initialMinute = parsed?.minute ?? now.getMinutes();

      if (selectedDate && isSameCalendarDay(selectedDate, now)) {
        const initialCandidate = new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate(),
          initialHour,
          initialMinute,
          0,
          0,
        );

        if (initialCandidate < minToday) {
          initialHour = minToday.getHours();
          initialMinute = minToday.getMinutes();
        }
      }

      setWebHourDraft(initialHour);
      setWebMinuteDraft(initialMinute);
      setWebTimePanelVisible((prev) => !prev);
      setWebDatePanelVisible(false);
      return;
    }

    setTimePickerVisible(true);
  };

  const closeMeetingForm = () => {
    setMeetingFormVisible(false);
    setIsCounterProposalMode(false);
  };

  const submitMeetingProposal = async () => {
    if (!validateMeetingDateTime()) return;
    if (!exchange) {
      setError("No se pudo identificar el intercambio para crear la propuesta.");
      return;
    }
    if (meetingSubmitting) return;

    if (meetingType === "ARBITRARY" && !meetingLocation.trim()) {
      setError("Debes indicar una ubicación para el encuentro.");
      return;
    }

    if (meetingType === "ARBITRARY" && !selectedLocationSuggestion) {
      setError("Selecciona una ubicación válida desde las sugerencias.");
      return;
    }

    if (meetingType === "BOOKSPOT" && !selectedBookspot) {
      setError("Selecciona un BookSpot recomendado o busca uno manualmente.");
      return;
    }

    if (meetingType === "BOOKDROP" && !selectedBookdrop) {
      setError("Selecciona uno de los BookDrops recomendados.");
      return;
    }

    const scheduledAt = buildMeetingDateTime();
    if (!scheduledAt) {
      setError("Debes indicar fecha y hora válidas para el encuentro.");
      return;
    }

    const payload = {
      exchangeId: exchange.exchangeId,
      exchangeMode:
        (meetingType === "ARBITRARY"
          ? "CUSTOM"
          : meetingType) as ExchangeMode,
      bookspotId:
        meetingType === "BOOKSPOT"
          ? (selectedBookspot?.id ?? null)
          : meetingType === "BOOKDROP"
            ? (selectedBookdrop?.id ?? null)
            : null,
      customLocation:
        meetingType === "ARBITRARY" && selectedLocationSuggestion
          ? [selectedLocationSuggestion.lon, selectedLocationSuggestion.lat]
          : null,
      scheduledAt: scheduledAt.toISOString(),
    };

    try {
      setMeetingSubmitting(true);
      setError(null);

      if (isCounterProposalMode && exchangeMeeting) {
        await rejectExchangeMeeting(exchangeMeeting.exchangeMeetingId);
      }

      const createdMeeting = await createExchangeMeeting(payload);
      setExchangeMeeting(createdMeeting);

      closeMeetingForm();
      Alert.alert("Propuesta enviada", "Tu propuesta de quedada se ha enviado correctamente.");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo guardar la propuesta de quedada.";
      setError(message);
    } finally {
      setMeetingSubmitting(false);
    }
  };

  const currentDistanceInfoForBookspot = useCallback(
    (spot: RankedBookspot) => {
      if (!exchange || !backendUserId) {
        return {
          myDistanceKm: spot.distanceUser1Km,
          otherDistanceKm: spot.distanceUser2Km,
        };
      }

      const iAmUser1 = exchange.user1Id === backendUserId;
      return {
        myDistanceKm: iAmUser1 ? spot.distanceUser1Km : spot.distanceUser2Km,
        otherDistanceKm: iAmUser1 ? spot.distanceUser2Km : spot.distanceUser1Km,
      };
    },
    [backendUserId, exchange],
  );

  const handleSelectBookspot = (spot: RankedBookspot) => {
    setSelectedBookspot(spot);
    setMeetingLocation(spot.addressText);
    setSelectedLocationSuggestion(null);
    setError(null);
  };

  const searchLocationSuggestions = useCallback(async (query: string) => {
    const trimmed = query.trim();

    if (trimmed.length < 3) {
      setLocationSuggestions([]);
      setLocationSuggestionFeedback(null);
      setLoadingLocationSuggestions(false);
      return;
    }

    const normalizedQuery = trimmed.toLowerCase();

    if (locationCacheRef.current[normalizedQuery]) {
      const cached = locationCacheRef.current[normalizedQuery];
      setLocationSuggestions(cached);
      setLocationSuggestionFeedback(cached.length === 0 ? "No se encontraron ubicaciones para ese texto." : null);
      setLoadingLocationSuggestions(false);
      return;
    }

    const requestSeq = ++locationRequestSeqRef.current;

    try {
      setLoadingLocationSuggestions(true);
      setLocationSuggestionFeedback(null);

      const mapped = await searchGeocodingSuggestions(trimmed, 5);

      locationCacheRef.current[normalizedQuery] = mapped;

      setLocationSuggestions(mapped);
      setLocationSuggestionFeedback(mapped.length === 0 ? "No se encontraron ubicaciones para ese texto." : null);
    } catch {
      if (requestSeq !== locationRequestSeqRef.current) return;
      setLocationSuggestionFeedback("No se pudieron cargar sugerencias. Revisa conexión e inténtalo de nuevo.");
    } finally {
      if (requestSeq === locationRequestSeqRef.current) {
        setLoadingLocationSuggestions(false);
      }
    }
  }, []);

  useEffect(() => {
    if (meetingType !== "ARBITRARY") {
      setLocationSuggestions([]);
      setLoadingLocationSuggestions(false);
      return;
    }

    const handler = setTimeout(() => {
      searchLocationSuggestions(meetingLocation);
    }, 350);

    return () => clearTimeout(handler);
  }, [meetingLocation, meetingType, searchLocationSuggestions]);

  useEffect(() => {
    if (meetingType !== "BOOKSPOT") {
      setBookspotSearchQuery("");
      setBookspotSuggestionFeedback(null);
      return;
    }

    if (!exchange) {
      setBookspotSuggestionFeedback("No se pudo obtener el intercambio para sugerir BookSpots.");
      return;
    }

    let cancelled = false;

    const loadBookspotSuggestions = async () => {
      try {
        setIsLoadingBookspots(true);
        setBookspotSuggestionFeedback(null);

        const [user1Prefs, user2Prefs, activeBookspots] = await Promise.all([
          authService.getPreferences(exchange.user1Id),
          authService.getPreferences(exchange.user2Id),
          getActiveBookspots(),
        ]);

        if (cancelled) return;

        const user1Location = user1Prefs?.location;
        const user2Location = user2Prefs?.location;

        if (!user1Location || !user2Location) {
          setRankedBookspots([]);
          setRecommendedBookspots([]);
          setBookspotSuggestionFeedback(
            "No hay ubicación suficiente de ambos usuarios para calcular sugerencias equitativas.",
          );
          return;
        }

        const ranked = rankBookspotsByFairDistance(
          activeBookspots,
          user1Location,
          user2Location,
        );
        setRankedBookspots(ranked);
        setRecommendedBookspots(ranked.slice(0, 5));

        if (ranked.length === 0) {
          setBookspotSuggestionFeedback("No hay BookSpots activos disponibles en este momento.");
          return;
        }

        if (selectedBookspot) {
          const refreshedSelection = ranked.find((spot) => spot.id === selectedBookspot.id) ?? null;
          setSelectedBookspot(refreshedSelection);
        }
      } catch {
        if (cancelled) return;
        setRankedBookspots([]);
        setRecommendedBookspots([]);
        setBookspotSuggestionFeedback("No se pudieron cargar los BookSpots. Intentalo de nuevo.");
      } finally {
        if (!cancelled) {
          setIsLoadingBookspots(false);
        }
      }
    };

    loadBookspotSuggestions();

    return () => {
      cancelled = true;
    };
  }, [exchange, meetingType]);

  useEffect(() => {
    if (meetingType !== "BOOKDROP") {
      setBookdropSearchQuery("");
      setBookdropSuggestionFeedback(null);
      return;
    }

    if (!exchange) {
      setBookdropSuggestionFeedback("No se pudo obtener el intercambio para sugerir BookDrops.");
      return;
    }

    let cancelled = false;

    const loadBookdropSuggestions = async () => {
      try {
        setIsLoadingBookdrops(true);
        setBookdropSuggestionFeedback(null);

        const [user1Prefs, user2Prefs, activeBookspots] = await Promise.all([
          authService.getPreferences(exchange.user1Id),
          authService.getPreferences(exchange.user2Id),
          getActiveBookspots(),
        ]);

        if (cancelled) return;

        const user1Location = user1Prefs?.location;
        const user2Location = user2Prefs?.location;

        if (!user1Location || !user2Location) {
          setRankedBookdrops([]);
          setRecommendedBookdrops([]);
          setBookdropSuggestionFeedback(
            "No hay ubicación suficiente de ambos usuarios para calcular sugerencias de BookDrop.",
          );
          return;
        }

        const onlyBookdrops = activeBookspots.filter((spot) => spot.isBookdrop);
        const ranked = rankBookspotsByFairDistance(
          onlyBookdrops,
          user1Location,
          user2Location,
        );
        setRankedBookdrops(ranked);
        setRecommendedBookdrops(ranked.slice(0, 5));

        if (ranked.length === 0) {
          setBookdropSuggestionFeedback("No hay BookDrops activos disponibles en este momento.");
          return;
        }

        if (selectedBookdrop) {
          const refreshedSelection = ranked.find((drop) => drop.id === selectedBookdrop.id) ?? null;
          setSelectedBookdrop(refreshedSelection);
        }
      } catch {
        if (cancelled) return;
        setRankedBookdrops([]);
        setRecommendedBookdrops([]);
        setBookdropSuggestionFeedback("No se pudieron cargar los BookDrops. Intentalo de nuevo.");
      } finally {
        if (!cancelled) {
          setIsLoadingBookdrops(false);
        }
      }
    };

    loadBookdropSuggestions();

    return () => {
      cancelled = true;
    };
  }, [exchange, meetingType]);

  const handleSelectBookdrop = (bookdrop: RankedBookspot) => {
    setSelectedBookdrop(bookdrop);
    setMeetingLocation(bookdrop.addressText);
    setSelectedLocationSuggestion(null);
    setError(null);
  };

  const filteredBookspotSearchResults = useMemo(() => {
    const normalizedQuery = bookspotSearchQuery.trim().toLowerCase();
    if (normalizedQuery.length < 2) return [];

    return rankedBookspots
      .filter((spot) => {
        const haystack = `${spot.nombre} ${spot.addressText}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      })
      .slice(0, 10);
  }, [bookspotSearchQuery, rankedBookspots]);

  const filteredBookdropSearchResults = useMemo(() => {
    const normalizedQuery = bookdropSearchQuery.trim().toLowerCase();
    if (normalizedQuery.length < 2) return [];

    return rankedBookdrops
      .filter((drop) => {
        const haystack = `${drop.nombre} ${drop.addressText}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      })
      .slice(0, 10);
  }, [bookdropSearchQuery, rankedBookdrops]);

  const handleLocationInputChange = (value: string) => {
    setMeetingLocation(value);
    setSelectedLocationSuggestion(null);
    if (value.trim().length === 0) {
      setLocationSuggestions([]);
      setLocationSuggestionFeedback(null);
    }
    if (error) setError(null);
  };

  const handleSelectLocationSuggestion = (suggestion: LocationSuggestion) => {
    setMeetingLocation(suggestion.label);
    setSelectedLocationSuggestion(suggestion);
    setLocationSuggestions([]);
    setLocationSuggestionFeedback(null);
    setError(null);
  };

  const moveCalendarMonth = (delta: number) => {
    setWebDateCursor((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  const pickCalendarDate = (date: Date, disabled: boolean) => {
    if (disabled) return;
    setMeetingDate(formatMeetingDate(date));
    setWebDateCursor(new Date(date.getFullYear(), date.getMonth(), 1));
    setWebDatePanelVisible(false);
    setError(null);
  };

  const applyWebTimeSelection = () => {
    if (isWebTimeOptionDisabled(webHourDraft, webMinuteDraft)) {
      setError("Para hoy, elige una hora al menos 5 minutos posterior a la actual.");
      return;
    }

    setMeetingTime(`${pad2(webHourDraft)}:${pad2(webMinuteDraft)}`);
    setWebTimePanelVisible(false);
    setError(null);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Cargar chat y mensajes en paralelo
      const [chatData, messagesData] = await Promise.all([
        fetchChat(chatId),
        fetchMessages(chatId),
      ]);

      setChat(chatData);

      // Resolver backendUserId si aún no se ha resuelto para que la
      // comparación senderId === currentUserId funcione correctamente.
      if (!backendUserId) {
        try {
          const me = await fetchMyBackendUser();
          if (me?.id) {
            setBackendUserId(me.id);
          }
        } catch {
          // Si falla, seguimos con el flujo normal
        }
      }

      const exchangeData = await getExchangeByChatIdWithMatch(chatId);
      if (!exchangeData && chatData.type !== "COMMUNITY") {
        throw new Error("404: Exchange no encontrado");
      }
      setExchange(exchangeData);

      if (exchangeData) {
        const meetingData = await getMeetingByExchangeId(exchangeData.exchangeId);
        setExchangeMeeting(meetingData);
      } else {
        setExchangeMeeting(null);
      }

      // Ordenar mensajes cronológicamente (más antiguos primero)
      const sorted = [...messagesData].sort(
        (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
      );
      setMessages(sorted);
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message.includes("404") || err.message.includes("403"))
      ) {
        handleChatDeleted();
        return;
      }
      setError(err instanceof Error ? err.message : "Error al cargar el chat");
    } finally {
      setLoading(false);
    }
  }, [chatId, router]);

  // Polling: recargar mensajes cada 3 segundos para ver actualizaciones
  const refreshMessages = useCallback(async () => {
    try {
      const messagesData = await fetchMessages(chatId);
      const sorted = [...messagesData].sort(
        (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
      );
      setMessages(sorted);
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message.includes("404") || err.message.includes("403"))
      ) {
        handleChatDeleted();
      }
      // Silenciar errores de polling
    }
  }, [chatId, router]);

  const refreshTyping = useCallback(async () => {
    try {
      const users = await getTypingUsers(chatId);
      // Filter out our own user
      setTypingUsers(
        users.filter(
          (u) => u.userId !== backendUserId && u.userId !== currentUserId,
        ),
      );
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message.includes("404") || err.message.includes("403"))
      ) {
        handleChatDeleted();
      }
      // Silenciar errores de polling de typing
    }
  }, [chatId, backendUserId, currentUserId, router]);

  useEffect(() => {
    loadData();
    refreshTyping();
  }, [loadData, refreshTyping]);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshMessages();
      refreshTyping();
    }, 3000);
    return () => clearInterval(interval);
  }, [refreshMessages, refreshTyping]);

  useEffect(() => {
    return () => {
      if (isTypingRef.current) {
        stopTyping(chatId).catch(() => {});
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [chatId]);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => {});
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {});
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    const loadExchangeBooks = async () => {
      if (!exchange || !backendUserId) return;

      try {
        // Determinar si es user1 o user2
        const isUser1 = backendUserId === exchange.user1Id;

        const myBookId = isUser1 ? exchange.book1Id : exchange.book2Id;
        const otherBookId = isUser1 ? exchange.book2Id : exchange.book1Id;

        const [myBookData, otherBookData] = await Promise.all([
          getBookDetail(myBookId),
          getBookDetail(otherBookId),
        ]);

        setMyBook(myBookData);
        setOtherBook(otherBookData);

        // Sacar nombre del otro usuario del chat
        const otherParticipant = chat?.participants.find(
          (p) => p.userId !== backendUserId,
        );
        setOtherUsername(otherParticipant?.username ?? "la otra persona");
      } catch (e) {
        console.error("Error cargando libros del intercambio", e);
      }
    };
    loadExchangeBooks();
  }, [exchange, backendUserId, chat]);

  useEffect(() => {
    const bookspotId = exchangeMeeting?.bookspotId;
    if (!bookspotId) return;

    let cancelled = false;

    const loadBookspotsById = async () => {
      try {
        const activeBookspots = await getActiveBookspots();
        if (cancelled) return;

        setBookspotsById((prev) => {
          if (prev[bookspotId]) return prev;

          const next = { ...prev };
          activeBookspots.forEach((spot) => {
            next[spot.id] = spot;
          });
          return next;
        });
      } catch {
        // Si falla, mantenemos fallback con el identificador.
      }
    };

    loadBookspotsById();

    return () => {
      cancelled = true;
    };
  }, [exchangeMeeting?.bookspotId]);

  useEffect(() => {
    if (!exchangeMeeting || exchangeMeeting.exchangeMode !== "CUSTOM") return;
    if (!exchangeMeeting.customLocation || exchangeMeeting.customLocation.length < 2) return;

    const [lon, lat] = exchangeMeeting.customLocation;
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;

    const locationKey = getCustomLocationKey(exchangeMeeting.customLocation);
    if (!locationKey || customLocationAddressByKey[locationKey]) return;

    let cancelled = false;

    const reverseGeocodeCustomLocation = async () => {
      try {
        const displayName = await reverseGeocode(lat, lon);
        if (!displayName || cancelled) return;

        setCustomLocationAddressByKey((prev) => ({
          ...prev,
          [locationKey]: displayName,
        }));
      } catch {
        // Si falla el reverse geocoding, mantenemos fallback con coordenadas.
      }
    };

    reverseGeocodeCustomLocation();

    return () => {
      cancelled = true;
    };
  }, [exchangeMeeting, customLocationAddressByKey]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#e4715f" />
      </View>
    );
  }

  if (!chat) {
    return (
      <View style={styles.centered}>
        <Text
          style={{ color: "#6B7280", marginBottom: 12, textAlign: "center" }}
        >
          {error ?? "Chat no encontrado"}
        </Text>
        <Pressable onPress={loadData}>
          <Text style={{ color: "#e4715f", fontWeight: "600" }}>
            Reintentar
          </Text>
        </Pressable>
      </View>
    );
  }

  // Título del header
  let headerTitle: string;
  if (chat.type === 'COMMUNITY') {
    headerTitle = chat.name ?? 'Comunidad';
  } else {
    const other = chat.participants.find((p) => p.userId !== currentUserId);
    headerTitle = other?.username ?? "Chat";
  }

  // Buscar info del sender de un mensaje
  const getSender = (senderId: string): ChatParticipantDto | undefined =>
    chat.participants.find((p) => p.userId === senderId);

  const handleInputChange = (text: string) => {
    setInputText(text);

    if (!isTypingRef.current && text.trim().length > 0) {
      isTypingRef.current = true;
      startTyping(chatId).catch(() => {});
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (text.trim().length === 0) {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        stopTyping(chatId).catch(() => {});
      }
    } else {
      typingTimeoutRef.current = setTimeout(() => {
        isTypingRef.current = false;
        stopTyping(chatId).catch(() => {});
      }, 3000);
    }
  };

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || sending) return;

    if (isTypingRef.current) {
      isTypingRef.current = false;
      stopTyping(chatId).catch(() => {});
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }

    // Mensaje optimista
    const optimisticMessage: MessageDto = {
      id: Date.now(),
      chatId: chatId,
      senderId: currentUserId ?? "",
      senderUsername: "",
      body: trimmed,
      sentAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInputText("");
    setSending(true);

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const sentMessage = await apiSendMessage(chatId, trimmed);
      // Si no teníamos el userId, ahora lo sabemos por el senderId del mensaje enviado
      if (!backendUserId && sentMessage.senderId) {
        setBackendUserId(sentMessage.senderId);
      }
      // Reemplazar mensaje optimista con el real
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticMessage.id ? sentMessage : m)),
      );
      // Forzar scroll al final tras enviar
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message.includes("404") || err.message.includes("403"))
      ) {
        handleChatDeleted();
        return;
      }
      // Remover mensaje optimista en caso de error
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
    } finally {
      setSending(false);
    }
  };

  // Agrupar mensajes por día para mostrar separadores de fecha
  const getDateKey = (dateStr: string) => new Date(dateStr).toDateString();

  const renderMessage = ({
    item,
    index,
  }: {
    item: MessageDto;
    index: number;
  }) => {
    const isOwn =
      (currentUserId && item.senderId === currentUserId) ||
      (!currentUserId && item.id > 1_000_000_000_000); // optimistic messages use Date.now() as id
    const sender = getSender(item.senderId);
    const showSenderName = chat.type === "COMMUNITY" && !isOwn;

    // Mostrar separador de fecha si es el primer mensaje del día
    const showDateHeader =
      index === 0 ||
      getDateKey(item.sentAt) !== getDateKey(messages[index - 1].sentAt);

    return (
      <>
        {showDateHeader && (
          <View style={styles.dateHeaderContainer}>
            <Text style={styles.dateHeaderText}>
              {formatDateHeader(item.sentAt)}
            </Text>
          </View>
        )}

        <View
          style={[
            styles.messageRow,
            isOwn ? styles.messageRowOwn : styles.messageRowOther,
          ]}
        >
          {/* Avatar solo para mensajes de otros en chats de comunidad */}
          {showSenderName && (
            <View style={styles.messageAvatarContainer}>
              {sender?.profilePhoto ? (
                <Image
                  source={{ uri: sender.profilePhoto }}
                  style={styles.messageAvatar}
                />
              ) : (
                <View style={styles.messageAvatarPlaceholder}>
                  <Text style={styles.messageAvatarText}>
                    {sender?.username?.charAt(0) ?? "?"}
                  </Text>
                </View>
              )}
            </View>
          )}

          <View
            style={[
              styles.messageBubble,
              isOwn ? styles.bubbleOwn : styles.bubbleOther,
            ]}
          >
            {showSenderName && (
              <Text style={styles.senderName}>
                {sender?.username ?? "Usuario"}
              </Text>
            )}
            <Text
              style={[
                styles.messageText,
                isOwn ? styles.messageTextOwn : styles.messageTextOther,
              ]}
            >
              {item.body}
            </Text>
            <Text
              style={[
                styles.messageTime,
                isOwn ? styles.messageTimeOwn : styles.messageTimeOther,
              ]}
            >
              {formatMessageTime(item.sentAt)}
            </Text>
          </View>
        </View>
      </>
    );
  };

  // Acepta el intercambio por parte del usuario actual
  const handleAcceptExchange = async () => {
    if (!exchange?.exchangeId) return;
    setError(null);
    try {
      const updated = await acceptExchange(exchange.exchangeId);
      setExchange((prev) =>
        prev
          ? {
              ...prev, // mantiene user1Id, user2Id, book1Id, book2Id...
              ...updated, // pisa status, updatedAt, etc. con lo que venga del backend
            }
          : updated,
      );
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message.includes("404") || err.message.includes("403"))
      ) {
        handleChatDeleted();
        return;
      }
      const backendMsg =
        err instanceof Error ? err.message : "Error al aceptar el intercambio";
      setError(`No se pudo aceptar el intercambio: ${backendMsg}`);
    }
  };

  // Desestima el intercambio
  const handleRejectExchange = async () => {
    if (!exchange?.exchangeId) return;
    setError(null);
    try {
      const updated = await rejectExchange(exchange.exchangeId);
      setExchange(updated);

      // Como el backend ahora borra el chat al desestimar el intercambio,
      // salimos de esta pantalla para evitar errores 404 al intentar refrescar.
      router.replace("/(tabs)/chat");
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message.includes("404") || err.message.includes("403"))
      ) {
        handleChatDeleted();
        return;
      }
      const msg =
        err instanceof Error
          ? err.message
          : "Error al desestimar el intercambio";
      setError(msg);
    }
  };

  const getAcceptButtonState = () => {
    if (!exchange || !backendUserId) {
      return {
        label: "Aceptar",
        bgColor: "#e76541",
        textColor: "#ffffff",
        disabled: true,
      };
    }

    const otherParticipant = chat?.participants.find(
      (p) => p.userId !== backendUserId,
    );

    const iAmUser1 = exchange.user1Id === backendUserId;
    const iAmUser2 = exchange.user2Id === backendUserId;

    // Ambos aceptados
    if (exchange.status === "ACCEPTED") {
      return {
        label: "Intercambio aceptado",
        bgColor: "#16a34a",
        textColor: "#ffffff",
        disabled: true,
      };
    }

    // User1 ha aceptado, pero 2 no
    if (
      (exchange.status === "ACCEPTED_BY_1" && iAmUser1) ||
      (exchange.status === "ACCEPTED_BY_2" && iAmUser2)
    ) {
      return {
        label: `Esperando confirmación...`,
        bgColor: "#fbbf24",
        textColor: "#1f2937",
        disabled: true,
      };
    }

    // User2 ha aceptado, pero 1 no
    if (
      (exchange.status === "ACCEPTED_BY_1" && iAmUser2) ||
      (exchange.status === "ACCEPTED_BY_2" && iAmUser1)
    ) {
      return {
        label: "Aceptar intercambio",
        bgColor: "#e76541",
        textColor: "#ffffff",
        disabled: false,
      };
    }

    // NEGOTIATING
    return {
      label: "Aceptar intercambio",
      bgColor: "#e76541",
      textColor: "#ffffff",
      disabled: false,
    };
  };

  const acceptBtn = getAcceptButtonState();
  const showExchangeActions =
    !!exchange &&
    exchange.status !== "REJECTED" &&
    exchange.status !== "INCIDENT" &&
    exchange.status !== "COMPLETED";
  const canProposeMeeting =
    exchange?.status === "ACCEPTED" &&
    (!exchangeMeeting || exchangeMeeting.meetingStatus === "REFUSED");
  const hasMeetingProposal = exchangeMeeting?.meetingStatus === "PROPOSAL";
  const hasMeetingAccepted = exchangeMeeting?.meetingStatus === "ACCEPTED";
  const isMeetingProposalReceived =
    !!exchangeMeeting &&
    hasMeetingProposal &&
    !!backendUserId &&
    exchangeMeeting.proposerId !== backendUserId;
  const isMeetingProposalSent =
    !!exchangeMeeting &&
    hasMeetingProposal &&
    !!backendUserId &&
    exchangeMeeting.proposerId === backendUserId;
  const canShowMeetingCompletionBanner =
    !!exchangeMeeting &&
    hasMeetingAccepted &&
    exchange?.status === "ACCEPTED";
  const isCurrentUserMeetingProposer =
    !!exchangeMeeting && !!backendUserId && exchangeMeeting.proposerId === backendUserId;
  const hasCurrentUserMarkedExchangeCompleted =
    !!exchangeMeeting &&
    (isCurrentUserMeetingProposer
      ? exchangeMeeting.markAsCompletedByUser1
      : exchangeMeeting.markAsCompletedByUser2);
  const hasOtherUserMarkedExchangeCompleted =
    !!exchangeMeeting &&
    (isCurrentUserMeetingProposer
      ? exchangeMeeting.markAsCompletedByUser2
      : exchangeMeeting.markAsCompletedByUser1);

  const resolveMeetingLocation = (meeting: ExchangeMeetingDto) => {
    const selectedBookspot =
      meeting.bookspotId != null ? bookspotsById[meeting.bookspotId] : null;

    if (meeting.exchangeMode === "BOOKSPOT") {
      const spotName =
        selectedBookspot?.nombre ??
        (meeting.bookspotId ? `#${meeting.bookspotId}` : "sin identificar");
      return {
        title: `BookSpot · ${spotName}`,
        subtitle: selectedBookspot?.addressText ?? "Punto de encuentro en BookSpot",
      };
    }

    if (meeting.exchangeMode === "BOOKDROP") {
      const dropName =
        selectedBookspot?.nombre ??
        (meeting.bookspotId ? `#${meeting.bookspotId}` : "sin identificar");
      return {
        title: `BookDrop · ${dropName}`,
        subtitle: selectedBookspot?.addressText ?? "Punto de entrega en BookDrop",
      };
    }

    if (meeting.customLocation && meeting.customLocation.length >= 2) {
      const [lon, lat] = meeting.customLocation;
      const locationKey = getCustomLocationKey(meeting.customLocation);
      const resolvedAddress = locationKey ? customLocationAddressByKey[locationKey] : null;

      if (resolvedAddress) {
        return {
          title: "Ubicación personalizada",
          subtitle: resolvedAddress,
        };
      }

      return {
        title: "Ubicación personalizada",
        subtitle: `Dirección no disponible · Lat ${lat.toFixed(4)} · Lon ${lon.toFixed(4)}`,
      };
    }

    return {
      title: "Ubicación personalizada",
      subtitle: "Dirección definida por la otra persona",
    };
  };

  const handleAcceptMeetingProposal = async () => {
    if (!exchangeMeeting || meetingSubmitting) return;

    try {
      setMeetingSubmitting(true);
      setError(null);
      const accepted = await acceptExchangeMeeting(exchangeMeeting.exchangeMeetingId);
      setExchangeMeeting(accepted);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo aceptar la propuesta.";
      setError(message);
    } finally {
      setMeetingSubmitting(false);
    }
  };

  const handleRejectMeetingProposal = async () => {
    if (!exchangeMeeting || meetingSubmitting) return;

    try {
      setMeetingSubmitting(true);
      setError(null);
      await rejectExchangeMeeting(exchangeMeeting.exchangeMeetingId);
      setExchangeMeeting(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo rechazar la propuesta.";
      setError(message);
    } finally {
      setMeetingSubmitting(false);
    }
  };

  const handleCounterProposeMeeting = () => {
    if (!exchangeMeeting || !exchangeMeeting.scheduledAt) return;

    const scheduled = parseApiMeetingDate(exchangeMeeting.scheduledAt);
    setMeetingDate(formatMeetingDate(scheduled));
    setMeetingTime(formatMeetingTime(scheduled));

    if (exchangeMeeting.exchangeMode === "BOOKSPOT") {
      setMeetingType("BOOKSPOT");
    } else if (exchangeMeeting.exchangeMode === "BOOKDROP") {
      setMeetingType("BOOKDROP");
    } else {
      setMeetingType("ARBITRARY");
      setMeetingLocation("Ubicación personalizada");
      setSelectedLocationSuggestion(null);
    }

    setIsCounterProposalMode(true);
    setMeetingFormVisible(true);
  };

  const handleCompleteExchangeAfterMeeting = async () => {
    if (!exchangeMeeting || meetingCompletionSubmitting) return;

    try {
      setMeetingCompletionSubmitting(true);
      setError(null);

      const updatedMeeting = await completeExchangeMeeting(exchangeMeeting.exchangeMeetingId);
      setExchangeMeeting(updatedMeeting);

      if (updatedMeeting.markAsCompletedByUser1 && updatedMeeting.markAsCompletedByUser2) {
        setExchange((prev) =>
          prev
            ? {
                ...prev,
                status: "COMPLETED",
                updatedAt: new Date().toISOString(),
              }
            : prev,
        );
      }

      // Sync after completion to avoid stale UI when backend flags are updated.
      try {
        const refreshedMeeting = await getMeetingByExchangeId(updatedMeeting.exchangeId);
        if (refreshedMeeting) {
          setExchangeMeeting(refreshedMeeting);
        }
      } catch {
        // Keep optimistic state if refresh fails.
      }

      if (exchange?.exchangeId) {
        try {
          const updatedExchange = await getExchangeByChatIdWithMatch(chatId);
          if (updatedExchange) {
            setExchange(updatedExchange);
          }
        } catch {
          // Keep local optimistic exchange state when refresh fails.
        }
      }
    } catch (err) {
      // Some backend flows may persist completion but fail while building response.
      // Try to recover from source of truth before surfacing an error banner.
      let recovered = false;
      try {
        const recoveredMeeting = await getMeetingByExchangeId(exchangeMeeting.exchangeId);
        if (recoveredMeeting) {
          setExchangeMeeting(recoveredMeeting);
          recovered = true;

          if (
            recoveredMeeting.markAsCompletedByUser1 &&
            recoveredMeeting.markAsCompletedByUser2
          ) {
            setExchange((prev) =>
              prev
                ? {
                    ...prev,
                    status: "COMPLETED",
                    updatedAt: new Date().toISOString(),
                  }
                : prev,
            );
          }
        }
      } catch {
        recovered = false;
      }

      if (!recovered) {
        const message =
          err instanceof Error
            ? err.message
            : "No se pudo confirmar la finalización del intercambio.";
        setError(message);
      }
    } finally {
      setMeetingCompletionSubmitting(false);
    }
  };

  const handleReportCompletedExchange = async () => {
    if (!exchange?.exchangeId || meetingCompletionSubmitting) return;

    try {
      setMeetingCompletionSubmitting(true);
      setError(null);

      const updatedExchange = await reportExchange(exchange.exchangeId);
      setExchange(updatedExchange);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo reportar el intercambio.";
      setError(message);
    } finally {
      setMeetingCompletionSubmitting(false);
    }
  };

  const openConfirm = (
    action: () => Promise<void>,
    mode: "accept" | "reject" | "meeting-accept" | "meeting-reject",
  ) => {
    setPendingAction(() => action);
    setConfirmVisible(true);
    setConfirmMode(mode);
  };

  const openAcceptConfirm = () => {
    openConfirm(handleAcceptExchange, "accept");
  };

  const openRejectConfirm = () => {
    openConfirm(handleRejectExchange, "reject");
  };

  const openAcceptMeetingConfirm = () => {
    openConfirm(handleAcceptMeetingProposal, "meeting-accept");
  };

  const openRejectMeetingConfirm = () => {
    openConfirm(handleRejectMeetingProposal, "meeting-reject");
  };

  const getConfirmModalContent = () => {
    switch (confirmMode) {
      case "accept":
        return {
          title: "Confirmar intercambio",
          message: "¿Seguro que quieres aceptar este intercambio?",
          confirmLabel: "Aceptar",
          confirmColor: "primary" as const,
        };
      case "reject":
        return {
          title: "Desestimar intercambio",
          message:
            "¿Seguro que quieres desestimar este intercambio? Esta acción terminará las negocioaciones y es irreversible.",
          confirmLabel: "Desestimar",
          confirmColor: "danger" as const,
        };
      case "meeting-accept":
        return {
          title: "Confirmar quedada",
          message: "¿Quieres aceptar esta propuesta de quedada?",
          confirmLabel: "Aceptar quedada",
          confirmColor: "primary" as const,
        };
      case "meeting-reject":
        return {
          title: "Desestimar quedada",
          message:
            "¿Seguro que quieres desestimar esta propuesta de quedada? Podrás enviar una nueva propuesta después.",
          confirmLabel: "Desestimar",
          confirmColor: "danger" as const,
        };
      default:
        return {
          title: "Confirmar acción",
          message: "¿Seguro que quieres continuar?",
          confirmLabel: "Confirmar",
          confirmColor: "primary" as const,
        };
    }
  };

  const confirmModalContent = getConfirmModalContent();

  const handleConfirm = async () => {
    if (pendingAction) {
      await pendingAction();
    }
    setConfirmVisible(false);
    setPendingAction(null);
  };

  const handleCancelConfirm = () => {
    setConfirmVisible(false);
    setPendingAction(null);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: headerTitle,
          headerBackTitle: "Chats",
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <ConfirmModal
          visible={confirmVisible}
          title={confirmModalContent.title}
          message={confirmModalContent.message}
          confirmLabel={confirmModalContent.confirmLabel}
          confirmColor={confirmModalContent.confirmColor}
          onConfirm={handleConfirm}
          onCancel={handleCancelConfirm}
        />
        {/* Banner de error de intercambio */}
        {error && (
          <View style={styles.exchangeErrorBanner}>
            <Text style={styles.exchangeErrorText}>{error}</Text>
            <Pressable onPress={() => setError(null)}>
              <FontAwesome name="times" size={16} color="#fff" />
            </Pressable>
          </View>
        )}

        {/* Banner de finalización exitosa */}
        {exchange?.status === "COMPLETED" && (
          <View style={styles.finalizationBannerSuccess}>
            <FontAwesome name="check-circle" size={18} color="#fff" />
            <Text style={styles.finalizationBannerTextSuccess}>
              Finalizado exitosamente
            </Text>
          </View>
        )}

        {/* Banner de incidente */}
        {exchange?.status === "INCIDENT" && (
          <View style={styles.finalizationBannerIncident}>
            <FontAwesome name="exclamation-circle" size={18} color="#fff" />
            <Text style={styles.finalizationBannerTextIncident}>
              Incidente reportado
            </Text>
          </View>
        )}

        {/* Banner de intercambio */}
        {exchange && myBook && otherBook && (
          <View style={styles.exchangeBanner}>
            <View style={styles.exchangeBannerRow}>
              <View style={styles.exchangeBannerColumn}>
                <Text style={styles.exchangeBannerLabel}>TU LIBRO</Text>
                <View style={styles.exchangeBookCard}>
                  {myBook.photos[0]?.url ? (
                    <Image
                      source={{ uri: myBook.photos[0].url }}
                      style={styles.exchangeBookCover}
                    />
                  ) : (
                    <View style={styles.exchangeBookIcon} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exchangeBookTitle} numberOfLines={2}>
                      {myBook.titulo ?? "Libro sin título"}
                    </Text>
                    {myBook.autor && (
                      <Text style={styles.exchangeBookAuthor} numberOfLines={2}>
                        {myBook.autor}
                      </Text>
                    )}
                    <Text style={styles.exchangeBookMeta} numberOfLines={1}>
                      {myBook.cover === "Hardcover"
                        ? "· Tapa dura"
                        : myBook.cover === "Paperback"
                          ? "· Tapa blanda"
                          : ""}
                    </Text>
                    <Text style={styles.exchangeBookMeta} numberOfLines={1}>
                      {myBook.condition
                        ? `· ${formatCondition(myBook.condition)}`
                        : ""}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Icono de intercambio */}
              <View style={styles.exchangeCenterIcon}>
                <FontAwesome name="exchange" size={20} color="#e4715f" />
              </View>

              {/* Columna derecha: libro del otro */}
              <View style={styles.exchangeBannerColumn}>
                <Text style={styles.exchangeBannerLabel}>
                  LIBRO DE {otherUsername.toUpperCase()}
                </Text>
                <View style={styles.exchangeBookCard}>
                  {otherBook.photos[0]?.url ? (
                    <Image
                      source={{ uri: otherBook.photos[0].url }}
                      style={[
                        styles.exchangeBookCover,
                        { backgroundColor: "#2b3a55" },
                      ]}
                    />
                  ) : (
                    <View
                      style={[
                        styles.exchangeBookIcon,
                        { backgroundColor: "#2b3a55" },
                      ]}
                    />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exchangeBookTitle} numberOfLines={2}>
                      {otherBook.titulo ?? "Libro sin título"}
                    </Text>
                    {otherBook.autor && (
                      <Text style={styles.exchangeBookAuthor} numberOfLines={1}>
                        {otherBook.autor}
                      </Text>
                    )}
                    <Text style={styles.exchangeBookMeta} numberOfLines={1}>
                      {otherBook.cover === "Hardcover"
                        ? "· Tapa dura"
                        : otherBook.cover === "Paperback"
                          ? "· Tapa blanda"
                          : ""}
                    </Text>
                    <Text style={styles.exchangeBookMeta} numberOfLines={1}>
                      {otherBook.condition
                        ? `· ${formatCondition(otherBook.condition)}`
                        : ""}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Botones de aceptar y desestimar */}
        {showExchangeActions && (
          <View style={styles.AcceptRejectContainer}>
            {/* Botón Aceptar */}
            <Pressable
              style={({ pressed }) => [
                styles.Exchangebutton,
                styles.acceptButton,
                { backgroundColor: acceptBtn.bgColor },
                (acceptBtn.disabled || pressed) && styles.buttonPressed,
              ]}
              onPress={openAcceptConfirm}
              disabled={acceptBtn.disabled}
            >
              <FontAwesome
                name="thumbs-up"
                size={18}
                color={acceptBtn.textColor}
                style={styles.iconAccept}
              />
              <Text style={[styles.acceptText, { color: acceptBtn.textColor }]}>
                {acceptBtn.label}
              </Text>
            </Pressable>

            {/* Botón Desestimar (mitad derecha) */}
            <Pressable
              style={({ pressed }) => [
                styles.Exchangebutton,
                styles.rejectButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={openRejectConfirm}
            >
              <FontAwesome
                name="times"
                size={18}
                color="#6B7280"
                style={styles.iconAccept}
              />
              <Text style={styles.rejectText}>Desestimar</Text>
            </Pressable>
          </View>
        )}

        {/* Botón para proponer encuentro */}
        {canProposeMeeting && (
          <View style={styles.meetingButtonContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.meetingButton,
                pressed && styles.meetingButtonPressed,
              ]}
              onPress={() => {
                setIsCounterProposalMode(false);
                setMeetingType("ARBITRARY");
                setMeetingFormVisible(true);
              }}
            >
              <FontAwesome name="calendar" size={18} color="#fff" />
              <Text style={styles.meetingButtonText}>Proponer encuentro</Text>
            </Pressable>
          </View>
        )}

        {/* Lista de mensajes */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMessage}
          ListFooterComponent={
            exchangeMeeting && (hasMeetingProposal || hasMeetingAccepted) ? (
              <View style={styles.meetingFooterGroup}>
                <View style={styles.meetingProposalWrapper}>
                  <View
                    style={[
                      styles.meetingProposalCard,
                      isMeetingProposalReceived
                        ? styles.meetingProposalCardReceived
                        : styles.meetingProposalCardSent,
                    ]}
                  >
                    <View style={styles.meetingProposalHeader}>
                      <View
                        style={[
                          styles.meetingProposalDot,
                          isMeetingProposalReceived
                            ? styles.meetingProposalDotReceived
                            : styles.meetingProposalDotSent,
                        ]}
                      />
                      <Text style={styles.meetingProposalTitle}>
                        {hasMeetingAccepted
                          ? "Quedada aceptada"
                          : isMeetingProposalReceived
                            ? "Propuesta recibida"
                            : "Tu propuesta"}
                      </Text>
                    </View>

                    <View style={styles.meetingProposalRow}>
                      <FontAwesome
                        name="calendar-o"
                        size={18}
                        color="#e4715f"
                        style={styles.meetingProposalRowIcon}
                      />
                      <Text style={styles.meetingProposalMainText}>
                        {formatMeetingDateLabel(exchangeMeeting.scheduledAt)}
                      </Text>
                    </View>

                    <View style={styles.meetingProposalRow}>
                      <FontAwesome
                        name="clock-o"
                        size={18}
                        color="#e4715f"
                        style={styles.meetingProposalRowIcon}
                      />
                      <Text style={styles.meetingProposalMainText}>
                        {formatMeetingTimeLabel(exchangeMeeting.scheduledAt)}
                      </Text>
                    </View>

                    <View style={styles.meetingProposalRow}>
                      <FontAwesome
                        name="map-marker"
                        size={18}
                        color="#e4715f"
                        style={styles.meetingProposalRowIcon}
                      />
                      <View style={styles.meetingProposalLocationTextWrap}>
                        <Text style={styles.meetingProposalLocationTitle}>
                          {resolveMeetingLocation(exchangeMeeting).title}
                        </Text>
                        <Text style={styles.meetingProposalLocationSubtitle}>
                          {resolveMeetingLocation(exchangeMeeting).subtitle}
                        </Text>
                      </View>
                    </View>

                    {isMeetingProposalReceived && (
                      <View style={styles.meetingProposalActionsRow}>
                        <Pressable
                          style={({ pressed }) => [
                            styles.meetingProposalAcceptButton,
                            (pressed || meetingSubmitting) && styles.meetingProposalActionPressed,
                          ]}
                          onPress={openAcceptMeetingConfirm}
                          disabled={meetingSubmitting}
                        >
                          <FontAwesome name="check" size={16} color="#fff" />
                          <Text style={styles.meetingProposalAcceptText}>Aceptar</Text>
                        </Pressable>

                        <Pressable
                          style={({ pressed }) => [
                            styles.meetingProposalCounterButton,
                            (pressed || meetingSubmitting) && styles.meetingProposalActionPressed,
                          ]}
                          onPress={handleCounterProposeMeeting}
                          disabled={meetingSubmitting}
                        >
                          <Text style={styles.meetingProposalCounterText}>Contraproponer</Text>
                        </Pressable>

                        <Pressable
                          style={({ pressed }) => [
                            styles.meetingProposalRejectButton,
                            (pressed || meetingSubmitting) && styles.meetingProposalActionPressed,
                          ]}
                          onPress={openRejectMeetingConfirm}
                          disabled={meetingSubmitting}
                        >
                          <FontAwesome name="times" size={16} color="#fff" />
                        </Pressable>
                      </View>
                    )}
                  </View>
                </View>

                {canShowMeetingCompletionBanner && (
                  <View style={styles.meetingCompletionWrapper}>
                    <View style={styles.meetingCompletionCard}>
                      <View style={styles.meetingCompletionHeader}>
                        <FontAwesome name="check-circle-o" size={20} color="#16A34A" />
                        <Text style={styles.meetingCompletionTitle}>Encuentro programado</Text>
                      </View>

                      <Text style={styles.meetingCompletionDescription}>
                        {hasCurrentUserMarkedExchangeCompleted
                          ? hasOtherUserMarkedExchangeCompleted
                            ? "Ambas partes han confirmado la realización del intercambio."
                            : "Has confirmado tu parte. Falta la confirmación de la otra persona."
                          : "Cuando realices el intercambio, confirma aquí para completarlo o reporta una incidencia."}
                      </Text>

                      <View style={styles.meetingCompletionActionsRow}>
                        <Pressable
                          style={({ pressed }) => [
                            styles.meetingCompletionAcceptButton,
                            (pressed || meetingCompletionSubmitting || hasCurrentUserMarkedExchangeCompleted) &&
                              styles.meetingProposalActionPressed,
                          ]}
                          onPress={handleCompleteExchangeAfterMeeting}
                          disabled={meetingCompletionSubmitting || hasCurrentUserMarkedExchangeCompleted}
                        >
                          <FontAwesome name="check-circle" size={16} color="#fff" />
                          <Text style={styles.meetingCompletionAcceptText}>
                            {hasCurrentUserMarkedExchangeCompleted ? "Confirmado" : "Completar"}
                          </Text>
                        </Pressable>

                        <Pressable
                          style={({ pressed }) => [
                            styles.meetingCompletionReportButton,
                            (pressed || meetingCompletionSubmitting) && styles.meetingProposalActionPressed,
                          ]}
                          onPress={handleReportCompletedExchange}
                          disabled={meetingCompletionSubmitting}
                        >
                          <FontAwesome name="warning" size={16} color="#fff" />
                          <Text style={styles.meetingCompletionReportText}>Reportar</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            ) : null
          }
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
        />

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <View style={styles.typingContainer}>
            {chat?.type === "COMMUNITY" ? (
              <View style={styles.typingAvatarsContainer}>
                {typingUsers.slice(0, 3).map((user, index) => {
                  const participant = getSender(user.userId);
                  return (
                    <View
                      key={user.userId}
                      style={[
                        styles.typingAvatarWrapper,
                        { zIndex: 10 - index },
                        index > 0 && { marginLeft: -10 },
                      ]}
                    >
                      {participant?.profilePhoto ? (
                        <Image
                          source={{ uri: participant.profilePhoto }}
                          style={styles.typingAvatar}
                        />
                      ) : (
                        <View style={styles.typingAvatarPlaceholder}>
                          <Text style={styles.typingAvatarText}>
                            {user.username?.charAt(0) ?? "?"}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
                {typingUsers.length > 3 && (
                  <View
                    style={[
                      styles.typingAvatarPlaceholder,
                      styles.typingAvatarWrapper,
                      {
                        marginLeft: -10,
                        zIndex: 1,
                        backgroundColor: "#E9EBF0",
                      },
                    ]}
                  >
                    <Text
                      style={[styles.typingAvatarText, { color: "#6B7280" }]}
                    >
                      +{typingUsers.length - 3}
                    </Text>
                  </View>
                )}
                <View style={{ marginLeft: 8 }}>
                  <Spinner
                    variant="dots"
                    size="sm"
                    color="#e4715f"
                    speed="normal"
                  />
                </View>
              </View>
            ) : (
              <View style={styles.typingBubbleContainer}>
                <View style={styles.typingBubble}>
                  <Spinner
                    variant="dots"
                    size="sm"
                    color="#e4715f"
                    speed="normal"
                  />
                </View>
              </View>
            )}
          </View>
        )}

        {meetingFormVisible && (
          <View style={styles.meetingFormOverlay}>
            <View style={styles.meetingFormCard}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.meetingFormScrollContent}
              >
                {/* Header */}
                <View style={styles.meetingFormHeader}>
                  <Text style={styles.meetingFormTitle}>
                    Proponer encuentro
                  </Text>
                  <Pressable
                    onPress={closeMeetingForm}
                    style={styles.formCloseButton}
                  >
                    <FontAwesome name="times" size={20} color="#6B7280" />
                  </Pressable>
                </View>

                {/* Tipo de encuentro */}
                <Text style={styles.meetingSectionLabel}>
                  Tipo de encuentro
                </Text>
                <View style={styles.meetingTypeRow}>
                  <Pressable
                    style={[
                      styles.meetingTypeCard,
                      meetingType === "ARBITRARY" &&
                        styles.meetingTypeCardSelected,
                    ]}
                    onPress={() => setMeetingType("ARBITRARY")}
                  >
                    <Text
                      style={[
                        styles.meetingTypeTitle,
                        meetingType === "ARBITRARY" &&
                          styles.meetingTypeTitleSelected,
                      ]}
                    >
                      Ubicación arbitraria
                    </Text>
                    <Text style={styles.meetingTypeSubtitle}>
                      Indica cualquier dirección para el encuentro
                    </Text>
                    <Text style={styles.meetingTypePrice}>Gratis</Text>
                  </Pressable>

                  {/* Segundo tipo: BookSpot */}
                  <Pressable
                    style={[
                      styles.meetingTypeCard,
                      meetingType === "BOOKSPOT" &&
                        styles.meetingTypeCardSelected,
                    ]}
                    onPress={() => setMeetingType("BOOKSPOT")}
                  >
                    <Text
                      style={[
                        styles.meetingTypeTitle,
                        meetingType === "BOOKSPOT" &&
                          styles.meetingTypeTitleSelected,
                      ]}
                    >
                      BookSpot
                    </Text>
                    <Text style={styles.meetingTypeSubtitle}>
                      Cafetería asociada con zona segura
                    </Text>
                    <Text style={styles.meetingTypePriceFree}>Gratis</Text>
                  </Pressable>

                  {/* Tercer tipo: BookDrop */}
                  <Pressable
                    style={[
                      styles.meetingTypeCard,
                      meetingType === "BOOKDROP" &&
                        styles.meetingTypeCardSelected,
                    ]}
                    onPress={() => setMeetingType("BOOKDROP")}
                  >
                    <Text
                      style={[
                        styles.meetingTypeTitle,
                        meetingType === "BOOKDROP" &&
                          styles.meetingTypeTitleSelected,
                      ]}
                    >
                      BookDrop
                    </Text>
                    <Text style={styles.meetingTypeSubtitle}>
                      Deja tu libro para recogida cuando quieras
                    </Text>
                    <Text style={styles.meetingTypePricePaid}>
                      1€ por usuario
                    </Text>
                  </Pressable>
                </View>

                {/* Fecha */}
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.meetingSectionLabel}>Fecha</Text>
                  {Platform.OS === "web" ? (
                    <>
                      <Pressable
                        style={[
                          styles.meetingInput,
                          styles.meetingInputTrigger,
                          webDatePanelVisible && styles.meetingInputTriggerActive,
                        ]}
                        onPress={openDateSelector}
                      >
                        <View style={styles.meetingTriggerLeft}>
                          <FontAwesome name="calendar" size={14} color="#e4715f" />
                          <Text
                            style={
                              meetingDate
                                ? styles.meetingInputValue
                                : styles.meetingInputPlaceholderNoMargin
                            }
                          >
                            {meetingDate || "dd/mm/aaaa"}
                          </Text>
                        </View>
                        <FontAwesome
                          name={webDatePanelVisible ? "chevron-up" : "chevron-down"}
                          size={12}
                          color="#6B7280"
                        />
                      </Pressable>

                      {webDatePanelVisible && (
                        <View style={styles.webPanelCard}>
                          <View style={styles.webPanelHeader}>
                            <Pressable
                              style={styles.webPanelArrowBtn}
                              onPress={() => moveCalendarMonth(-1)}
                            >
                              <FontAwesome name="chevron-left" size={12} color="#4B5563" />
                            </Pressable>
                            <Text style={styles.webPanelTitle}>
                              {MONTHS_ES[webDateCursor.getMonth()]} {webDateCursor.getFullYear()}
                            </Text>
                            <Pressable
                              style={styles.webPanelArrowBtn}
                              onPress={() => moveCalendarMonth(1)}
                            >
                              <FontAwesome name="chevron-right" size={12} color="#4B5563" />
                            </Pressable>
                          </View>

                          <View style={styles.webWeekHeaderRow}>
                            {WEEKDAYS_SHORT_ES.map((d) => (
                              <Text key={d} style={styles.webWeekHeaderText}>
                                {d}
                              </Text>
                            ))}
                          </View>

                          <View style={styles.webCalendarGrid}>
                            {calendarCells.map((cell, index) => (
                              <Pressable
                                key={`${cell.date.toISOString()}-${index}`}
                                disabled={cell.disabled}
                                style={[
                                  styles.webCalendarDay,
                                  cell.isSelected && styles.webCalendarDaySelected,
                                ]}
                                onPress={() => pickCalendarDate(cell.date, cell.disabled)}
                              >
                                <Text
                                  style={[
                                    styles.webCalendarDayText,
                                    !cell.inCurrentMonth && styles.webCalendarDayTextMuted,
                                    cell.disabled && styles.webCalendarDayTextDisabled,
                                    cell.isSelected && styles.webCalendarDayTextSelected,
                                  ]}
                                >
                                  {cell.date.getDate()}
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                        </View>
                      )}
                    </>
                  ) : (
                    <Pressable style={styles.meetingInput} onPress={openDateSelector}>
                      <Text style={styles.meetingInputPlaceholder}>
                        {meetingDate || "dd/mm/aaaa"}
                      </Text>
                    </Pressable>
                  )}
                </View>

                {/* Hora */}
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.meetingSectionLabel}>Hora</Text>
                  {Platform.OS === "web" ? (
                    <>
                      <Pressable
                        style={[
                          styles.meetingInput,
                          styles.meetingInputTrigger,
                          webTimePanelVisible && styles.meetingInputTriggerActive,
                        ]}
                        onPress={openTimeSelector}
                      >
                        <View style={styles.meetingTriggerLeft}>
                          <FontAwesome name="clock-o" size={14} color="#e4715f" />
                          <Text
                            style={
                              meetingTime
                                ? styles.meetingInputValue
                                : styles.meetingInputPlaceholderNoMargin
                            }
                          >
                            {meetingTime || "--:--"}
                          </Text>
                        </View>
                        <FontAwesome
                          name={webTimePanelVisible ? "chevron-up" : "chevron-down"}
                          size={12}
                          color="#6B7280"
                        />
                      </Pressable>

                      {webTimePanelVisible && (
                        <View style={styles.webPanelCard}>
                          <Text style={styles.webPanelTitle}>Selecciona la hora</Text>
                          <View style={styles.webTimeColumns}>
                            <View style={styles.webTimeColumn}>
                              <Text style={styles.webTimeColumnLabel}>Hora</Text>
                              <ScrollView style={styles.webTimeScroll} showsVerticalScrollIndicator={false}>
                                {Array.from({ length: 24 }, (_, hour) => (
                                  <Pressable
                                    key={`hour-${hour}`}
                                    disabled={isWebTimeOptionDisabled(hour, 59)}
                                    style={[
                                      styles.webTimeOption,
                                      webHourDraft === hour && styles.webTimeOptionSelected,
                                      isWebTimeOptionDisabled(hour, 59) && styles.webTimeOptionDisabled,
                                    ]}
                                    onPress={() => {
                                      if (isWebTimeOptionDisabled(hour, 59)) return;
                                      setWebHourDraft(hour);
                                      if (isWebTimeOptionDisabled(hour, webMinuteDraft)) {
                                        const firstValidMinute = Array.from({ length: 60 }, (_, m) => m).find(
                                          (m) => !isWebTimeOptionDisabled(hour, m),
                                        );
                                        setWebMinuteDraft(firstValidMinute ?? webMinuteDraft);
                                      }
                                    }}
                                  >
                                    <Text
                                      style={[
                                        styles.webTimeOptionText,
                                        webHourDraft === hour && styles.webTimeOptionTextSelected,
                                        isWebTimeOptionDisabled(hour, 59) && styles.webTimeOptionTextDisabled,
                                      ]}
                                    >
                                      {pad2(hour)}
                                    </Text>
                                  </Pressable>
                                ))}
                              </ScrollView>
                            </View>
                            <View style={styles.webTimeColumn}>
                              <Text style={styles.webTimeColumnLabel}>Minuto</Text>
                              <ScrollView style={styles.webTimeScroll} showsVerticalScrollIndicator={false}>
                                {Array.from({ length: 60 }, (_, minute) => minute).map((minute) => (
                                  <Pressable
                                    key={`minute-${minute}`}
                                    disabled={isWebTimeOptionDisabled(webHourDraft, minute)}
                                    style={[
                                      styles.webTimeOption,
                                      webMinuteDraft === minute && styles.webTimeOptionSelected,
                                      isWebTimeOptionDisabled(webHourDraft, minute) && styles.webTimeOptionDisabled,
                                    ]}
                                    onPress={() => setWebMinuteDraft(minute)}
                                  >
                                    <Text
                                      style={[
                                        styles.webTimeOptionText,
                                        webMinuteDraft === minute && styles.webTimeOptionTextSelected,
                                        isWebTimeOptionDisabled(webHourDraft, minute) && styles.webTimeOptionTextDisabled,
                                      ]}
                                    >
                                      {pad2(minute)}
                                    </Text>
                                  </Pressable>
                                ))}
                              </ScrollView>
                            </View>
                          </View>

                          <View style={styles.webPanelActions}>
                            <Pressable onPress={() => setWebTimePanelVisible(false)}>
                              <Text style={styles.webPanelCancelText}>Cancelar</Text>
                            </Pressable>
                            <Pressable style={styles.webPanelApplyBtn} onPress={applyWebTimeSelection}>
                              <Text style={styles.webPanelApplyText}>Aplicar</Text>
                            </Pressable>
                          </View>
                        </View>
                      )}
                    </>
                  ) : (
                    <Pressable style={styles.meetingInput} onPress={openTimeSelector}>
                      <Text style={styles.meetingInputPlaceholder}>
                        {meetingTime || "--:--"}
                      </Text>
                    </Pressable>
                  )}
                  {getSameDayMinTimeLabel() && (
                    <Text style={styles.meetingInfoText}>
                      Para hoy, la hora minima disponible es {getSameDayMinTimeLabel()} (5 min desde ahora).
                    </Text>
                  )}
                  {!!meetingDate && !hasAvailableMinutesToday() && (
                    <Text style={styles.locationSuggestionFeedbackText}>
                      Para hoy ya no quedan horas disponibles. Elige una fecha posterior.
                    </Text>
                  )}
                </View>

                {/* Ubicación: solo si ARBITRARY */}
                {meetingType === "ARBITRARY" && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.meetingSectionLabel}>Ubicación</Text>
                    <View style={styles.locationInputWrap}>
                      <TextInput
                        style={styles.locationInput}
                        value={meetingLocation}
                        onChangeText={handleLocationInputChange}
                        placeholder="Ej: Café Central, Calle Mayor 10"
                        placeholderTextColor="#9CA3AF"
                      />
                      {isLoadingLocationSuggestions && (
                        <View style={styles.locationSuggestionsLoading}>
                          <ActivityIndicator size="small" color="#e4715f" />
                        </View>
                      )}
                      {locationSuggestions.length > 0 && (
                        <View style={styles.locationSuggestionsList}>
                          {locationSuggestions.map((suggestion) => (
                            <Pressable
                              key={suggestion.id}
                              style={styles.locationSuggestionItem}
                              onPress={() => handleSelectLocationSuggestion(suggestion)}
                            >
                              <FontAwesome
                                name="map-marker"
                                size={14}
                                color="#e4715f"
                                style={styles.locationSuggestionIcon}
                              />
                              <Text style={styles.locationSuggestionText} numberOfLines={2}>
                                {suggestion.label}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </View>
                    {locationSuggestionFeedback && (
                      <Text style={styles.locationSuggestionFeedbackText}>
                        {locationSuggestionFeedback}
                      </Text>
                    )}
                    <Text style={styles.meetingInfoText}>
                      Escribe al menos 3 caracteres y selecciona una sugerencia válida.
                    </Text>
                  </View>
                )}

                {meetingType === "BOOKSPOT" && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.meetingSectionLabel}>BookSpots recomendados</Text>
                    <Text style={styles.meetingInfoText}>
                      Se muestran los 5 que minimizan la distancia para ambos, priorizando equilibrio.
                    </Text>

                    {isLoadingBookspots && (
                      <View style={styles.bookspotLoadingRow}>
                        <ActivityIndicator size="small" color="#e4715f" />
                        <Text style={styles.bookspotLoadingText}>Calculando sugerencias...</Text>
                      </View>
                    )}

                    {!isLoadingBookspots && recommendedBookspots.length > 0 && (
                      <View style={styles.bookspotRecommendedList}>
                        {recommendedBookspots.map((spot) => {
                          const distanceInfo = currentDistanceInfoForBookspot(spot);
                          const isSelected = selectedBookspot?.id === spot.id;

                          return (
                            <Pressable
                              key={`recommended-bookspot-${spot.id}`}
                              style={[
                                styles.bookspotItem,
                                isSelected && styles.bookspotItemSelected,
                              ]}
                              onPress={() => handleSelectBookspot(spot)}
                            >
                              <Text
                                style={[
                                  styles.bookspotItemTitle,
                                  isSelected && styles.bookspotItemTitleSelected,
                                ]}
                                numberOfLines={1}
                              >
                                {spot.nombre}
                              </Text>
                              <Text style={styles.bookspotItemAddress} numberOfLines={2}>
                                {spot.addressText}
                              </Text>
                              <Text style={styles.bookspotItemMeta}>
                                Tu distancia: {formatDistanceKm(distanceInfo.myDistanceKm)} · Otra persona: {formatDistanceKm(distanceInfo.otherDistanceKm)}
                              </Text>
                              <Text style={styles.bookspotItemMeta}>
                                Diferencia: {formatDistanceKm(spot.fairnessGapKm)}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}

                    <Text style={[styles.meetingSectionLabel, { marginTop: 10 }]}>Buscar otro BookSpot</Text>
                    <TextInput
                      style={styles.locationInput}
                      value={bookspotSearchQuery}
                      onChangeText={setBookspotSearchQuery}
                      placeholder="Buscar por nombre o direccion"
                      placeholderTextColor="#9CA3AF"
                    />

                    {bookspotSearchQuery.trim().length > 0 && bookspotSearchQuery.trim().length < 2 && (
                      <Text style={styles.meetingInfoText}>Escribe al menos 2 caracteres para buscar.</Text>
                    )}

                    {filteredBookspotSearchResults.length > 0 && (
                      <View style={styles.bookspotSearchResultsList}>
                        {filteredBookspotSearchResults.map((spot) => {
                          const distanceInfo = currentDistanceInfoForBookspot(spot);
                          const isSelected = selectedBookspot?.id === spot.id;

                          return (
                            <Pressable
                              key={`search-bookspot-${spot.id}`}
                              style={[
                                styles.bookspotSearchResultItem,
                                isSelected && styles.bookspotSearchResultItemSelected,
                              ]}
                              onPress={() => handleSelectBookspot(spot)}
                            >
                              <Text
                                style={[
                                  styles.bookspotSearchResultTitle,
                                  isSelected && styles.bookspotSearchResultTitleSelected,
                                ]}
                                numberOfLines={1}
                              >
                                {spot.nombre}
                              </Text>
                              <Text style={styles.bookspotItemAddress} numberOfLines={2}>
                                {spot.addressText}
                              </Text>
                              <Text style={styles.bookspotItemMeta}>
                                Tu distancia: {formatDistanceKm(distanceInfo.myDistanceKm)} · Otra persona: {formatDistanceKm(distanceInfo.otherDistanceKm)}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}

                    {bookspotSearchQuery.trim().length >= 2 &&
                      filteredBookspotSearchResults.length === 0 &&
                      !isLoadingBookspots && (
                        <Text style={styles.locationSuggestionFeedbackText}>
                          No se encontraron BookSpots con ese texto.
                        </Text>
                      )}

                    {selectedBookspot && (
                      <Text style={styles.bookspotSelectedSummary}>
                        Seleccionado: {selectedBookspot.nombre}
                      </Text>
                    )}

                    {bookspotSuggestionFeedback && (
                      <Text style={styles.locationSuggestionFeedbackText}>
                        {bookspotSuggestionFeedback}
                      </Text>
                    )}
                  </View>
                )}

                {meetingType === "BOOKDROP" && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.meetingSectionLabel}>BookDrops recomendados</Text>
                    <Text style={styles.meetingInfoText}>
                      Se muestran los 5 que minimizan la distancia para ambos y, despues, priorizan equilibrio.
                    </Text>

                    {isLoadingBookdrops && (
                      <View style={styles.bookspotLoadingRow}>
                        <ActivityIndicator size="small" color="#e4715f" />
                        <Text style={styles.bookspotLoadingText}>Buscando BookDrops cercanos...</Text>
                      </View>
                    )}

                    {!isLoadingBookdrops && recommendedBookdrops.length > 0 && (
                      <View style={styles.bookspotRecommendedList}>
                        {recommendedBookdrops.map((bookdrop) => {
                          const distanceInfo = currentDistanceInfoForBookspot(bookdrop);
                          const isSelected = selectedBookdrop?.id === bookdrop.id;

                          return (
                            <Pressable
                              key={`recommended-bookdrop-${bookdrop.id}`}
                              style={[
                                styles.bookspotItem,
                                isSelected && styles.bookspotItemSelected,
                              ]}
                              onPress={() => handleSelectBookdrop(bookdrop)}
                            >
                              <Text
                                style={[
                                  styles.bookspotItemTitle,
                                  isSelected && styles.bookspotItemTitleSelected,
                                ]}
                                numberOfLines={1}
                              >
                                {bookdrop.nombre}
                              </Text>
                              <Text style={styles.bookspotItemAddress} numberOfLines={2}>
                                {bookdrop.addressText}
                              </Text>
                              <Text style={styles.bookspotItemMeta}>
                                Tu distancia: {formatDistanceKm(distanceInfo.myDistanceKm)} · Otra persona: {formatDistanceKm(distanceInfo.otherDistanceKm)}
                              </Text>
                              <Text style={styles.bookspotItemMeta}>
                                Diferencia: {formatDistanceKm(bookdrop.fairnessGapKm)}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}

                    <Text style={[styles.meetingSectionLabel, { marginTop: 10 }]}>Buscar otro BookDrop</Text>
                    <TextInput
                      style={styles.locationInput}
                      value={bookdropSearchQuery}
                      onChangeText={setBookdropSearchQuery}
                      placeholder="Buscar por nombre o direccion"
                      placeholderTextColor="#9CA3AF"
                    />

                    {bookdropSearchQuery.trim().length > 0 && bookdropSearchQuery.trim().length < 2 && (
                      <Text style={styles.meetingInfoText}>Escribe al menos 2 caracteres para buscar.</Text>
                    )}

                    {filteredBookdropSearchResults.length > 0 && (
                      <View style={styles.bookspotSearchResultsList}>
                        {filteredBookdropSearchResults.map((bookdrop) => {
                          const distanceInfo = currentDistanceInfoForBookspot(bookdrop);
                          const isSelected = selectedBookdrop?.id === bookdrop.id;

                          return (
                            <Pressable
                              key={`search-bookdrop-${bookdrop.id}`}
                              style={[
                                styles.bookspotSearchResultItem,
                                isSelected && styles.bookspotSearchResultItemSelected,
                              ]}
                              onPress={() => handleSelectBookdrop(bookdrop)}
                            >
                              <Text
                                style={[
                                  styles.bookspotSearchResultTitle,
                                  isSelected && styles.bookspotSearchResultTitleSelected,
                                ]}
                                numberOfLines={1}
                              >
                                {bookdrop.nombre}
                              </Text>
                              <Text style={styles.bookspotItemAddress} numberOfLines={2}>
                                {bookdrop.addressText}
                              </Text>
                              <Text style={styles.bookspotItemMeta}>
                                Tu distancia: {formatDistanceKm(distanceInfo.myDistanceKm)} · Otra persona: {formatDistanceKm(distanceInfo.otherDistanceKm)}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}

                    {bookdropSearchQuery.trim().length >= 2 &&
                      filteredBookdropSearchResults.length === 0 &&
                      !isLoadingBookdrops && (
                        <Text style={styles.locationSuggestionFeedbackText}>
                          No se encontraron BookDrops con ese texto.
                        </Text>
                      )}

                    {selectedBookdrop && (
                      <Text style={styles.bookspotSelectedSummary}>
                        Seleccionado: {selectedBookdrop.nombre}
                      </Text>
                    )}

                    {bookdropSuggestionFeedback && (
                      <Text style={styles.locationSuggestionFeedbackText}>
                        {bookdropSuggestionFeedback}
                      </Text>
                    )}

                    {!isLoadingBookdrops && rankedBookdrops.length > 0 && (
                      <Text style={styles.meetingInfoText}>
                        Si no quieres un punto de entrega, cambia el tipo de encuentro a Ubicacion arbitraria o BookSpot.
                      </Text>
                    )}
                  </View>
                )}

                {/* Botón Enviar propuesta */}
                <Pressable
                  style={({ pressed }) => [
                    styles.meetingSubmitButton,
                    meetingSubmitting && styles.meetingSubmitDisabled,
                    pressed && styles.meetingSubmitPressed,
                  ]}
                  onPress={submitMeetingProposal}
                  disabled={meetingSubmitting}
                >
                  <Text style={styles.meetingSubmitText}>
                    {meetingSubmitting
                      ? "Guardando..."
                      : isCounterProposalMode
                        ? "Enviar contrapropuesta"
                        : "Enviar propuesta"}
                  </Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        )}

        <DateTimePickerModal
          isVisible={meetingFormVisible && isDatePickerVisible}
          mode="date"
          locale="es-ES"
          minimumDate={new Date()}
          onConfirm={handleDateConfirm}
          onCancel={() => setDatePickerVisible(false)}
        />

        <DateTimePickerModal
          isVisible={meetingFormVisible && isTimePickerVisible}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          locale="es-ES"
          is24Hour
          onConfirm={(value) => {
            const selected = parseMeetingDate(meetingDate);
            const now = new Date();

            if (selected && isSameCalendarDay(selected, now)) {
              const candidate = new Date(
                selected.getFullYear(),
                selected.getMonth(),
                selected.getDate(),
                value.getHours(),
                value.getMinutes(),
                0,
                0,
              );

              if (candidate < getTodayMinAllowedDateTime()) {
                setError("Para hoy, elige una hora al menos 5 minutos posterior a la actual.");
                setTimePickerVisible(false);
                return;
              }
            }

            handleTimeConfirm(value);
          }}
          onCancel={() => setTimePickerVisible(false)}
        />

        {/* Input de texto */}
        {!meetingFormVisible && (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={handleInputChange}
              placeholder="Escribe un mensaje..."
              placeholderTextColor="#999"
              multiline
              maxLength={1000}
              onSubmitEditing={handleSend}
            />
            <GHTouchableOpacity
              style={[
                styles.sendButton,
                !inputText.trim() && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!inputText.trim() || sending}
              activeOpacity={0.7}
            >
              <FontAwesome
                name="send"
                size={18}
                color={inputText.trim() ? "#fff" : "#ccc"}
              />
            </GHTouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fbf7f4",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Messages ──────────────────────────────────────────
  messagesList: {
    paddingHorizontal: 14,
    paddingBottom: 8,
    paddingTop: 4,
  },
  dateHeaderContainer: {
    alignItems: "center",
    marginVertical: 14,
    backgroundColor: "transparent",
  },
  dateHeaderText: {
    fontSize: 11,
    color: "#2b2c2d",
    backgroundColor: "#E9EBF0",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    overflow: "hidden",
    fontWeight: "500",
  },
  messageRow: {
    flexDirection: "row",
    marginVertical: 3,
    backgroundColor: "transparent",
  },
  messageRowOwn: {
    justifyContent: "flex-end",
  },
  messageRowOther: {
    justifyContent: "flex-start",
  },
  messageAvatarContainer: {
    marginRight: 8,
    justifyContent: "flex-end",
    backgroundColor: "transparent",
  },
  messageAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  messageAvatarPlaceholder: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#fbf7f4",
    justifyContent: "center",
    alignItems: "center",
  },
  messageAvatarText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  messageBubble: {
    maxWidth: "78%",
    paddingHorizontal: 14,
    paddingTop: 9,
    paddingBottom: 7,
    borderRadius: 20,
    marginVertical: 1,
  },
  bubbleOwn: {
    backgroundColor: "#e76541",
    borderBottomRightRadius: 5,
  },
  bubbleOther: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  senderName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#e4715f",
    marginBottom: 3,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  messageTextOwn: {
    color: "#FFFFFF",
  },
  messageTextOther: {
    color: "#1F2937",
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  messageTimeOwn: {
    color: "rgba(255,255,255,0.5)",
  },
  messageTimeOther: {
    color: "#C4C9D4",
  },

  // ── Typing Indicator ──────────────────────────────────
  typingContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 4,
    backgroundColor: "#fbf7f4",
  },
  typingBubbleContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingLeft: 0,
    backgroundColor: "transparent",
  },
  typingBubble: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderBottomLeftRadius: 5,
    paddingHorizontal: 18,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  typingAvatarsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  typingAvatarWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#fbf7f4",
    overflow: "hidden",
  },
  typingAvatar: {
    width: "100%",
    height: "100%",
  },
  typingAvatarPlaceholder: {
    flex: 1,
    backgroundColor: "#e76541",
    justifyContent: "center",
    alignItems: "center",
  },
  typingAvatarText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },

  // ── Input ─────────────────────────────────────────────
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#fbf7f4",
    borderTopWidth: 1,
    borderTopColor: "#fbf7f4",
  },
  textInput: {
    flex: 1,
    minHeight: 42,
    maxHeight: 110,
    backgroundColor: "#F3F4F8",
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
    fontSize: 15,
    color: "#1F2937",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#E9EBF0",
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#e4715f",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#e4715f",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: "#E5E7EB",
    shadowOpacity: 0,
    elevation: 0,
  },
  sendButtonPressed: {
    opacity: 0.75,
  },
  // ── Intercambio ─────────────────────────────────────────────
  AcceptRejectContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fbf7f4",
    marginTop: 6,
    marginHorizontal: 14,
    marginBottom: 5,
  },
  Exchangebutton: {
    flex: 1,
    flexDirection: "row",
    height: 46,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 14,
  },
  acceptButton: {
    backgroundColor: "#e76541",
    shadowColor: "#e4715f",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  rejectButton: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  buttonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonPressed: {
    opacity: 0.75,
  },
  acceptText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 10,
  },
  rejectText: {
    color: "#6B7280",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 10,
  },
  iconAccept: {
    marginLeft: 10,
  },
  iconReject: {
    marginLeft: 10,
  },
  // cuando solo hay botón desestimar ocupa todo el ancho
  rejectButtonSingle: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  //── Banner de errores ─────────────────────────────────────────────
  exchangeErrorBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 14,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#DC2626", // rojo error
    borderRadius: 8,
  },
  exchangeErrorText: {
    color: "#fff",
    fontSize: 13,
    flex: 1,
    marginRight: 8,
  },

  // ── Banner de finalización (COMPLETED/INCIDENT) ─────────────────
  finalizationBannerSuccess: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 14,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#34D399",
    borderRadius: 8,
    borderTopWidth: 3,
    borderTopColor: "#059669",
    borderBottomWidth: 3,
    borderBottomColor: "#059669",
  },
  finalizationBannerTextSuccess: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  finalizationBannerIncident: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 14,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#F87171",
    borderRadius: 8,
    borderTopWidth: 3,
    borderTopColor: "#991B1B",
    borderBottomWidth: 3,
    borderBottomColor: "#991B1B",
  },
  finalizationBannerTextIncident: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },

  // ── Banner de intercambio ─────────────────────────────
  exchangeBanner: {
    backgroundColor: "#fff",
    marginHorizontal: 14,
    marginTop: 8,
    marginBottom: 6,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  exchangeBannerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  exchangeBannerColumn: {
    flex: 1,
  },
  exchangeBannerLabel: {
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: "#6B7280",
    backgroundColor: "#ffffff",
    marginBottom: 6,
  },
  exchangeBookCard: {
    backgroundColor: "#fbf7f4",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  exchangeBookIcon: {
    width: 26,
    height: 34,
    borderRadius: 6,
    backgroundColor: "#b87333",
    marginRight: 8,
  },
  exchangeBookCover: {
    width: 26,
    height: 34,
    borderRadius: 6,
    marginRight: 8,
    backgroundColor: "#b87333",
  },
  exchangeBookTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  exchangeBookAuthor: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  exchangeBookMeta: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 2,
  },
  exchangeCenterIcon: {
    width: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  exchangeStatusContainer: {
    marginHorizontal: 14,
    marginBottom: 4,
  },
  exchangeStatusText: {
    fontSize: 12,
    color: "#6B7280",
    fontStyle: "italic",
  },
  // ── Modales de confirmacion de accept y reject ─────────────────────────────
  confirmOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  confirmCard: {
    width: "82%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  confirmMessage: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 16,
  },
  confirmButtonsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  confirmSecondaryButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    marginRight: 8,
    backgroundColor: "#F3F4F8",
  },
  confirmSecondaryText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "500",
  },
  confirmPrimaryButton: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#e4715f",
  },
  confirmPrimaryDanger: {
    backgroundColor: "#DC2626",
  },
  confirmPrimaryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  meetingProposalWrapper: {
    marginHorizontal: 14,
    marginTop: 10,
    backgroundColor: "transparent",
  },
  meetingFooterGroup: {
    backgroundColor: "transparent",
  },
  meetingProposalCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
  },
  meetingProposalCardReceived: {
    borderColor: "#F3C6BC",
  },
  meetingProposalCardSent: {
    borderColor: "#D4DEFF",
  },
  meetingProposalHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    marginBottom: 10,
  },
  meetingProposalDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginRight: 10,
  },
  meetingProposalDotReceived: {
    backgroundColor: "#E4715F",
  },
  meetingProposalDotSent: {
    backgroundColor: "#2FA66A",
  },
  meetingProposalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#9A683A",
  },
  meetingProposalRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    marginBottom: 10,
    gap: 12,
  },
  meetingProposalRowIcon: {
    width: 20,
    textAlign: "center",
  },
  meetingProposalMainText: {
    fontSize: 15,
    color: "#1F2937",
    fontWeight: "500",
    flex: 1,
  },
  meetingProposalLocationTextWrap: {
    flex: 1,
    backgroundColor: "transparent",
  },
  meetingProposalLocationTitle: {
    fontSize: 15,
    color: "#1F2937",
    fontWeight: "700",
  },
  meetingProposalLocationSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: "#6B7280",
  },
  meetingProposalActionsRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "transparent",
    gap: 8,
  },
  meetingProposalAcceptButton: {
    flex: 1,
    minHeight: 35,
    borderRadius: 16,
    backgroundColor: "#2FA66A",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  meetingProposalAcceptText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  meetingProposalCounterButton: {
    flex: 1,
    minHeight: 35,
    borderRadius: 16,
    backgroundColor: "#E37F67",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  meetingProposalCounterText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  meetingProposalRejectButton: {
    width: 50,
    minHeight: 35,
    borderRadius: 16,
    backgroundColor: "#FC2634",
    alignItems: "center",
    justifyContent: "center",
  },
  meetingProposalActionPressed: {
    opacity: 0.8,
  },
  meetingCompletionWrapper: {
    marginHorizontal: 14,
    marginTop: 10,
    backgroundColor: "transparent",
  },
  meetingCompletionCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#A7E7C2",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#F5FCF8",
  },
  meetingCompletionHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    gap: 10,
  },
  meetingCompletionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#3F2C1F",
  },
  meetingCompletionDescription: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    color: "#6B4A2F",
    backgroundColor: "transparent",
  },
  meetingCompletionActionsRow: {
    marginTop: 14,
    flexDirection: "row",
    gap: 12,
    backgroundColor: "transparent",
  },
  meetingCompletionAcceptButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: "#09C14B",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  meetingCompletionAcceptText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  meetingCompletionReportButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: "#FC2634",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  meetingCompletionReportText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  meetingAcceptedBadgeWrap: {
    marginHorizontal: 14,
    marginTop: 8,
    marginBottom: 2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#B6E5CB",
    backgroundColor: "#DFF3E8",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  meetingAcceptedBadgeText: {
    color: "#0A8A52",
    fontSize: 16,
    fontWeight: "600",
  },
  meetingButtonContainer: {
    marginTop: 10,
    marginHorizontal: 28, // alineado con el banner
    backgroundColor: "#ffffff",
    marginBottom: 5,
  },
  meetingButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: 24,
    backgroundColor: "#e4715f",
    paddingHorizontal: 16,
    shadowColor: "#e4715f",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  meetingButtonPressed: {
    opacity: 0.8,
  },
  meetingButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 10,
  },
  meetingFormOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.25)",
    justifyContent: "flex-end",
  },
  meetingFormHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    backgroundColor: "#ffffff",
  },
  meetingFormTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  meetingSectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
    backgroundColor: "#ffffff",
    marginBottom: 4,
  },
  meetingInfoText: {
    marginTop: 4,
    fontSize: 12,
    color: "#9CA3AF",
    backgroundColor: "transparent",
  },
  meetingPlaceholder: {
    fontSize: 13,
    color: "#9CA3AF",
  },
  meetingInput: {
    height: 35,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
  },
  meetingInputTrigger: {
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    justifyContent: "space-between",
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 10,
  },
  meetingInputTriggerActive: {
    borderColor: "#e4715f",
    backgroundColor: "#FFF7F4",
  },
  meetingTriggerLeft: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    gap: 8,
  },
  meetingInputValue: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "600",
  },
  meetingInputPlaceholderNoMargin: {
    color: "#9CA3AF",
    fontSize: 14,
  },
  locationInputWrap: {
    position: "relative",
    backgroundColor: "transparent",
  },
  locationInput: {
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#111827",
  },
  locationSuggestionsLoading: {
    position: "absolute",
    right: 10,
    top: 10,
    backgroundColor: "transparent",
  },
  locationSuggestionsList: {
    marginTop: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    overflow: "hidden",
  },
  locationSuggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    backgroundColor: "#FFFFFF",
  },
  locationSuggestionIcon: {
    marginRight: 8,
  },
  locationSuggestionText: {
    flex: 1,
    fontSize: 13,
    color: "#374151",
    lineHeight: 18,
  },
  locationSuggestionFeedbackText: {
    marginTop: 6,
    fontSize: 12,
    color: "#9CA3AF",
  },
  bookspotLoadingRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    gap: 8,
  },
  bookspotLoadingText: {
    fontSize: 13,
    color: "#6B7280",
  },
  bookspotRecommendedList: {
    marginTop: 8,
    backgroundColor: "transparent",
    gap: 8,
  },
  bookspotItem: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  bookspotItemSelected: {
    borderColor: "#e4715f",
    backgroundColor: "#FFF7F4",
  },
  bookspotItemTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  bookspotItemTitleSelected: {
    color: "#e4715f",
  },
  bookspotItemAddress: {
    marginTop: 4,
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
  },
  bookspotItemMeta: {
    marginTop: 4,
    fontSize: 12,
    color: "#6B7280",
  },
  bookspotSearchResultsList: {
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    overflow: "hidden",
  },
  bookspotSearchResultItem: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    backgroundColor: "#FFFFFF",
  },
  bookspotSearchResultItemSelected: {
    backgroundColor: "#FFF7F4",
  },
  bookspotSearchResultTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  bookspotSearchResultTitleSelected: {
    color: "#e4715f",
  },
  bookspotSelectedSummary: {
    marginTop: 8,
    fontSize: 12,
    color: "#e4715f",
    fontWeight: "600",
  },
  webPanelCard: {
    marginTop: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F3F4F8",
    backgroundColor: "#fff",
    padding: 10,
    width: "100%",
    maxWidth: 420,
    alignSelf: "flex-start",
  },
  webPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "transparent",
    marginBottom: 8,
  },
  webPanelArrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F8",
  },
  webPanelTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    textTransform: "capitalize",
  },
  webWeekHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
    backgroundColor: "transparent",
  },
  webWeekHeaderText: {
    width: "14.2%",
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },
  webCalendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "transparent",
    alignSelf: "center",
    width: "100%",
  },
  webCalendarDay: {
    width: "14.2%",
    alignItems: "center",
    justifyContent: "center",
    height: 34,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: "transparent",
  },
  webCalendarDaySelected: {
    backgroundColor: "#e4715f",
  },
  webCalendarDayText: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "500",
  },
  webCalendarDayTextMuted: {
    color: "#9CA3AF",
  },
  webCalendarDayTextDisabled: {
    color: "#D1D5DB",
  },
  webCalendarDayTextSelected: {
    color: "#fff",
    fontWeight: "700",
  },
  webTimeColumns: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "transparent",
    marginTop: 8,
    width: "100%",
  },
  webTimeColumn: {
    flex: 1,
    backgroundColor: "transparent",
  },
  webTimeColumnLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 6,
  },
  webTimeScroll: {
    maxHeight: 140,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
    paddingVertical: 4,
  },
  webTimeOption: {
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
    marginHorizontal: 4,
    marginVertical: 2,
  },
  webTimeOptionSelected: {
    backgroundColor: "#e4715f",
  },
  webTimeOptionDisabled: {
    opacity: 0.35,
  },
  webTimeOptionText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "600",
  },
  webTimeOptionTextSelected: {
    color: "#fff",
  },
  webTimeOptionTextDisabled: {
    color: "#9CA3AF",
  },
  webPanelActions: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 12,
    backgroundColor: "transparent",
  },
  webPanelCancelText: {
    color: "#6B7280",
    fontWeight: "600",
  },
  webPanelApplyBtn: {
    borderRadius: 14,
    backgroundColor: "#e4715f",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  webPanelApplyText: {
    color: "#fff",
    fontWeight: "700",
  },
  meetingSubmitButton: {
    marginTop: 20,
    height: 46,
    borderRadius: 24,
    backgroundColor: "#e4715f",
    alignItems: "center",
    justifyContent: "center",
  },
  meetingSubmitPressed: {
    opacity: 0.85,
  },
  meetingSubmitDisabled: {
    opacity: 0.6,
  },
  meetingSubmitText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  meetingTypeRow: {
    marginTop: 4,
    marginBottom: 8,
  },
  meetingTypeCard: {
    backgroundColor: "#FBF7F4",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#F3F4F8",
    marginBottom: 8,
  },
  meetingTypeCardSelected: {
    borderColor: "#e4715f",
    backgroundColor: "#FFF7F4",
  },
  meetingTypeTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  meetingTypeTitleSelected: {
    color: "#e4715f",
  },
  meetingTypeSubtitle: {
    fontSize: 13,
    color: "#4B5563",
  },
  meetingTypePrice: {
    marginTop: 4,
    fontSize: 13,
    color: "#16a34a",
    fontWeight: "600",
  },
  meetingTypePriceFree: {
    marginTop: 4,
    fontSize: 13,
    color: "#16a34a",
    fontWeight: "600",
  },
  meetingTypePricePaid: {
    marginTop: 4,
    fontSize: 13,
    color: "#e4715f",
    fontWeight: "600",
  },
  meetingInputPlaceholder: {
    color: "#9CA3AF",
    fontSize: 14,
    marginLeft: 10,
  },
  inlinePickerCard: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F3F4F8",
    backgroundColor: "#FBF7F4",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  inlinePickerGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    backgroundColor: "transparent",
  },
  inlinePickerCol: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  inlinePickerLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
    marginBottom: 6,
  },
  inlinePickerButton: {
    width: 34,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  inlinePickerButtonText: {
    color: "#374151",
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 18,
  },
  inlinePickerValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginVertical: 8,
  },
  inlinePickerActions: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: "transparent",
    gap: 12,
  },
  inlinePickerCancel: {
    color: "#6B7280",
    fontWeight: "600",
  },
  inlinePickerApplyButton: {
    borderRadius: 14,
    backgroundColor: "#e4715f",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  inlinePickerApplyText: {
    color: "#fff",
    fontWeight: "700",
  },
  meetingFormCard: {
    maxHeight: "80%", // para que no tape toda la pantalla
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
  meetingFormScrollContent: {
    paddingBottom: 20, // espacio extra para el botón
  },
  formCloseButton: {
    backgroundColor: "#FFFFFF",
    padding: 6,
    borderRadius: 999,
  },
});
