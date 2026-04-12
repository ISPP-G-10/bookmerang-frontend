import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSubscription } from '@/contexts/SubscriptionContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';

interface PremiumGateProps {
  feature: string;
  children: React.ReactNode;
}

export function PremiumGate({ feature, children }: PremiumGateProps) {
  const { isPremium } = useSubscription();
  const router = useRouter();

  if (isPremium) {
    return <>{children}</>;
  }

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#faf8f3',
      }}
    >
      <FontAwesome name="lock" size={48} color="#c4a882" style={{ marginBottom: 16 }} />
      <Text
        style={{
          fontSize: 18,
          fontWeight: '900',
          color: '#2d2520',
          marginBottom: 8,
          textAlign: 'center',
        }}
      >
        {feature} es exclusivo para Premium
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: '#8B7355',
          marginBottom: 24,
          textAlign: 'center',
        }}
      >
        Mejora a Premium para acceder a esta funcionalidad
      </Text>
      <TouchableOpacity
        style={{
          backgroundColor: '#e07a5f',
          borderRadius: 999,
          paddingHorizontal: 24,
          paddingVertical: 12,
        }}
        onPress={() => router.push('/subscription')}
      >
        <Text
          style={{
            color: '#fff',
            fontWeight: '900',
            fontSize: 14,
          }}
        >
          Mejorar a Premium
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/**
 * Wrapper component for inline premium gating
 * Shows a lock icon + "Upgrade" button when content is locked
 */
export function PremiumFeatureBadge({ feature }: { feature: string }) {
  const { isPremium } = useSubscription();
  const router = useRouter();

  if (isPremium) {
    return null;
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#ffe8e0',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginBottom: 12,
      }}
    >
      <FontAwesome name="lock" size={14} color="#c41e3a" />
      <Text
        style={{
          color: '#c41e3a',
          fontWeight: '600',
          fontSize: 12,
          flex: 1,
        }}
      >
        {feature} es exclusivo para Premium
      </Text>
      <TouchableOpacity onPress={() => router.push('/subscription')}>
        <Text
          style={{
            color: '#e07a5f',
            fontWeight: '900',
            fontSize: 11,
          }}
        >
          Mejorar
        </Text>
      </TouchableOpacity>
    </View>
  );
}
