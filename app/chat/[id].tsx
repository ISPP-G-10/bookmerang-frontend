import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    TextInput,
} from 'react-native';

import { Text, View } from '@/components/Themed';
import { CURRENT_USER_ID, mockChats } from '@/data/mockChats';
import { ChatMessage } from '@/types/chat';

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
  const chat = mockChats.find((c) => c.id === chatId);

  const [messages, setMessages] = useState<ChatMessage[]>(
    chat?.messages ?? []
  );
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  if (!chat) {
    return (
      <View style={styles.centered}>
        <Text>Chat no encontrado</Text>
      </View>
    );
  }

  // Título del header
  let headerTitle: string;
  if (chat.type === 'COMMUNITY' && chat.community_chat) {
    headerTitle = chat.community_chat.community.name;
  } else {
    const other = chat.participants.find(
      (p) => p.user_id !== CURRENT_USER_ID
    );
    headerTitle = other?.user.nombre ?? 'Chat';
  }

  // Buscar info del sender de un mensaje
  const getSender = (senderId: number) =>
    chat.participants.find((p) => p.user_id === senderId)?.user;

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    const newMessage: ChatMessage = {
      id: Date.now(),
      chat_id: chatId,
      sender_id: CURRENT_USER_ID,
      body: trimmed,
      sent_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputText('');

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Agrupar mensajes por día para mostrar separadores de fecha
  const getDateKey = (dateStr: string) =>
    new Date(dateStr).toDateString();

  const renderMessage = ({
    item,
    index,
  }: {
    item: ChatMessage;
    index: number;
  }) => {
    const isOwn = item.sender_id === CURRENT_USER_ID;
    const sender = getSender(item.sender_id);
    const showSenderName =
      chat.type === 'COMMUNITY' && !isOwn;

    // Mostrar separador de fecha si es el primer mensaje del día
    const showDateHeader =
      index === 0 ||
      getDateKey(item.sent_at) !==
        getDateKey(messages[index - 1].sent_at);

    return (
      <>
        {showDateHeader && (
          <View style={styles.dateHeaderContainer}>
            <Text style={styles.dateHeaderText}>
              {formatDateHeader(item.sent_at)}
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
              {sender?.foto_perfil_url ? (
                <Image
                  source={{ uri: sender.foto_perfil_url }}
                  style={styles.messageAvatar}
                />
              ) : (
                <View style={styles.messageAvatarPlaceholder}>
                  <Text style={styles.messageAvatarText}>
                    {sender?.nombre?.charAt(0) ?? '?'}
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
                {sender?.nombre ?? 'Usuario'}
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
              {formatMessageTime(item.sent_at)}
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
        {/* Tarjeta del intercambio */}
        {chat.exchange && (
          <View style={styles.exchangeCard}>
            <View style={styles.exchangeBooks}>
              {/* Libro propio */}
              <View style={styles.bookItem}>
                <Text style={styles.bookLabel}>TU LIBRO</Text>
                <View style={styles.bookCover}>
                  <FontAwesome name="book" size={22} color="#e4715f" />
                </View>
                <Text style={styles.bookTitle} numberOfLines={2}>
                  {chat.exchange.book_1.titulo}
                </Text>
                <Text style={styles.bookAuthor} numberOfLines={1}>
                  {chat.exchange.book_1.autor}
                </Text>
              </View>

              <View style={styles.exchangeArrow}>
                <FontAwesome name="exchange" size={18} color="#2b2c2d" />
              </View>

              {/* Libro de cambio */}
              <View style={styles.bookItem}>
                <Text style={styles.bookLabel}>LIBRO DE CAMBIO</Text>
                <View style={[styles.bookCover, styles.bookCoverAlt]}>
                  <FontAwesome name="book" size={22} color="#10B981" />
                </View>
                <Text style={styles.bookTitle} numberOfLines={2}>
                  {chat.exchange.book_2.titulo}
                </Text>
                <Text style={styles.bookAuthor} numberOfLines={1}>
                  {chat.exchange.book_2.autor}
                </Text>
              </View>
            </View>

            {/* Acciones según estado */}
            {chat.exchange.status === 'NEGOTIATING' ? (
              <View style={styles.exchangeActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.btnAccept,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <FontAwesome name="check" size={13} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.btnAcceptText}>Aceptar</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.btnDecline,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <FontAwesome name="times" size={13} color="#6B7280" style={{ marginRight: 6 }} />
                  <Text style={styles.btnDeclineText}>Desestimar</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.acceptedBanner}>
                <FontAwesome name="check-circle" size={14} color="#10B981" style={{ marginRight: 6 }} />
                <Text style={styles.acceptedBannerText}>Intercambio aceptado</Text>
              </View>
            )}
          </View>
        )}

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
            disabled={!inputText.trim()}
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
    backgroundColor: '#f2cfc5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Exchange card ─────────────────────────────────────
  exchangeCard: {
    backgroundColor: '#ea7656',
    marginHorizontal: 14,
    marginVertical: 10,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  exchangeBooks: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginBottom: 14,
    backgroundColor: 'transparent',
  },
  bookItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  bookLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#2b2c2d',
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  bookCover: {
    width: 64,
    height: 88,
    borderRadius: 8,
    backgroundColor: '#FBE9E7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#e4715f',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  bookCoverAlt: {
    backgroundColor: '#ECFDF5',
    shadowColor: '#10B981',
  },
  bookTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2b2c2d',
    textAlign: 'center',
    lineHeight: 15,
    paddingHorizontal: 4,
  },
  bookAuthor: {
    fontSize: 10,
    color: '#2b2c2d',
    textAlign: 'center',
    marginTop: 2,
    paddingHorizontal: 4,
  },
  exchangeArrow: {
    paddingHorizontal: 8,
    paddingTop: 40,
    backgroundColor: 'transparent',
  },
  exchangeActions: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'transparent',
  },
  btnAccept: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnAcceptText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  btnDecline: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  btnDeclineText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 14,
  },
  acceptedBanner: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    borderRadius: 10,
    paddingVertical: 8,
  },
  acceptedBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#065F46',
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
    backgroundColor: '#e4715f',
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
    backgroundColor: '#f2cfc5',
    borderTopWidth: 1,
    borderTopColor: '#f2cfc5',
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