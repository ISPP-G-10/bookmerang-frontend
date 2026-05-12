import React from 'react';
import {
  Text as RNText,
  TextProps as RNTextProps,
  TextStyle,
  StyleSheet,
} from 'react-native';
import {
  FONTS,
  FONT_SIZE,
  FONT_WEIGHT,
  LINE_HEIGHT,
  LETTER_SPACING,
  TEXT_STYLES,
  TextRole,
} from '@/theme/typography';

type TypographyProps = Omit<RNTextProps, 'role'> & {
  variant?: TextRole;
  color?: string;
  align?: TextStyle['textAlign'];
};

const ROLE_STYLES: Record<TextRole, TextStyle> = Object.fromEntries(
  (Object.keys(TEXT_STYLES) as TextRole[]).map((key) => {
    const t = TEXT_STYLES[key];
    return [
      key,
      {
        fontFamily: t.fontFamily,
        fontSize: FONT_SIZE[t.size],
        lineHeight: LINE_HEIGHT[t.size],
        fontWeight: t.weight as TextStyle['fontWeight'],
        letterSpacing: t.letterSpacing,
      } as TextStyle,
    ];
  })
) as Record<TextRole, TextStyle>;

const styles = StyleSheet.create(ROLE_STYLES);

export function Typography({
  variant = 'body',
  color,
  align,
  style,
  ...rest
}: TypographyProps) {
  return (
    <RNText
      {...rest}
      style={[
        styles[variant],
        color ? { color } : null,
        align ? { textAlign: align } : null,
        style,
      ]}
    />
  );
}

export const Display = (p: TypographyProps) => <Typography variant="display" {...p} />;
export const H1 = (p: TypographyProps) => <Typography variant="h1" {...p} />;
export const H2 = (p: TypographyProps) => <Typography variant="h2" {...p} />;
export const H3 = (p: TypographyProps) => <Typography variant="h3" {...p} />;
export const H4 = (p: TypographyProps) => <Typography variant="h4" {...p} />;
export const Subtitle = (p: TypographyProps) => <Typography variant="subtitle" {...p} />;
export const Body = (p: TypographyProps) => <Typography variant="body" {...p} />;
export const BodySm = (p: TypographyProps) => <Typography variant="bodySm" {...p} />;
export const Label = (p: TypographyProps) => <Typography variant="label" {...p} />;
export const Caption = (p: TypographyProps) => <Typography variant="caption" {...p} />;
export const Overline = (p: TypographyProps) => <Typography variant="overline" {...p} />;
export const ButtonText = (p: TypographyProps) => <Typography variant="button" {...p} />;

export { FONTS, FONT_SIZE, FONT_WEIGHT, LINE_HEIGHT, LETTER_SPACING };
