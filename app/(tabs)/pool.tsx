import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  useWindowDimensions, TextInput, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, G, Line as SvgLine, Text as SvgText } from 'react-native-svg';
import { POOL_ITEMS } from '@/constants/data';
import { useStore } from '@/store/useStore';
import { colors, typography, fontSizes, spacing, radius, shadows } from '@/constants/theme';

const NOW_YEAR = new Date().getFullYear();

const DEFAULT_RATES: Record<string, number> = {
  'pool-shoken': 0.05,
  'pool-teiki': 0.005,
  'pool-nisa': 0.07,
  'pool-main': 0.001,
  'pool-sub': 0.001,
};

const DEFAULT_POOL_MONTHLY: Record<string, number> = {
  'pool-shoken': 50_000,
  'pool-teiki': 0,
  'pool-nisa': 33_000,
  'pool-main': 0,
  'pool-sub': 0,
};

// ── 残高予測計算 ─────────────────────────────────────────────────────

function projectYearly(initial: number, monthly: number, rate: number, yearCount: number): number[] {
  const arr = [initial];
  let bal = initial;
  for (let y = 1; y < yearCount; y++) {
    bal = bal * (1 + rate) + monthly * 12;
    arr.push(Math.max(0, bal));
  }
  return arr;
}

function buildCumulativeStacks(
  balMap: Record<string, number>,
  monthlyMap: Record<string, number>,
  rateMap: Record<string, number>,
  yearCount: number
): number[][] {
  const stacks: number[][] = [];
  let prev = new Array(yearCount).fill(0) as number[];
  for (const item of POOL_ITEMS) {
    const id = item.projectId!;
    const proj = projectYearly(balMap[id] ?? item.amount, monthlyMap[id] ?? 0, rateMap[id] ?? 0, yearCount);
    const cum = proj.map((v, i) => v + prev[i]);
    stacks.push(cum);
    prev = cum;
  }
  return stacks;
}

function niceStep(max: number, ticks: number): number {
  if (max <= 0) return 1_000_000;
  const rough = max / ticks;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const candidates = [1, 2, 5, 10].map(m => m * mag);
  return candidates.find(c => c >= rough) ?? candidates[candidates.length - 1];
}

function fmtAxis(v: number): string {
  if (v === 0) return '0';
  if (v >= 1e8) return `${(v / 1e8).toFixed(0)}億`;
  if (v >= 1e7) return `${(v / 1e7).toFixed(0)}千万`;
  return `${Math.round(v / 1e4)}万`;
}

// ── 積み上げ面積グラフ ────────────────────────────────────────────────

const PL = 48, PR = 10, PT = 10, PB = 24;

function StackedAreaChart({
  svgW, chartH = 160, yearCount, stacks, colors: chartColors,
}: {
  svgW: number; chartH?: number; yearCount: number;
  stacks: number[][]; colors: string[];
}) {
  if (!stacks.length || yearCount < 2) return null;
  const gW = svgW - PL - PR;
  const gH = chartH - PT - PB;
  const n = yearCount;
  const topStack = stacks[stacks.length - 1];
  const maxVal = Math.max(...topStack, 1);
  const topVal = maxVal * 1.1;
  const step = niceStep(topVal, 4);
  const maxTick = Math.ceil(topVal / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= maxTick; v += step) ticks.push(v);
  const xi = (i: number) => PL + (i / (n - 1)) * gW;
  const yv = (v: number) => PT + gH * (1 - Math.min(v / maxTick, 1));
  const xStep = n <= 15 ? 3 : n <= 30 ? 5 : 10;
  const xLabels = new Set([0, n - 1]);
  for (let i = xStep; i < n - 1; i += xStep) xLabels.add(i);

  return (
    <Svg width={svgW} height={chartH}>
      {ticks.map(v => (
        <G key={v}>
          <SvgLine x1={PL} y1={yv(v)} x2={svgW - PR} y2={yv(v)}
            stroke={colors.divider} strokeWidth={0.5} />
          <SvgText x={PL - 4} y={yv(v) + 4} textAnchor="end" fontSize={8} fill={colors.textLight}>{fmtAxis(v)}</SvgText>
        </G>
      ))}
      {[...xLabels].sort((a, b) => a - b).map(i => (
        <SvgText key={i} x={xi(i)} y={chartH - 3} textAnchor="middle" fontSize={8} fill={colors.textLight}>
          {NOW_YEAR + i}
        </SvgText>
      ))}
      {stacks.map((stack, si) => {
        const prev = si > 0 ? stacks[si - 1] : (new Array(n).fill(0) as number[]);
        const topPts = stack.map((v, i) => `${xi(i).toFixed(1)},${yv(v).toFixed(1)}`);
        const botPts = prev.map((v, i) => `${xi(i).toFixed(1)},${yv(v).toFixed(1)}`).reverse();
        const d = `M ${topPts[0]} L ${topPts.slice(1).join(' L ')} L ${botPts.join(' L ')} Z`;
        return <Path key={si} d={d} fill={chartColors[si]} opacity={0.85} />;
      })}
    </Svg>
  );
}

