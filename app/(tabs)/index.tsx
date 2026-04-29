import { useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, Pressable,
  StyleSheet, StatusBar, ScrollView,
} from 'react-native';
import { Link, router, type Href } from 'expo-router';
import { DonutChart } from '@/components/donut-chart';
import { type FinancialItem } from '@/constants/data';
import { useStore } from '@/store/useStore';
import { colors, typography, fontSizes, spacing, radius, shadows } from '@/constants/theme';
import { assignPoolColors } from '@/constants/colors';
import { ChevronDown } from 'lucide-react-native';

// ─── 円グラフカード ─────────────────────────────────────────────────

type LegendItemProps = { color: string; name: string; val: string; muted?: boolean };

function LegendItem({ color, name, val, muted = false }: LegendItemProps) {
  return (
    <View style={s.legRow}>
      <View style={s.legLeft}>
        <View style={[s.legDot, { backgroundColor: color }]} />
        <Text style={[s.legName, muted && s.legNameMuted]} numberOfLines={1}>{name}</Text>
      </View>
      <Text style={[s.legVal, muted && s.legValMuted]}>{val}</Text>
    </View>
  );
}

type ChartCardProps = {
  title: string;
  subTitle: string;
  total: string;
  sub: string;
  items: FinancialItem[];
  route: Href;
  accentColor: string;
};

