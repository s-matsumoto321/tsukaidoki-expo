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
  // Manrope — 数字・英字
  display: 'Manrope_400Regular',
  displayMedium: 'Manrope_500Medium',
  displaySemiBold: 'Manrope_600SemiBold',
  displayBold: 'Manrope_700Bold',

  // Noto Sans JP — 日本語
  body: 'NotoSansJP_400Regular',
  bodyMedium: 'NotoSansJP_500Medium',
  bodyBold: 'NotoSansJP_700Bold',
};

export const fontSizes = {
  pageTitle: 32,         // L1 タイトル
  amountHero: 38,        // ヒーロー金額（ホーム総資産）
  amountCard: 20,        // L3 カード残高金額（+2 from 18）
  amountMedium: 19,
  amountSmall: 14,
  currencyHero: 26,
  currencyMedium: 13,
  textLg: 21,            // L2 説明書き大（差額テキスト等）
  textMd: 20,            // L3 説明書き中・名称（カード名/口座名/残高金額）
  textSm: 15,            // L4 説明書き小（凡例・メタ・AI本文）
  heading: 16,
  body: 14,
  caption: 15,           // L4
  micro: 15,             // L4
};

export const lineHeights = {
  tight: 1,       // 金額表示（行間ゼロ感）
  snug: 1.2,      // 見出し
  normal: 1.5,    // 本文
  relaxed: 1.6,   // 長文・AIインサイト
};

export const letterSpacing = {
  tight: -0.02,   // 大きい金額
  normal: 0,
  wide: 0.02,     // ラベル・セクションヘッダー
  wider: 0.05,
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
