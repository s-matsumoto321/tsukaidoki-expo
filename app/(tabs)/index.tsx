import { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line as SvgLine, Polyline, Circle, Text as SvgText } from 'react-native-svg';
import { ChevronDown, Sparkles } from 'lucide-react-native';
import { router } from 'expo-router';
import { useStore, type Account, type AccountSavingPlan, type ProjectEntity, type ProjectSavingPlan, type Expense } from '@/store/useStore';
import { colors, typography, fontSizes, spacing, radius, shadows, letterSpacing, lineHeights } from '@/constants/theme';
import { usePalette, poolPalette, brand } from '@/constants/colors';

// ─── 定数 ─────────────────────────────────────────────────────────────────

const POOL_LINE = poolPalette.tones[0];     // 残高推移：プール金（青系）
const USAGE_LINE = usePalette.jewels[1];    // 残高推移：使いみち（フォレストグリーン）
const EXPENSE_COLOR = usePalette.jewels[2]; // 支出（テラコッタ）
const AI_BG = brand.sage.bg;
const AI_FG = brand.sage.base;

const PERIODS = [50, 10, 5] as const;
type Period = typeof PERIODS[number];

const NOW = new Date();
const NOW_YEAR = NOW.getFullYear();
const NOW_MONTH = NOW.getMonth() + 1;

// ─── 計算ロジック（仕様書3章準拠の簡易版） ────────────────────────────────

// 任意の(Y,M)時点における月次の積立額合計
function monthlyPlanAmount(
  plans: { startYear: number; startMonth: number; endYear?: number; endMonth?: number; monthlyAmount: number }[],
  filterKey: string,
  filterValue: string,
  y: number,
  m: number,
): number {
  let total = 0;
  for (const p of plans as any[]) {
    if (p[filterKey] !== filterValue) continue;
    const startKey = p.startYear * 12 + (p.startMonth - 1);
    const cur = y * 12 + (m - 1);
    if (cur < startKey) continue;
    if (p.endYear != null && p.endMonth != null) {
      const endKey = p.endYear * 12 + (p.endMonth - 1);
      if (cur > endKey) continue;
    }
    total += p.monthlyAmount;
  }
  return total;
}

// 任意の年における支出合計（口座 or PJ別）
function yearlyExpenseAmount(
  expenses: Expense[],
  filterKey: 'accountId' | 'projectId',
  filterValue: string,
  y: number,
): number {
  let total = 0;
  for (const e of expenses) {
    if (e[filterKey] !== filterValue) continue;
    const inRange = e.year <= y && (e.endYear == null || e.endYear >= y);
    if (!inRange) continue;
    // 単発支出は e.year のみ
    if (!e.isRecurring && e.year !== y) continue;
    total += e.unit === 'year' ? e.amount : e.amount * 12;
  }
  return total;
}

// 仕様書3-4：プール金合計の(y)時点残高。
// year === NOW_YEAR は「いま」のスナップショット（複利・積立計上なし）、
// year >  NOW_YEAR は NOW_YEAR+1 以降を月次複利＋積立＋年間支出で前進シミュレーション。
function calcPoolTotalAt(year: number, accounts: Account[], plans: AccountSavingPlan[], expenses: Expense[]): number {
  if (year <= NOW_YEAR) {
    return accounts.reduce((s, a) => s + a.currentBalance, 0);
  }
  let total = 0;
  for (const acc of accounts) {
    let bal = acc.currentBalance;
    const monthlyRate = acc.annualRate / 100 / 12;
    for (let y = NOW_YEAR + 1; y <= year; y++) {
      for (let m = 1; m <= 12; m++) {
        const saving = monthlyPlanAmount(plans, 'accountId', acc.id, y, m);
        bal = bal * (1 + monthlyRate) + saving;
      }
      bal -= yearlyExpenseAmount(expenses, 'accountId', acc.id, y);
    }
    total += bal;
  }
  return total;
}

// 仕様書3-5：使いみち合計。PJ独自の想定利回り(assumedRate)で複利計算。
function calcUsageTotalAt(year: number, projects: ProjectEntity[], plans: ProjectSavingPlan[], expenses: Expense[]): number {
  if (year <= NOW_YEAR) {
    return projects.reduce((s, p) => s + p.currentBalance, 0);
  }
  let total = 0;
  for (const pj of projects) {
    let bal = pj.currentBalance;
    const monthlyRate = pj.assumedRate / 100 / 12;
    for (let y = NOW_YEAR + 1; y <= year; y++) {
      for (let m = 1; m <= 12; m++) {
        const saving = monthlyPlanAmount(plans, 'projectId', pj.id, y, m);
        bal = bal * (1 + monthlyRate) + saving;
      }
      bal -= yearlyExpenseAmount(expenses, 'projectId', pj.id, y);
    }
    total += bal;
  }
  return total;
}

