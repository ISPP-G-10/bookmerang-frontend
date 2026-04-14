import React from 'react';
import { Image, Text, View, ViewStyle } from 'react-native';
import FrameOverlay from '@/components/FrameOverlay';
import { getFrameById, getNameColorById } from '@/lib/rewardsSystem';

interface ChatAvatarProps {
  profilePhoto?: string | null;
  username?: string | null;
  size: number;
  activeFrameId?: string | null;
  activeColorId?: string | null;
  style?: ViewStyle;
}

/**
 * Avatar circular de tamaño fijo con marco opcional.
 * El marco se superpone absolutamente sin cambiar el tamaño del contenedor
 * y sin desalinear los elementos hermanos.
 */
export default function ChatAvatar({
  profilePhoto,
  username,
  size,
  activeFrameId,
  activeColorId,
  style,
}: ChatAvatarProps) {
  const frame = activeFrameId ? getFrameById(activeFrameId) : undefined;
  const nameColor = activeColorId ? getNameColorById(activeColorId) : undefined;

  const frameColor = frame?.animationColors?.[0] ?? frame?.borderColor ?? null;
  const bw = frame?.borderWidth ?? 0;
  const gap = bw > 0 ? 2 : 0;

  const placeholderBg = nameColor?.color ?? '#e4715f';
  const initial = username?.charAt(0)?.toUpperCase() ?? '?';

  return (
    <View style={[{ width: size, height: size }, style]}>
      {profilePhoto ? (
        <Image
          source={{ uri: profilePhoto }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: placeholderBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{ color: '#ffffff', fontSize: size * 0.4, fontWeight: '700' }}
          >
            {initial}
          </Text>
        </View>
      )}

      {frame && frameColor && (
        <FrameOverlay
          size={size}
          bw={bw}
          gap={gap}
          color={frameColor}
          animated={frame.animated}
        />
      )}
    </View>
  );
}
