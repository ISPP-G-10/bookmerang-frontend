import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  useColorScheme,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

import {
  createCommunityMeetup,
  updateCommunityMeetup,
  deleteCommunityMeetup,
  getCommunityMeetups,
  attendCommunityMeetup,
  cancelCommunityMeetupAttendance,
  getCommunityLibrary,
} from '@/lib/communityApi';
import { getMyLibrary, BookListItem } from '@/lib/books';
import { useAuth } from '@/contexts/AuthContext';
import { CommunityMeetupDto } from '@/types/community';
import { ConfirmModal } from '@/components/ConfirmationModal';
import FrameOverlay from '@/components/FrameOverlay';
import { getFrameById, getNameColorById } from '@/lib/rewardsSystem';

type Props = {
  communityId: number;
  meetingPointId?: number;
  meetingPointName?: string;
  meetingPointAddress?: string;
  canCreateMeetups?: boolean;
};

const MAX_MEETUP_ASSISTANTS = 10;
const AVATAR_PALETTE = ['#8D7451', '#4E5D75', '#9A6E4A', '#607D8B', '#8F5E6B'];
const MONTHS_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];
const WEEKDAYS_SHORT_ES = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const parseBackendDate = (value: string) => {
  // If backend sends no timezone suffix, treat it as UTC to avoid local-time drift.
  const hasTimezone = /Z$|[+-]\d{2}:\d{2}$/.test(value);
  return new Date(hasTimezone ? value : `${value}Z`);
};

const formatMeetupDate = (isoDate: string) => {
  const date = parseBackendDate(isoDate);
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
  }).format(date);
};

const formatMeetupTime = (isoDate: string) => {
  const date = parseBackendDate(isoDate);
  return new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
};

const formatDateForDisplay = (date: Date | null) => {
  if (!date) return '';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const formatTimeForDisplay = (date: Date | null) => {
  if (!date) return '';
  return new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
};

const toUtcIsoString = (date: Date) => date.toISOString();

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const getAvatarColor = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
};

const isSameCalendarDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const pad2 = (value: number) => value.toString().padStart(2, '0');

const isPastTimeForSelectedDate = (selectedDate: Date | null, hour: number, minute: number) => {
  if (!selectedDate) return false;

  const now = new Date();
  if (!isSameCalendarDay(selectedDate, now)) return false;

  const candidate = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    selectedDate.getDate(),
    hour,
    minute,
    0,
    0
  );

  return candidate < now;
};

