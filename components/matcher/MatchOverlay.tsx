import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming
} from 'react-native-reanimated';

export interface MatchOverlayData {
  otherUsername: string;
  bookTitle: string | null;
  bookCoverUrl: string | null;
}

interface MatchOverlayProps {
  data: MatchOverlayData;
  onClose: () => void;
  onChat: () => void;
}

const PARTICLE_COUNT = 18;

interface Particle {
  emoji: string;
  startX: number;
  startY: number;
  delay: number;
  duration: number;
  size: number;
  direction: number;
}

function generateParticles(): Particle[] {
  const emojis = ['✨', '💛', '📚', '⭐', '🔥', '💫', '❤️', '📖', '🌟', '💕'];
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    emoji: emojis[i % emojis.length],
    startX: Math.random(),
    startY: 0.2 + Math.random() * 0.6,
    delay: Math.random() * 800,
    duration: 2000 + Math.random() * 1500,
    size: 16 + Math.random() * 18,
    direction: Math.random() > 0.5 ? 1 : -1,
  }));
}

const particles = generateParticles();

function FloatingParticle({ particle, screenWidth, screenHeight }: {
  particle: Particle;
  screenWidth: number;
  screenHeight: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      particle.delay,
      withRepeat(
        withTiming(1, { duration: particle.duration, easing: Easing.out(Easing.quad) }),
        -1,
        false,
      ),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: particle.startX * screenWidth + particle.direction * progress.value * 60,
    top: particle.startY * screenHeight - progress.value * screenHeight * 0.4,
    opacity: interpolate(progress.value, [0, 0.2, 0.7, 1], [0, 1, 1, 0]),
    transform: [
      { scale: interpolate(progress.value, [0, 0.3, 1], [0.3, 1.1, 0.5]) },
      { rotate: `${particle.direction * progress.value * 180}deg` },
    ],
  }));

  return (
    <Animated.Text style={[animatedStyle, { fontSize: particle.size }]}>
      {particle.emoji}
    </Animated.Text>
  );
}

