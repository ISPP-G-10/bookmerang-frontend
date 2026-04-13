import { useEffect } from "react";
import { Text, TextProps, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

interface AnimatedNameDisplayProps extends TextProps {
  name: string;
  color?: string;
  isHighTier?: boolean; // Premium shine effect para tiers altos
  size?: number;
  weight?: "700" | "800" | "900";
}

/**
 * Nombre con animación de brillo opcional para tiers altos
 */
export default function AnimatedNameDisplay({
  name,
  color = "#3e2723",
  isHighTier = false,
  size = 24,
  weight = "900",
  style,
  ...props
}: AnimatedNameDisplayProps) {
  const shineOpacity = useSharedValue(0);
  const shineX = useSharedValue(-100);

  useEffect(() => {
    if (!isHighTier) return;

    // Efecto shine para nombres de tier alto
    shineX.value = withRepeat(
      withTiming(200, {
        duration: 3200,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );

    shineOpacity.value = withRepeat(
      withTiming(0.4, {
        duration: 3200 / 2,
        easing: Easing.inOut(Easing.cubic),
      }),
      -1,
      true,
    );
  }, [isHighTier]);

  const shineAnimStyle = useAnimatedStyle(() => ({
    left: `${shineX.value}%`,
    opacity: shineOpacity.value,
  }));

  return (
    <View style={{ position: "relative" }}>
      <Text
        style={[
          {
            fontSize: size,
            fontWeight: weight,
            color,
          },
          style,
        ]}
        {...props}
      >
        {name}
      </Text>

      {/* Shine overlay para tier alto */}
      {isHighTier && (
        <Animated.View
          style={[
            {
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: "25%",
              height: "100%",
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.7) 50%, transparent 100%)",
              pointerEvents: "none",
            },
            shineAnimStyle,
          ]}
          pointerEvents="none"
        />
      )}
    </View>
  );
}