// 期間に応じてサンプリング年を決定
function samplePoints(period: Period): number[] {
  if (period === 50) {
    return Array.from({ length: 11 }, (_, i) => NOW_YEAR + i * 5);
  }
  if (period === 10) {
    return Array.from({ length: 6 }, (_, i) => NOW_YEAR + i * 2);
  }
  return Array.from({ length: 6 }, (_, i) => NOW_YEAR + i);
}

// ─── 画面 ──────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const accounts = useStore(s => s.accounts);
  const accountSavingPlans = useStore(s => s.accountSavingPlans);
  const projectEntities = useStore(s => s.projectEntities);
  const projectSavingPlans = useStore(s => s.projectSavingPlans);
  const expenses = useStore(s => s.expenses);
  const scenarios = useStore(s => s.scenarios);
  const activeScenarioId = useStore(s => s.activeScenarioId);

  const activeScenario = scenarios.find(s => s.id === activeScenarioId) ?? scenarios[0];

  const [period, setPeriod] = useState<Period>(50);

  // チャート系列の計算
  const series = useMemo(() => {
    const points = samplePoints(period);
    const pool = points.map(y => calcPoolTotalAt(y, accounts, accountSavingPlans, expenses));
    const usage = points.map(y => calcUsageTotalAt(y, projectEntities, projectSavingPlans, expenses));
    return { points, pool, usage };
  }, [period, accounts, accountSavingPlans, projectEntities, projectSavingPlans, expenses]);

  // 現時点の総資産（仕様書4-1：使いみち側合計を採用、ズレは別途バナー判断）
  const totalNow = useMemo(
    () => projectEntities.reduce((s, p) => s + p.currentBalance, 0),
    [projectEntities],
  );
  const poolNow = useMemo(
    () => accounts.reduce((s, a) => s + a.currentBalance, 0),
    [accounts],
  );
  const integrityDiff = totalNow - poolNow;

  // 今年の支出一覧（月昇順）
  const thisYearExpenses = useMemo(() => {
    return expenses
      .filter(e => {
        const inRange = e.year <= NOW_YEAR && (e.endYear == null || e.endYear >= NOW_YEAR);
        if (!inRange) return false;
        if (!e.isRecurring && e.year !== NOW_YEAR) return false;
        return true;
      })
      .map(e => ({
        ...e,
        sortMonth: e.month ?? 0,
        yearAmount: e.unit === 'year' ? e.amount : e.amount * 12,
      }))
      .sort((a, b) => a.sortMonth - b.sortMonth);
  }, [expenses]);

  const yearTotalExpense = thisYearExpenses.reduce((s, e) => s + e.yearAmount, 0);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>ホーム</Text>
        <Pressable
          style={styles.scenarioPill}
          onPress={() => router.push('/(tabs)/scenario')}
          hitSlop={8}
        >
          <View style={styles.scenarioDot} />
          <Text style={styles.scenarioLabel}>
            プラン{activeScenario?.systemLabel ?? 'A'}：{activeScenario?.userLabel ?? 'メイン'}
          </Text>
          <ChevronDown size={12} color={AI_FG} strokeWidth={2} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 総資産カード */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>総資産</Text>
          <View style={styles.totalRow}>
            <Text style={styles.totalValue}>{formatMan(totalNow)}</Text>
            <Text style={styles.totalUnit}>万円</Text>
          </View>
          {integrityDiff === 0 ? (
            <Text style={[styles.statusText, { color: AI_FG }]}>✓ プール金と使いみちが一致</Text>
          ) : (
            <Text style={[styles.statusText, { color: colors.honeyDark }]}>
              ⚠ プール金との差 {formatMan(Math.abs(integrityDiff))}万円
            </Text>
          )}
        </View>

        {/* 残高推移グラフ */}
        <View style={styles.card}>
          <View style={styles.chartHeader}>
            <Text style={styles.cardTitle}>残高推移</Text>
            <View style={styles.periodTabs}>
              {PERIODS.map(p => (
                <Pressable
                  key={p}
                  onPress={() => setPeriod(p)}
                  style={[styles.periodTab, period === p && styles.periodTabActive]}
                >
                  <Text style={[styles.periodTabText, period === p && styles.periodTabTextActive]}>
                    {p}年
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendLine, { backgroundColor: POOL_LINE }]} />
              <Text style={styles.legendText}>プール金</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendLine, { backgroundColor: USAGE_LINE }]} />
              <Text style={styles.legendText}>使いみち</Text>
            </View>
            <Text style={styles.legendUnit}>単位：万円</Text>
          </View>
          <BalanceChart
            years={series.points}
            poolValues={series.pool}
            usageValues={series.usage}
          />
        </View>

        {/* AIインサイト */}
        <View style={styles.aiCard}>
          <Sparkles size={18} color={AI_FG} strokeWidth={2} />
          <View style={{ flex: 1 }}>
            <Text style={styles.aiTitle}>AIインサイト</Text>
            <Text style={styles.aiText}>
              2076年まで赤字なしで運用できる見込みです。教育費ピーク（2044年）も計画通り乗り越えられます。
            </Text>
          </View>
        </View>

        {/* 今年の支出予定 */}
        <View style={styles.card}>
          <View style={styles.expenseHeader}>
            <Text style={styles.cardTitle}>今年の支出予定</Text>
            <Text style={styles.expenseYearLabel}>{NOW_YEAR}年</Text>
          </View>
          {thisYearExpenses.length === 0 ? (
            <Text style={styles.emptyText}>今年の支出予定はありません</Text>
          ) : (
            <>
              {thisYearExpenses.map((e, idx) => {
                const isPast = (e.month ?? 0) < NOW_MONTH;
                const project = projectEntities.find(p => p.id === e.projectId);
                const dotColor = project?.color ?? colors.textLight;
                return (
                  <View
                    key={e.id}
                    style={[
                      styles.expenseRow,
                      idx === thisYearExpenses.length - 1 && styles.expenseRowLast,
                      isPast && { opacity: 0.5 },
                    ]}
                  >
                    <View style={[styles.expenseDot, { backgroundColor: dotColor }]} />
                    <Text style={styles.expenseMonth}>{e.month ?? '—'}月</Text>
                    <Text style={styles.expenseName} numberOfLines={1}>{e.name}</Text>
                    <Text style={[styles.expenseAmount, isPast && { color: colors.textLight }]}>
                      -{formatMan(e.yearAmount)}
                      <Text style={styles.expenseUnit}>万円</Text>
                    </Text>
                  </View>
                );
              })}
              <View style={styles.expenseTotal}>
                <Text style={styles.expenseTotalLabel}>合計</Text>
                <Text style={styles.expenseTotalValue}>
                  -{formatMan(yearTotalExpense)}
                  <Text style={styles.expenseTotalUnit}>万円</Text>
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── チャート ──────────────────────────────────────────────────────────────

function BalanceChart({
  years,
  poolValues,
  usageValues,
}: {
  years: number[];
  poolValues: number[];
  usageValues: number[];
}) {
  const W = 360;
  const H = 180;
  const PL = 36, PR = 12, PT = 14, PB = 22;
  const gW = W - PL - PR;
  const gH = H - PT - PB;
  const n = years.length;

  const poolMan = poolValues.map(toMan);
  const usageMan = usageValues.map(toMan);
  const all = [...poolMan, ...usageMan];
  let maxVal = Math.max(...all, 100);
  // 100単位で切り上げ
  maxVal = Math.ceil(maxVal / 1000) * 1000;
  if (maxVal < 100) maxVal = 100;

  const xi = (i: number) => PL + (i * gW) / Math.max(n - 1, 1);
  const yv = (v: number) => PT + gH - (v / maxVal) * gH;

  const tickCount = 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => (maxVal / tickCount) * i);

  const labelCount = Math.min(5, n);
  const labelIdx = Array.from({ length: labelCount }, (_, i) =>
    Math.round((i * (n - 1)) / Math.max(labelCount - 1, 1)),
  );

  const poolPts = poolMan.map((v, i) => `${xi(i)},${yv(v)}`).join(' ');
  const usagePts = usageMan.map((v, i) => `${xi(i)},${yv(v)}`).join(' ');

  return (
    <View style={{ width: '100%', aspectRatio: W / H }}>
      <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
        {ticks.map((v, i) => (
          <SvgLine
            key={`tick-${i}`}
            x1={PL} y1={yv(v)} x2={W - PR} y2={yv(v)}
            stroke="rgba(0,0,0,0.06)" strokeWidth={0.5}
          />
        ))}
        {ticks.map((v, i) => (
          <SvgText
            key={`tickl-${i}`}
            x={PL - 6} y={yv(v) + 3} textAnchor="end"
            fontSize={9} fill={colors.textLight}
          >
            {v >= 1000 ? `${v / 1000}千` : `${v}`}
          </SvgText>
        ))}
        {labelIdx.map((i, k) => (
          <SvgText
            key={`xl-${k}`}
            x={xi(i)} y={H - 6} textAnchor="middle"
            fontSize={9} fill={colors.textLight}
          >
            {years[i]}
          </SvgText>
        ))}
        <Polyline points={poolPts} fill="none" stroke={POOL_LINE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Polyline points={usagePts} fill="none" stroke={USAGE_LINE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={xi(0)} cy={yv(poolMan[0])} r={3} fill={POOL_LINE} />
        <Circle cx={xi(0)} cy={yv(usageMan[0])} r={3} fill={USAGE_LINE} />
        <Circle cx={xi(n - 1)} cy={yv(poolMan[n - 1])} r={3} fill={POOL_LINE} />
        <Circle cx={xi(n - 1)} cy={yv(usageMan[n - 1])} r={3} fill={USAGE_LINE} />
      </Svg>
    </View>
  );
}

// ─── ユーティリティ ────────────────────────────────────────────────────────

function toMan(yen: number): number {
  return Math.round(yen / 10_000);
}

function formatMan(yen: number): string {
  return toMan(yen).toLocaleString('ja-JP');
}

// ─── スタイル ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: fontSizes.pageTitle,
    color: colors.text,
    fontFamily: typography.displayBold,
    letterSpacing: letterSpacing.tight,
    marginBottom: spacing.sm,
  },
  scenarioPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: AI_BG,
    borderRadius: radius.pill,
  },
  scenarioDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: AI_FG },
  scenarioLabel: {
    fontSize: 13, color: AI_FG, fontFamily: typography.bodyMedium,
  },
  scroll: { flex: 1, paddingHorizontal: spacing.lg },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.08)',
    ...shadows.card,
  },
  cardLabel: {
    fontSize: 13,
    color: colors.textMid,
    fontFamily: typography.body,
    marginBottom: spacing.xs,
  },
  cardTitle: {
    fontSize: fontSizes.heading,
    color: colors.text,
    fontFamily: typography.bodyBold,
  },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 6 },
  totalValue: {
    fontSize: fontSizes.amountHero,
    color: colors.text,
    fontFamily: typography.displaySemiBold,
    letterSpacing: -1,
    lineHeight: fontSizes.amountHero * lineHeights.tight,
  },
  totalUnit: {
    fontSize: 16, color: colors.textMid, fontFamily: typography.bodyMedium,
  },
  statusText: { fontSize: 12, fontFamily: typography.bodyMedium },

  chartHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 4, flexWrap: 'wrap', gap: spacing.sm,
  },
  periodTabs: { flexDirection: 'row', gap: 4 },
  periodTab: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14,
    borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.18)',
  },
  periodTabActive: { backgroundColor: POOL_LINE, borderColor: POOL_LINE },
  periodTabText: { fontSize: 11, color: colors.textMid, fontFamily: typography.body },
  periodTabTextActive: { color: '#fff', fontFamily: typography.bodyMedium },
  legendRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 6, marginBottom: 2,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendLine: { width: 18, height: 2, borderRadius: 1 },
  legendText: { fontSize: 11, color: colors.textMid, fontFamily: typography.body },
  legendUnit: { marginLeft: 'auto', fontSize: 10, color: colors.textLight, fontFamily: typography.body },

  aiCard: {
    backgroundColor: AI_BG,
    borderRadius: radius.md,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  aiTitle: {
    fontSize: 12, color: AI_FG, fontFamily: typography.bodyBold,
    marginBottom: 4,
  },
  aiText: {
    fontSize: 13, color: colors.text, fontFamily: typography.body,
    lineHeight: 13 * lineHeights.relaxed,
  },

  expenseHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.md,
  },
  expenseYearLabel: { fontSize: 11, color: colors.textLight, fontFamily: typography.body },
  expenseRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  expenseRowLast: { borderBottomWidth: 0 },
  expenseDot: { width: 8, height: 8, borderRadius: 4 },
  expenseMonth: { width: 36, fontSize: 12, color: colors.textMid, fontFamily: typography.bodyMedium },
  expenseName: { flex: 1, fontSize: 13, color: colors.text, fontFamily: typography.body },
  expenseAmount: {
    fontSize: 14, color: EXPENSE_COLOR, fontFamily: typography.displaySemiBold,
  },
  expenseUnit: { fontSize: 11, color: colors.textMid, fontFamily: typography.body },
  expenseTotal: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 12, marginTop: 8,
    borderTopWidth: 0.5, borderTopColor: 'rgba(0,0,0,0.18)',
  },
  expenseTotalLabel: { fontSize: 12, color: colors.textMid, fontFamily: typography.bodyMedium },
  expenseTotalValue: { fontSize: 16, color: EXPENSE_COLOR, fontFamily: typography.displayBold },
  expenseTotalUnit: { fontSize: 12, color: colors.textMid, fontFamily: typography.body },

  emptyText: {
    fontSize: 13, color: colors.textLight, fontFamily: typography.body,
    paddingVertical: spacing.md, textAlign: 'center',
  },
});
