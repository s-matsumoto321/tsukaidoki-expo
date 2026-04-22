import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen
          name="pool"
          options={{
            title: 'プール金',
            headerStyle: { backgroundColor: '#0C447C' },
            headerTintColor: '#ffffff',
            headerBackTitle: 'ホーム',
          }}
        />
        <Stack.Screen
          name="portfolio"
          options={{
            title: 'ポートフォリオ',
            headerStyle: { backgroundColor: '#0C447C' },
            headerTintColor: '#ffffff',
            headerBackTitle: 'ホーム',
          }}
        />
        <Stack.Screen
          name="project/[id]"
          options={{ headerShown: false }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
