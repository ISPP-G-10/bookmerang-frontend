import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { BookCondition, MatcherCard } from '@/types/matcher';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, Pressable, Image as RNImage, StyleSheet, useColorScheme, View } from 'react-native';

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
}

export function BookDetailsScreen({
  visible,
  card,
  onClose,
  onChat,
}: BookDetailsScreenProps) {
  const [showReportMenu, setShowReportMenu] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (!card) return null;

  const { book, owner, distanceKm } = card;
  const heroPhoto = book.photos[0]?.url;

  const handleReport = (reason: string) => {
    setShowReportMenu(false);
    console.log('Reportado:', reason);
    // Aquí iría la lógica de reporte
  };

  // Colores dinámicos según el tema
  const bgColor = isDark ? '#1C1C1E' : '#FAF7F4';
  const cardBgColor = isDark ? '#2C2C2E' : '#FFFFFF';
  const borderColor = isDark ? '#3A3A3C' : '#F3E9E0';
  const textPrimary = isDark ? '#fdfbf7' : '#3e2723';
  const textSecondary = isDark ? '#AEAEB2' : '#8B7355';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        {/* Header/Hero Section */}
        <View style={styles.heroContainer}>
          {heroPhoto ? (
            <RNImage
              source={{ uri: heroPhoto }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.heroImage, { backgroundColor: '#e07a5f', alignItems: 'center', justifyContent: 'center' }]}>
              <Ionicons name="book" size={80} color="#fdfbf7" />
            </View>
          )}

          {/* Back Button */}
          <Pressable onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fdfbf7" />
          </Pressable>

          {/* Action Buttons (Share & Report) */}
          <HStack style={styles.topActions} className="gap-2">
            <Pressable style={styles.iconButton}>
              <Ionicons name="share-outline" size={20} color="#fdfbf7" />
            </Pressable>
            <Pressable
              onPress={() => setShowReportMenu(!showReportMenu)}
              style={styles.iconButton}
            >
              <Ionicons name="ellipsis-vertical" size={20} color="#fdfbf7" />
            </Pressable>
          </HStack>

          {/* Report Dropdown */}
          {showReportMenu && (
            <View style={[styles.reportMenu, { backgroundColor: cardBgColor, borderColor }]}>
              <HStack style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: borderColor, alignItems: 'center', justifyContent: 'space-between' }}>
                <HStack className="items-center gap-2">
                  <Ionicons name="flag-outline" size={14} color="#e07a5f" />
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: textPrimary }}>
                    Reportar libro
                  </Text>
                </HStack>
                <Pressable onPress={() => setShowReportMenu(false)}>
                  <Ionicons name="close" size={16} color={textSecondary} />
                </Pressable>
              </HStack>
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
                  style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: borderColor }}
                >
                  <Text style={{ fontSize: 14, color: textPrimary }}>{reason}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Content */}
        <VStack style={{ paddingHorizontal: 24, paddingVertical: 20, paddingBottom: 100, gap: 18, marginTop: -40, backgroundColor: bgColor, borderTopLeftRadius: 40, borderTopRightRadius: 40 }}>
          {/* Book Title & Author */}
          <VStack className="gap-1">
            <Heading size="2xl" style={{ color: textPrimary, fontWeight: '900' }}>
              {book.titulo}
            </Heading>
            <Text style={{ fontSize: 18, color: textSecondary }}>
              {book.autor ?? 'Autor desconocido'}
            </Text>
          </VStack>

          {/* Owner Info */}
          <View style={{ padding: 16, backgroundColor: cardBgColor, borderRadius: 16, borderWidth: 1, borderColor }}>
            <HStack className="items-center justify-between">
              <HStack className="items-center gap-3">
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#e07a5f', overflow: 'hidden', borderWidth: 2, borderColor: bgColor }}>
                  {owner.fotoPerfilUrl ? (
                    <RNImage
                      source={{ uri: owner.fotoPerfilUrl }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="w-full h-full bg-[#e07a5f] items-center justify-center">
                      <Text className="text-white text-lg font-black">
                        {owner.username.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
                <VStack>
                  <Text style={{ fontWeight: 'bold', color: textPrimary }}>
                    {owner.username}
                  </Text>
                  <HStack className="items-center gap-1">
                    <Ionicons name="location-outline" size={12} color="#e07a5f" />
                    <Text style={{ fontSize: 12, color: textSecondary }}>
                      A {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${Math.round(distanceKm)} km`} de ti
                    </Text>
                  </HStack>
                </VStack>
              </HStack>
              <Pressable>
                <Text className="text-[#e07a5f] font-bold text-sm">
                  Ver perfil
                </Text>
              </Pressable>
            </HStack>
          </View>

          {/* Book Specs */}
          <View style={styles.specsGrid}>
            <View style={{ backgroundColor: cardBgColor, padding: 14, borderRadius: 16, borderWidth: 1, borderColor, flex: 1, minWidth: '45%' }}>
              <Text style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: textSecondary, fontWeight: 'bold' }}>
                Estado
              </Text>
              <Text style={{ fontWeight: 'bold', color: textPrimary, fontSize: 14, marginTop: 4 }}>
                {book.condition ? CONDITION_LABELS[book.condition] : 'No especificado'}
              </Text>
            </View>
            <View style={{ backgroundColor: cardBgColor, padding: 14, borderRadius: 16, borderWidth: 1, borderColor, flex: 1, minWidth: '45%' }}>
              <Text style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: textSecondary, fontWeight: 'bold' }}>
                Idioma
              </Text>
              <Text style={{ fontWeight: 'bold', color: textPrimary, fontSize: 14, marginTop: 4 }}>
                {book.languages[0]?.language ?? 'No especificado'}
              </Text>
            </View>
            <View style={{ backgroundColor: cardBgColor, padding: 14, borderRadius: 16, borderWidth: 1, borderColor, flex: 1, minWidth: '45%' }}>
              <Text style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: textSecondary, fontWeight: 'bold' }}>
                Páginas
              </Text>
              <Text style={{ fontWeight: 'bold', color: textPrimary, fontSize: 14, marginTop: 4 }}>
                {book.numPaginas} aprox.
              </Text>
            </View>
            <View style={{ backgroundColor: cardBgColor, padding: 14, borderRadius: 16, borderWidth: 1, borderColor, flex: 1, minWidth: '45%' }}>
              <Text style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: textSecondary, fontWeight: 'bold' }}>
                Cubierta
              </Text>
              <Text style={{ fontWeight: 'bold', color: textPrimary, fontSize: 14, marginTop: 4 }}>
                {book.cover === 'HARDCOVER' ? 'Tapa dura' : 'Tapa blanda'}
              </Text>
            </View>
          </View>

          {/* Description */}
          {book.observaciones && (
            <VStack>
              <HStack className="items-center gap-2" style={{ marginBottom: 8 }}>
                <Ionicons name="information-circle-outline" size={18} color="#e07a5f" />
                <Heading size="md" style={{ color: textPrimary, fontWeight: '900' }}>
                  Sobre este libro
                </Heading>
              </HStack>
              <Text 
                style={{ color: textSecondary, fontSize: 13, lineHeight: 20 }}
                numberOfLines={4}
                ellipsizeMode="tail"
              >
                {book.observaciones}
              </Text>
            </VStack>
          )}
        </VStack>

        {/* Action Button */}
        <View style={styles.actionButtonContainer}>
          <Pressable
            onPress={() => onChat?.(card)}
            className="w-full bg-[#e07a5f] py-4 rounded-2xl items-center"
            style={styles.actionButton}
          >
            <HStack className="items-center gap-2">
              <Ionicons name="chatbubble-outline" size={22} color="#fdfbf7" />
              <Text className="text-white font-black text-base">
                Solicitar intercambio
              </Text>
            </HStack>
          </Pressable>
        </View>
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
    top: 48,
    left: 16,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
    zIndex: 10,
  },
  topActions: {
    position: 'absolute',
    top: 48,
    right: 16,
    zIndex: 10,
  },
  iconButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
  },
  reportMenu: {
    position: 'absolute',
    top: 96,
    right: 16,
    width: 224,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 1000,
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
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
    shadowColor: '#e07a5f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});