// ── 積み上げ折れ線グラフ ─────────────────────────────────────────────

function MultiLineChart({
  svgW, chartH = 140, yearCount, stacks, colors: chartColors,
}: {
  svgW: number; chartH?: number; yearCount: number;
  stacks: number[][]; colors: string[];
}) {
  if (!stacks.length || yearCount < 2) return null;
  const gW = svgW - PL - PR;
  const gH = chartH - PT - PB;
  const n = Math.min(yearCount, stacks[0]?.length ?? yearCount);
  const topStack = stacks[stacks.length - 1].slice(0, n);
  const maxVal = Math.max(...topStack, 1);
  const topVal = maxVal * 1.1;
  const step = niceStep(topVal, 4);
  const maxTick = Math.ceil(topVal / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= maxTick; v += step) ticks.push(v);
  const xi = (i: number) => PL + (i / (n - 1)) * gW;
  const yv = (v: number) => PT + gH * (1 - Math.min(v / maxTick, 1));
  const xStep = n <= 6 ? 1 : n <= 15 ? 3 : n <= 30 ? 5 : 10;
  const xLabels = new Set([0, n - 1]);
  for (let i = xStep; i < n - 1; i += xStep) xLabels.add(i);

  return (
    <Svg width={svgW} height={chartH}>
      {ticks.map(v => (
        <G key={v}>
          <SvgLine x1={PL} y1={yv(v)} x2={svgW - PR} y2={yv(v)}
            stroke={colors.divider} strokeWidth={0.5} />
          <SvgText x={PL - 4} y={yv(v) + 4} textAnchor="end" fontSize={8} fill={colors.textLight}>{fmtAxis(v)}</SvgText>
        </G>
      ))}
      {[...xLabels].sort((a, b) => a - b).map(i => (
        <SvgText key={i} x={xi(i)} y={chartH - 3} textAnchor="middle" fontSize={8} fill={colors.textLight}>
          {NOW_YEAR + i}
        </SvgText>
      ))}
      {stacks.map((stack, si) => {
        const pts = stack.slice(0, n).map((v, i) => `${xi(i).toFixed(1)},${yv(v).toFixed(1)}`).join(' L ');
        return (
          <Path key={si} d={`M ${pts}`} fill="none" stroke={chartColors[si]} strokeWidth={2} />
        );
      })}
    </Svg>
  );
}

// ── 残高行 ────────────────────────────────────────────────────────────

type PoolItem = typeof POOL_ITEMS[0] & { balance: number; rate: number; monthly: number };