export default function CommunityMeetupTab({
  communityId,
  meetingPointId,
  meetingPointName,
  meetingPointAddress,
  canCreateMeetups = false,
}: Props) {
  const { currentUserId } = useAuth();
  const colorScheme = useColorScheme();

  const [meetups, setMeetups] = useState<CommunityMeetupDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editingMeetup, setEditingMeetup] = useState<CommunityMeetupDto | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [attendanceActionMeetupId, setAttendanceActionMeetupId] = useState<number | null>(null);

  const [title, setTitle] = useState('');
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [descriptionInput, setDescriptionInput] = useState('');
  const [createFormFeedback, setCreateFormFeedback] = useState<string | null>(null);
  const [createFormFeedbackType, setCreateFormFeedbackType] = useState<'error' | 'success' | null>(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [webDateCursor, setWebDateCursor] = useState(new Date());
  const [webHourDraft, setWebHourDraft] = useState(new Date().getHours());
  const [webMinuteDraft, setWebMinuteDraft] = useState(new Date().getMinutes());
  const [attendModalVisible, setAttendModalVisible] = useState(false);
  const [selectedMeetupForAttendance, setSelectedMeetupForAttendance] = useState<CommunityMeetupDto | null>(null);
  const [myLibraryBooks, setMyLibraryBooks] = useState<BookListItem[]>([]);
  const [communityLikesByBookId, setCommunityLikesByBookId] = useState<Record<number, number>>({});
  const [loadingMyLibrary, setLoadingMyLibrary] = useState(false);
  const [selectedBookIdForAttendance, setSelectedBookIdForAttendance] = useState<number | null>(null);
  const [attendSubmitting, setAttendSubmitting] = useState(false);
  const [attendFeedback, setAttendFeedback] = useState<string | null>(null);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [meetupToCancel, setMeetupToCancel] = useState<CommunityMeetupDto | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const modalSheetTranslateY = useRef(new Animated.Value(32)).current;
  const modalSheetOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!createModalVisible) return;

    modalSheetTranslateY.setValue(32);
    modalSheetOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(modalSheetTranslateY, {
        toValue: 0,
        duration: 230,
        useNativeDriver: true,
      }),
      Animated.timing(modalSheetOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [createModalVisible, modalSheetOpacity, modalSheetTranslateY]);

  const fetchMeetups = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getCommunityMeetups(communityId);
      setMeetups(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudieron cargar las quedadas');
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useFocusEffect(
    useCallback(() => {
      fetchMeetups();
    }, [fetchMeetups])
  );

  const sortedMeetups = useMemo(
    () => [...meetups].sort((a, b) => +parseBackendDate(b.createdAt) - +parseBackendDate(a.createdAt)),
    [meetups]
  );

  const selectedDate = scheduledDate ? new Date(scheduledDate) : null;

  const calendarCells = useMemo(() => {
    const year = webDateCursor.getFullYear();
    const month = webDateCursor.getMonth();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: Array<{
      date: Date;
      inCurrentMonth: boolean;
      isSelected: boolean;
      disabled: boolean;
    }> = [];

    for (let i = firstWeekday - 1; i >= 0; i -= 1) {
      const d = new Date(year, month - 1, daysInPrevMonth - i);
      cells.push({
        date: d,
        inCurrentMonth: false,
        isSelected: !!selectedDate && isSameCalendarDay(d, selectedDate),
        disabled: d < todayStart,
      });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const d = new Date(year, month, day);
      cells.push({
        date: d,
        inCurrentMonth: true,
        isSelected: !!selectedDate && isSameCalendarDay(d, selectedDate),
        disabled: d < todayStart,
      });
    }

    while (cells.length < 42) {
      const nextDay = cells.length - (firstWeekday + daysInMonth) + 1;
      const d = new Date(year, month + 1, nextDay);
      cells.push({
        date: d,
        inCurrentMonth: false,
        isSelected: !!selectedDate && isSameCalendarDay(d, selectedDate),
        disabled: d < todayStart,
      });
    }

    return cells;
  }, [webDateCursor, selectedDate]);

  const resetCreateForm = () => {
    setEditingMeetup(null);
    setTitle('');
    setScheduledDate(null);
    setDescriptionInput('');
    setShowDatePicker(false);
    setShowTimePicker(false);
    setCreateFormFeedback(null);
    setCreateFormFeedbackType(null);
  };

  const openCreateModal = () => {
    resetCreateForm();
    setCreateModalVisible(true);
  };

  const openEditModal = (meetup: CommunityMeetupDto) => {
    setEditingMeetup(meetup);
    setTitle(meetup.title ?? '');
    setDescriptionInput(meetup.description ?? '');
    setScheduledDate(parseBackendDate(meetup.scheduledAt));
    setCreateFormFeedback(null);
    setCreateFormFeedbackType(null);
    setShowDatePicker(false);
    setShowTimePicker(false);
    setCreateModalVisible(true);
  };

  const closeCreateModal = () => {
    if (submitting) return;
    setCreateModalVisible(false);
    resetCreateForm();
  };

  const handleDateConfirm = (value: Date) => {
    if (scheduledDate) {
      const updated = new Date(value);
      updated.setHours(scheduledDate.getHours(), scheduledDate.getMinutes(), 0, 0);
      setScheduledDate(updated);
    } else {
      setScheduledDate(value);
    }
    setShowDatePicker(false);
  };

  const handleTimeConfirm = (value: Date) => {
    if (scheduledDate) {
      const updated = new Date(scheduledDate);
      updated.setHours(value.getHours(), value.getMinutes(), 0, 0);
      setScheduledDate(updated);
    } else {
      setScheduledDate(value);
    }
    setShowTimePicker(false);
  };

  const openDateSelector = () => {
    if (Platform.OS === 'web') {
      setWebDateCursor(selectedDate ?? new Date());
      setShowDatePicker((prev) => !prev);
      setShowTimePicker(false);
      return;
    }
    setShowDatePicker(true);
  };

  const openTimeSelector = () => {
    if (Platform.OS === 'web') {
      setWebHourDraft(selectedDate?.getHours() ?? new Date().getHours());
      setWebMinuteDraft(selectedDate?.getMinutes() ?? new Date().getMinutes());
      setShowTimePicker((prev) => !prev);
      setShowDatePicker(false);
      return;
    }
    setShowTimePicker(true);
  };

  const moveCalendarMonth = (delta: number) => {
    setWebDateCursor((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  const pickCalendarDate = (date: Date, disabled: boolean) => {
    if (disabled) return;
    handleDateConfirm(date);
    setWebDateCursor(new Date(date.getFullYear(), date.getMonth(), 1));
  };

  const applyWebTimeSelection = () => {
    if (isPastTimeForSelectedDate(selectedDate, webHourDraft, webMinuteDraft)) {
      const message = 'Para hoy, elige una hora igual o posterior a la actual.';
      setCreateFormFeedback(message);
      setCreateFormFeedbackType('error');
      return;
    }

    const base = selectedDate ?? new Date();
    const updated = new Date(base);
    updated.setHours(webHourDraft, webMinuteDraft, 0, 0);
    handleTimeConfirm(updated);
  };

  const isCurrentUserAttending = useCallback(
    (meetup: CommunityMeetupDto) => (meetup.attendees ?? []).some((a) => a.userId === currentUserId),
    [currentUserId]
  );

  const closeAttendModal = () => {
    if (attendSubmitting) return;
    setAttendModalVisible(false);
    setSelectedMeetupForAttendance(null);
    setSelectedBookIdForAttendance(null);
    setCommunityLikesByBookId({});
    setAttendFeedback(null);
  };

  const openAttendModal = async (meetup: CommunityMeetupDto) => {
    setAttendModalVisible(true);
    setSelectedMeetupForAttendance(meetup);
    setSelectedBookIdForAttendance(null);
    setAttendFeedback(null);

    try {
      setLoadingMyLibrary(true);
      const [myBooksResult, communityLibraryResult] = await Promise.allSettled([
        getMyLibrary(100),
        getCommunityLibrary(communityId, 1, 250),
      ]);

      let likesMap: Record<number, number> = {};

      if (communityLibraryResult.status === 'fulfilled') {
        communityLibraryResult.value.forEach((entry) => {
          if (!currentUserId || entry.ownerId === currentUserId) {
            likesMap[entry.bookId] = entry.likesCount ?? 0;
          }
        });
        setCommunityLikesByBookId(likesMap);
      } else {
        setCommunityLikesByBookId({});
      }

      if (myBooksResult.status === 'rejected') {
        throw myBooksResult.reason;
      }

      const booksWithPreference = [...myBooksResult.value].sort((a, b) => {
        const likesA = likesMap[a.id] ?? 0;
        const likesB = likesMap[b.id] ?? 0;
        return likesB - likesA;
      });

      setMyLibraryBooks(booksWithPreference);
      if (booksWithPreference.length === 0) {
        setAttendFeedback('No tienes libros publicados para llevar a la quedada.');
      }
    } catch (error: any) {
      setMyLibraryBooks([]);
      setAttendFeedback(error?.message || 'No se pudo cargar tu biblioteca.');
    } finally {
      setLoadingMyLibrary(false);
    }
  };

  const handleConfirmAttend = async () => {
    if (!selectedMeetupForAttendance) return;
    if (!selectedBookIdForAttendance) {
      setAttendFeedback('Debes seleccionar un libro para apuntarte.');
      return;
    }

    try {
      setAttendSubmitting(true);
      setAttendanceActionMeetupId(selectedMeetupForAttendance.id);
      setAttendFeedback(null);

      await attendCommunityMeetup(communityId, selectedMeetupForAttendance.id, {
        selectedBookId: selectedBookIdForAttendance,
      });

      closeAttendModal();
      await fetchMeetups();
      if (Platform.OS !== 'web') Alert.alert('Listo', 'Te has apuntado correctamente a la quedada.');
    } catch (error: any) {
      setAttendFeedback(error?.message || 'No se pudo confirmar tu asistencia.');
    } finally {
      setAttendSubmitting(false);
      setAttendanceActionMeetupId(null);
    }
  };

  const executeCancelAttendance = async (meetup: CommunityMeetupDto) => {
    try {
      setAttendanceActionMeetupId(meetup.id);
      await cancelCommunityMeetupAttendance(communityId, meetup.id);
      await fetchMeetups();
      if (Platform.OS !== 'web') Alert.alert('Asistencia cancelada', 'Has cancelado tu asistencia.');
    } catch (error: any) {
      const message = error?.message || 'No se pudo cancelar la asistencia';
      if (Platform.OS !== 'web') {
        Alert.alert('Error', message);
      } else {
        setAttendFeedback(message);
      }
    } finally {
      setAttendanceActionMeetupId(null);
    }
  };

  const handleCancelAttendance = (meetup: CommunityMeetupDto) => {
    setMeetupToCancel(meetup);
    setCancelModalVisible(true);
  };

  const closeCancelModal = () => {
    if (attendanceActionMeetupId !== null) return;
    setCancelModalVisible(false);
    setMeetupToCancel(null);
  };

  const confirmCancelAttendance = async () => {
    if (!meetupToCancel) return;
    await executeCancelAttendance(meetupToCancel);
    setCancelModalVisible(false);
    setMeetupToCancel(null);
  };

  const handleSubmitCreateMeetup = async () => {
    if (!canCreateMeetups) {
      const message = 'Solo el creador o los moderadores pueden crear quedadas.';
      setCreateFormFeedback(message);
      setCreateFormFeedbackType('error');
      if (Platform.OS !== 'web') Alert.alert('Sin permisos', message);
      return;
    }

    setCreateFormFeedback(null);
    setCreateFormFeedbackType(null);

    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      const message = 'Debes introducir un título para la quedada.';
      setCreateFormFeedback(message);
      setCreateFormFeedbackType('error');
      if (Platform.OS !== 'web') Alert.alert('Campo obligatorio', message);
      return;
    }

    if (!scheduledDate) {
      const message = 'Debes seleccionar fecha y hora para la quedada.';
      setCreateFormFeedback(message);
      setCreateFormFeedbackType('error');
      if (Platform.OS !== 'web') Alert.alert('Campo obligatorio', message);
      return;
    }

    if (+scheduledDate <= +new Date()) {
      const message = 'La quedada debe programarse en una fecha futura.';
      setCreateFormFeedback(message);
      setCreateFormFeedbackType('error');
      if (Platform.OS !== 'web') Alert.alert('Fecha no válida', message);
      return;
    }

    try {
      const isEditing = !!editingMeetup;
      setSubmitting(true);
      setCreateFormFeedback(isEditing ? 'Actualizando quedada...' : 'Creando quedada...');
      setCreateFormFeedbackType('success');

      const payload = {
        title: normalizedTitle,
        description: descriptionInput.trim() || undefined,
        otherBookSpotId: meetingPointId,
        scheduledAt: toUtcIsoString(scheduledDate),
      };

      if (isEditing && editingMeetup) {
        await updateCommunityMeetup(communityId, editingMeetup.id, payload);
      } else {
        await createCommunityMeetup(communityId, payload);
      }

      setCreateFormFeedback(isEditing ? 'La quedada se ha actualizado correctamente.' : 'La quedada se ha creado correctamente.');
      setCreateFormFeedbackType('success');
      setCreateModalVisible(false);
      resetCreateForm();
      await fetchMeetups();
      if (Platform.OS !== 'web') {
        Alert.alert(
          isEditing ? 'Quedada actualizada' : 'Quedada creada',
          isEditing ? 'La quedada se ha actualizado correctamente.' : 'La quedada se ha creado correctamente.'
        );
      }
    } catch (error: any) {
      const message = error?.message || (editingMeetup ? 'No se pudo actualizar la quedada' : 'No se pudo crear la quedada');
      setCreateFormFeedback(message);
      setCreateFormFeedbackType('error');
      console.error('[CommunityMeetupTab] Error al guardar quedada:', error);
      if (Platform.OS !== 'web') Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMeetup = () => {
    if (!editingMeetup) return;
    setDeleteModalVisible(true);
  };

  const closeDeleteModal = () => {
    if (submitting) return;
    setDeleteModalVisible(false);
  };

  const confirmDeleteMeetup = async () => {
    if (!editingMeetup) return;

    try {
      setSubmitting(true);
      await deleteCommunityMeetup(communityId, editingMeetup.id);
      setDeleteModalVisible(false);
      setCreateModalVisible(false);
      resetCreateForm();
      await fetchMeetups();
      if (Platform.OS !== 'web') Alert.alert('Quedada cancelada', 'La quedada se ha cancelado correctamente.');
    } catch (error: any) {
      const message = error?.message || 'No se pudo cancelar la quedada';
      if (Platform.OS !== 'web') Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderMeetupCard = ({ item }: { item: CommunityMeetupDto }) => {
    const attendees = item.attendees ?? [];
    const displayedAttendees = attendees.slice(0, MAX_MEETUP_ASSISTANTS);
    const isAttending = isCurrentUserAttending(item);
    const isAttendanceActionLoading = attendanceActionMeetupId === item.id;
    const isPastMeetup = +parseBackendDate(item.scheduledAt) <= Date.now();
    const isJoinButtonDisabled = isAttendanceActionLoading || isPastMeetup;

    return (
      <View style={styles.meetupCard}>
        <View style={styles.meetupHeaderRow}>
          <Text style={styles.meetupTitle}>{item.title}</Text>
          {canCreateMeetups && !isPastMeetup ? (
            <View style={styles.meetupAdminActions}>
              <Pressable style={styles.meetupAdminIconBtn} onPress={() => openEditModal(item)}>
                <Ionicons name='pencil' size={15} color='#5f6b7a'/>
                <Text style={styles.meetupAdminIconText}>Editar</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        <View style={styles.meetupMetaRow}>
          <View style={styles.meetupMetaItem}>
            <Ionicons name='calendar-outline' size={16} color='#d77761' />
            <Text style={styles.metaText}>{formatMeetupDate(item.scheduledAt)}</Text>
          </View>

          <View style={styles.meetupMetaItem}>
            <Ionicons name='time-outline' size={16} color='#8a8a8a' />
            <Text style={styles.metaText}>{formatMeetupTime(item.scheduledAt)}</Text>
          </View>
        </View>

        {!!item.description && <Text style={styles.meetupDescription}>{item.description}</Text>}

        <View style={styles.attendeesHeaderRow}>
          <Text style={styles.attendeesTitle}>
            Asistentes ({Math.min(attendees.length, MAX_MEETUP_ASSISTANTS)}/{MAX_MEETUP_ASSISTANTS})
          </Text>
        </View>

        {displayedAttendees.length === 0 ? (
          <View style={styles.emptyAttendeesCard}>
            <Text style={styles.emptyAttendeesText}>Aún no hay asistentes apuntados</Text>
          </View>
        ) : (
          <View style={styles.attendeesList}>
            {displayedAttendees.map((attendee) => {
              const frame = attendee.activeFrameId ? getFrameById(attendee.activeFrameId) : undefined;
              const frameColor = frame?.animationColors?.[0] ?? frame?.borderColor ?? null;
              const bw = frame?.borderWidth ?? 0;
              const nameColor = attendee.activeColorId ? getNameColorById(attendee.activeColorId) : undefined;
              return (
              <View key={attendee.userId} style={styles.attendeeRow}>
                {/* Avatar con marco superpuesto (position absolute, no afecta layout) */}
                <View style={{ width: 42, height: 42 }}>
                  <View
                    style={[
                      styles.attendeeAvatar,
                      {
                        backgroundColor:
                          attendee.userId === currentUserId ? '#D77B63' : getAvatarColor(attendee.userId),
                      },
                    ]}
                  >
                    <Text style={styles.attendeeAvatarText}>
                      {attendee.userId === currentUserId ? 'TU' : getInitials(attendee.username)}
                    </Text>
                  </View>
                  {frame && frameColor && (
                    <FrameOverlay size={42} bw={bw} gap={2} color={frameColor} animated={frame.animated} />
                  )}
                </View>

                <View style={styles.attendeeInfo}>
                  <Text
                    style={[
                      styles.attendeeName,
                      nameColor ? { color: nameColor.color } : undefined,
                    ]}
                    numberOfLines={1}
                  >
                    {attendee.userId === currentUserId ? 'Tú' : attendee.username}
                  </Text>
                  <View style={styles.attendeeBookRow}>
                    <Ionicons name='book-outline' size={14} color='#CF755E' />
                    <Text style={styles.attendeeBook} numberOfLines={1}>
                      {attendee.selectedBookTitle || 'Libro sin título'}
                    </Text>
                  </View>
                </View>
              </View>
              );
            })}
          </View>
        )}

        <Pressable
          style={[
            styles.joinButton,
            isAttending && styles.cancelAttendanceButton,
            isJoinButtonDisabled && styles.joinButtonDisabled,
          ]}
          onPress={() => {
            if (isJoinButtonDisabled) return;
            if (isAttending) {
              handleCancelAttendance(item);
            } else {
              void openAttendModal(item);
            }
          }}
          disabled={isJoinButtonDisabled}
        >
          {isAttendanceActionLoading ? (
            <ActivityIndicator size='small' color={isAttending ? '#fff' : '#d77761'} />
          ) : (
            <Text
              style={[
                styles.joinButtonText,
                isAttending && styles.cancelAttendanceButtonText,
                isJoinButtonDisabled && styles.joinButtonTextDisabled,
              ]}
            >
              {isPastMeetup ? 'Quedada finalizada' : isAttending ? 'Cancelar asistencia' : 'Apuntarme y elegir libro'}
            </Text>
          )}
        </Pressable>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size='large' color='#e4715f' />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.stickyMeetingPointWrap}>
        <View style={styles.meetingPointCard}>
          <View style={styles.meetingPointIconWrap}>
            <Ionicons name='cafe-outline' size={20} color='#d77761' />
          </View>

          <View style={styles.meetingPointTextWrap}>
            <Text style={styles.meetingPointLabel}>Punto de encuentro</Text>
            <Text style={styles.meetingPointName} numberOfLines={1}>
              {meetingPointName || 'Bookspot de la comunidad'}
            </Text>
            <View style={styles.addressRow}>
              <Ionicons name='location-outline' size={14} color='#8a8a8a' />
              <Text style={styles.meetingPointAddress} numberOfLines={1}>
                {meetingPointAddress || 'Dirección pendiente de confirmar'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {canCreateMeetups ? (
        <View style={styles.createButtonWrap}>
          <Pressable style={styles.createButton} onPress={openCreateModal}>
            <Ionicons name='add' size={22} color='#fff' />
            <Text style={styles.createButtonText}>Crear nueva quedada</Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={sortedMeetups}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={sortedMeetups.length === 0 ? styles.emptyContainer : styles.listContent}
        ListHeaderComponent={null}
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Ionicons name='calendar-clear-outline' size={48} color='#d1d5db' />
            <Text style={styles.emptyText}>Todavía no hay quedadas programadas</Text>
          </View>
        }
        renderItem={renderMeetupCard}
      />

      <Modal visible={createModalVisible} animationType='fade' transparent onRequestClose={closeCreateModal}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboardAvoiding}
          >
            <Animated.View
              style={[
                styles.modalSheet,
                {
                  opacity: modalSheetOpacity,
                  transform: [{ translateY: modalSheetTranslateY }],
                },
              ]}
            >
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps='handled'>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{editingMeetup ? 'Editar quedada' : 'Nueva quedada'}</Text>
                  <View style={styles.modalSpotRow}>
                    <Ionicons name='cafe-outline' size={14} color='#d77761' />
                    <Text style={styles.modalSpotText}>en {meetingPointName || 'Bookspot de la comunidad'}</Text>
                  </View>
                </View>

                <View style={styles.formBody}>
                  <Text style={styles.fieldLabel}>Título *</Text>
                  <TextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder='Ej: Intercambio de fantasía'
                    placeholderTextColor='#a6a2a0'
                    style={styles.input}
                    maxLength={120}
                  />

                  <View style={styles.rowFields}>
                    <View style={styles.halfField}>
                      <Text style={styles.fieldLabel}>Fecha *</Text>
                      <Pressable style={styles.dateTimeInput} onPress={openDateSelector}>
                        <Ionicons name='calendar-outline' size={20} color='#d77761' />
                        <Text style={[styles.dateTimeText, !scheduledDate && styles.dateTimePlaceholder]}>
                          {scheduledDate ? formatDateForDisplay(scheduledDate) : 'Seleccionar fecha'}
                        </Text>
                        <Ionicons name={showDatePicker ? 'chevron-up' : 'chevron-down'} size={14} color='#7a7a7a' />
                      </Pressable>

                      {Platform.OS === 'web' && showDatePicker && (
                        <View style={styles.webPanelCard}>
                          <View style={styles.webPanelHeader}>
                            <Pressable style={styles.webPanelArrowBtn} onPress={() => moveCalendarMonth(-1)}>
                              <Ionicons name='chevron-back' size={14} color='#4B5563' />
                            </Pressable>
                            <Text style={styles.webPanelTitle}>
                              {MONTHS_ES[webDateCursor.getMonth()]} {webDateCursor.getFullYear()}
                            </Text>
                            <Pressable style={styles.webPanelArrowBtn} onPress={() => moveCalendarMonth(1)}>
                              <Ionicons name='chevron-forward' size={14} color='#4B5563' />
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
                                style={[styles.webCalendarDay, cell.isSelected && styles.webCalendarDaySelected]}
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
                    </View>

                    <View style={styles.halfField}>
                      <Text style={styles.fieldLabel}>Hora *</Text>
                      <Pressable style={styles.dateTimeInput} onPress={openTimeSelector}>
                        <Ionicons name='time-outline' size={20} color='#d77761' />
                        <Text style={[styles.dateTimeText, !scheduledDate && styles.dateTimePlaceholder]}>
                          {scheduledDate ? formatTimeForDisplay(scheduledDate) : 'Seleccionar hora'}
                        </Text>
                        <Ionicons name={showTimePicker ? 'chevron-up' : 'chevron-down'} size={14} color='#7a7a7a' />
                      </Pressable>

                      {Platform.OS === 'web' && showTimePicker && (
                        <View style={styles.webPanelCard}>
                          <Text style={styles.webPanelTitle}>Selecciona la hora</Text>
                          <View style={styles.webTimeColumns}>
                            <View style={styles.webTimeColumn}>
                              <Text style={styles.webTimeColumnLabel}>Hora</Text>
                              <ScrollView style={styles.webTimeScroll} showsVerticalScrollIndicator={false}>
                                {Array.from({ length: 24 }, (_, hour) => (
                                  <Pressable
                                    key={`hour-${hour}`}
                                    disabled={isPastTimeForSelectedDate(selectedDate, hour, 59)}
                                    style={[
                                      styles.webTimeOption,
                                      webHourDraft === hour && styles.webTimeOptionSelected,
                                      isPastTimeForSelectedDate(selectedDate, hour, 59) && styles.webTimeOptionDisabled,
                                    ]}
                                    onPress={() => {
                                      if (isPastTimeForSelectedDate(selectedDate, hour, 59)) return;
                                      setWebHourDraft(hour);
                                      if (isPastTimeForSelectedDate(selectedDate, hour, webMinuteDraft)) {
                                        const nextValidMinute = Array.from({ length: 60 }, (_, m) => m).find(
                                          (m) => !isPastTimeForSelectedDate(selectedDate, hour, m)
                                        );
                                        if (typeof nextValidMinute === 'number') setWebMinuteDraft(nextValidMinute);
                                      }
                                    }}
                                  >
                                    <Text
                                      style={[
                                        styles.webTimeOptionText,
                                        webHourDraft === hour && styles.webTimeOptionTextSelected,
                                        isPastTimeForSelectedDate(selectedDate, hour, 59) && styles.webTimeOptionTextDisabled,
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
                                {Array.from({ length: 60 }, (_, minute) => (
                                  <Pressable
                                    key={`minute-${minute}`}
                                    disabled={isPastTimeForSelectedDate(selectedDate, webHourDraft, minute)}
                                    style={[
                                      styles.webTimeOption,
                                      webMinuteDraft === minute && styles.webTimeOptionSelected,
                                      isPastTimeForSelectedDate(selectedDate, webHourDraft, minute) &&
                                      styles.webTimeOptionDisabled,
                                    ]}
                                    onPress={() => setWebMinuteDraft(minute)}
                                  >
                                    <Text
                                      style={[
                                        styles.webTimeOptionText,
                                        webMinuteDraft === minute && styles.webTimeOptionTextSelected,
                                        isPastTimeForSelectedDate(selectedDate, webHourDraft, minute) &&
                                        styles.webTimeOptionTextDisabled,
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
                            <Pressable onPress={() => setShowTimePicker(false)}>
                              <Text style={styles.webPanelCancelText}>Cancelar</Text>
                            </Pressable>
                            <Pressable style={styles.webPanelApplyBtn} onPress={applyWebTimeSelection}>
                              <Text style={styles.webPanelApplyText}>Aplicar</Text>
                            </Pressable>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>

                  <Text style={styles.fieldLabel}>Descripción</Text>
                  <TextInput
                    value={descriptionInput}
                    onChangeText={setDescriptionInput}
                    placeholder='¿De qué va esta quedada?'
                    placeholderTextColor='#a6a2a0'
                    style={[styles.input, styles.textArea]}
                    multiline
                    textAlignVertical='top'
                    maxLength={600}
                  />

                  {!!createFormFeedback && (
                    <View
                      style={[
                        styles.formFeedbackBox,
                        createFormFeedbackType === 'error' ? styles.formFeedbackError : styles.formFeedbackSuccess,
                      ]}
                    >
                      <Text
                        style={[
                          styles.formFeedbackText,
                          createFormFeedbackType === 'error'
                            ? styles.formFeedbackTextError
                            : styles.formFeedbackTextSuccess,
                        ]}
                      >
                        {createFormFeedback}
                      </Text>
                    </View>
                  )}
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                {editingMeetup ? (
                  <Pressable
                    style={[styles.actionBtn, styles.deleteInEditBtn, submitting && styles.submitBtnDisabled]}
                    onPress={handleDeleteMeetup}
                    disabled={submitting}
                  >
                    <Text style={styles.deleteInEditBtnText}>Cancelar quedada</Text>
                  </Pressable>
                ) : null}

                <Pressable style={[styles.actionBtn, styles.cancelBtn]} onPress={closeCreateModal} disabled={submitting}>
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </Pressable>

                <Pressable
                  style={[styles.actionBtn, styles.submitBtn, submitting && styles.submitBtnDisabled]}
                  onPress={handleSubmitCreateMeetup}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size='small' color='#fff' />
                  ) : (
                    <Text style={styles.submitBtnText}>{editingMeetup ? 'Guardar cambios' : 'Crear quedada'}</Text>
                  )}
                </Pressable>
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>

        <DateTimePickerModal
          isVisible={Platform.OS !== 'web' && showDatePicker}
          mode='date'
          locale='es-ES'
          minimumDate={new Date()}
          themeVariant={colorScheme ?? 'light'}
          onConfirm={handleDateConfirm}
          onCancel={() => setShowDatePicker(false)}
        />

        <DateTimePickerModal
          isVisible={Platform.OS !== 'web' && showTimePicker}
          mode='time'
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          locale='es-ES'
          is24Hour
          themeVariant={colorScheme ?? 'light'}
          onConfirm={handleTimeConfirm}
          onCancel={() => setShowTimePicker(false)}
        />
      </Modal>

      <Modal visible={attendModalVisible} animationType='fade' transparent onRequestClose={closeAttendModal}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboardAvoiding}
          >
            <View style={styles.attendModalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Apuntarme a la quedada</Text>
                {!!selectedMeetupForAttendance && (
                  <Text style={styles.attendModalSubtitle}>
                    {selectedMeetupForAttendance.title} · {formatMeetupDate(selectedMeetupForAttendance.scheduledAt)}
                  </Text>
                )}
              </View>

              <ScrollView style={styles.attendBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps='handled'>
                {loadingMyLibrary ? (
                  <View style={styles.centeredLoaderRow}>
                    <ActivityIndicator size='small' color='#d77761' />
                    <Text style={styles.loaderText}>Cargando tu biblioteca...</Text>
                  </View>
                ) : myLibraryBooks.length === 0 ? (
                  <View style={styles.emptyAttendeesCard}>
                    <Text style={styles.emptyAttendeesText}>No tienes libros publicados para elegir.</Text>
                  </View>
                ) : (
                  <View style={styles.selectBookList}>
                    {myLibraryBooks.map((book) => {
                      const isSelected = selectedBookIdForAttendance === book.id;
                      const likesCount = communityLikesByBookId[book.id] ?? 0;
                      return (
                        <Pressable
                          key={book.id}
                          style={[styles.selectBookRow, isSelected && styles.selectBookRowSelected]}
                          onPress={() => {
                            setSelectedBookIdForAttendance(book.id);
                            setAttendFeedback(null);
                          }}
                        >
                          <View style={styles.selectBookIconWrap}>
                            <Ionicons name='book-outline' size={18} color='#d77761' />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.selectBookTitle} numberOfLines={1}>
                              {book.titulo || book.title || 'Libro sin título'}
                            </Text>
                            <Text style={styles.selectBookAuthor} numberOfLines={1}>
                              {book.autor || book.author || 'Autor desconocido'}
                            </Text>
                            {likesCount > 0 && (
                              <View style={styles.selectBookLikesRow}>
                                <Ionicons name='heart' size={12} color='#d77761' />
                                <Text style={styles.selectBookLikesText}>
                                  {likesCount} like{likesCount === 1 ? '' : 's'} en la comunidad
                                </Text>
                              </View>
                            )}
                          </View>
                          {isSelected && <Ionicons name='checkmark-circle' size={20} color='#d77761' />}
                        </Pressable>
                      );
                    })}
                  </View>
                )}

                {!!attendFeedback && (
                  <View style={[styles.formFeedbackBox, styles.formFeedbackError]}>
                    <Text style={[styles.formFeedbackText, styles.formFeedbackTextError]}>{attendFeedback}</Text>
                  </View>
                )}
              </ScrollView>

              <View style={styles.modalActions}>
                <Pressable style={[styles.actionBtn, styles.cancelBtn]} onPress={closeAttendModal} disabled={attendSubmitting}>
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.actionBtn,
                    styles.submitBtn,
                    (!selectedBookIdForAttendance || attendSubmitting || myLibraryBooks.length === 0) && styles.submitBtnDisabled,
                  ]}
                  onPress={handleConfirmAttend}
                  disabled={!selectedBookIdForAttendance || attendSubmitting || myLibraryBooks.length === 0}
                >
                  {attendSubmitting ? (
                    <ActivityIndicator size='small' color='#fff' />
                  ) : (
                    <Text style={styles.submitBtnText}>Confirmar</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <ConfirmModal
        visible={cancelModalVisible}
        title='Cancelar asistencia'
        message={
          meetupToCancel
            ? `¿Seguro que quieres cancelar tu asistencia a "${meetupToCancel.title}"?`
            : '¿Seguro que quieres cancelar tu asistencia a esta quedada?'
        }
        confirmLabel='Sí, cancelar'
        cancelLabel='No'
        confirmColor='danger'
        onCancel={closeCancelModal}
        onConfirm={confirmCancelAttendance}
      />

      <ConfirmModal
        visible={deleteModalVisible}
        title='Cancelar quedada'
        message={
          editingMeetup
            ? `¿Seguro que quieres cancelar la quedada "${editingMeetup.title}"?`
            : '¿Seguro que quieres cancelar esta quedada?'
        }
        confirmLabel='Sí, cancelar'
        cancelLabel='No'
        confirmColor='danger'
        onCancel={closeDeleteModal}
        onConfirm={confirmDeleteMeetup}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  emptyContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  stickyMeetingPointWrap: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 6,
    backgroundColor: '#fdfbf7',
    zIndex: 2,
  },
  meetingPointCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f0e9df',
    alignItems: 'center',
  },
  meetingPointIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#f8eee8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  meetingPointTextWrap: {
    flex: 1,
  },
  meetingPointLabel: {
    color: '#a8705f',
    fontSize: 14,
    marginBottom: 2,
  },
  meetingPointName: {
    color: '#2b2b2b',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 1,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  meetingPointAddress: {
    color: '#6d6d6d',
    fontSize: 14,
    marginLeft: 4,
    flex: 1,
  },
  createButtonWrap: {
    paddingHorizontal: 16,
  },
  createButton: {
    backgroundColor: '#d77761',
    borderRadius: 18,
    marginTop: 3,
    marginBottom: 8,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  createRestrictedInfo: {
    marginTop: 14,
    marginBottom: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ece6df',
    backgroundColor: '#f6f3ef',
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  createRestrictedInfoText: {
    color: '#6f6f6f',
    fontSize: 13,
    flex: 1,
  },
  meetupCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#f0e9df',
    padding: 18,
  },
  meetupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 10,
  },
  meetupTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#2f2f2f',
    flex: 1,
  },
  meetupAdminActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  meetupAdminIconBtn: {
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f4f0eb',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 10,
    gap: 4,
  },
  meetupAdminIconText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5f6b7a',
  },
  meetupMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 14,
    flexWrap: 'wrap',
  },
  meetupMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: '#7a7a7a',
    fontSize: 14,
  },
  meetupDescription: {
    color: '#555',
    fontSize: 16,
    lineHeight: 23,
    marginBottom: 12,
  },
  attendeesHeaderRow: {
    marginBottom: 8,
  },
  attendeesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2f2f2f',
  },
  emptyAttendeesCard: {
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 14,
    backgroundColor: '#f5f2ef',
    marginBottom: 12,
  },
  emptyAttendeesText: {
    color: '#7a7a7a',
    fontSize: 14,
  },
  attendeesList: {
    gap: 10,
    marginBottom: 12,
  },
  attendeeRow: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f1efed',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  attendeeAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendeeAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  attendeeInfo: {
    flex: 1,
  },
  attendeeName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#243652',
    marginBottom: 3,
  },
  attendeeBookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attendeeBook: {
    fontSize: 14,
    color: '#7F675A',
    flex: 1,
  },
  joinButton: {
    borderRadius: 14,
    backgroundColor: '#f5f2ef',
    paddingVertical: 14,
    alignItems: 'center',
  },
  joinButtonDisabled: {
    backgroundColor: '#ebe7e4',
    opacity: 0.85,
  },
  cancelAttendanceButton: {
    backgroundColor: '#d77761',
  },
  joinButtonText: {
    color: '#d77761',
    fontSize: 15,
    fontWeight: '700',
  },
  joinButtonTextDisabled: {
    color: '#9a918d',
  },
  cancelAttendanceButtonText: {
    color: '#fff',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 12,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalKeyboardAvoiding: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fdfbf7',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    width: '100%',
    maxHeight: '88%',
    overflow: 'hidden',
  },
  attendModalSheet: {
    backgroundColor: '#fdfbf7',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    width: '100%',
    maxHeight: '82%',
    overflow: 'hidden',
  },
  attendModalSubtitle: {
    fontSize: 14,
    color: '#7F675A',
    marginTop: 4,
  },
  attendBody: {
    paddingHorizontal: 16,
    paddingTop: 12,
    maxHeight: 380,
  },
  centeredLoaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  loaderText: {
    color: '#7a7a7a',
    fontSize: 14,
  },
  selectBookList: {
    gap: 10,
    marginBottom: 10,
  },
  selectBookRow: {
    borderRadius: 16,
    backgroundColor: '#f1efed',
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectBookRowSelected: {
    borderColor: '#d77761',
    backgroundColor: '#fff3ef',
  },
  selectBookIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#efe3dd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectBookTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#243652',
    marginBottom: 2,
  },
  selectBookAuthor: {
    fontSize: 13,
    color: '#7F675A',
  },
  selectBookLikesRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  selectBookLikesText: {
    fontSize: 12,
    color: '#8b5e50',
    fontWeight: '600',
  },
  modalHeader: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e1d7',
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#2f2f2f',
    marginBottom: 6,
  },
  modalSpotRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalSpotText: {
    fontSize: 16,
    color: '#835f50',
    marginLeft: 6,
  },
  formBody: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3a312c',
    marginBottom: 8,
  },
  input: {
    height: 56,
    backgroundColor: '#f1eeeb',
    borderRadius: 16,
    paddingHorizontal: 18,
    fontSize: 15,
    color: '#2f2f2f',
    marginBottom: 16,
  },
  textArea: {
    height: 120,
    paddingTop: 16,
    paddingBottom: 16,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  dateTimeInput: {
    height: 56,
    backgroundColor: '#f1eeeb',
    borderRadius: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  dateTimeText: {
    flex: 1,
    fontSize: 15,
    color: '#2f2f2f',
    fontWeight: '500',
  },
  dateTimePlaceholder: {
    color: '#a6a2a0',
  },
  modalActions: {
    borderTopWidth: 1,
    borderTopColor: '#e8e1d7',
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#d6d9df',
  },
  cancelBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#243652',
  },
  submitBtn: {
    backgroundColor: '#d77761',
  },
  deleteInEditBtn: {
    backgroundColor: '#EF4444',
  },
  deleteInEditBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  formFeedbackBox: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  formFeedbackError: {
    backgroundColor: '#FDECEC',
    borderWidth: 1,
    borderColor: '#F8C8C8',
  },
  formFeedbackSuccess: {
    backgroundColor: '#ECFDF3',
    borderWidth: 1,
    borderColor: '#B7E7C9',
  },
  formFeedbackText: {
    fontSize: 13,
    fontWeight: '600',
  },
  formFeedbackTextError: {
    color: '#A33A3A',
  },
  formFeedbackTextSuccess: {
    color: '#236B42',
  },
  webPanelCard: {
    marginTop: 4,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F3F4F8',
    backgroundColor: '#fff',
    padding: 10,
    width: '100%',
  },
  webPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  webPanelArrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F8',
  },
  webPanelTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    textTransform: 'capitalize',
  },
  webWeekHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  webWeekHeaderText: {
    width: '14.2%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  webCalendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  webCalendarDay: {
    width: '14.2%',
    alignItems: 'center',
    justifyContent: 'center',
    height: 34,
    borderRadius: 8,
    marginBottom: 4,
  },
  webCalendarDaySelected: {
    backgroundColor: '#e4715f',
  },
  webCalendarDayText: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
  },
  webCalendarDayTextMuted: {
    color: '#9CA3AF',
  },
  webCalendarDayTextDisabled: {
    color: '#D1D5DB',
  },
  webCalendarDayTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  webTimeColumns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    width: '100%',
  },
  webTimeColumn: {
    flex: 1,
  },
  webTimeColumnLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 6,
  },
  webTimeScroll: {
    maxHeight: 140,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    paddingVertical: 4,
  },
  webTimeOption: {
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
    marginVertical: 2,
  },
  webTimeOptionSelected: {
    backgroundColor: '#e4715f',
  },
  webTimeOptionDisabled: {
    opacity: 0.35,
  },
  webTimeOptionText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
  },
  webTimeOptionTextSelected: {
    color: '#fff',
  },
  webTimeOptionTextDisabled: {
    color: '#9CA3AF',
  },
  webPanelActions: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
  },
  webPanelCancelText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  webPanelApplyBtn: {
    borderRadius: 14,
    backgroundColor: '#e4715f',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  webPanelApplyText: {
    color: '#fff',
    fontWeight: '700',
  },
});
