import { useColor } from '@/hooks/useColor';
import {
  FONTS,
  FONT_SIZE,
  FONT_WEIGHT,
  LETTER_SPACING,
  LINE_HEIGHT,
} from '@/theme/typography';
import React, { forwardRef } from 'react';
import {
  Text as RNText,
  TextProps as RNTextProps,
  TextStyle,
} from 'react-native';

type TextVariant =
  | 'body'
  | 'title'
  | 'subtitle'
  | 'caption'
  | 'heading'
  | 'link';

interface TextProps extends RNTextProps {
  variant?: TextVariant;
  lightColor?: string;
  darkColor?: string;
  children: React.ReactNode;
}

export const Text = forwardRef<RNText, TextProps>(
  (
    { variant = 'body', lightColor, darkColor, style, children, ...props },
    ref
  ) => {
    const textColor = useColor('text', { light: lightColor, dark: darkColor });
    const mutedColor = useColor('textMuted');

    const getTextStyle = (): TextStyle => {
      const baseStyle: TextStyle = {
        color: textColor,
        fontFamily: FONTS.regular,
      };

      switch (variant) {
        case 'heading':
          return {
            ...baseStyle,
            fontFamily: FONTS.bold,
            fontSize: FONT_SIZE['3xl'],
            lineHeight: LINE_HEIGHT['3xl'],
            fontWeight: FONT_WEIGHT.bold as TextStyle['fontWeight'],
            letterSpacing: LETTER_SPACING.tight,
          };
        case 'title':
          return {
            ...baseStyle,
            fontFamily: FONTS.bold,
            fontSize: FONT_SIZE['2xl'],
            lineHeight: LINE_HEIGHT['2xl'],
            fontWeight: FONT_WEIGHT.bold as TextStyle['fontWeight'],
            letterSpacing: LETTER_SPACING.tight,
          };
        case 'subtitle':
          return {
            ...baseStyle,
            fontFamily: FONTS.bold,
            fontSize: FONT_SIZE.lg,
            lineHeight: LINE_HEIGHT.lg,
            fontWeight: FONT_WEIGHT.semibold as TextStyle['fontWeight'],
          };
        case 'caption':
          return {
            ...baseStyle,
            fontSize: FONT_SIZE.xs,
            lineHeight: LINE_HEIGHT.xs,
            fontWeight: FONT_WEIGHT.regular as TextStyle['fontWeight'],
            color: mutedColor,
          };
        case 'link':
          return {
            ...baseStyle,
            fontSize: FONT_SIZE.md,
            lineHeight: LINE_HEIGHT.md,
            fontWeight: FONT_WEIGHT.medium as TextStyle['fontWeight'],
            textDecorationLine: 'underline',
          };
        default: // 'body'
          return {
            ...baseStyle,
            fontSize: FONT_SIZE.md,
            lineHeight: LINE_HEIGHT.md,
            fontWeight: FONT_WEIGHT.regular as TextStyle['fontWeight'],
          };
      }
    };

    return (
      <RNText ref={ref} style={[getTextStyle(), style]} {...props}>
        {children}
      </RNText>
    );
  }
);
