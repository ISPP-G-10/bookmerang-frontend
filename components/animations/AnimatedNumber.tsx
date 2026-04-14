import { useEffect, useState } from "react";
import { Text, TextProps } from "react-native";
import {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

interface AnimatedNumberProps extends TextProps {
  value: number;
  precision?: number;
  duration?: number;
}

export default function AnimatedNumber({
  value,
  precision = 0,
  duration = 800,
  style,
  ...props
}: AnimatedNumberProps) {
  const animatedValue = useSharedValue(0);
  const [displayValue, setDisplayValue] = useState<string | number>(0);

  useEffect(() => {
    animatedValue.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, duration]);

  // Actualizar el texto mostrado cuando el valor animado cambia
  useAnimatedReaction(
    () => Math.round(animatedValue.value * 100) / 100,
    (val) => {
      const rounded =
        precision === 0 ? Math.round(val) : parseFloat(val.toFixed(precision));
      runOnJS(setDisplayValue)(rounded);
    },
  );

  return (
    <Text style={style} {...props}>
      {displayValue}
    </Text>
  );
}
