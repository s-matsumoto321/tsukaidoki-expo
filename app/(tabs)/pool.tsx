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
import { Logo } from '@/components/logo';

const C = {
  brand: '#0C447C',
  bg: '#f5f4ee',
  card: '#ffffff',
  textPrimary: '#2c2c2a',
  textSecondary: '#73726c',
  border: 'rgba(0,0,0,0.08)',
  borderMd: 'rgba(0,0,0,0.18)',
};

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

// ── 残高予測計算 ──────────────────────────────────────────────────

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

// ── 積み上げ面積グラフ（メイン画面用） ──────────────────────────

const PL = 48, PR = 10, PT = 10, PB = 24;

function StackedAreaChart({
  svgW, chartH = 160, yearCount, stacks, colors,
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
            stroke="rgba(0,0,0,0.07)" strokeWidth={0.5} />
          <SvgText x={PL - 4} y={yv(v) + 4} textAnchor="end" fontSize={8} fill="#999">{fmtAxis(v)}</SvgText>
        </G>
      ))}
      {[...xLabels].sort((a, b) => a - b).map(i => (
        <SvgText key={i} x={xi(i)} y={chartH - 3} textAnchor="middle" fontSize={8} fill="#999">
          {NOW_YEAR + i}
        </SvgText>
      ))}
      {stacks.map((stack, si) => {
        const prev = si > 0 ? stacks[si - 1] : (new Array(n).fill(0) as number[]);
        const topPts = stack.map((v, i) => `${xi(i).toFixed(1)},${yv(v).toFixed(1)}`);
        const botPts = prev.map((v, i) => `${xi(i).toFixed(1)},${yv(v).toFixed(1)}`).reverse();
        const d = `M ${topPts[0]} L ${topPts.slice(1).join(' L ')} L ${botPts.join(' L ')} Z`;
        return <Path key={si} d={d} fill={colors[si]} opacity={0.85} />;
      })}
    </Svg>
  );
}

// ── 積み上げ折れ線グラフ（モーダル用） ──────────────────────────

function MultiLineChart({
  svgW, chartH = 140, yearCount, stacks, colors,
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
            stroke="rgba(0,0,0,0.07)" strokeWidth={0.5} />
          <SvgText x={PL - 4} y={yv(v) + 4} textAnchor="end" fontSize={8} fill="#999">{fmtAxis(v)}</SvgText>
        </G>
      ))}
      {[...xLabels].sort((a, b) => a - b).map(i => (
        <SvgText key={i} x={xi(i)} y={chartH - 3} textAnchor="middle" fontSize={8} fill="#999">
          {NOW_YEAR + i}
        </SvgText>
      ))}
      {stacks.map((stack, si) => {
        const pts = stack.slice(0, n).map((v, i) => `${xi(i).toFixed(1)},${yv(v).toFixed(1)}`).join(' L ');
        return (
          <Path key={si} d={`M ${pts}`} fill="none" stroke={colors[si]} strokeWidth={2} />
        );
      })}
    </Svg>
  );
}

// ── 残高行（インライン編集） ──────────────────────────────────────

type PoolItem = typeof POOL_ITEMS[0] & { balance: number; rate: number; monthly: number };

function BalanceRow({ item, onSave }: { item: PoolItem; onSave: (id: string, newVal: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState('');

  const startEdit = () => {
    setEditVal(String(item.balance));
    setEditing(true);
  };

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
    backgroundColor: C.card, borderRadius: 10,
    borderWidth: 0.5, borderColor: C.border,
    paddingHorizontal: 12, paddingVertical: 11, marginBottom: 6,
  },
  bar: { width: 4, height: 38, borderRadius: 2, flexShrink: 0 },
  name: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  meta: { fontSize: 11, color: C.textSecondary, marginTop: 1 },
  amtPressable: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  amt: { fontSize: 15, fontWeight: '700', color: C.brand },
  editIcon: { fontSize: 11, color: C.brand },
  editRow: {
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1.5, borderBottomColor: C.brand, paddingBottom: 1,
  },
  editPrefix: { fontSize: 14, color: C.brand, fontWeight: '600', marginRight: 2 },
  editInput: {
    fontSize: 15, fontWeight: '700', color: C.brand,
    paddingVertical: 0, minWidth: 80,
  },
  rate: { fontSize: 11, color: C.textSecondary, marginTop: 2 },
});

