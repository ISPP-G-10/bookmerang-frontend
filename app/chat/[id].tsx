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
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/AuthContext';
import {
    sendMessage as apiSendMessage,
    getChat as fetchChat,
    getMessages as fetchMessages,
    startTyping,
    stopTyping,
    getTypingUsers,
} from '@/lib/chatApi';
import { ChatDto, ChatParticipantDto, MessageDto, TypingUserDto } from '@/types/chat';
import { ExchangeMeetingDto, ExchangeWithMatchDto } from '@/types/exchange';
import {
    getExchangeByChatIdWithMatch,
    acceptExchange, 
    rejectExchange
} from '@/lib/exchangeApi';
import {
    getBookDetail, BookDetail
} from '@/lib/books';

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
  const { backendUserId, currentUserId, setBackendUserId } = useAuth();

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
  const [exchange, setExchange] = useState<ExchangeWithMatchDto | null>(null);
  const [exchangeMeeting, setExchangeMeeting] = useState<ExchangeMeetingDto | null>(null);
  const [disabledAccept, setDisabledAccept] = useState<boolean>(false);
  // banner de intercambio commet
  const [myBook, setMyBook] = useState<BookDetail | null>(null);
  const [otherBook, setOtherBook] = useState<BookDetail | null>(null);
  const [otherUsername, setOtherUsername] = useState<string>(''); // para “Libro de Carlos”

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

      const exchangeData = await getExchangeByChatIdWithMatch(chatId);
      setExchange(exchangeData);
      
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

  const refreshTyping = useCallback(async () => {
    try {
      const users = await getTypingUsers(chatId);
      // Filter out our own user
      setTypingUsers(users.filter(u => u.userId !== backendUserId && u.userId !== currentUserId));
    } catch {
      // Silenciar errores de polling de typing
    }
  }, [chatId, backendUserId, currentUserId]);

  // Hook para inicializar estado del boton accept
  const initializeAcceptState = useCallback(() => {
    if (!exchange || !backendUserId) return;
    const isAlreadyAccepted = checkUserAcceptance();
    setDisabledAccept(isAlreadyAccepted);
  }, [exchange, backendUserId]);

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
    const showSub = Keyboard.addListener('keyboardDidShow', () => {});
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {});
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
  const loadExchangeBooks = async () => {
    if (!exchange || !backendUserId) return;

    try {
      // Determinar si soy user1 o user2
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
        (p) => p.userId !== backendUserId
      );
      setOtherUsername(otherParticipant?.username ?? 'la otra persona');
    } catch (e) {
      console.error('Error cargando libros del intercambio', e);
    }
  };

  loadExchangeBooks();
}, [exchange, backendUserId, chat]);

  
  useEffect(() => {
    initializeAcceptState();
  }, [initializeAcceptState]);

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
      (p) => p.userId !== currentUserId
    );
    headerTitle = other?.username ?? 'Chat';
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
      senderId: currentUserId ?? '',
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
      (currentUserId && item.senderId === currentUserId) ||
      (!currentUserId && item.id > 1_000_000_000_000); // optimistic messages use Date.now() as id
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

  // Acepta el intercambio por parte del usuario actual
  const handleAcceptExchange = async () => {
  if (!exchange?.exchangeId) return;
  setError(null);
  try {
    const updated = await acceptExchange(exchange.exchangeId);
    setExchange(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al aceptar el intercambio';
    setError(msg);
  }
  };

  // Función auxiliar para calcular si se puede aceptar o no
  const checkUserAcceptance = (): boolean => {
    // Si sigue negociando, el usuario todavía puede aceptar
    if (exchange?.status === "NEGOTIATING") return false;
    
    if (
      exchange?.status === "ACCEPTED_BY_1" &&
      exchange?.user1Id === backendUserId
    ) {
      return true;
    }

    if (
      exchange?.status === "ACCEPTED_BY_2" &&
      exchange?.user2Id === backendUserId
    ) {
      return true;
    }

    if(exchange?.status === "REJECTED" || exchange?.status === "ACCEPTED") return true;

    return false;
  };
  
  // Desestima el intercambio
  const handleRejectExchange = async () => {
  if (!exchange?.exchangeId) return;
  setError(null);
  try {
    const updated = await rejectExchange(exchange.exchangeId);
    setExchange(updated);
    setDisabledAccept(true);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al desestimar el intercambio';
    setError(msg);
  }
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
        {/* Banner de error de intercambio */}
        {error && (
          <View style={styles.exchangeErrorBanner}>
            <Text style={styles.exchangeErrorText}>{error}</Text>
            <Pressable onPress={() => setError(null)}>
              <FontAwesome name="times" size={16} color="#fff" />
            </Pressable>
          </View>
        )}
        
        {/* Banner de intercambio */}
        {exchange && myBook && otherBook && (
          <View style={styles.exchangeBanner}>
            <View style={styles.exchangeBannerRow}>
              {/* Columna izquierda: tu libro */}
              <View style={styles.exchangeBannerColumn}>
                <Text style={styles.exchangeBannerLabel}>TU LIBRO</Text>
                <View style={styles.exchangeBookCard}>
                  {/* Foto o icono */}
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
                      {myBook.titulo ?? 'Libro sin título'}
                    </Text>
                    {myBook.autor && (
                      <Text style={styles.exchangeBookAuthor} numberOfLines={1}>
                        {myBook.autor}
                      </Text>
                    )}
                    <Text style={styles.exchangeBookMeta} numberOfLines={1}>
                      {myBook.cover === 'Hardcover' ? 'Tapa dura' :
                      myBook.cover === 'Paperback' ? 'Tapa blanda' : ''}
                      {myBook.condition
                        ? ` · ${myBook.condition}`
                        : ''}
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
                      style={[styles.exchangeBookCover, { backgroundColor: '#2b3a55' }]}
                    />
                  ) : (
                    <View
                      style={[
                        styles.exchangeBookIcon,
                        { backgroundColor: '#2b3a55' },
                      ]}
                    />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exchangeBookTitle} numberOfLines={2}>
                      {otherBook.titulo ?? 'Libro sin título'}
                    </Text>
                    {otherBook.autor && (
                      <Text style={styles.exchangeBookAuthor} numberOfLines={1}>
                        {otherBook.autor}
                      </Text>
                    )}
                    <Text style={styles.exchangeBookMeta} numberOfLines={1}>
                      {otherBook.cover === 'Hardcover' ? 'Tapa dura' :
                      otherBook.cover === 'Paperback' ? 'Tapa blanda' : ''}
                      {otherBook.condition
                        ? ` · ${otherBook.condition}`
                        : ''}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Botones de aceptar y desestimar */}
        <View style={styles.AcceptRejectContainer}>
          {/* Botón Aceptar */}
          <Pressable
            style={({ pressed }) => [
              styles.Exchangebutton,
              styles.acceptButton,
              disabledAccept && styles.buttonDisabled,
              pressed && !disabledAccept && styles.buttonPressed,
            ]}
            onPress={handleAcceptExchange}
            disabled={disabledAccept}
          >
            <FontAwesome name="thumbs-up" size={18} color="#fff" />
            <Text style={styles.acceptText}>Aceptar</Text>
          </Pressable>

          {/* Botón Desestimar (mitad derecha) */}
          <Pressable
            style={({ pressed }) => [
              styles.Exchangebutton,
              styles.rejectButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleRejectExchange}
          >
            <FontAwesome name="times" size={18} color="#6B7280" />
            <Text style={styles.rejectText}>Desestimar</Text>
          </Pressable>
        </View>

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

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <View style={styles.typingContainer}>
            {chat?.type === 'COMMUNITY' ? (
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
                            {user.username?.charAt(0) ?? '?'}
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
                      { marginLeft: -10, zIndex: 1, backgroundColor: '#E9EBF0' },
                    ]}
                  >
                    <Text style={[styles.typingAvatarText, { color: '#6B7280' }]}>
                      +{typingUsers.length - 3}
                    </Text>
                  </View>
                )}
                <View style={{ marginLeft: 8 }}>
                  <Spinner variant="dots" size="sm" color="#e4715f" speed="normal" />
                </View>
              </View>
            ) : (
              <View style={styles.typingBubbleContainer}>
                <View style={styles.typingBubble}>
                  <Spinner variant="dots" size="sm" color="#e4715f" speed="normal" />
                </View>
              </View>
            )}
          </View>
        )}

        {/* Input de texto */}
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

  // ── Typing Indicator ──────────────────────────────────
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 4,
    backgroundColor: '#fbf7f4',
  },
  typingBubbleContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingLeft: 0,
    backgroundColor: 'transparent',
  },
  typingBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderBottomLeftRadius: 5,
    paddingHorizontal: 18,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  typingAvatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingAvatarWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fbf7f4',
    overflow: 'hidden',
  },
  typingAvatar: {
    width: '100%',
    height: '100%',
  },
  typingAvatarPlaceholder: {
    flex: 1,
    backgroundColor: '#e76541',
    justifyContent: 'center',
    alignItems: 'center',
  },
  typingAvatarText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
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
  // ── Intercambio ─────────────────────────────────────────────
  AcceptRejectContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: '#fbf7f4',
    marginTop: "0.5%"
  },
  Exchangebutton: {
    flex: 1,
    flexDirection: 'row',
    height: 44,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: "0.2%",
    marginLeft: "0.2%",
  },
  acceptButton: {
    backgroundColor: '#e76541',
    shadowColor: '#e4715f',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  rejectButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  rejectText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  // cuando solo hay botón desestimar ocupa todo el ancho
  rejectButtonSingle: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  //── Banner de errores ─────────────────────────────────────────────
  exchangeErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 14,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#DC2626', // rojo error
    borderRadius: 8,
  },
  exchangeErrorText: {
    color: '#fff',
    fontSize: 13,
    flex: 1,
    marginRight: 8,
  },

  // ── Banner de intercambio ─────────────────────────────
  exchangeBanner: {
    backgroundColor: '#fff',
    marginHorizontal: 14,
    marginTop: 8,
    marginBottom: 6,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  exchangeBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exchangeBannerColumn: {
    flex: 1,
  },
  exchangeBannerLabel: {
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: '#6B7280',
    marginBottom: 6,
  },
  exchangeBookCard: {
    backgroundColor: '#fbf7f4',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  exchangeBookIcon: {
    width: 26,
    height: 34,
    borderRadius: 6,
    backgroundColor: '#b87333',
    marginRight: 8,
  },
  exchangeBookCover: {
    width: 26,
    height: 34,
    borderRadius: 6,
    marginRight: 8,
    backgroundColor: '#b87333',
  },
  exchangeBookTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  exchangeBookAuthor: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  exchangeBookMeta: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  exchangeCenterIcon: {
    width: 32,
    alignItems: 'center',
  },


});