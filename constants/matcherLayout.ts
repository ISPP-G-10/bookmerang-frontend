import type { DeviceType, Orientation } from '@/hooks/useDeviceType';

interface CardSizeConfig {
  widthRatio: number;
  heightRatio: number;
}

interface LayoutConfig {
  cardMarginTop: number;
  buttonGap: number;
  buttonOffsetFromCard: number;
  dislikeButtonSize: number;
  likeButtonSize: number;
  iconSize: number;
}

type DeviceOrientationConfig<T> = {
  [K in DeviceType]: {
    [O in Orientation]: T;
  };
};

export const CARD_SIZE_CONFIG: DeviceOrientationConfig<CardSizeConfig> = {
  mobile: {
    portrait: { widthRatio: 0.85, heightRatio: 1.6 },
    landscape: { widthRatio: 0.50, heightRatio: 1.4 },
  },
  tablet: {
    portrait: { widthRatio: 0.65, heightRatio: 1.5 },
    landscape: { widthRatio: 0.30, heightRatio: 1.4 },
  },
  desktop: {
    portrait: { widthRatio: 0.60, heightRatio: 1.5 },
    landscape: { widthRatio: 0.25, heightRatio: 1.4 },
  },
} as const;

export const LAYOUT_CONFIG: DeviceOrientationConfig<LayoutConfig> = {
  mobile: {
    portrait: {
      cardMarginTop: 0,
      buttonGap: 40,
      buttonOffsetFromCard: 0, // No se usa, calculado por porcentaje
      dislikeButtonSize: 66,
      likeButtonSize: 70,
      iconSize: 50,
    },
    landscape: {
      cardMarginTop: 0,
      buttonGap: 35,
      buttonOffsetFromCard: 0,
      dislikeButtonSize: 60,
      likeButtonSize: 64,
      iconSize: 45,
    },
  },
  tablet: {
    portrait: {
      cardMarginTop: -20,
      buttonGap: 45,
      buttonOffsetFromCard: 150,
      dislikeButtonSize: 70,
      likeButtonSize: 74,
      iconSize: 42,
    },
    landscape: {
      cardMarginTop: 0,
      buttonGap: 50,
      buttonOffsetFromCard: 140,
      dislikeButtonSize: 65,
      likeButtonSize: 69,
      iconSize: 42,
    },
  },
  desktop: {
    portrait: {
      cardMarginTop: -80,
      buttonGap: 45,
      buttonOffsetFromCard: 90,
      dislikeButtonSize: 70,
      likeButtonSize: 74,
      iconSize: 42,
    },
    landscape: {
      cardMarginTop: -60,
      buttonGap: 50,
      buttonOffsetFromCard: 100,
      dislikeButtonSize: 70,
      likeButtonSize: 74,
      iconSize: 42,
    },
  },
} as const;