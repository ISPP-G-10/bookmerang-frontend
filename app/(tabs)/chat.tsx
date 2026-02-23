import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    FlatList,
    Image,
    Pressable,
    View as RNView,
    StyleSheet,
} from 'react-native';

import { Text, View } from '@/components/Themed';
import { CURRENT_USER_ID, mockChats } from '@/data/mockChats';
import { ChatData } from '@/types/chat';

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } else if (diffDays === 1) {
    return 'Ayer';
  } else if (diffDays < 7) {
    return date.toLocaleDateString('es-ES', { weekday: 'short' });
  }
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
}

function ChatListItem({ chat }: { chat: ChatData }) {
  const router = useRouter();
  const lastMessage = chat.messages[chat.messages.length - 1];

  // Nombre a mostrar: en chats directos el otro usuario, en comunidad el nombre del grupo
  let displayName: string;
  let avatarUrl: string | null = null;

  if (chat.type === 'COMMUNITY' && chat.community_chat) {
    displayName = chat.community_chat.community.name;
  } else {
    const otherParticipant = chat.participants.find(
      (p) => p.user_id !== CURRENT_USER_ID
    );
    displayName = otherParticipant?.user.nombre ?? 'Usuario';
    avatarUrl = otherParticipant?.user.foto_perfil_url ?? null;
  }

  // Para mensajes de grupo, mostrar quién envió el último mensaje
  let lastMessagePreview = '';
  if (lastMessage) {
    if (chat.type === 'COMMUNITY') {
      const sender = chat.participants.find(
        (p) => p.user_id === lastMessage.sender_id
      );
      const senderName =
        lastMessage.sender_id === CURRENT_USER_ID
          ? 'Tú'
          : sender?.user.nombre?.split(' ')[0] ?? 'Usuario';
      lastMessagePreview = `${senderName}: ${lastMessage.body}`;
    } else {
      lastMessagePreview =
        lastMessage.sender_id === CURRENT_USER_ID
          ? `Tú: ${lastMessage.body}`
          : lastMessage.body;
    }
  }

  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const isAccepted = chat.exchange?.status === 'ACCEPTED';
  const isNegotiating = chat.exchange?.status === 'NEGOTIATING';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.chatItem,
        pressed && styles.chatItemPressed,
      ]}
      onPress={() => router.push(`/chat/${chat.id}`)}
    >
      {/* Avatar */}
      <RNView style={styles.avatarWrapper}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
        ) : (
          <RNView style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{initials}</Text>
          </RNView>
        )}
      </RNView>

      {/* Contenido */}
      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName} numberOfLines={1}>
            {displayName}
          </Text>
          {lastMessage && (
            <Text style={styles.chatTime}>
              {formatTime(lastMessage.sent_at)}
            </Text>
          )}
        </View>

        {lastMessage && (
          <Text style={styles.chatPreview} numberOfLines={1}>
            {lastMessagePreview}
          </Text>
        )}

        {chat.exchange && (
          <RNView
            style={[
              styles.statusPill,
              isAccepted ? styles.pillAccepted : styles.pillNegotiating,
            ]}
          >
            <FontAwesome
              name={isAccepted ? 'check-circle' : 'refresh'}
              size={10}
              color={isAccepted ? '#10B981' : '#F59E0B'}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.statusPillText,
                isAccepted ? styles.pillTextAccepted : styles.pillTextNegotiating,
              ]}
            >
              {isAccepted ? 'Intercambio aceptado' : 'Negociando'}
            </Text>
          </RNView>
        )}
      </View>
    </Pressable>
  );
}

export default function ChatListScreen() {
  return (
    <View style={styles.container}>
      <FlatList
        data={mockChats}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <ChatListItem chat={item} />}
        ItemSeparatorComponent={() => (
          <RNView style={styles.separator} />
        )}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2cfc5',
  },
  listContent: {
    paddingVertical: 6,
  },
  chatItem: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#f2cfc5',
  },
  chatItemPressed: {
    backgroundColor: '#e8af9f',
  },
  avatarWrapper: {
    marginRight: 14,
  },
  avatarImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#D1D5DB',
  },
  avatarPlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#e4715f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  chatContent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
    backgroundColor: 'transparent',
  },
  chatName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  chatTime: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '400',
  },
  chatPreview: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
    lineHeight: 18,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  pillAccepted: {
    backgroundColor: '#D1FAE5',
  },
  pillNegotiating: {
    backgroundColor: '#FEF3C7',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  pillTextAccepted: {
    color: '#065F46',
  },
  pillTextNegotiating: {
    color: '#92400E',
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 86,
  },
});
