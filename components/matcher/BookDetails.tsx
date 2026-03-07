import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import type { BookCondition, MatcherCard } from '@/types/matcher';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  Image as RNImage,
  ScrollView,
  StyleSheet,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CONDITION_LABELS: Record<BookCondition, string> = {
  LIKE_NEW: 'Como nuevo',
  VERY_GOOD: 'Muy bueno',
  GOOD: 'Bueno',
  ACCEPTABLE: 'Aceptable',
  POOR: 'Malo',
};

interface BookDetailsScreenProps {
  visible: boolean;
  card: MatcherCard | null;
  onClose: () => void;
  onChat?: (card: MatcherCard) => void;
  onPrimaryAction?: (card: MatcherCard) => void;
  primaryActionLabel?: string;
  primaryActionIcon?: React.ComponentProps<typeof Ionicons>["name"];
}

export function BookDetailsScreen({
  visible,
  card,
  onClose,
  onChat,
  onPrimaryAction,
  primaryActionLabel = 'Solicitar intercambio',
  primaryActionIcon = 'chatbubble-outline',
}: BookDetailsScreenProps) {
  const [showReportMenu, setShowReportMenu] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH } = useWindowDimensions();

  const isWeb = Platform.OS === 'web';

  if (!card) return null;

  const { book, owner, distanceKm } = card;
  const heroPhoto = book.photos[0]?.url;
  const handlePrimaryAction = onPrimaryAction ?? onChat;

  const handleReport = (reason: string) => {
    setShowReportMenu(false);
    console.log('Reportado:', reason);
  };

  const bgColor = isDark ? '#1C1C1E' : '#FAF7F4';
  const cardBgColor = isDark ? '#2C2C2E' : '#FFFFFF';
  const borderColor = isDark ? '#3A3A3C' : '#F3E9E0';
  const textPrimary = isDark ? '#fdfbf7' : '#3e2723';
  const textSecondary = isDark ? '#AEAEB2' : '#8B7355';

  const specCardWidth = isWeb ? (SCREEN_WIDTH - 48 - 10) / 2 : undefined;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
        >
          {/* Header/Hero Section */}
          <View style={styles.heroContainer}>
            {heroPhoto ? (
              <RNImage
                source={{ uri: heroPhoto }}
                style={styles.heroImage}
                resizeMode="cover"
              />
            ) : (
              <View
                style={[
                  styles.heroImage,
                  {
                    backgroundColor: '#e07a5f',
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                ]}
              >
                <Ionicons name="book" size={80} color="#fdfbf7" />
              </View>
            )}

            {/* Back Button */}
            <Pressable
              onPress={onClose}
              style={[styles.backButton, { top: insets.top + 8 }]}
            >
              <Ionicons name="arrow-back" size={24} color="#fdfbf7" />
            </Pressable>

            {/* Action Buttons */}
            <View style={[styles.topActions, { top: insets.top + 8 }]}>
              <Pressable style={[styles.iconButton, { marginRight: 8 }]}>
                <Ionicons name="share-outline" size={20} color="#fdfbf7" />
              </Pressable>
              <Pressable
                onPress={() => setShowReportMenu(!showReportMenu)}
                style={styles.iconButton}
              >
                <Ionicons name="ellipsis-vertical" size={20} color="#fdfbf7" />
              </Pressable>
            </View>
          </View>

          {/* Content */}
          <View style={[styles.contentSection, { backgroundColor: bgColor }]}>
            {/* Title & Author */}
            <View style={{ marginBottom: 18 }}>
              <Heading
                size="2xl"
                style={{
                  color: textPrimary,
                  fontWeight: '900',
                  marginBottom: 4,
                }}
              >
                {book.titulo}
              </Heading>
              <Text style={{ fontSize: 18, color: textSecondary }}>
                {book.autor ?? 'Autor desconocido'}
              </Text>
            </View>

            {/* Owner Info */}
            <View
              style={[
                styles.ownerCard,
                { backgroundColor: cardBgColor, borderColor, marginBottom: 18 },
              ]}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.ownerAvatar, { borderColor: bgColor }]}>
                    {owner.fotoPerfilUrl ? (
                      <RNImage
                        source={{ uri: owner.fotoPerfilUrl }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={{
                          width: '100%',
                          height: '100%',
                          backgroundColor: '#e07a5f',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text
                          style={{
                            color: 'white',
                            fontSize: 18,
                            fontWeight: '900',
                          }}
                        >
                          {owner.username.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={{ marginLeft: 12 }}>
                    <Text style={{ fontWeight: 'bold', color: textPrimary }}>
                      {owner.username}
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginTop: 4,
                      }}
                    >
                      <Ionicons
                        name="location-outline"
                        size={12}
                        color="#e07a5f"
                        style={{ marginRight: 4 }}
                      />
                      <Text style={{ fontSize: 12, color: textSecondary }}>
                        A{' '}
                        {distanceKm < 1
                          ? `${Math.round(distanceKm * 1000)} m`
                          : `${Math.round(distanceKm)} km`}{' '}
                        de ti
                      </Text>
                    </View>
                  </View>
                </View>
                <Pressable>
                  <Text
                    style={{
                      color: '#e07a5f',
                      fontWeight: 'bold',
                      fontSize: 14,
                    }}
                  >
                    Ver perfil
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Specs Grid - Condicional por plataforma */}
            {isWeb ? (
              <>
                <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                  <View
                    style={[
                      styles.specCard,
                      {
                        backgroundColor: cardBgColor,
                        borderColor,
                        width: specCardWidth,
                        marginRight: 10,
                      },
                    ]}
                  >
                    <Text style={styles.specLabel}>Estado</Text>
                    <Text
                      style={StyleSheet.flatten([
                        styles.specValue,
                        { color: textPrimary },
                      ])}
                    >
                      {book.condition
                        ? CONDITION_LABELS[book.condition]
                        : 'No especificado'}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.specCard,
                      {
                        backgroundColor: cardBgColor,
                        borderColor,
                        width: specCardWidth,
                      },
                    ]}
                  >
                    <Text style={styles.specLabel}>Idioma</Text>
                    <Text
                      style={StyleSheet.flatten([
                        styles.specValue,
                        { color: textPrimary },
                      ])}
                    >
                      {book.languages[0]?.language ?? 'No especificado'}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', marginBottom: 18 }}>
                  <View
                    style={[
                      styles.specCard,
                      {
                        backgroundColor: cardBgColor,
                        borderColor,
                        width: specCardWidth,
                        marginRight: 10,
                      },
                    ]}
                  >
                    <Text style={styles.specLabel}>Páginas</Text>
                    <Text
                      style={StyleSheet.flatten([
                        styles.specValue,
                        { color: textPrimary },
                      ])}
                    >
                      {book.numPaginas} aprox.
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.specCard,
                      {
                        backgroundColor: cardBgColor,
                        borderColor,
                        width: specCardWidth,
                      },
                    ]}
                  >
                    <Text style={styles.specLabel}>Cubierta</Text>
                    <Text
                      style={StyleSheet.flatten([
                        styles.specValue,
                        { color: textPrimary },
                      ])}
                    >
                      {book.cover === 'HARDCOVER' ? 'Tapa dura' : 'Tapa blanda'}
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              <View style={[styles.specsGrid, { marginBottom: 18 }]}>
                <View
                  style={{
                    backgroundColor: cardBgColor,
                    padding: 14,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor,
                    flex: 1,
                    minWidth: '45%',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                      color: textSecondary,
                      fontWeight: 'bold',
                    }}
                  >
                    Estado
                  </Text>
                  <Text
                    style={{
                      fontWeight: 'bold',
                      color: textPrimary,
                      fontSize: 14,
                      marginTop: 4,
                    }}
                  >
                    {book.condition
                      ? CONDITION_LABELS[book.condition]
                      : 'No especificado'}
                  </Text>
                </View>

                <View
                  style={{
                    backgroundColor: cardBgColor,
                    padding: 14,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor,
                    flex: 1,
                    minWidth: '45%',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                      color: textSecondary,
                      fontWeight: 'bold',
                    }}
                  >
                    Idioma
                  </Text>
                  <Text
                    style={{
                      fontWeight: 'bold',
                      color: textPrimary,
                      fontSize: 14,
                      marginTop: 4,
                    }}
                  >
                    {book.languages[0]?.language ?? 'No especificado'}
                  </Text>
                </View>

                <View
                  style={{
                    backgroundColor: cardBgColor,
                    padding: 14,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor,
                    flex: 1,
                    minWidth: '45%',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                      color: textSecondary,
                      fontWeight: 'bold',
                    }}
                  >
                    Páginas
                  </Text>
                  <Text
                    style={{
                      fontWeight: 'bold',
                      color: textPrimary,
                      fontSize: 14,
                      marginTop: 4,
                    }}
                  >
                    {book.numPaginas} aprox.
                  </Text>
                </View>

                <View
                  style={{
                    backgroundColor: cardBgColor,
                    padding: 14,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor,
                    flex: 1,
                    minWidth: '45%',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                      color: textSecondary,
                      fontWeight: 'bold',
                    }}
                  >
                    Cubierta
                  </Text>
                  <Text
                    style={{
                      fontWeight: 'bold',
                      color: textPrimary,
                      fontSize: 14,
                      marginTop: 4,
                    }}
                  >
                    {book.cover === 'HARDCOVER' ? 'Tapa dura' : 'Tapa blanda'}
                  </Text>
                </View>
              </View>
            )}

            {/* Description */}
            {book.observaciones && (
              <View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={18}
                    color="#e07a5f"
                    style={{ marginRight: 8 }}
                  />
                  <Heading size="md" style={{ color: textPrimary, fontWeight: '900' }}>
                    Sobre este libro
                  </Heading>
                </View>
                <Text style={{ color: textSecondary, fontSize: 13, lineHeight: 20 }}>
                  {book.observaciones}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Fixed Action Button */}
        <View
          style={[
            styles.actionButtonContainer,
            { paddingBottom: insets.bottom + 24 },
          ]}
        >
          <Pressable
            onPress={() => handlePrimaryAction?.(card)}
            style={[
              styles.actionButton,
              {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              },
            ]}
          >
            <Ionicons
              name={primaryActionIcon}
              size={22}
              color="#fdfbf7"
              style={{ marginRight: 8 }}
            />
            <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>
              {primaryActionLabel}
            </Text>
          </Pressable>
        </View>

        {/* Report Dropdown - MOVIDO FUERA DEL SCROLLVIEW */}
        {showReportMenu && (
          <View
            style={[
              styles.reportMenu,
              {
                backgroundColor: cardBgColor,
                borderColor,
                top: insets.top + 56,
              },
            ]}
          >
            <View
              style={[
                styles.reportHeader,
                { borderBottomColor: borderColor },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons
                  name="flag-outline"
                  size={14}
                  color="#e07a5f"
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: 'bold',
                    color: textPrimary,
                  }}
                >
                  Reportar libro
                </Text>
              </View>
              <Pressable onPress={() => setShowReportMenu(false)}>
                <Ionicons name="close" size={16} color={textSecondary} />
              </Pressable>
            </View>

            {[
              'Contenido inapropiado',
              'Información falsa',
              'Libro duplicado',
              'Spam',
              'Otro',
            ].map((reason) => (
              <Pressable
                key={reason}
                onPress={() => handleReport(reason)}
                style={[styles.reportItem, { borderBottomColor: borderColor }]}
              >
                <Text style={{ fontSize: 14, color: textPrimary }}>
                  {reason}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroContainer: {
    height: 300,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 999,
    zIndex: 10,
  },
  topActions: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 999,
  },
  reportMenu: {
    position: 'absolute',
    right: 16,
    width: 224,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    zIndex: 99999,
  },
  reportHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reportItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  contentSection: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    marginTop: -40,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
  },
  ownerCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  ownerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e07a5f',
    overflow: 'hidden',
    borderWidth: 2,
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  specCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  specLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#8B7355',
    fontWeight: 'bold',
  },
  specValue: {
    fontWeight: 'bold',
    fontSize: 14,
    marginTop: 4,
  },
  actionButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingTop: 0,
  },
  actionButton: {
    width: '100%',
    backgroundColor: '#e07a5f',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#e07a5f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
