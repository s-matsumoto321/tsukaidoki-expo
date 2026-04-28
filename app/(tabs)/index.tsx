import { useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Animated, View, Text, Pressable,
  StyleSheet, StatusBar, ScrollView,
} from 'react-native';
import { Link, router, type Href } from 'expo-router';
import { DonutChart } from '@/components/donut-chart';
import { POOL_ITEMS, PF_ITEMS, type FinancialItem } from '@/constants/data';
import { useStore } from '@/store/useStore';
import { colors, typography, fontSizes, spacing, radius, shadows } from '@/constants/theme';
import { X, Menu, ChevronDown } from 'lucide-react-native';

const MENU_WIDTH = 270;

// ─── 円グラフカード ─────────────────────────────────────────────────

type LegendItemProps = { color: string; name: string; val: string };

function LegendItem({ color, name, val }: LegendItemProps) {
  return (
    <View style={s.legRow}>
      <View style={s.legLeft}>
        <View style={[s.legDot, { backgroundColor: color }]} />
        <Text style={s.legName} numberOfLines={1}>{name}</Text>
      </View>
      <Text style={s.legVal}>{val}</Text>
    </View>
  );
}

type ChartCardProps = {
  title: string;
  badge: string;
  total: string;
  sub: string;
  items: FinancialItem[];
  route: Href;
};

function ChartCard({ title, badge, total, sub, items, route }: ChartCardProps) {
  const segments = items.map(i => ({ color: i.color, value: i.amount }));
  const topItems = items.slice(0, 3);
  return (
    <Link href={route} asChild>
      <Pressable style={s.chartCard}>
        <View style={s.chartHeader}>
          <Text style={s.chartHeaderTitle}>{title}</Text>
          <Text style={s.chartHeaderBadge}>{badge}</Text>
        </View>
        <View style={s.chartBody}>
          <DonutChart segments={segments} size={110} thickness={14} centerLabel={total} centerSub={sub} />
          {topItems.map(item => <LegendItem key={item.name} color={item.color} name={item.name} val={item.val} />)}
        </View>
      </Pressable>
    </Link>
  );
}

// ─── AIインサイトカード ──────────────────────────────────────────────

function generateHomeInsight(pfItems: FinancialItem[], dreamCount: number): string {
  const warnItems = pfItems.filter(i => i.status === 'warn' && i.projectId);
  const okItems = pfItems.filter(i => i.status === 'ok' && i.projectId);

  if (warnItems.length > 0) {
    const warnName = warnItems[0].name;
    const okNames = okItems.map(i => i.name).join('・');
    let text = `${warnName}の達成が遅れ気味です。積立額を見直すと改善できます。`;
    if (okNames) text += `\n${okNames}は順調に積み上がっています。`;
    return text;
  }
  return `備えは整っています。${dreamCount}つの夢に向けて順調に進んでいます。余力で何ができるか、見てみますか？`;
}

