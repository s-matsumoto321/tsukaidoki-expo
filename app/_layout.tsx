import { ThemeProvider, DefaultTheme } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

const HDR = '#072A35';

const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#EEEAE0',
    card: HDR,
    text: '#ffffff',
    border: 'transparent',
  },
};

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <ThemeProvider value={AppTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen
          name="pool"
          options={{
            title: 'プール金',
            headerStyle: { backgroundColor: HDR },
            headerTintColor: '#ffffff',
            headerBackTitle: 'ホーム',
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="portfolio"
          options={{
            title: 'ポートフォリオ',
            headerStyle: { backgroundColor: HDR },
            headerTintColor: '#ffffff',
            headerBackTitle: 'ホーム',
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="project/[id]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="transfer"
          options={{ presentation: 'modal', headerShown: false }}
        />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
