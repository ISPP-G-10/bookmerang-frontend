import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  Image,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import {
  getChat,
  getMessages,
  sendMessage as apiSendMessage,
  getTypingUsers,
  startTyping,
  stopTyping,
} from '@/lib/chatApi';
import { useAuth } from '@/contexts/AuthContext';
import { fetchMyBackendUser } from '@/lib/api';
import {
  ChatDto,
  ChatParticipantDto,
  MessageDto,
  TypingUserDto,
} from '@/types/chat';

type Props = {
  communityId: number;
  chatId: string;
};

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function CommunityChatTab({ communityId, chatId }: Props) {
  const { currentUserId, backendUserId, setBackendUserId } = useAuth();

  const [chat, setChat] = useState<ChatDto | null>(null);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [inputText, setInputText] = useState('');
  const [typingUsers, setTypingUsers] = useState<TypingUserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Resolve backendUserId FIRST if not available (critical for message ownership)
      let resolvedBackendUserId = backendUserId;
      if (!resolvedBackendUserId) {
        try {
          const me = await fetchMyBackendUser();
          if (me?.id) {
            setBackendUserId(me.id);
            resolvedBackendUserId = me.id;
          }
        } catch {
          // Continue without it
        }
      }

      const [chatData, messagesData] = await Promise.all([
        getChat(chatId),
        getMessages(chatId),
      ]);

      setChat(chatData);

      // Sort messages chronologically (oldest first)
      const sorted = [...messagesData].sort(
        (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
      );
      setMessages(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el chat');
    } finally {
      setLoading(false);
    }
  }, [chatId, backendUserId, setBackendUserId]);

  // Refresh messages polling
  const refreshMessages = useCallback(async () => {
    try {
      const messagesData = await getMessages(chatId);
      const sorted = [...messagesData].sort(
        (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
      );
      setMessages(sorted);
    } catch {
      // Silent error for polling
    }
  }, [chatId]);

  // Refresh typing users
  const refreshTyping = useCallback(async () => {
    try {
      const users = await getTypingUsers(chatId);
      setTypingUsers(
        users.filter(
          (u) => u.userId !== backendUserId && u.userId !== currentUserId
        )
      );
    } catch {
      // Silent error for polling
    }
  }, [chatId, backendUserId, currentUserId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      refreshTyping();
    }, [loadData, refreshTyping])
  );

  // Polling interval
  useEffect(() => {
    const interval = setInterval(() => {
      refreshMessages();
      refreshTyping();
    }, 3000);
    return () => clearInterval(interval);
  }, [refreshMessages, refreshTyping]);

  // Cleanup typing on unmount
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

  // Get sender info
  const getSender = (senderId: string): ChatParticipantDto | undefined =>
    chat?.participants.find((p) => p.userId === senderId);

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

    // Optimistic message - use backendUserId if available, fallback to currentUserId
    const optimisticSenderId = backendUserId ?? currentUserId ?? '';
    const optimisticMessage: MessageDto = {
      id: Date.now(),
      chatId: chatId,
      senderId: optimisticSenderId,
      senderUsername: '',
      body: trimmed,
      sentAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInputText('');
    setSending(true);
    Keyboard.dismiss();

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const sentMessage = await apiSendMessage(chatId, trimmed);
      if (!backendUserId && sentMessage.senderId) {
        setBackendUserId(sentMessage.senderId);
      }
      // Replace optimistic with real
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticMessage.id ? sentMessage : m))
      );
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
    } catch (err) {
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
      setError('No se pudo enviar el mensaje');
    } finally {
      setSending(false);
    }
  };

  const getDateKey = (dateStr: string) => new Date(dateStr).toDateString();

  const renderMessage = ({
    item,
    index,
  }: {
    item: MessageDto;
    index: number;
  }) => {
    // Check if message is from current user - compare with both backendUserId and currentUserId
    const isOwn =
      (backendUserId && item.senderId === backendUserId) ||
      (currentUserId && item.senderId === currentUserId) ||
      (!currentUserId && !backendUserId && item.id > 1_000_000_000_000);
    const sender = getSender(item.senderId);
    const showSenderName = !isOwn;

    // Show date header if first message of the day
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
          {/* Avatar for other users' messages */}
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
                    {sender?.username?.charAt(0)?.toUpperCase() ?? '?'}
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
                {sender?.username ?? 'Usuario'}
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

  const renderTypingIndicator = () => {
    if (typingUsers.length === 0) return null;

    const names = typingUsers.map((u) => u.username).join(', ');
    const label =
      typingUsers.length === 1
        ? `${names} está escribiendo...`
        : `${names} están escribiendo...`;

    return (
      <View style={styles.typingContainer}>
        <View style={styles.typingBubble}>
          <View style={styles.typingDots}>
            <View style={[styles.typingDot, styles.typingDot1]} />
            <View style={[styles.typingDot, styles.typingDot2]} />
            <View style={[styles.typingDot, styles.typingDot3]} />
          </View>
        </View>
        <Text style={styles.typingText}>{label}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#e4715f" />
      </View>
    );
  }

  if (error && !chat) {
    return (
      <View style={styles.centered}>
        <Ionicons name="chatbubbles-outline" size={48} color="#d1d5db" />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable onPress={loadData} style={styles.retryButton}>
          <Text style={styles.retryText}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  const participantCount = chat?.participants.length ?? 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 140 : 0}
    >
      {/* Member count header */}
      <View style={styles.memberHeader}>
        <Ionicons name="people-outline" size={14} color="#6b7280" />
        <Text style={styles.memberHeaderText}>
          {participantCount} miembro{participantCount !== 1 ? 's' : ''} en el chat
        </Text>
      </View>

      {/* Error banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
          <Pressable onPress={() => setError(null)}>
            <Ionicons name="close" size={16} color="#fff" />
          </Pressable>
        </View>
      )}

      {/* Messages list */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderMessage}
        contentContainerStyle={
          messages.length === 0 ? styles.listEmpty : styles.messagesList
        }
        onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>
              Aún no hay mensajes en este chat
            </Text>
            <Text style={styles.emptySubtext}>
              ¡Sé el primero en escribir!
            </Text>
          </View>
        }
      />

      {/* Typing indicator */}
      {renderTypingIndicator()}

      {/* Input container */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={handleInputChange}
          placeholder="Escribe un mensaje..."
          placeholderTextColor="#999"
          multiline
          maxLength={1000}
        />
        <Pressable
          style={[
            styles.sendButton,
            (!inputText.trim() || sending) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons
              name="send"
              size={18}
              color={inputText.trim() ? '#fff' : '#ccc'}
            />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fdfbf7',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#e4715f',
    borderRadius: 20,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },

  // Member header
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#f5f0e8',
    gap: 6,
  },
  memberHeaderText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },

  // Error banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 14,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#DC2626',
    borderRadius: 8,
  },
  errorBannerText: {
    color: '#fff',
    fontSize: 13,
    flex: 1,
    marginRight: 8,
  },

  // Messages
  messagesList: {
    paddingHorizontal: 14,
    paddingBottom: 8,
    paddingTop: 4,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
    color: '#6b7280',
    marginTop: 12,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 4,
  },

  // Date header
  dateHeaderContainer: {
    alignItems: 'center',
    marginVertical: 14,
    backgroundColor: 'transparent',
  },
  dateHeaderText: {
    fontSize: 11,
    color: '#2b2c2d',
    backgroundColor: '#E9EBF0',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    overflow: 'hidden',
    fontWeight: '500',
  },

  // Message row
  messageRow: {
    flexDirection: 'row',
    marginVertical: 3,
    backgroundColor: 'transparent',
  },
  messageRowOwn: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },

  // Avatar
  messageAvatarContainer: {
    marginRight: 8,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
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
    backgroundColor: '#e4715f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageAvatarText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },

  // Bubble
  messageBubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingTop: 9,
    paddingBottom: 7,
    borderRadius: 20,
    marginVertical: 1,
  },
  bubbleOwn: {
    backgroundColor: '#e4715f',
    borderBottomRightRadius: 5,
  },
  bubbleOther: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  senderName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#e4715f',
    marginBottom: 3,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  messageTextOwn: {
    color: '#FFFFFF',
  },
  messageTextOther: {
    color: '#1F2937',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  messageTimeOwn: {
    color: 'rgba(255,255,255,0.5)',
  },
  messageTimeOther: {
    color: '#C4C9D4',
  },

  // Typing indicator
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: '#fdfbf7',
    gap: 8,
  },
  typingBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#9ca3af',
  },
  typingDot1: {
    opacity: 0.4,
  },
  typingDot2: {
    opacity: 0.6,
  },
  typingDot3: {
    opacity: 0.8,
  },
  typingText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },

  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#fdfbf7',
    borderTopWidth: 1,
    borderTopColor: '#f0ece4',
  },
  textInput: {
    flex: 1,
    minHeight: 42,
    maxHeight: 110,
    backgroundColor: '#F3F4F8',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1F2937',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E9EBF0',
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#e4715f',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#e4715f',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#E5E7EB',
    shadowOpacity: 0,
    elevation: 0,
  },
});
