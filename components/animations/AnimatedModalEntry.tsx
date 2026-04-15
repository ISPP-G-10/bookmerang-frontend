import { useEffect } from "react";
import { Modal, ModalProps, Pressable } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

interface AnimatedModalEntryProps extends ModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  backdropOpacity?: number;
  backdropColor?: string;
}

/**
 * Modal con animación de entrada mejorada:
 * 1. Backdrop fade in
 * 2. Content slide up + scale
 */
export default function AnimatedModalEntry({
  visible,
  onClose,
  children,
  backdropOpacity = 0.55,
  backdropColor = "#000000",
  ...props
}: AnimatedModalEntryProps) {
  const contentScale = useSharedValue(0.8);
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(50);
  const backdropOpacityValue = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      contentScale.value = withTiming(1, {
        duration: 500,
        easing: Easing.out(Easing.cubic),
      });
      contentOpacity.value = withTiming(1, { duration: 400 });
      contentTranslateY.value = withTiming(0, {
        duration: 500,
        easing: Easing.out(Easing.cubic),
      });
      backdropOpacityValue.value = withTiming(backdropOpacity, {
        duration: 300,
      });
    } else {
      contentScale.value = withTiming(0.8, {
        duration: 300,
        easing: Easing.in(Easing.cubic),
      });
      contentOpacity.value = withTiming(0, { duration: 200 });
      contentTranslateY.value = withTiming(50, { duration: 300 });
      backdropOpacityValue.value = withTiming(0, { duration: 300 });
    }
  }, [visible]);

  const contentStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: contentScale.value },
      { translateY: contentTranslateY.value },
    ],
    opacity: contentOpacity.value,
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(0, 0, 0, ${backdropOpacityValue.value})`,
  }));

  return (
    <Modal visible={visible} transparent animationType="none" {...props}>
      <Animated.View
        style={[
          {
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
          },
          backdropStyle,
        ]}
      >
        <Pressable
          style={{ flex: 1 }}
          onPress={onClose}
          testID="modal-backdrop"
        />
        <Animated.View
          style={[
            {
              backgroundColor: "#ffffff",
              borderRadius: 24,
              width: "100%",
              maxHeight: "85%",
              overflow: "hidden",
            },
            contentStyle,
          ]}
          pointerEvents="box-none"
        >
          {children}
        </Animated.View>
        <Pressable
          style={{ flex: 1 }}
          onPress={onClose}
          testID="modal-backdrop-bottom"
        />
      </Animated.View>
    </Modal>
  );
}
