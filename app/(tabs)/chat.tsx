import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Pressable,
    View as RNView,
    StyleSheet,
} from 'react-native';

import { Text, View } from '@/components/Themed';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { getMyChats, resolveUserIdFromChats } from '@/lib/chatApi';
import { ChatDto } from '@/types/chat';

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();

  const today = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today) {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Ayer';
  } else if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString('es-ES', { weekday: 'short' });
  }
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
}

function ChatListItem({
  chat,
  currentUserId,
}: {
  chat: ChatDto;
  currentUserId: string;
}) {
  const router = useRouter();
  const lastMessage = chat.lastMessage;

  // Nombre a mostrar: en chats directos el otro usuario, en comunidad el nombre del grupo
  let displayName: string;
  let avatarUrl: string | null = null;

  const otherParticipant = chat.participants.find(
    (p) => p.userId !== currentUserId
  );

  if (chat.type === 'COMMUNITY') {
    // Usar el nombre del primer participante diferente como fallback
    displayName = otherParticipant?.username ?? 'Comunidad';
  } else {
    displayName = otherParticipant?.username ?? 'Usuario';
    avatarUrl = otherParticipant?.profilePhoto || null;
  }

  // Para mensajes de grupo, mostrar quién envió el último mensaje
  let lastMessagePreview = '';
  if (lastMessage) {
    if (chat.type === 'COMMUNITY') {
      const senderName =
        lastMessage.senderId === currentUserId
          ? 'Tú'
          : lastMessage.senderUsername?.split(' ')[0] ?? 'Usuario';
      lastMessagePreview = `${senderName}: ${lastMessage.body}`;
    } else {
      lastMessagePreview =
        lastMessage.senderId === currentUserId
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
              {formatTime(lastMessage.sentAt)}
            </Text>
          )}
        </View>

        {lastMessage && (
          <Text style={styles.chatPreview} numberOfLines={1}>
            {lastMessagePreview}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

export default function ChatListScreen() {
  const { currentUserId, backendUserId, setBackendUserId } = useAuth();
  const [chats, setChats] = useState<ChatDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getMyChats();

      // Si aún no conocemos el userId del backend, resolverlo desde los chats
      if (!backendUserId) {
        const resolved = resolveUserIdFromChats(data);
        if (resolved) {
          setBackendUserId(resolved);
        }
      }

      // Ordenar por actividad más reciente
      const sorted = [...data].sort((a, b) => {
        const aTime = a.lastMessage?.sentAt ?? a.createdAt;
        const bTime = b.lastMessage?.sentAt ?? b.createdAt;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      setChats(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar chats');
    } finally {
      setLoading(false);
    }
  }, [backendUserId, setBackendUserId]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Header />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#e4715f" />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Header />
        <View style={styles.centered}>
          <Text style={{ color: '#6B7280', marginBottom: 12 }}>{error}</Text>
          <Pressable onPress={fetchChats}>
            <Text style={{ color: '#e4715f', fontWeight: '600' }}>Reintentar</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header />
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <ChatListItem chat={item} currentUserId={currentUserId ?? ''} />
        )}
        ItemSeparatorComponent={() => (
          <RNView style={styles.separator} />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={() => (
          <View style={styles.centered}>
            <Text style={{ color: '#6B7280' }}>No tienes chats todavía</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fbf7f4',
  },
  listContent: {
    paddingVertical: 6,
  },
  chatItem: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#fbf7f4',
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 86,
  },
});
