import { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, Pressable,
  StyleSheet, StatusBar, ScrollView, Animated, Easing,
} from 'react-native';
import { Link, router, useFocusEffect, type Href } from 'expo-router';
import { DonutChart } from '@/components/donut-chart';
import { PF_ITEMS, type FinancialItem } from '@/constants/data';
import { useStore } from '@/store/useStore';
import { colors, typography, fontSizes, letterSpacing, spacing, radius, shadows } from '@/constants/theme';
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
  const { balances, scenarios, activeScenarioId, dreams, poolItems } = useStore();
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

  const livePfItems = PF_ITEMS.map(item => ({
    ...item,
    amount: item.projectId ? (balances[item.projectId] ?? item.amount) : item.amount,
  }));

  const poolTotal = livePoolItems.reduce((sum, item) => sum + item.amount, 0);
  const pfTotal   = livePfItems.reduce((sum, item) => sum + item.amount, 0);
  const diff       = poolTotal - pfTotal;
  const isBalanced = diff === 0;

  // フォーカス取得ごとにカウントアップ → useEffect で確実にアニメーション起動
  // pulseAnim: 回転角度（0 = 正位置、±10 = 左右10度）
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const rotateInterp = pulseAnim.interpolate({
    inputRange: [-10, 0, 10],
    outputRange: ['-10deg', '0deg', '10deg'],
  });
  const [focusCount, setFocusCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setFocusCount(c => c + 1);
    }, [])
  );

  useEffect(() => {
    if (focusCount === 0) return;
    pulseAnim.setValue(0);
    if (isBalanced) return;
    // 左右10度を2往復（合計2秒）でスムーズに揺れる
    const ease = Easing.inOut(Easing.sin);
    const anim = Animated.sequence([
      Animated.timing(pulseAnim, { toValue:  10, duration: 250, easing: Easing.out(Easing.sin), useNativeDriver: false }),
      Animated.timing(pulseAnim, { toValue: -10, duration: 500, easing: ease, useNativeDriver: false }),
      Animated.timing(pulseAnim, { toValue:  10, duration: 500, easing: ease, useNativeDriver: false }),
      Animated.timing(pulseAnim, { toValue: -10, duration: 500, easing: ease, useNativeDriver: false }),
      Animated.timing(pulseAnim, { toValue:   0, duration: 250, easing: Easing.in(Easing.sin), useNativeDriver: false }),
    ]);
    anim.start();
    return () => { anim.stop(); pulseAnim.setValue(0); };
  }, [focusCount, isBalanced]);

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
          <Animated.View style={[s.dualWrap, { transform: [{ rotate: rotateInterp }] }]}>
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
                sub={`${PF_ITEMS.length}件`}
                items={livePfItems}
                route="/(tabs)/explore"
                accentColor={colors.sage}
              />
            </View>
            {isBalanced ? (
              <View pointerEvents="none" style={s.diffCenter}>
                <View style={[s.diffBubble, s.diffBubbleOk]}>
                  <Text style={s.diffOkTxt}>✓ 整合</Text>
                </View>
              </View>
            ) : (
              <View pointerEvents="none" style={s.diffCenter}>
                <View style={s.diffBubble}>
                  <Text style={s.diffChevron}>‹</Text>
                  <Text style={s.diffNeq}>≠</Text>
                  <Text style={s.diffAmt}>{fmtMan(Math.abs(diff))}</Text>
                  <Text style={s.diffChevron}>›</Text>
                </View>
              </View>
            )}
          </Animated.View>

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
    fontFamily: typography.bodyBold,
    color: colors.text,
    lineHeight: fontSizes.pageTitle * 1.1,
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
  totalLabel: { fontSize: fontSizes.caption, color: colors.textMid, letterSpacing: 1, fontFamily: typography.bodyMedium },
  totalAmtRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: spacing.sm },
  totalCurrency: {
    fontSize: fontSizes.currencyHero, color: colors.textMid, fontFamily: typography.displayMedium,
    paddingBottom: 4, marginRight: 2,
  },
  totalAmt: {
    fontSize: fontSizes.amountHero,
    fontFamily: typography.displaySemiBold,
    color: colors.text,
    lineHeight: fontSizes.amountHero * 1.2,
    letterSpacing: letterSpacing.tight,
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
  diffChevron: { fontSize: 15, color: 'rgba(255,255,255,0.65)', fontFamily: typography.displayBold, lineHeight: 18 },
  diffNeq: { fontSize: 12, color: '#fff', fontFamily: typography.displayBold },
  diffAmt: { fontSize: 11, color: '#fff', fontFamily: typography.displayBold },
  diffBubbleOk: {
    backgroundColor: colors.sage,
    shadowColor: colors.sage,
  },
  diffOkTxt: { fontSize: 11, color: '#fff', fontFamily: typography.displayBold },

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
  aiMark: { fontSize: 14, color: colors.sage, lineHeight: 22, fontFamily: typography.body },
  aiLabel: { fontSize: 11, color: colors.sage, fontWeight: '700', marginBottom: 4, fontFamily: typography.bodyBold },
  aiTxt: { fontSize: 13, color: colors.text, lineHeight: 13 * 1.6, fontFamily: typography.body },

});
