import { useEffect } from "react";
import { Image, Text, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { getFrameById, type FrameReward } from "../lib/rewardsSystem";

function PremiumGlowFrame({
  size,
  borderWidth,
  color,
  animated,
}: {
  size: number;
  borderWidth: number;
  color: string;
  animated: boolean;
}) {
  const glowOpacity = useSharedValue(0.5);
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (animated) {
      glowOpacity.value = withRepeat(
        withTiming(0.8, {
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true,
      );
      rotation.value = withRepeat(
        withTiming(1, {
          duration: 3000,
          easing: Easing.linear,
        }),
        -1,
        false,
      );
    }
  }, [animated]);

  const outerSize = size + borderWidth * 2;

  const glowStyle = useAnimatedStyle(() => ({
    opacity: animated ? glowOpacity.value : 0.5,
  }));

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(rotation.value, [0, 1], [0, 360])}deg` },
    ],
  }));

  return (
    <View
      style={{
        position: "absolute",
        width: outerSize,
        height: outerSize,
        alignItems: "center",
        justifyContent: "center",
      }}
      pointerEvents="none"
    >
      <Animated.View
        style={[
          {
            position: "absolute",
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            shadowColor: color,
            shadowOpacity: 1,
            shadowRadius: 20,
            elevation: 20,
          },
          glowStyle,
        ]}
      />

      <View
        style={{
          position: "absolute",
          width: outerSize,
          height: outerSize,
          borderRadius: outerSize / 2,
          borderWidth: borderWidth,
          borderColor: color,
        }}
      />

      {animated && (
        <Animated.View
          style={[
            {
              position: "absolute",
              width: outerSize,
              height: outerSize,
              alignItems: "center",
            },
            rotateStyle,
          ]}
        >
          <View
            style={{
              width: borderWidth * 3,
              height: borderWidth,
              backgroundColor: "rgba(255, 255, 255, 0.8)",
              borderRadius: borderWidth,
              shadowColor: "#ffffff",
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

interface AvatarWithFrameProps {
  avatarUri?: string | null;
  profilePhoto?: string | null;
  size?: number;
  activeFrameId?: string | null;
}

export default function AvatarWithFrame({
  avatarUri,
  profilePhoto,
  size = 112,
  activeFrameId,
}: AvatarWithFrameProps) {
  const frame: FrameReward | undefined = activeFrameId
    ? getFrameById(activeFrameId)
    : undefined;

  const imageUri = avatarUri ?? profilePhoto ?? null;
  const frameColor =
    frame?.animationColors?.[0] ?? frame?.borderColor ?? "#e07a5f";
  const outerPad = frame ? frame.borderWidth + 4 : 0;
  const outerSize = size + outerPad * 2;

  return (
    <View
      style={{
        width: outerSize,
        height: outerSize,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {frame && (
        <PremiumGlowFrame
          size={size + 8}
          borderWidth={frame.borderWidth}
          color={frameColor}
          animated={frame.animated}
        />
      )}

      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: "#ffffff",
          overflow: "hidden",
        }}
      >
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={{ width: size, height: size }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: size,
              height: size,
              backgroundColor: "#e07a5f",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: size * 0.43 }}>U</Text>
          </View>
        )}
      </View>
    </View>
  );
}
