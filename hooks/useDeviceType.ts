import { useMemo } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type Orientation = 'portrait' | 'landscape';

interface DeviceInfo {
  deviceType: DeviceType;
  orientation: Orientation;
  isPortrait: boolean;
  isLandscape: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

export function useDeviceType(): DeviceInfo {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const isPortrait = height > width;
    const isLandscape = width > height;

    let deviceType: DeviceType;
    
    // En plataformas nativas (iOS/Android), detectar por dimensiones
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      if (width < 768) {
        deviceType = 'mobile';
      } else {
        // iPad o tablet Android
        deviceType = 'tablet';
      }
    } else {
      // En web, usar solo dimensiones de ventana
      if (width < 768) {
        deviceType = 'mobile';
      } else if (width >= 768 && width < 1024) {
        deviceType = 'tablet';
      } else {
        deviceType = 'desktop';
      }
    }

    return {
      deviceType,
      orientation: isPortrait ? 'portrait' : 'landscape',
      isPortrait,
      isLandscape,
      isMobile: deviceType === 'mobile',
      isTablet: deviceType === 'tablet',
      isDesktop: deviceType === 'desktop',
    };
  }, [width, height]);
}