function BalanceRow({ item, onSave }: { item: PoolItem; onSave: (id: string, newVal: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState('');

  const startEdit = () => { setEditVal(String(item.balance)); setEditing(true); };

  const commit = () => {
    const n = parseInt(editVal.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(n) && n > 0 && n !== item.balance) {
      onSave(item.projectId!, n);
    }
    setEditing(false);
  };

  return (
    <View style={bl.row}>
      <View style={[bl.bar, { backgroundColor: item.color }]} />
      <View style={{ flex: 1 }}>
        <Text style={bl.name}>{item.name}</Text>
        <Text style={bl.meta}>{item.meta}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        {editing ? (
          <View style={bl.editRow}>
            <Text style={bl.editPrefix}>¥</Text>
            <TextInput
              style={bl.editInput}
              value={editVal}
              onChangeText={v => setEditVal(v.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              autoFocus
              onBlur={commit}
              onSubmitEditing={commit}
              selectTextOnFocus
            />
          </View>
        ) : (
          <Pressable style={bl.amtPressable} onPress={startEdit}>
            <Text style={bl.amt}>¥{item.balance.toLocaleString('ja-JP')}</Text>
            <Text style={bl.editIcon}>✎</Text>
          </Pressable>
        )}
        <Text style={bl.rate}>
          年利 {(item.rate * 100).toFixed(1)}%
          {item.monthly > 0 ? `  月¥${item.monthly.toLocaleString('ja-JP')}` : ''}
        </Text>
      </View>
    </View>
  );
}

const bl = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.card, borderRadius: radius.sm,
    paddingHorizontal: 12, paddingVertical: 12, marginBottom: 6,
    ...shadows.card,
  },
  bar: { width: 4, height: 38, borderRadius: 2, flexShrink: 0 },
  name: { fontSize: 14, fontWeight: '600', color: colors.text },
  meta: { fontSize: 11, color: colors.textMid, marginTop: 1 },
  amtPressable: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  amt: { fontSize: 15, fontWeight: '700', color: colors.sage },
  editIcon: { fontSize: 11, color: colors.sage },
  editRow: {
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1.5, borderBottomColor: colors.sage, paddingBottom: 1,
  },
  editPrefix: { fontSize: 14, color: colors.sage, fontWeight: '600', marginRight: 2 },
  editInput: {
    fontSize: 15, fontWeight: '700', color: colors.sage,
    paddingVertical: 0, minWidth: 80,
  },
  rate: { fontSize: 11, color: colors.textMid, marginTop: 2 },
});

// ── 積立・複利オーバーレイ ────────────────────────────────────────────

type DraftState = {
  fromYear: number;
  toYear: number;
  monthlyAmounts: Record<string, number>;
  interestRates: Record<string, number>;
};

type RangeMode = '生涯' | '5年' | '1年';

const AMT_STEP = 1000;
const RATE_STEP = 0.001;

function AllocationSheet({
  open, draft, onChangeDraft, draftStacks, svgW, yearCount, onApply, onClose, bottomPad,
}: {
  open: boolean;
  draft: DraftState;
  onChangeDraft: (d: DraftState) => void;
  draftStacks: number[][];
  svgW: number;
  yearCount: number;
  onApply: () => void;
  onClose: () => void;
  bottomPad: number;
}) {
  const insets = useSafeAreaInsets();
  const [rangeMode, setRangeMode] = useState<RangeMode>('生涯');

  if (!open) return null;

  const displayYearCount = rangeMode === '生涯' ? yearCount
    : rangeMode === '5年' ? Math.min(6, yearCount)
    : Math.min(2, yearCount);

  const setMonthly = (id: string, val: number) =>
    onChangeDraft({ ...draft, monthlyAmounts: { ...draft.monthlyAmounts, [id]: Math.max(0, val) } });

  const setRate = (id: string, val: number) =>
    onChangeDraft({
      ...draft,
      interestRates: {
        ...draft.interestRates,
        [id]: Math.max(0, Math.min(0.20, parseFloat(val.toFixed(4)))),
      },
    });

  return (
    <View style={[sh.sheet, { paddingTop: insets.top, paddingBottom: bottomPad }]}>
      <View style={sh.sheetHeader}>
        <Text style={sh.sheetTitle}>積立・複利を調整する</Text>
        <Pressable style={sh.closeBtn} onPress={onClose}>
          <Text style={sh.closeTxt}>✕</Text>
        </Pressable>
      </View>

      <View style={sh.rangeRow}>
        {(['生涯', '5年', '1年'] as RangeMode[]).map(r => (
          <Pressable
            key={r}
            style={[sh.rangePill, rangeMode === r && sh.rangePillActive]}
            onPress={() => setRangeMode(r)}
          >
            <Text style={[sh.rangePillTxt, rangeMode === r && sh.rangePillTxtActive]}>{r}</Text>
          </Pressable>
        ))}
      </View>

      <View style={sh.chartCard}>
        <View style={sh.legendRow}>
          {POOL_ITEMS.map(item => (
            <View key={item.projectId} style={sh.legendItem}>
              <View style={[sh.legendDot, { backgroundColor: item.color }]} />
              <Text style={sh.legendTxt}>{item.name}</Text>
            </View>
          ))}
        </View>
        <MultiLineChart
          svgW={svgW - 24}
          chartH={130}
          yearCount={displayYearCount}
          stacks={draftStacks}
          colors={POOL_ITEMS.map(i => i.color)}
        />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={sh.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={sh.sectionLabel}>適用期間</Text>
        <View style={sh.periodContainer}>
          <View style={sh.periodBlock}>
            <Text style={sh.periodLabel}>From</Text>
            <View style={sh.yearRow}>
              <Pressable
                style={sh.arrowBtn}
                onPress={() => onChangeDraft({ ...draft, fromYear: Math.max(NOW_YEAR, draft.fromYear - 1) })}
              >
                <Text style={sh.arrowTxt}>‹</Text>
              </Pressable>
              <Text style={sh.yearTxt}>{draft.fromYear}</Text>
              <Pressable
                style={sh.arrowBtn}
                onPress={() => onChangeDraft({ ...draft, fromYear: Math.min(draft.toYear, draft.fromYear + 1) })}
              >
                <Text style={sh.arrowTxt}>›</Text>
              </Pressable>
            </View>
          </View>
          <Text style={sh.periodSep}>〜</Text>
          <View style={sh.periodBlock}>
            <Text style={sh.periodLabel}>To</Text>
            <View style={sh.yearRow}>
              <Pressable
                style={sh.arrowBtn}
                onPress={() => onChangeDraft({ ...draft, toYear: Math.max(draft.fromYear, draft.toYear - 1) })}
              >
                <Text style={sh.arrowTxt}>‹</Text>
              </Pressable>
              <Text style={sh.yearTxt}>{draft.toYear}</Text>
              <Pressable
                style={sh.arrowBtn}
                onPress={() => onChangeDraft({ ...draft, toYear: Math.min(NOW_YEAR + 50, draft.toYear + 1) })}
              >
                <Text style={sh.arrowTxt}>›</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <Text style={[sh.sectionLabel, { marginTop: 12 }]}>各口座の設定</Text>
        {POOL_ITEMS.map(item => {
          const id = item.projectId!;
          const monthly = draft.monthlyAmounts[id] ?? 0;
          const rate = draft.interestRates[id] ?? 0;
          return (
            <View key={id} style={sh.accountBlock}>
              <View style={sh.accountNameRow}>
                <View style={[sh.colorDot, { backgroundColor: item.color }]} />
                <Text style={sh.accountName}>{item.name}</Text>
              </View>
              <View style={sh.fieldsRow}>
                <View style={sh.fieldCol}>
                  <Text style={sh.fieldLabel}>月次積立額</Text>
                  <View style={sh.stepper}>
                    <Pressable style={sh.stepBtn} onPress={() => setMonthly(id, monthly - AMT_STEP)}>
                      <Text style={sh.stepBtnTxt}>−</Text>
                    </Pressable>
                    <TextInput
                      style={sh.stepInput}
                      value={String(monthly)}
                      onChangeText={v => setMonthly(id, parseInt(v.replace(/\D/g, ''), 10) || 0)}
                      keyboardType="number-pad"
                      selectTextOnFocus
                    />
                    <Pressable style={sh.stepBtn} onPress={() => setMonthly(id, monthly + AMT_STEP)}>
                      <Text style={sh.stepBtnTxt}>＋</Text>
                    </Pressable>
                  </View>
                  <Text style={sh.unitTxt}>¥{monthly.toLocaleString('ja-JP')}/月</Text>
                </View>

                <View style={{ width: 8 }} />

                <View style={sh.fieldCol}>
                  <Text style={sh.fieldLabel}>複利（年利）</Text>
                  <View style={sh.stepper}>
                    <Pressable style={sh.stepBtn} onPress={() => setRate(id, rate - RATE_STEP)}>
                      <Text style={sh.stepBtnTxt}>−</Text>
                    </Pressable>
                    <TextInput
                      style={sh.stepInput}
                      value={(rate * 100).toFixed(1)}
                      onChangeText={v => setRate(id, (parseFloat(v) || 0) / 100)}
                      keyboardType="decimal-pad"
                      selectTextOnFocus
                    />
                    <Pressable style={sh.stepBtn} onPress={() => setRate(id, rate + RATE_STEP)}>
                      <Text style={sh.stepBtnTxt}>＋</Text>
                    </Pressable>
                  </View>
                  <Text style={sh.unitTxt}>{(rate * 100).toFixed(1)}%/年</Text>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={sh.footer}>
        <Pressable style={sh.applyBtn} onPress={onApply}>
          <Text style={sh.applyTxt}>適用する</Text>
        </Pressable>
      </View>
    </View>
  );
}

const sh = StyleSheet.create({
  sheet: {
    position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: colors.bg,
    ...shadows.floating,
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
    backgroundColor: colors.card,
  },
  sheetTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  closeBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center',
  },
  closeTxt: { fontSize: 13, color: colors.textMid },

  rangeRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: colors.bg,
  },
  rangePill: {
    paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: radius.pill, backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.divider,
  },
  rangePillActive: { backgroundColor: colors.sage, borderColor: colors.sage },
  rangePillTxt: { fontSize: 13, fontWeight: '500', color: colors.textMid },
  rangePillTxtActive: { color: '#fff' },

  chartCard: {
    backgroundColor: colors.card, marginHorizontal: 12,
    borderRadius: radius.sm, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6,
    ...shadows.card,
  },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  legendDot: { width: 8, height: 8, borderRadius: 2 },
  legendTxt: { fontSize: 9, color: colors.textMid },

  scrollContent: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 16 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: colors.textMid, marginBottom: 8 },

  periodContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginBottom: 4,
  },
  periodBlock: { alignItems: 'center', flex: 1 },
  periodLabel: { fontSize: 11, color: colors.textMid, marginBottom: 4 },
  periodSep: { fontSize: 18, color: colors.textMid, marginTop: 16 },
  yearRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  arrowBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.divider,
    justifyContent: 'center', alignItems: 'center',
  },
  arrowTxt: { fontSize: 18, color: colors.sage },
  yearTxt: { fontSize: 16, fontWeight: '700', color: colors.text, minWidth: 50, textAlign: 'center' },

  accountBlock: {
    backgroundColor: colors.card, borderRadius: radius.sm,
    padding: 12, marginBottom: 8,
    ...shadows.card,
  },
  accountNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  colorDot: { width: 10, height: 10, borderRadius: 3 },
  accountName: { fontSize: 14, fontWeight: '600', color: colors.text },
  fieldsRow: { flexDirection: 'row', alignItems: 'flex-start' },
  fieldCol: { flex: 1 },
  fieldLabel: { fontSize: 10, color: colors.textMid, fontWeight: '500', marginBottom: 3 },
  stepper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bg, borderRadius: 6,
    borderWidth: 1, borderColor: colors.divider, overflow: 'hidden',
  },
  stepBtn: {
    width: 32, height: 36, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.sageBg,
  },
  stepBtnTxt: { fontSize: 18, color: colors.sage, fontWeight: '300' },
  stepInput: {
    flex: 1, textAlign: 'center',
    fontSize: 13, fontWeight: '700', color: colors.text, paddingVertical: 4,
  },
  unitTxt: { fontSize: 11, color: colors.sage, textAlign: 'center', marginTop: 2 },
  footer: {
    paddingHorizontal: spacing.lg, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: colors.divider,
    backgroundColor: colors.bg,
  },
  applyBtn: {
    backgroundColor: colors.sage, borderRadius: radius.md,
    paddingVertical: 14, alignItems: 'center',
    ...shadows.card,
  },
  applyTxt: { fontSize: 15, fontWeight: '600', color: '#fff' },
});