function AiInsightCard({ pfItems, dreamCount }: { pfItems: FinancialItem[]; dreamCount: number }) {
  const text = generateHomeInsight(pfItems, dreamCount);
  const hasWarn = pfItems.some(i => i.status === 'warn' && i.projectId);
  return (
    <View style={s.aiCard}>
      <View style={s.aiInner}>
        <Text style={s.aiMark}>✦</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.aiLabel}>AIインサイト</Text>
          <Text style={s.aiTxt}>{text}</Text>
          {!hasWarn && (
            <Pressable style={s.aiBtn} onPress={() => router.push('/(tabs)/explore' as any)}>
              <Text style={s.aiBtnTxt}>試算してみる</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── ヘルパー ────────────────────────────────────────────────────────

function fmtMan(yen: number): string {
  return `¥${Math.round(yen / 10000).toLocaleString('ja-JP')}万`;
}

// ─── ホーム画面 ──────────────────────────────────────────────────────

export default function HomeScreen() {
  const { balances, scenarios, activeScenarioId, dreams } = useStore();
  const activeScenario = scenarios.find(sc => sc.id === activeScenarioId) ?? scenarios[0];

  const [menuVisible, setMenuVisible] = useState(false);
  const menuAnim    = useRef(new Animated.Value(MENU_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const btnScale    = useRef(new Animated.Value(1)).current;

  const openMenu = () => {
    setMenuVisible(true);
    Animated.parallel([
      Animated.spring(menuAnim,    { toValue: 0, useNativeDriver: true, bounciness: 4 }),
      Animated.timing(overlayAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const closeMenu = () => {
    Animated.parallel([
      Animated.timing(menuAnim,    { toValue: MENU_WIDTH, duration: 220, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 0,          duration: 200, useNativeDriver: true }),
    ]).start(() => setMenuVisible(false));
  };

  const onMenuBtnPress = () => {
    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.75, duration: 80, useNativeDriver: true }),
      Animated.spring(btnScale, { toValue: 1, bounciness: 14, useNativeDriver: true }),
    ]).start();
    openMenu();
  };

  const poolItems = POOL_ITEMS.map(item => ({
    ...item,
    amount: balances[item.projectId!] ?? item.amount,
  }));
  const pfItems = PF_ITEMS.map(item => ({
    ...item,
    amount: item.projectId ? (balances[item.projectId] ?? item.amount) : item.amount,
  }));

  const poolTotal = poolItems.reduce((sum, item) => sum + item.amount, 0);
  const pfTotal   = pfItems.reduce((sum, item) => sum + item.amount, 0);
  const diff       = poolTotal - pfTotal;
  const isBalanced = diff === 0;

  const pjCount   = PF_ITEMS.filter(i => i.projectId).length;
  const acctCount = POOL_ITEMS.length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView style={s.safe} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ① ヘッダー */}
          <View style={s.header}>
            <View>
              <Text style={s.headerGreeting}>こんにちは</Text>
              <Text style={s.headerTitle}>あなたの{'\n'}ライフプラン</Text>
            </View>
            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <Pressable style={s.menuBtn} onPress={onMenuBtnPress}>
                <Menu size={18} color={colors.text} strokeWidth={1.8} />
              </Pressable>
            </Animated.View>
          </View>

          {/* ② プラン選択ピル */}
          <Pressable style={s.planPill} onPress={() => router.push('/(tabs)/scenario' as any)}>
            <View style={s.planDot} />
            <Text style={s.planTxt}>
              プラン{activeScenario?.systemLabel}・{activeScenario?.userLabel}
            </Text>
            <ChevronDown size={14} color={colors.sage} strokeWidth={1.8} />
          </Pressable>

          {/* ③ 総資産ヒーローカード */}
          <View style={s.totalCard}>
            <Text style={s.totalLabel}>総資産</Text>
            <View style={s.totalAmtRow}>
              <Text style={s.totalCurrency}>¥</Text>
              <Text style={s.totalAmt}>{poolTotal.toLocaleString('ja-JP')}</Text>
            </View>
            <View style={s.totalDivider} />
            <View style={s.totalMeta}>
              <View style={s.totalMetaItem}>
                <Text style={s.totalMetaNum}>{pjCount}</Text>
                <Text style={s.totalMetaLbl}>プロジェクト</Text>
              </View>
              <View style={s.totalMetaSep} />
              <View style={s.totalMetaItem}>
                <Text style={s.totalMetaNum}>{dreams.length}</Text>
                <Text style={s.totalMetaLbl}>の夢</Text>
              </View>
              <View style={s.totalMetaSep} />
              <View style={s.totalMetaItem}>
                <Text style={s.totalMetaNum}>{acctCount}</Text>
                <Text style={s.totalMetaLbl}>口座</Text>
              </View>
            </View>
          </View>

          {/* ④ アラート（差異あり時のみ） */}
          {!isBalanced && (
            <View style={s.alertCard}>
              <View style={s.alertBadge}>
                <Text style={s.alertBadgeTxt}>!</Text>
              </View>
              <Text style={s.alertTxt}>
                <Text style={{ fontWeight: '700' }}>残高修正が必要です</Text>
                {`　差額 ¥${Math.abs(diff).toLocaleString('ja-JP')}`}
              </Text>
            </View>
          )}

          {/* ⑤ 円グラフ2枚 */}
          <View style={s.dualChart}>
            <ChartCard
              title="プール金"
              badge="口座別"
              total={fmtMan(poolTotal)}
              sub={`${POOL_ITEMS.length}口座`}
              items={poolItems}
              route={'/(tabs)/pool' as any}
            />
            <ChartCard
              title="使いみち"
              badge="用途別"
              total={fmtMan(pfTotal)}
              sub={`${PF_ITEMS.length}件`}
              items={pfItems}
              route="/(tabs)/explore"
            />
          </View>

          {/* ⑥ AIインサイト */}
          <AiInsightCard pfItems={pfItems} dreamCount={dreams.length} />

        </ScrollView>
      </SafeAreaView>

      {/* オーバーレイ */}
      {menuVisible && (
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: overlayAnim }]}
          pointerEvents="auto"
        >
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }}
            onPress={closeMenu}
          />
        </Animated.View>
      )}

      {/* スライドメニュー */}
      {menuVisible && (
        <Animated.View style={[s.menuPanel, { transform: [{ translateX: menuAnim }] }]}>
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
            <View style={s.menuHeader}>
              <Text style={s.menuTitle}>ツカイドキ</Text>
              <Pressable style={s.menuCloseBtn} onPress={closeMenu}>
                <X size={14} color={colors.textMid} strokeWidth={2} />
              </Pressable>
            </View>
            <View style={s.menuList}>
              {[
                { label: 'ホーム',   route: '/(tabs)/' },
                { label: '使いみち', route: '/(tabs)/explore' },
                { label: '設定',     route: '/(tabs)/settings' },
              ].map(item => (
                <Pressable
                  key={item.label}
                  style={s.menuItem}
                  onPress={() => { closeMenu(); router.push(item.route as any); }}
                >
                  <Text style={s.menuItemLabel}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          </SafeAreaView>
        </Animated.View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingBottom: 100 },

  // ヘッダー
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerGreeting: { fontSize: 13, color: colors.textMid, marginBottom: 4 },
  headerTitle: {
    fontSize: fontSizes.pageTitle,
    fontFamily: typography.display,
    color: colors.text,
    lineHeight: 40,
  },

  menuBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.card,
    justifyContent: 'center', alignItems: 'center',
    ...shadows.card,
  },

  // プラン選択ピル
  planPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.sageBg,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: radius.pill,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  planDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: colors.sage,
  },
  planTxt: { fontSize: 13, color: colors.sage, fontWeight: '500' },

  // 総資産ヒーローカード
  totalCard: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    ...shadows.card,
  },
  totalLabel: { fontSize: fontSizes.caption, color: colors.textMid, letterSpacing: 1 },
  totalAmtRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: spacing.sm },
  totalCurrency: {
    fontSize: 28, color: colors.textMid, fontFamily: typography.display,
    paddingBottom: 4, marginRight: 2,
  },
  totalAmt: {
    fontSize: fontSizes.amountHero,
    fontFamily: typography.display,
    color: colors.text,
    lineHeight: 48,
  },
  totalDivider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.lg },
  totalMeta: { flexDirection: 'row', alignItems: 'center' },
  totalMetaItem: { flex: 1, alignItems: 'center' },
  totalMetaNum: { fontSize: 14, fontWeight: '700', color: colors.text },
  totalMetaLbl: { fontSize: 11, color: colors.textLight, marginTop: 2 },
  totalMetaSep: { width: 1, height: 24, backgroundColor: colors.divider },

  // アラート
  alertCard: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    backgroundColor: colors.honeyBg,
    borderRadius: radius.md,
    padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  alertBadge: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.honey,
    justifyContent: 'center', alignItems: 'center',
  },
  alertBadgeTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
  alertTxt: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 19 },

  // 円グラフ
  dualChart: {
    flexDirection: 'row', gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  chartCard: {
    flex: 1, backgroundColor: colors.card,
    borderRadius: radius.lg, overflow: 'hidden',
    ...shadows.card,
  },
  chartHeader: {
    paddingHorizontal: spacing.md, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  chartHeaderTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  chartHeaderBadge: { fontSize: 10, color: colors.textLight },
  chartBody: { paddingHorizontal: 12, paddingBottom: 14, alignItems: 'center' },
  legRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3, width: '100%' },
  legLeft: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1, minWidth: 0 },
  legDot: { width: 7, height: 7, borderRadius: 3.5, flexShrink: 0 },
  legName: { fontSize: 11, color: colors.textMid, flex: 1 },
  legVal: { fontSize: 11, fontWeight: '600', color: colors.text, minWidth: 36, textAlign: 'right' },

  // AIインサイト
  aiCard: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    backgroundColor: colors.sageBg,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  aiInner: { padding: spacing.xl, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  aiMark: { fontSize: 14, color: colors.sage, lineHeight: 22 },
  aiLabel: { fontSize: 11, color: colors.sage, fontWeight: '700', marginBottom: 4 },
  aiTxt: { fontSize: 13, color: colors.text, lineHeight: 21 },
  aiBtn: {
    marginTop: 10, backgroundColor: colors.sage,
    borderRadius: radius.sm, paddingVertical: 8, paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  aiBtnTxt: { fontSize: 13, fontWeight: '600', color: '#fff' },

  // スライドメニュー
  menuPanel: {
    position: 'absolute', top: 0, right: 0, bottom: 0, width: MENU_WIDTH,
    backgroundColor: colors.card,
    ...shadows.floating,
  },
  menuHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xl,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  menuTitle: { fontSize: 18, fontFamily: typography.display, color: colors.text },
  menuCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.bg,
    justifyContent: 'center', alignItems: 'center',
  },
  menuList: { paddingTop: spacing.sm },
  menuItem: {
    paddingHorizontal: spacing.xxl, paddingVertical: spacing.lg,
  },
  menuItemLabel: { fontSize: 16, fontWeight: '500', color: colors.text },
});
