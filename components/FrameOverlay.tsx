import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

interface FrameOverlayProps {
  /** Tamaño del avatar (diámetro) */
  size: number;
  /** Ancho del borde del marco */
  bw: number;
  /** Hueco entre la foto y el borde */
  gap: number;
  /** Color principal del marco */
  color: string;
  /** Si el marco tiene animación de glow + rotación */
  animated: boolean;
}

/**
 * Marco superpuesto sobre un avatar circular.
 * Se posiciona con `position: absolute` y NO afecta al layout del contenedor.
 *
 * El glow se aplica como shadow sobre el anillo de borde (no como círculo de
 * fondo) para evitar teñir la imagen del avatar que queda debajo.
 */
export default function FrameOverlay({
  size,
  bw,
  gap,
  color,
  animated,
}: FrameOverlayProps) {
  const offset = bw + gap;
  const outerSize = size + offset * 2;

  const glowOpacity = useSharedValue(animated ? 0.5 : 0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (animated) {
      glowOpacity.value = withRepeat(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
      rotation.value = withRepeat(
        withTiming(1, { duration: 3000, easing: Easing.linear }),
        -1,
        false,
      );
    }
  }, [animated]);

  // El shadow del anillo pulsa para simular el glow sin cubrir la imagen
  const ringStyle = useAnimatedStyle(() => ({
    shadowOpacity: animated ? glowOpacity.value : 0,
  }));

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(rotation.value, [0, 1], [0, 360])}deg` },
    ],
  }));

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: -offset,
        left: -offset,
        width: outerSize,
        height: outerSize,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Anillo de borde con glow pulsante via shadow */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: outerSize,
            height: outerSize,
            borderRadius: outerSize / 2,
            borderWidth: bw,
            borderColor: color,
            shadowColor: color,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 0 },
            elevation: animated ? 12 : 0,
          },
          ringStyle,
        ]}
      />

      {/* Destello rotante (solo en animados) */}
      {animated && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: outerSize,
              height: outerSize,
              alignItems: 'center',
            },
            rotateStyle,
          ]}
        >
          <View
            style={{
              width: bw * 3,
              height: bw,
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              borderRadius: bw,
              shadowColor: '#ffffff',
              shadowOpacity: 1,
              shadowRadius: 8,
              elevation: 8,
            }}
          />
        </Animated.View>
      )}
    </View>
  );
}