// ── メイン画面 ────────────────────────────────────────────────────────

export default function PoolScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { balances, savingsAllocation, saveSavingsAllocation, familyMembers, updateBalance } = useStore();

  const selfBirthYear = familyMembers.find(m => m.id === 'self')?.birthYear ?? 1990;
  const yearCount = Math.max(10, (selfBirthYear + 100) - NOW_YEAR);

  const [overlayOpen, setOverlayOpen] = useState(false);
  const [draft, setDraft] = useState<DraftState>({
    fromYear: NOW_YEAR, toYear: NOW_YEAR + 10, monthlyAmounts: {}, interestRates: {},
  });

  const svgW = screenWidth - 32;
  const savedRates = savingsAllocation.interestRates ?? {};

  const poolItems = useMemo<PoolItem[]>(() => {
    const sortedEntries = [...savingsAllocation.entries].sort((a, b) => b.fromYear - a.fromYear);
    const currentEntry = sortedEntries.find(e => e.fromYear <= NOW_YEAR);
    return POOL_ITEMS.map(item => {
      const id = item.projectId!;
      return {
        ...item,
        balance: balances[id] ?? item.amount,
        monthly: currentEntry?.monthlyAmounts[id] ?? DEFAULT_POOL_MONTHLY[id] ?? 0,
        rate: savedRates[id] ?? DEFAULT_RATES[id] ?? 0,
      };
    });
  }, [balances, savingsAllocation]);

  const totalBalance = poolItems.reduce((sum, i) => sum + i.balance, 0);

  const savedStacks = useMemo(() => buildCumulativeStacks(
    Object.fromEntries(poolItems.map(i => [i.projectId!, i.balance])),
    Object.fromEntries(poolItems.map(i => [i.projectId!, i.monthly])),
    Object.fromEntries(poolItems.map(i => [i.projectId!, i.rate])),
    yearCount
  ), [poolItems, yearCount]);

  const draftStacks = useMemo(() => {
    if (!overlayOpen) return savedStacks;
    return buildCumulativeStacks(
      Object.fromEntries(poolItems.map(i => [i.projectId!, i.balance])),
      draft.monthlyAmounts,
      draft.interestRates,
      yearCount
    );
  }, [overlayOpen, draft, poolItems, yearCount, savedStacks]);

  const openOverlay = () => {
    setDraft({
      fromYear: NOW_YEAR,
      toYear: NOW_YEAR + 10,
      monthlyAmounts: Object.fromEntries(poolItems.map(i => [i.projectId!, i.monthly])),
      interestRates: Object.fromEntries(
        poolItems.map(i => [i.projectId!, savedRates[i.projectId!] ?? DEFAULT_RATES[i.projectId!] ?? 0])
      ),
    });
    setOverlayOpen(true);
  };

  const applyDraft = () => {
    const existing = savingsAllocation.entries.find(e => e.fromYear === draft.fromYear);
    let newEntries;
    if (existing) {
      newEntries = savingsAllocation.entries.map(e =>
        e.fromYear === draft.fromYear
          ? { ...e, monthlyAmounts: { ...e.monthlyAmounts, ...draft.monthlyAmounts } }
          : e
      );
    } else {
      const sorted = [...savingsAllocation.entries].sort((a, b) => b.fromYear - a.fromYear);
      const base = sorted.find(e => e.fromYear <= draft.fromYear);
      newEntries = [
        ...savingsAllocation.entries,
        {
          fromYear: draft.fromYear,
          monthlyAmounts: { ...(base?.monthlyAmounts ?? {}), ...draft.monthlyAmounts },
        },
      ].sort((a, b) => a.fromYear - b.fromYear);
    }
    saveSavingsAllocation({
      entries: newEntries,
      interestRates: { ...savedRates, ...draft.interestRates },
    });
    setOverlayOpen(false);
  };

  const handleBalanceSave = (id: string, newVal: number) => {
    const item = poolItems.find(i => i.projectId === id);
    if (!item) return;
    updateBalance(id, item.balance, newVal, '残高修正');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* ページタイトル + 総残高 */}
      <View style={ps.titleRow}>
        <Text style={ps.pageTitle}>プール金</Text>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={ps.totalLbl}>総残高</Text>
          <Text style={ps.totalAmt}>¥{totalBalance.toLocaleString('ja-JP')}</Text>
        </View>
      </View>

      {/* 積み上げ面積グラフ */}
      <View style={ps.chartCard}>
        <View style={ps.legendRow}>
          {POOL_ITEMS.map(item => (
            <View key={item.projectId} style={ps.legendItem}>
              <View style={[ps.legendDot, { backgroundColor: item.color }]} />
              <Text style={ps.legendTxt}>{item.name}</Text>
            </View>
          ))}
        </View>
        <StackedAreaChart
          svgW={svgW}
          yearCount={yearCount}
          stacks={savedStacks}
          colors={POOL_ITEMS.map(i => i.color)}
        />
      </View>

      {/* 残高リスト */}
      <View style={ps.listPanel}>
        <View style={ps.secRow}>
          <Text style={ps.secTitle}>口座残高</Text>
          <Text style={ps.secSub}>タップで残高を修正</Text>
        </View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 80 }}
          showsVerticalScrollIndicator={false}
        >
          {poolItems.map(item => (
            <BalanceRow key={item.projectId} item={item} onSave={handleBalanceSave} />
          ))}
        </ScrollView>
      </View>

      {/* 積立調整ボタン */}
      <View style={[ps.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
        <Pressable style={ps.allocBtn} onPress={openOverlay}>
          <Text style={ps.allocBtnTxt}>積立・複利を調整する</Text>
        </Pressable>
      </View>

      <AllocationSheet
        open={overlayOpen}
        draft={draft}
        onChangeDraft={setDraft}
        draftStacks={draftStacks}
        svgW={svgW}
        yearCount={yearCount}
        onApply={applyDraft}
        onClose={() => setOverlayOpen(false)}
        bottomPad={insets.bottom + 4}
      />
    </SafeAreaView>
  );
}