function ChartCard({ title, subTitle, total, sub, items, route, accentColor }: ChartCardProps) {
  const segments = items.map(i => ({ color: i.color, value: i.amount }));
  const top2 = items.slice(0, 2);
  const rest = items.slice(2);
  const restTotal = rest.reduce((sum, i) => sum + i.amount, 0);
  return (
    <Link href={route} asChild>
      <Pressable style={s.chartCard}>
        <View style={[s.cardTopBar, { backgroundColor: accentColor }]} />
        <View style={s.chartHeader}>
          <View>
            <Text style={s.chartHeaderTitle}>{title}</Text>
            <Text style={s.chartHeaderSub}>{subTitle}</Text>
          </View>
          <Text style={s.chartArrow}>›</Text>
        </View>
        <View style={s.chartBody}>
          <DonutChart segments={segments} size={120} thickness={15} centerLabel={total} centerSub={sub} />
        </View>
        <View style={s.legWrap}>
          {top2.map(item => (
            <LegendItem key={item.name} color={item.color} name={item.name} val={item.val} />
          ))}
          {rest.length > 0 && (
            <LegendItem color={colors.textLight} name={`他${rest.length}件`} val={fmtMan(restTotal)} muted />
          )}
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
  return (
    <View style={s.aiCard}>
      <View style={s.aiGlow} pointerEvents="none" />
      <View style={s.aiInner}>
        <Text style={s.aiMark}>✦</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.aiLabel}>AIインサイト</Text>
          <Text style={s.aiTxt}>{text}</Text>
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
  const { balances, scenarios, activeScenarioId, dreams, poolItems, pfItems } = useStore();
  const activeScenario = scenarios.find(sc => sc.id === activeScenarioId) ?? scenarios[0];

  const livePoolItems = useMemo(() => {
    const items = poolItems.map(item => ({
      ...item,
      amount: balances[item.projectId!] ?? item.amount,
    }));
    const colorMap = assignPoolColors(items.map(i => ({ id: i.projectId!, amount: i.amount })));
    return items
      .map(i => ({ ...i, color: colorMap.get(i.projectId!) ?? i.color }))
      .sort((a, b) => b.amount - a.amount);
  }, [poolItems, balances]);

  const livePfItems = pfItems.map(item => ({
    ...item,
    amount: item.projectId ? (balances[item.projectId] ?? item.amount) : item.amount,
  }));

  const poolTotal = livePoolItems.reduce((sum, item) => sum + item.amount, 0);
  const pfTotal   = livePfItems.reduce((sum, item) => sum + item.amount, 0);
  const diff       = poolTotal - pfTotal;
  const isBalanced = diff === 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView style={s.safe} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ① ページタイトル */}
          <View style={s.titleRow}>
            <Text style={s.pageTitle}>ホーム</Text>
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
            <View style={s.totalGlow} pointerEvents="none" />
            <Text style={s.totalLabel}>総資産</Text>
            <View style={s.totalAmtRow}>
              <Text style={s.totalCurrency}>¥</Text>
              <Text style={s.totalAmt}>{poolTotal.toLocaleString('ja-JP')}</Text>
            </View>
          </View>

          {/* ④ 円グラフ2枚（差額バッジ中央オーバーレイ） */}
          <View style={s.dualWrap}>
            <View style={s.dualChart}>
              <ChartCard
                title="プール金"
                subTitle="どこにある"
                total={fmtMan(poolTotal)}
                sub={`${poolItems.length}口座`}
                items={livePoolItems}
                route={'/(tabs)/pool' as any}
                accentColor={colors.chart2}
              />
              <ChartCard
                title="使いみち"
                subTitle="何のために"
                total={fmtMan(pfTotal)}
                sub={`${pfItems.length}件`}
                items={livePfItems}
                route="/(tabs)/explore"
                accentColor={colors.sage}
              />
            </View>
            {!isBalanced && (
              <View pointerEvents="none" style={s.diffCenter}>
                <View style={s.diffBubble}>
                  <Text style={s.diffNeq}>≠</Text>
                  <Text style={s.diffTxt}>差額 {fmtMan(Math.abs(diff))}</Text>
                </View>
              </View>
            )}
          </View>

          {/* ⑥ AIインサイト */}
          <AiInsightCard pfItems={livePfItems} dreamCount={dreams.length} />

        </ScrollView>
      </SafeAreaView>

    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingBottom: 100 },

  // ページタイトル
  titleRow: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  pageTitle: {
    fontSize: fontSizes.pageTitle,
    fontFamily: typography.display,
    color: colors.text,
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
  planTxt: { fontSize: 13, color: colors.sage, fontWeight: '500', fontFamily: typography.display },

  // 総資産ヒーローカード
  totalCard: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    ...shadows.card,
  },
  totalGlow: {
    position: 'absolute', top: -40, right: -40,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(91, 142, 125, 0.08)',
  },
  totalLabel: { fontSize: fontSizes.caption, color: colors.textMid, letterSpacing: 1, fontFamily: typography.display },
  totalAmtRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: spacing.sm },
  totalCurrency: {
    fontSize: 28, color: colors.textMid, fontFamily: typography.displayMedium,
    paddingBottom: 4, marginRight: 2,
  },
  totalAmt: {
    fontSize: fontSizes.amountHero,
    fontFamily: typography.displaySemiBold,
    color: colors.text,
    lineHeight: 48,
  },
  // 円グラフ（2枚＋差額バッジ）
  dualWrap: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    position: 'relative',
  },
  dualChart: {
    flexDirection: 'row', gap: spacing.sm,
  },
  diffCenter: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center', zIndex: 5,
  },
  diffBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.honey, paddingHorizontal: 11, paddingVertical: 7,
    borderRadius: 100, borderWidth: 3, borderColor: colors.bg,
    shadowColor: colors.honey, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  diffNeq: { fontSize: 13, color: '#fff', fontFamily: typography.displayBold },
  diffTxt: { fontSize: 10, color: '#fff', fontFamily: typography.displayBold },

  chartCard: {
    flex: 1, backgroundColor: colors.card,
    borderRadius: radius.lg, overflow: 'hidden',
    ...shadows.card,
  },
  cardTopBar: { height: 4 },
  chartHeader: {
    paddingHorizontal: 12, paddingTop: 12, paddingBottom: 6,
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
  },
  chartHeaderTitle: { fontSize: 14, fontWeight: '700', color: colors.text, fontFamily: typography.displayBold },
  chartHeaderSub: { fontSize: 10, color: colors.textLight, marginTop: 1, fontFamily: typography.display },
  chartArrow: { fontSize: 18, color: colors.textLight, lineHeight: 20 },
  chartBody: { paddingHorizontal: 12, paddingBottom: 8, alignItems: 'center' },
  legWrap: {
    paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12,
    borderTopWidth: 1, borderTopColor: colors.divider, gap: 4,
  },
  legRow: { flexDirection: 'row', alignItems: 'center' },
  legLeft: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1, minWidth: 0 },
  legDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  legName: { fontSize: 10, color: colors.textMid, flex: 1, fontFamily: typography.display },
  legNameMuted: { color: colors.textLight },
  legVal: { fontSize: 10, color: colors.text, minWidth: 36, textAlign: 'right', fontFamily: typography.displaySemiBold },
  legValMuted: { color: colors.textLight, fontFamily: typography.display },

  // AIインサイト
  aiCard: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    backgroundColor: colors.sageBg,
    borderRadius: radius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  aiGlow: {
    position: 'absolute', bottom: -30, right: -30,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(91, 142, 125, 0.15)',
  },
  aiInner: { padding: spacing.xl, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  aiMark: { fontSize: 14, color: colors.sage, lineHeight: 22, fontFamily: typography.display },
  aiLabel: { fontSize: 11, color: colors.sage, fontWeight: '700', marginBottom: 4, fontFamily: typography.displayBold },
  aiTxt: { fontSize: 13, color: colors.text, lineHeight: 21, fontFamily: typography.display },

});
