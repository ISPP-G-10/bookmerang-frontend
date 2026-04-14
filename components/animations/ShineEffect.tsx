import { useEffect } from "react";
import { View, ViewProps } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

interface ShineEffectProps extends ViewProps {
  children: React.ReactNode;
  intensity?: "subtle" | "medium" | "high";
  speed?: "slow" | "normal" | "fast";
}

/**
 * Premium shine/gloss effect overlay
 * Crea una ilusión de luz reflejándose sobre el elemento
 */
export default function ShineEffect({
  children,
  intensity = "medium",
  speed = "normal",
  style,
  ...props
}: ShineEffectProps) {
  const shineOpacity = useSharedValue(0);
  const shineX = useSharedValue(-100);

  const intensityConfig = {
    subtle: 0.15,
    medium: 0.35,
    high: 0.55,
  };

  const speedConfig = {
    slow: 4000,
    normal: 2800,
    fast: 1800,
  };

  useEffect(() => {
    // Animación continua del brillo
    shineX.value = withRepeat(
      withTiming(200, {
        duration: speedConfig[speed],
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );

    shineOpacity.value = withRepeat(
      withTiming(intensityConfig[intensity], {
        duration: speedConfig[speed] / 2,
        easing: Easing.inOut(Easing.cubic),
      }),
      -1,
      true,
    );
  }, [intensity, speed]);

  const shineAnimStyle = useAnimatedStyle(() => ({
    left: `${shineX.value}%`,
    opacity: shineOpacity.value,
  }));

  return (
    <View style={[style, { position: "relative" }]} {...props}>
      {children}

      {/* Shine overlay */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            width: "30%",
            height: "100%",
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.8) 50%, transparent 100%)",
            pointerEvents: "none",
            borderRadius: 14, // Match reward card border radius
          },
          shineAnimStyle,
        ]}
        pointerEvents="none"
      />
    </View>
  );
}
