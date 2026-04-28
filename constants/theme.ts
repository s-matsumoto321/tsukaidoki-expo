export const colors = {
  bg: '#FAF7F2',
  card: '#FFFFFF',
  cardAlt: '#FFFEFB',

  sage: '#5B8E7D',
  sageLight: '#8BB0A2',
  sageBg: '#E8EFEB',

  honey: '#E8B86D',
  honeyBg: '#FBF1DD',

  text: '#2C3539',
  textMid: '#6B7378',
  textLight: '#A0A6A9',

  divider: '#EDE8DF',

  chart1: '#5B8E7D',
  chart2: '#4A7FA8',
  chart3: '#E8B86D',
  chart4: '#C8826B',
  chart5: '#B8AFD9',
  chart6: '#BDC4C7',
};

export const typography = {
  display: 'Fraunces_400Regular',
  displayBold: 'Fraunces_700Bold',
  body: undefined,
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
    shadowColor: '#2C3539',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  floating: {
    shadowColor: '#2C3539',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 8,
  },
  fab: {
    shadowColor: '#2C3539',
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
