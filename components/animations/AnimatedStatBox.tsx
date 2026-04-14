import { useEffect } from "react";
import { ViewProps } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

interface AnimatedStatBoxProps extends ViewProps {
  children: React.ReactNode;
  delay?: number;
  index?: number;
}

/**
 * Stat boxes que entran en cascada con:
 * 1. Slide up + fade in
 * 2. Slight scale pop
 */
export default function AnimatedStatBox({
  children,
  delay = 0,
  index = 0,
  style,
  ...props
}: AnimatedStatBoxProps) {
  const translateY = useSharedValue(20);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);

  useEffect(() => {
    const totalDelay = delay + index * 100;

    translateY.value = withDelay(
      totalDelay,
      withTiming(0, {
        duration: 500,
        easing: Easing.out(Easing.cubic),
      }),
    );

    opacity.value = withDelay(totalDelay, withTiming(1, { duration: 400 }));

    scale.value = withDelay(totalDelay, withTiming(1, { duration: 500 }));
  }, [delay, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[animatedStyle, style]} {...props}>
      {children}
    </Animated.View>
  );
}
