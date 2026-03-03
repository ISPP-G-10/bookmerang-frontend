import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    TextInput,
} from 'react-native';

import { Text, View } from '@/components/Themed';
import { useAuth } from '@/contexts/AuthContext';
import {
    sendMessage as apiSendMessage,
    getChat as fetchChat,
    getMessages as fetchMessages,
} from '@/lib/chatApi';
import { ChatDto, ChatParticipantDto, MessageDto } from '@/types/chat';

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

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const chatId = parseInt(id ?? '0', 10);
  const { backendUserId, setBackendUserId } = useAuth();

  const [chat, setChat] = useState<ChatDto | null>(null);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

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
      // Ordenar mensajes cronológicamente (más antiguos primero)
      const sorted = [...messagesData].sort(
        (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
      );
      setMessages(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el chat');
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  // Polling: recargar mensajes cada 3 segundos para ver actualizaciones
  const refreshMessages = useCallback(async () => {
    try {
      const messagesData = await fetchMessages(chatId);
      const sorted = [...messagesData].sort(
        (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
      );
      setMessages(sorted);
    } catch {
      // Silenciar errores de polling
    }
  }, [chatId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const interval = setInterval(refreshMessages, 3000);
    return () => clearInterval(interval);
  }, [refreshMessages]);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {});
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {});
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#e4715f" />
      </View>
    );
  }

  if (error || !chat) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: '#6B7280', marginBottom: 12 }}>
          {error ?? 'Chat no encontrado'}
        </Text>
        <Pressable onPress={loadData}>
          <Text style={{ color: '#e4715f', fontWeight: '600' }}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  // Título del header
  let headerTitle: string;
  if (chat.type === 'COMMUNITY') {
    headerTitle = 'Comunidad';
  } else {
    const other = chat.participants.find(
      (p) => p.userId !== backendUserId
    );
    headerTitle = other?.username ?? 'Chat';
  }

  // Buscar info del sender de un mensaje
  const getSender = (senderId: string): ChatParticipantDto | undefined =>
    chat.participants.find((p) => p.userId === senderId);

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || sending) return;

    // Mensaje optimista
    const optimisticMessage: MessageDto = {
      id: Date.now(),
      chatId: chatId,
      senderId: backendUserId ?? '',
      senderUsername: '',
      body: trimmed,
      sentAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInputText('');
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
        prev.map((m) => (m.id === optimisticMessage.id ? sentMessage : m))
      );
      // Forzar scroll al final tras enviar
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
    } catch {
      // Remover mensaje optimista en caso de error
      setMessages((prev) =>
        prev.filter((m) => m.id !== optimisticMessage.id)
      );
    } finally {
      setSending(false);
    }
  };

  // Agrupar mensajes por día para mostrar separadores de fecha
  const getDateKey = (dateStr: string) =>
    new Date(dateStr).toDateString();

  const renderMessage = ({
    item,
    index,
  }: {
    item: MessageDto;
    index: number;
  }) => {
    const isOwn =
      (backendUserId && item.senderId === backendUserId) ||
      (!backendUserId && item.id > 1_000_000_000_000); // optimistic messages use Date.now() as id
    const sender = getSender(item.senderId);
    const showSenderName = chat.type === 'COMMUNITY' && !isOwn;

    // Mostrar separador de fecha si es el primer mensaje del día
    const showDateHeader =
      index === 0 ||
      getDateKey(item.sentAt) !==
        getDateKey(messages[index - 1].sentAt);

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
                    {sender?.username?.charAt(0) ?? '?'}
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

  return (
    <>
      <Stack.Screen
        options={{
          title: headerTitle,
          headerBackTitle: 'Chats',
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {/* Lista de mensajes */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
        />

        {/* Input de texto */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Escribe un mensaje..."
            placeholderTextColor="#999"
            multiline
            maxLength={1000}
            onSubmitEditing={handleSend}
          />
          <Pressable
            style={({ pressed }) => [
              styles.sendButton,
              !inputText.trim() && styles.sendButtonDisabled,
              pressed && styles.sendButtonPressed,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            <FontAwesome
              name="send"
              size={18}
              color={inputText.trim() ? '#fff' : '#ccc'}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fbf7f4',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Messages ──────────────────────────────────────────
  messagesList: {
    paddingHorizontal: 14,
    paddingBottom: 8,
    paddingTop: 4,
  },
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
    backgroundColor: '#fbf7f4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageAvatarText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  messageBubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingTop: 9,
    paddingBottom: 7,
    borderRadius: 20,
    marginVertical: 1,
  },
  bubbleOwn: {
    backgroundColor: '#e76541',
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

  // ── Input ─────────────────────────────────────────────
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#fbf7f4',
    borderTopWidth: 1,
    borderTopColor: '#fbf7f4',
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
  sendButtonPressed: {
    opacity: 0.75,
  },
});