// ── 積立・複利オーバーレイ ────────────────────────────────────────

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
      {/* ヘッダー */}
      <View style={sh.sheetHeader}>
        <Text style={sh.sheetTitle}>積立・複利を調整する</Text>
        <Pressable style={sh.closeBtn} onPress={onClose}>
          <Text style={sh.closeTxt}>✕</Text>
        </Pressable>
      </View>

      {/* 時系列範囲セレクター */}
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

      {/* 積み上げ折れ線グラフ */}
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
        {/* 適用期間 */}
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

        {/* 各口座の設定 */}
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
                {/* 月次積立額 */}
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

                {/* 複利 */}
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
    backgroundColor: C.bg,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.14, shadowRadius: 10, elevation: 12,
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: C.border,
    backgroundColor: C.card,
  },
  sheetTitle: { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  closeBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center',
  },
  closeTxt: { fontSize: 13, color: C.textSecondary },

  rangeRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: C.bg,
  },
  rangePill: {
    paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: 20, backgroundColor: C.card,
    borderWidth: 0.5, borderColor: C.border,
  },
  rangePillActive: { backgroundColor: C.brand, borderColor: C.brand },
  rangePillTxt: { fontSize: 13, fontWeight: '500', color: C.textSecondary },
  rangePillTxtActive: { color: '#fff' },

  chartCard: {
    backgroundColor: C.card, marginHorizontal: 12,
    borderRadius: 10, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6,
    borderWidth: 0.5, borderColor: C.border,
  },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  legendDot: { width: 8, height: 8, borderRadius: 2 },
  legendTxt: { fontSize: 9, color: C.textSecondary },

  scrollContent: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 16 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: C.textSecondary, marginBottom: 8 },

  periodContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginBottom: 4,
  },
  periodBlock: { alignItems: 'center', flex: 1 },
  periodLabel: { fontSize: 11, color: C.textSecondary, marginBottom: 4 },
  periodSep: { fontSize: 18, color: C.textSecondary, marginTop: 16 },
  yearRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  arrowBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.borderMd,
    justifyContent: 'center', alignItems: 'center',
  },
  arrowTxt: { fontSize: 18, color: C.brand },
  yearTxt: { fontSize: 16, fontWeight: '700', color: C.textPrimary, minWidth: 50, textAlign: 'center' },

  accountBlock: {
    backgroundColor: C.card, borderRadius: 10,
    borderWidth: 0.5, borderColor: C.border,
    padding: 12, marginBottom: 8,
  },
  accountNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  colorDot: { width: 10, height: 10, borderRadius: 3 },
  accountName: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  fieldsRow: { flexDirection: 'row', alignItems: 'flex-start' },
  fieldCol: { flex: 1 },
  fieldLabel: { fontSize: 10, color: C.textSecondary, fontWeight: '500', marginBottom: 3 },
  stepper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.bg, borderRadius: 6,
    borderWidth: 0.5, borderColor: C.borderMd, overflow: 'hidden',
  },
  stepBtn: {
    width: 32, height: 36, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#f0f0f8',
  },
  stepBtnTxt: { fontSize: 18, color: C.brand, fontWeight: '300' },
  stepInput: {
    flex: 1, textAlign: 'center',
    fontSize: 13, fontWeight: '700', color: C.textPrimary, paddingVertical: 4,
  },
  unitTxt: { fontSize: 11, color: C.brand, textAlign: 'center', marginTop: 2 },
  footer: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 0.5, borderTopColor: C.border,
    backgroundColor: C.bg,
  },
  applyBtn: {
    backgroundColor: C.brand, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  applyTxt: { fontSize: 15, fontWeight: '600', color: '#fff' },
});

// ── メイン画面 ────────────────────────────────────────────────────

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
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.brand} />

      {/* ヘッダー */}
      <View style={ps.header}>
        <View style={ps.headerRow}>
          <Logo iconSize={22} />
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={ps.totalLbl}>総残高</Text>
            <Text style={ps.totalAmt}>¥{totalBalance.toLocaleString('ja-JP')}</Text>
          </View>
        </View>
        <Text style={ps.headerSub}>プール金 · 口座管理</Text>
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

      {/* 残高リストパネル */}
      <View style={ps.listPanel}>
        <View style={ps.secRow}>
          <Text style={ps.secTitle}>口座残高</Text>
          <Text style={ps.secSub}>タップで残高を修正</Text>
        </View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 70 }}
          showsVerticalScrollIndicator={false}
        >
          {poolItems.map(item => (
            <BalanceRow
              key={item.projectId}
              item={item}
              onSave={handleBalanceSave}
            />
          ))}
        </ScrollView>
      </View>

      {/* 積立調整ボタン */}
      <View style={[ps.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
        <Pressable style={ps.allocBtn} onPress={openOverlay}>
          <Text style={ps.allocBtnTxt}>⚙ 積立・複利を調整する</Text>
        </Pressable>
      </View>

      {/* 積立・複利オーバーレイ */}
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
  header: { backgroundColor: C.brand, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  totalLbl: { fontSize: 11, color: 'rgba(255,255,255,0.55)' },
  totalAmt: { fontSize: 18, fontWeight: '600', color: '#fff' },

  chartCard: {
    marginHorizontal: 16, marginTop: 10, marginBottom: 6,
    backgroundColor: C.card, borderRadius: 12,
    borderWidth: 0.5, borderColor: C.border,
    paddingTop: 10, paddingBottom: 6, overflow: 'hidden',
  },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 12, marginBottom: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  legendDot: { width: 8, height: 8, borderRadius: 2 },
  legendTxt: { fontSize: 10, color: C.textSecondary },

  listPanel: { flex: 1, backgroundColor: C.bg, borderTopWidth: 0.5, borderTopColor: C.border },
  secRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 6,
  },
  secTitle: { fontSize: 13, fontWeight: '500', color: C.textSecondary },
  secSub: { fontSize: 12, color: C.brand, fontWeight: '500' },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 10,
    backgroundColor: C.bg, borderTopWidth: 0.5, borderTopColor: C.border,
  },
  allocBtn: {
    backgroundColor: C.brand, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  allocBtnTxt: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
