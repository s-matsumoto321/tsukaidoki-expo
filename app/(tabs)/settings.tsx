import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View, Text, Pressable, StyleSheet, StatusBar, Alert } from 'react-native';
import { router } from 'expo-router';
import { useStore } from '@/store/useStore';
import { colors, typography, fontSizes, spacing, radius, shadows } from '@/constants/theme';
import { semantic } from '@/constants/colors';

type MenuItemProps = {
  label: string;
  sub?: string;
  onPress: () => void;
  accent?: string;
  showArrow?: boolean;
};

function MenuItem({ label, sub, onPress, accent = colors.sage, showArrow = true }: MenuItemProps) {
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
  const { setOnboardingDone, isPremium, resetToDefaults } = useStore();

  const handleResetAllData = () => {
    Alert.alert(
      'テストデータをリセット',
      '口座・プロジェクト・残高・夢・シナリオをすべてデフォルト値に戻します。この操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'リセットする',
          style: 'destructive',
          onPress: () => {
            resetToDefaults();
          },
        },
      ],
    );
  };

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
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      <ScrollView style={s.scroll} contentContainerStyle={s.content}>

        {/* ページタイトル */}
        <Text style={s.pageTitle}>設定</Text>

        <View style={s.section}>
          <Text style={s.sectionTitle}>資産管理</Text>
          <View style={s.menuCard}>
            <MenuItem
              label="プール金"
              sub="口座残高の確認・編集"
              accent={colors.sage}
              onPress={() => router.push('/pool')}
            />
            <View style={s.divider} />
            <MenuItem
              label="口座振替"
              sub="口座間の資金を移動する"
              accent={colors.textLight}
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
              accent={colors.chart2}
              onPress={() => {}}
            />
            <View style={s.divider} />
            <MenuItem
              label="通知設定"
              accent={colors.chart2}
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
              accent={colors.honey}
              onPress={() => {}}
            />
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>プラン</Text>
          <View style={s.menuCard}>
            {isPremium ? (
              <MenuItem
                label="プレミアム会員"
                sub="✓ シナリオ無制限 · ありがとうございます"
                accent={colors.use4}
                showArrow={false}
                onPress={() => {}}
              />
            ) : (
              <MenuItem
                label="プレミアムにアップグレード"
                sub="シナリオを無制限に作れるようになります"
                accent={colors.use4}
                onPress={() => router.push('/premium' as any)}
              />
            )}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>初期設定</Text>
          <View style={s.menuCard}>
            <MenuItem
              label="オンボーディングをやり直す"
              sub="最初の設定フローをもう一度実行"
              accent={colors.honey}
              onPress={handleResetOnboarding}
            />
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>テスト・開発</Text>
          <View style={s.menuCard}>
            <MenuItem
              label="テストデータをリセット"
              sub="口座・残高・プロジェクト・シナリオをデフォルトに戻す"
              accent={semantic.negative}
              onPress={handleResetAllData}
            />
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>サポート</Text>
          <View style={s.menuCard}>
            <MenuItem
              label="ヘルプ・お問い合わせ"
              accent={colors.textLight}
              onPress={() => {}}
            />
            <View style={s.divider} />
            <MenuItem
              label="利用規約"
              accent={colors.textLight}
              onPress={() => {}}
            />
            <View style={s.divider} />
            <MenuItem
              label="プライバシーポリシー"
              accent={colors.textLight}
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
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: 100 },

  pageTitle: {
    fontSize: fontSizes.pageTitle,
    fontFamily: typography.display,
    color: colors.text,
    marginBottom: spacing.xxl,
  },

  section: { marginBottom: spacing.xl },
  sectionTitle: {
    fontSize: 12, color: colors.textMid, marginBottom: spacing.sm,
    paddingHorizontal: 4, letterSpacing: 0.5, textTransform: 'uppercase',
  },

  menuCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadows.card,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  menuAccent: { width: 4, height: 36, borderRadius: 2, marginRight: 12 },
  menuBody: { flex: 1 },
  menuLabel: { fontSize: 16, fontWeight: '600', color: colors.text },
  menuSub: { fontSize: 13, color: colors.textMid, marginTop: 2 },
  menuArrow: { fontSize: 20, color: colors.textLight },

  divider: { height: 1, backgroundColor: colors.divider, marginLeft: 30 },

  version: { textAlign: 'center', fontSize: 12, color: colors.textLight, marginTop: 8 },
});
