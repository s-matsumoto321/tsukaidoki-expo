import { Tabs } from 'expo-router';
import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Activity, Building2, Star, Settings } from 'lucide-react-native';
import { colors, shadows, typography } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TabBarProps = {
  state: any;
  navigation: any;
};

const TAB_ICONS: Record<string, React.ComponentType<any>> = {
  scenario: Activity,
  pool: Building2,
  explore: Star,
  settings: Settings,
};

const TAB_LABELS: Record<string, string> = {
  scenario: 'シナリオ',
  pool: 'プール金',
  explore: '使いみち',
  settings: '設定',
};

function CustomTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const visibleRoutes = state.routes.filter((r: any) => r.name !== 'manage' && r.name !== 'index');

  return (
    <View style={[tb.container, { bottom: insets.bottom + 10 }]}>
      <View style={tb.inner}>
        {visibleRoutes.map((route: any) => {
          const isFocused = state.routes[state.index]?.name === route.name;
          const Icon = TAB_ICONS[route.name] ?? Star;
          const iconColor = isFocused ? colors.sage : colors.textLight;
          const label = TAB_LABELS[route.name] ?? route.name;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <View
              key={route.key}
              style={[tb.tab, isFocused && tb.tabActive]}
              onTouchEnd={onPress}
            >
              <Icon size={20} color={iconColor} strokeWidth={1.8} />
              <Text style={[tb.label, isFocused && tb.labelActive]}>{label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar state={props.state} navigation={props.navigation} />}
      initialRouteName="explore"
    >
      <Tabs.Screen name="scenario" options={{ title: 'シナリオ' }} />
      <Tabs.Screen name="pool" options={{ title: 'プール金' }} />
      <Tabs.Screen name="explore" options={{ title: '使いみち' }} />
      <Tabs.Screen name="settings" options={{ title: '設定' }} />
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="manage" options={{ href: null }} />
    </Tabs>
  );
}

const tb = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 28,
    overflow: 'hidden',
    ...shadows.floating,
  },
  inner: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 28,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 18,
    gap: 3,
  },
  tabActive: {
    backgroundColor: colors.sageBg,
  },
  label: {
    fontSize: 10,
    color: colors.textLight,
    fontFamily: typography.bodyMedium,
    letterSpacing: 0.02,
  },
  labelActive: {
    color: colors.sage,
  },
});