export default function MatchOverlay({ data, onClose, onChat }: MatchOverlayProps) {
  const { width: W, height: H } = useWindowDimensions();

  const overlayOpacity = useSharedValue(0);
  const titleScale = useSharedValue(0);
  const titleRotate = useSharedValue(-10);
  const heartScale = useSharedValue(0);
  const heartPulse = useSharedValue(1);
  const subtitleOpacity = useSharedValue(0);
  const buttonsTranslateY = useSharedValue(60);
  const buttonsOpacity = useSharedValue(0);
  const glowScale = useSharedValue(0.6);
  const glowOpacity = useSharedValue(0);
  const bookSlideX = useSharedValue(80);
  const bookOpacity = useSharedValue(0);

  useEffect(() => {
    overlayOpacity.value = withTiming(1, { duration: 400 });

    glowOpacity.value = withDelay(200, withTiming(0.4, { duration: 600 }));
    glowScale.value = withDelay(200,
      withRepeat(
        withSequence(
          withTiming(1.2, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.8, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      ),
    );

    heartScale.value = withDelay(250, withSpring(1, { damping: 6, stiffness: 150 }));
    heartPulse.value = withDelay(800,
      withRepeat(
        withSequence(
          withTiming(1.15, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      ),
    );

    titleScale.value = withDelay(350, withSpring(1, { damping: 8, stiffness: 120 }));
    titleRotate.value = withDelay(350, withSpring(0, { damping: 10, stiffness: 100 }));

    bookSlideX.value = withDelay(500, withSpring(0, { damping: 14, stiffness: 90 }));
    bookOpacity.value = withDelay(500, withTiming(1, { duration: 300 }));

    subtitleOpacity.value = withDelay(650, withTiming(1, { duration: 400 }));

    buttonsTranslateY.value = withDelay(800, withSpring(0, { damping: 12, stiffness: 100 }));
    buttonsOpacity.value = withDelay(800, withTiming(1, { duration: 350 }));
  }, []);

  const overlayAnimStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const glowAnimStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const heartAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: heartScale.value * heartPulse.value },
    ],
  }));

  const titleAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: titleScale.value },
      { rotate: `${titleRotate.value}deg` },
    ],
  }));

  const bookAnimStyle = useAnimatedStyle(() => ({
    opacity: bookOpacity.value,
    transform: [{ translateX: bookSlideX.value }],
  }));

  const subtitleAnimStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  const buttonsAnimStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
    transform: [{ translateY: buttonsTranslateY.value }],
  }));

  const handleClose = useCallback(() => {
    overlayOpacity.value = withTiming(0, { duration: 250 }, (finished) => {
      if (finished) runOnJS(onClose)();
    });
  }, [onClose]);

  const handleChat = useCallback(() => {
    overlayOpacity.value = withTiming(0, { duration: 250 }, (finished) => {
      if (finished) runOnJS(onChat)();
    });
  }, [onChat]);

  const bookCover = data.bookCoverUrl;
  const showBookImage = !!bookCover;

  return (
    <Animated.View style={[styles.container, overlayAnimStyle]}>
      <LinearGradient
        colors={['rgba(224,122,95,0.95)', 'rgba(180,70,50,0.97)', 'rgba(62,39,35,0.98)']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {particles.map((p, i) => (
        <FloatingParticle key={i} particle={p} screenWidth={W} screenHeight={H} />
      ))}

      <Animated.View style={[styles.glowCircle, glowAnimStyle]} />

      <Animated.View style={[styles.heartContainer, heartAnimStyle]}>
        <View style={styles.heartBg}>
          <Ionicons name="heart" size={52} color="#fff" />
        </View>
      </Animated.View>

      <Animated.View style={[styles.titleContainer, titleAnimStyle]}>
        <Text style={styles.titleText}>¡Es un Match!</Text>
      </Animated.View>

      {showBookImage && (
        <Animated.View style={[styles.bookContainer, bookAnimStyle]}>
          <Animated.Image
            source={{ uri: bookCover }}
            style={styles.bookImage}
            resizeMode="cover"
          />
        </Animated.View>
      )}

      <Animated.View style={[styles.subtitleContainer, subtitleAnimStyle]}>
        {data.bookTitle && (
          <Text style={styles.bookTitleText} numberOfLines={2}>
            {data.bookTitle}
          </Text>
        )}
        <Text style={styles.subtitleText}>
          Tú y{' '}
          <Text style={styles.usernameText}>{data.otherUsername}</Text>
          {'\n'}quereis intercambiar libros 📚 
        </Text>
      </Animated.View>

      <Animated.View style={[styles.buttonsContainer, buttonsAnimStyle]}>
        <Pressable
          onPress={handleChat}
          style={({ pressed }) => [
            styles.chatButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Ionicons name="chatbubble-ellipses" size={20} color="#e07a5f" style={{ marginRight: 8 }} />
          <Text style={styles.chatButtonText}>Enviar mensaje</Text>
        </Pressable>

        <Pressable
          onPress={handleClose}
          style={({ pressed }) => [
            styles.continueButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.continueButtonText}>Seguir buscando</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  glowCircle: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  heartContainer: {
    marginBottom: 8,
  },
  heartBg: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    marginBottom: 20,
  },
  titleText: {
    fontSize: 38,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    letterSpacing: 1,
  },
  bookContainer: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 12,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  bookImage: {
    width: 120,
    height: 170,
    borderRadius: 9,
  },
  subtitleContainer: {
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 32,
  },
  bookTitleText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subtitleText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 24,
  },
  usernameText: {
    fontWeight: '800',
    color: '#fff',
  },
  buttonsContainer: {
    alignItems: 'center',
    gap: 12,
    width: '100%',
    paddingHorizontal: 40,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    width: '100%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  chatButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#e07a5f',
  },
  continueButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
});
