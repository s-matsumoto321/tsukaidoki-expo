import { brand, neutral, poolPalette, usePalette, tints } from './colors';

export const colors = {
  bg: neutral.bg,
  card: neutral.card,
  cardAlt: neutral.cardAlt,

  sage: brand.sage.base,
  sageLight: brand.sage.light,
  sageBg: brand.sage.bg,
  poolBg: tints.poolActive,

  honey: brand.honey.base,
  honeyDark: brand.honey.dark,
  honeyBg: brand.honey.bg,

  text: neutral.text.primary,
  textMid: neutral.text.mid,
  textLight: neutral.text.light,

  divider: neutral.divider,

  // プール金パレット（tone-1〜5: 濃→淡）
  chart1: poolPalette.tones[0],
  chart2: poolPalette.tones[1],
  chart3: poolPalette.tones[2],
  chart4: poolPalette.tones[3],
  chart5: poolPalette.tones[4],

  // 使いみちパレット（jewel-1〜6）
  use1: usePalette.jewels[0],
  use2: usePalette.jewels[1],
  use3: usePalette.jewels[2],
  use4: usePalette.jewels[3],
  use5: usePalette.jewels[4],
  use6: usePalette.jewels[5],
};

export const typography = {
  display: 'Manrope_400Regular',
  displayMedium: 'Manrope_500Medium',
  displaySemiBold: 'Manrope_600SemiBold',
  displayBold: 'Manrope_700Bold',
  body: 'Manrope_400Regular',
};

export const fontSizes = {
  pageTitle: 32,
  amountHero: 40,
  amountMedium: 18,
  heading: 16,
  body: 14,
  caption: 12,
  micro: 10,
};

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32,
};

export const radius = {
  sm: 12,
  md: 16,
  lg: 24,
  xl: 28,
  pill: 100,
  full: 9999,
};

export const shadows = {
  card: {
    shadowColor: neutral.text.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  floating: {
    shadowColor: neutral.text.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 8,
  },
  fab: {
    shadowColor: neutral.text.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
};

export const Colors = {
  light: {
    text: colors.text,
    background: colors.bg,
    tint: colors.sage,
    icon: colors.textLight,
    tabIconDefault: colors.textLight,
    tabIconSelected: colors.sage,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: colors.sage,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: colors.sage,
  },
};
