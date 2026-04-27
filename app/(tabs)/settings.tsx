import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View, Text, Pressable, StyleSheet, StatusBar, Alert } from 'react-native';
import { router } from 'expo-router';
import { Logo } from '@/components/logo';
import { useStore } from '@/store/useStore';

const C = {
  brand: '#0C447C',
  green: '#1D9E75',
  amber: '#EF9F27',
  bg: '#f5f4ee',
  card: '#ffffff',
  textPrimary: '#2c2c2a',
  textSecondary: '#73726c',
  border: 'rgba(0,0,0,0.08)',
};

type MenuItemProps = {
  label: string;
  sub?: string;
  onPress: () => void;
  accent?: string;
  showArrow?: boolean;
};

function MenuItem({ label, sub, onPress, accent = C.brand, showArrow = true }: MenuItemProps) {
  return (
    <Pressable style={s.menuItem} onPress={onPress}>
      <View style={[s.menuAccent, { backgroundColor: accent }]} />
      <View style={s.menuBody}>
        <Text style={s.menuLabel}>{label}</Text>
        {sub ? <Text style={s.menuSub}>{sub}</Text> : null}
      </View>
      {showArrow && <Text style={s.menuArrow}>›</Text>}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { setOnboardingDone } = useStore();

  const handleResetOnboarding = () => {
    Alert.alert(
      'オンボーディングをやり直す',
      '初期設定からやり直します。現在のデータは保持されます。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'やり直す',
          onPress: () => {
            setOnboardingDone(false);
            router.replace('/onboarding' as any);
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.brand} />
      <View style={s.header}>
        <Logo iconSize={26} />
        <Text style={s.headerSub}>ライフマネープラン</Text>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content}>

        <View style={s.section}>
          <Text style={s.sectionTitle}>資産管理</Text>
          <View style={s.menuCard}>
            <MenuItem
              label="プール金"
              sub="口座残高の確認・編集"
              accent={C.brand}
              onPress={() => router.push('/pool')}
            />
            <View style={s.divider} />
            <MenuItem
              label="口座振替"
              sub="口座間の資金を移動する"
              accent="#888780"
              onPress={() => router.push('/transfer')}
            />
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>プロフィール</Text>
          <View style={s.menuCard}>
            <MenuItem
              label="プロフィール編集"
              sub="名前・家族構成"
              accent={C.green}
              onPress={() => {}}
            />
            <View style={s.divider} />
            <MenuItem
              label="通知設定"
              accent={C.green}
              onPress={() => {}}
            />
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>連携</Text>
          <View style={s.menuCard}>
            <MenuItem
              label="銀行・証券口座連携"
              sub="自動残高取得"
              accent={C.amber}
              onPress={() => {}}
            />
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>プラン</Text>
          <View style={s.menuCard}>
            <MenuItem
              label="プレミアムプラン"
              sub="シナリオ無制限などの特典"
              accent="#534AB7"
              onPress={() => {}}
            />
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>初期設定</Text>
          <View style={s.menuCard}>
            <MenuItem
              label="オンボーディングをやり直す"
              sub="最初の設定フローをもう一度実行"
              accent={C.amber}
              onPress={handleResetOnboarding}
            />
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>サポート</Text>
          <View style={s.menuCard}>
            <MenuItem
              label="ヘルプ・お問い合わせ"
              accent="#888780"
              onPress={() => {}}
            />
            <View style={s.divider} />
            <MenuItem
              label="利用規約"
              accent="#888780"
              onPress={() => {}}
            />
            <View style={s.divider} />
            <MenuItem
              label="プライバシーポリシー"
              accent="#888780"
              onPress={() => {}}
            />
          </View>
        </View>

        <Text style={s.version}>ツカイドキ v0.1.0</Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    backgroundColor: C.brand,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 3 },

  scroll: { flex: 1 },
  content: { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 40 },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 13, color: C.textSecondary, marginBottom: 8, paddingHorizontal: 4 },

  menuCard: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: C.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  menuAccent: { width: 4, height: 36, borderRadius: 2, marginRight: 12 },
  menuBody: { flex: 1 },
  menuLabel: { fontSize: 16, fontWeight: '600', color: C.textPrimary },
  menuSub: { fontSize: 13, color: C.textSecondary, marginTop: 2 },
  menuArrow: { fontSize: 20, color: C.textSecondary },

  divider: { height: 0.5, backgroundColor: C.border, marginLeft: 30 },

  version: { textAlign: 'center', fontSize: 12, color: C.textSecondary, marginTop: 8 },
});
