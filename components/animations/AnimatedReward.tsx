import { useEffect } from "react";
import { ViewProps } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

interface AnimatedRewardProps extends ViewProps {
  children: React.ReactNode;
  delay?: number;
  onAnimationComplete?: () => void;
  fast?: boolean;
}

/**
 * Animación mejorada de rewards:
 * - Pop animation rápida (250ms base)
 * - Sin solapamiento visual
 * - Modo rápido para desplegables
 */
export default function AnimatedReward({
  children,
  delay = 0,
  onAnimationComplete,
  fast = false,
  ...props
}: AnimatedRewardProps) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const duration = fast ? 300 : 380;

    // Pop suave sin superpocición: 0 → 1.06 → 1 (pequeño pop, no 1.12)
    scale.value = withDelay(
      delay,
      withSequence(
        withSpring(1.06, {
          damping: 16,
          stiffness: 260,
        }),
        withSpring(1, {
          damping: 16,
          stiffness: 240,
        }),
      ),
    );

    opacity.value = withDelay(
      delay,
      withTiming(1, {
        duration: fast ? 240 : 300,
        easing: Easing.out(Easing.cubic),
      }),
    );

    // Callback tras finalizar
    if (onAnimationComplete) {
      const timer = setTimeout(() => {
        onAnimationComplete();
      }, delay + duration);
      return () => clearTimeout(timer);
    }
  }, [delay, fast]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animatedStyle} {...props}>
      {children}
    </Animated.View>
  );
}
