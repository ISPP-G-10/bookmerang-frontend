import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

interface AnimatedProgressBarProps {
  progress: number; // 0-1
  backgroundColor?: string;
  fillColor?: string;
  height?: number;
  borderRadius?: number;
}

export default function AnimatedProgressBar({
  progress,
  backgroundColor = "#F3E9E0",
  fillColor = "#e07a5f",
  height = 10,
  borderRadius = 5,
}: AnimatedProgressBarProps) {
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    // Animar suavemente al nuevo valor
    animatedProgress.value = withTiming(Math.min(progress, 1), {
      duration: 1200,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(100, animatedProgress.value * 100))}%`,
  }));

  return (
    <View
      style={{
        height,
        borderRadius,
        backgroundColor,
        overflow: "hidden",
        width: "100%",
      }}
    >
      <Animated.View
        style={[
          {
            height,
            borderRadius,
            backgroundColor: fillColor,
          },
          animatedStyle,
        ]}
      />
    </View>
  );
}
