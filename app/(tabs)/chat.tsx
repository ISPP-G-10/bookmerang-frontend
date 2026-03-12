import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  View as RNView,
  StyleSheet,
  TextInput
} from 'react-native';

import { Text, View } from '@/components/Themed';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { getMyChats, resolveUserIdFromChats } from '@/lib/chatApi';
import { ChatDto } from '@/types/chat';
import { getExchangeByChatIdWithMatch } from '@/lib/exchangeApi';
import { ExchangeWithMatchDto, ExchangeStatus } from '@/types/exchange';
import { FontAwesome } from '@expo/vector-icons';

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
  const [allChats, setAllChats] = useState<ChatDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const TAB_VALUES = ['Nuevos matches', 'En curso', 'Finalizados'];
  const [activeTab, setActiveTab] = useState<string>('Nuevos matches');
  const [search, setSearch] = useState('');
  const [exchanges, setExchanges] = useState<ExchangeWithMatchDto[]>([])

  const fetchChats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getMyChats();

      const exchangeResults = await Promise.all(data.map(c => getExchangeByChatIdWithMatch(c.id)));
      setExchanges(exchangeResults.filter((e): e is ExchangeWithMatchDto => !!e)) //Si alguno es null no lo incluye

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

      setAllChats(sorted);
      setChats(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar chats');
    } finally {
      setLoading(false);
    }
  }, [backendUserId, setBackendUserId]);

  useFocusEffect( //Esto hace que fetchChats se ejecute cada vez que se entra en esta pantalla (útil que se actualicen las pestañas dinámicamente)
    React.useCallback(() => {
      fetchChats();     
    }, [fetchChats])
  );

  useEffect(() => {

    // filtrar por texto (barra de búsqueda)
    const bySearch = allChats.filter((c) => {
      const other = c.participants.find((p) => p.userId !== currentUserId);
      const name = (other?.username ?? 'Usuario desconocido').toLowerCase();
      return name.includes(search.toLowerCase());
    });

    // filtrar por pestaña
    const byTab = bySearch.filter((chat) => {
      const currentExchange = exchanges.find((e) => e.chatId === chat.id);
      return exchangeMatchesTab(currentExchange, activeTab);
    });

    setChats(byTab);
  }, [search, activeTab, allChats, exchanges]);

  //Función que determina dónde va cada exchange según su estado
  const exchangeMatchesTab = (exchange: ExchangeWithMatchDto | undefined, tab: string) => {
    if (!exchange) return false;

    const status = exchange.status as ExchangeStatus;

    if (tab === 'Nuevos matches') {
      return (
        status === 'NEGOTIATING' ||
        status === 'ACCEPTED_BY_1' ||
        status === 'ACCEPTED_BY_2'
      );
    }

    if (tab === 'En curso') {
      return status === 'ACCEPTED';
    }

    // Finalizados
    return (
      status === 'COMPLETED' ||
      status === 'REJECTED' ||
      status === 'INCIDENT'
    );
  };

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
      <View style={styles.topBar}>
        <View style={styles.tabsRow}>
          {TAB_VALUES.map((tab) => {
            const isActive = tab === activeTab;
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tabItem, isActive && styles.tabItemActive]}
              >
                <Text
                  style={[styles.tabText, isActive && styles.tabTextActive]}
                  numberOfLines={1}
                >
                  {tab}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.searchBar}>
          <FontAwesome name="search" size={16} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar chats..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <ChatListItem chat={item} currentUserId={currentUserId ?? ''} />
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
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  chatItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  chatItemPressed: {
    backgroundColor: '#fef5f2',
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
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: '#fbf7f4',
  },
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#e4715f', // color principal de la app
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#111827',
    fontWeight: '600',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  searchPlaceholderIcon: {
    fontSize: 16,
    marginRight: 6,
    color: '#9CA3AF',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    paddingVertical: 2,
    marginLeft: 6,
  },
});