const ps = StyleSheet.create({
  titleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.md,
  },
  pageTitle: {
    fontSize: fontSizes.pageTitle,
    fontFamily: typography.display,
    color: colors.text,
  },
  totalLbl: { fontSize: 11, color: colors.textMid },
  totalAmt: {
    fontSize: fontSizes.amountMedium, fontWeight: '600', color: colors.text,
    fontFamily: typography.display,
  },

  chartCard: {
    marginHorizontal: spacing.lg, marginBottom: spacing.sm,
    backgroundColor: colors.card, borderRadius: radius.lg,
    paddingTop: 10, paddingBottom: 6, overflow: 'hidden',
    ...shadows.card,
  },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 12, marginBottom: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  legendDot: { width: 8, height: 8, borderRadius: 2 },
  legendTxt: { fontSize: 10, color: colors.textMid },

  listPanel: { flex: 1, backgroundColor: colors.bg },
  secRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: 6,
  },
  secTitle: { fontSize: 13, fontWeight: '500', color: colors.textMid },
  secSub: { fontSize: 12, color: colors.sage, fontWeight: '500', textDecorationLine: 'underline' },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: spacing.lg, paddingTop: 10,
    backgroundColor: colors.bg,
    borderTopWidth: 1, borderTopColor: colors.divider,
  },
  allocBtn: {
    backgroundColor: colors.sage, borderRadius: radius.md,
    paddingVertical: 14, alignItems: 'center',
    ...shadows.card,
  },
  allocBtnTxt: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
