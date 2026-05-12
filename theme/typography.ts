/**
 * Unified typography tokens. Single source of truth for fonts, sizes, weights,
 * leading and tracking across the app. Use these everywhere instead of inline
 * fontFamily/fontSize/fontWeight literals.
 */

export const FONTS = {
  regular: 'Outfit_400Regular',
  bold: 'Outfit_700Bold',
  display: 'RomanaBeckerDemi',
  mono: 'SpaceMono',
} as const;

export type FontKey = keyof typeof FONTS;

export const FONT_WEIGHT = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
  black: '900',
} as const;

export type FontWeightKey = keyof typeof FONT_WEIGHT;

export const FONT_SIZE = {
  '2xs': 10,
  xs: 12,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 40,
} as const;

export type FontSizeKey = keyof typeof FONT_SIZE;

export const LINE_HEIGHT: Record<FontSizeKey, number> = {
  '2xs': 14,
  xs: 16,
  sm: 18,
  base: 22,
  md: 24,
  lg: 26,
  xl: 28,
  '2xl': 32,
  '3xl': 36,
  '4xl': 40,
  '5xl': 48,
};

export const LETTER_SPACING = {
  tighter: -0.5,
  tight: -0.2,
  normal: 0,
  wide: 0.4,
  wider: 0.8,
} as const;

export type LetterSpacingKey = keyof typeof LETTER_SPACING;

/**
 * Semantic role → token map. Drives the Typography primitives.
 */
export const TEXT_STYLES = {
  display: {
    fontFamily: FONTS.bold,
    size: '4xl' as FontSizeKey,
    weight: FONT_WEIGHT.bold,
    letterSpacing: LETTER_SPACING.tight,
  },
  h1: {
    fontFamily: FONTS.bold,
    size: '3xl' as FontSizeKey,
    weight: FONT_WEIGHT.bold,
    letterSpacing: LETTER_SPACING.tight,
  },
  h2: {
    fontFamily: FONTS.bold,
    size: '2xl' as FontSizeKey,
    weight: FONT_WEIGHT.bold,
    letterSpacing: LETTER_SPACING.tight,
  },
  h3: {
    fontFamily: FONTS.bold,
    size: 'xl' as FontSizeKey,
    weight: FONT_WEIGHT.bold,
    letterSpacing: LETTER_SPACING.normal,
  },
  h4: {
    fontFamily: FONTS.bold,
    size: 'lg' as FontSizeKey,
    weight: FONT_WEIGHT.bold,
    letterSpacing: LETTER_SPACING.normal,
  },
  subtitle: {
    fontFamily: FONTS.bold,
    size: 'md' as FontSizeKey,
    weight: FONT_WEIGHT.semibold,
    letterSpacing: LETTER_SPACING.normal,
  },
  body: {
    fontFamily: FONTS.regular,
    size: 'md' as FontSizeKey,
    weight: FONT_WEIGHT.regular,
    letterSpacing: LETTER_SPACING.normal,
  },
  bodySm: {
    fontFamily: FONTS.regular,
    size: 'sm' as FontSizeKey,
    weight: FONT_WEIGHT.regular,
    letterSpacing: LETTER_SPACING.normal,
  },
  label: {
    fontFamily: FONTS.bold,
    size: 'sm' as FontSizeKey,
    weight: FONT_WEIGHT.semibold,
    letterSpacing: LETTER_SPACING.wide,
  },
  caption: {
    fontFamily: FONTS.regular,
    size: 'xs' as FontSizeKey,
    weight: FONT_WEIGHT.regular,
    letterSpacing: LETTER_SPACING.normal,
  },
  overline: {
    fontFamily: FONTS.bold,
    size: '2xs' as FontSizeKey,
    weight: FONT_WEIGHT.bold,
    letterSpacing: LETTER_SPACING.wider,
  },
  button: {
    fontFamily: FONTS.bold,
    size: 'md' as FontSizeKey,
    weight: FONT_WEIGHT.bold,
    letterSpacing: LETTER_SPACING.normal,
  },
} as const;

export type TextRole = keyof typeof TEXT_STYLES;
