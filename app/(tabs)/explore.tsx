import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View, Text, Pressable, StyleSheet, StatusBar,
  Animated, useWindowDimensions, ScrollView, TextInput,
} from 'react-native';
import { router } from 'expo-router';
import Svg, { Path, Line as SvgLine, Circle, Text as SvgText, G, Rect, Polyline } from 'react-native-svg';
import { useStore, type AllocationEntry } from '@/store/useStore';
import { colors, typography, fontSizes, spacing, radius, shadows } from '@/constants/theme';
import { usePalette } from '@/constants/colors';

// ─── 定数 ─────────────────────────────────────────────────────────────────

const NOW_YEAR = new Date().getFullYear();
const CHART_FROM = NOW_YEAR;
const CHART_TO = 2055;
const TAB_BAR_HEIGHT = 74;
const TAB_BAR_MARGIN = 10;
const BUTTON_BAR_BOTTOM_GAP = 8;
const MAX_MONTHLY_POOL = 100_000; // 月10万円の上限

const GOAL_IDS = ['edu', 'ret', 'car', 'trip'] as const;
type GoalId = typeof GOAL_IDS[number];

const GOAL_COLORS: Record<GoalId, string> = {
  edu: usePalette.jewels[0],
  ret: usePalette.jewels[1],
  car: usePalette.jewels[2],
  trip: usePalette.jewels[3],
};
const GOAL_NAMES: Record<GoalId, string> = {
  edu: '教育資金', ret: '老後資金', car: '車資金', trip: '旅行資金',
};
const GOAL_TARGETS: Record<GoalId, number> = {
  edu: 5_000_000, ret: 30_000_000, car: 2_000_000, trip: 2_660_000,
};
const GOAL_TARGET_YEARS: Record<GoalId, number> = {
  edu: 2044, ret: 2050, car: 2028, trip: 2037,
};

const RED = '#C74545';
const RED_BG = 'rgba(199, 69, 69, 0.08)';
const GREEN_BG_ALPHA = 'rgba(90, 130, 102, 0.10)';
const SAGE = '#5a8266';

const DEFAULT_POOL_RATES: Record<string, number> = {
  'pool-shoken': 0.05,
  'pool-teiki': 0.005,
  'pool-nisa': 0.07,
  'pool-main': 0.001,
  'pool-sub': 0.001,
};

// 各ゴールの年間支出イベント（プロジェクトデータより）
const GOAL_EXPENSE_EVENTS: Record<GoalId, Array<{ year: number; amountYen: number }>> = {
  edu: [
    { year: 2027, amountYen: 720_000 },
    { year: 2033, amountYen: 309_000 },
    { year: 2038, amountYen: 321_000 },
    { year: 2043, amountYen: 488_000 },
    { year: 2044, amountYen: 1_000_000 },
    { year: 2046, amountYen: 1_000_000 },
  ],
  ret: [
    { year: 2050, amountYen: 4_200_000 },
    { year: 2051, amountYen: 4_200_000 },
    { year: 2052, amountYen: 4_200_000 },
    { year: 2053, amountYen: 3_000_000 },
    { year: 2054, amountYen: 3_000_000 },
    { year: 2055, amountYen: 3_000_000 },
  ],
  car: [
    { year: 2028, amountYen: 2_000_000 },
  ],
  trip: [
    { year: 2026, amountYen: 150_000 },
    { year: 2027, amountYen: 150_000 },
    { year: 2028, amountYen: 150_000 },
    { year: 2029, amountYen: 150_000 },
    { year: 2030, amountYen: 150_000 },
    { year: 2031, amountYen: 300_000 },
    { year: 2032, amountYen: 150_000 },
    { year: 2033, amountYen: 150_000 },
    { year: 2034, amountYen: 150_000 },
    { year: 2035, amountYen: 150_000 },
    { year: 2036, amountYen: 150_000 },
    { year: 2037, amountYen: 800_000 },
  ],
};

// ─── 計算ロジック ──────────────────────────────────────────────────────────

type BalanceSeries = Array<{ year: number; balance: number }>;

function calcGoalBalanceOverTime(
  goalId: GoalId,
  initialBalance: number,
  allocationEntries: AllocationEntry[],
  fromYear: number,
  toYear: number,
  annualRate = 0.04,
): BalanceSeries {
  const result: BalanceSeries = [];
  let bal = initialBalance;
  const expenses = GOAL_EXPENSE_EVENTS[goalId];

  for (let year = fromYear; year <= toYear; year++) {
    if (year > fromYear) {
      const sorted = [...allocationEntries]
        .filter(e => e.fromYear <= year)
        .sort((a, b) => b.fromYear - a.fromYear);
      const monthly = sorted[0]?.monthlyAmounts[goalId] ?? 0;
      bal = bal * (1 + annualRate) + monthly * 12;
      const yearExp = expenses
        .filter(e => e.year === year)
        .reduce((s, e) => s + e.amountYen, 0);
      bal -= yearExp;
    }
    result.push({ year, balance: bal });
  }
  return result;
}

function detectDeficit(series: BalanceSeries) {
  const defPts = series.filter(p => p.balance < 0);
  if (!defPts.length) return { hasDeficit: false as const };
  return {
    hasDeficit: true as const,
    firstDeficitYear: defPts[0].year,
    minBalance: Math.min(...defPts.map(p => p.balance)),
    minYear: defPts.reduce((a, b) => a.balance < b.balance ? a : b).year,
  };
}

function getRemainingAllocation(allocs: Record<string, number>): number {
  return MAX_MONTHLY_POOL - Object.values(allocs).reduce((a, b) => a + b, 0);
}

// ─── 使いみち推移グラフ ────────────────────────────────────────────────────

const CHART_PL = 42, CHART_PR = 8, CHART_PT = 20, CHART_PB = 20, CHART_H = 200;

function UsageTrendChart({
  seriesMap, svgW, isPreview, seriesMapOrig,
}: {
  seriesMap: Partial<Record<GoalId, BalanceSeries>>;
  svgW: number;
  isPreview?: boolean;
  seriesMapOrig?: Partial<Record<GoalId, BalanceSeries>>;
}) {
  const gW = svgW - CHART_PL - CHART_PR;
  const gH = CHART_H - CHART_PT - CHART_PB;
  const years = CHART_TO - CHART_FROM;

  const allBalances = [
    ...Object.values(seriesMap).flatMap(s => s?.map(p => p.balance) ?? []),
    ...(seriesMapOrig ? Object.values(seriesMapOrig).flatMap(s => s?.map(p => p.balance) ?? []) : []),
  ];
  const maxVal = Math.max(...allBalances, 800_0000);
  const minVal = Math.min(...allBalances, 0);
  const range = maxVal - minVal || 1;

  const xi = (year: number) => CHART_PL + ((year - CHART_FROM) / years) * gW;
  const yv = (bal: number) => CHART_PT + gH * (1 - (bal - minVal) / range);
  const yZero = yv(0);

  // X軸ラベル
  const xLabels = [2025, 2030, 2035, 2040, 2045, 2050, 2055].filter(y => y >= CHART_FROM && y <= CHART_TO);

  // 縦軸ライン
  const maxMan = Math.round(maxVal / 10_000);
  const yStep = maxMan > 600 ? 200 : maxMan > 300 ? 100 : 50;
  const yTicks: number[] = [];
  if (minVal < 0) yTicks.push(0);
  for (let v = 0; v <= maxVal; v += yStep * 10_000) {
    if (v !== 0) yTicks.push(v);
  }

  // ドラフトのdeficit検出
  const deficits = (Object.entries(seriesMap) as Array<[GoalId, BalanceSeries]>)
    .map(([id, s]) => ({ id, ...detectDeficit(s) }))
    .filter(d => d.hasDeficit);
  const mainDeficit = deficits[0];

  // 元シリーズのdeficit（プレビュー中に解消されたものを検出するため）
  const origDeficits = (seriesMapOrig
    ? (Object.entries(seriesMapOrig) as Array<[GoalId, BalanceSeries]>)
        .map(([id, s]) => ({ id, ...detectDeficit(s) }))
        .filter(d => d.hasDeficit)
    : []);
  const resolvedDeficits = isPreview
    ? origDeficits.filter(od => !deficits.some(d => d.id === od.id))
    : [];

  function renderLine(goalId: GoalId, series: BalanceSeries, opts: { dotted?: boolean; dimmed?: boolean } = {}) {
    const color = GOAL_COLORS[goalId];
    const pts = series.map(p => ({
      x: xi(p.year), y: yv(p.balance), balance: p.balance,
    }));

    const elems: React.ReactElement[] = [];
    let segStart = 0;
    for (let i = 1; i <= pts.length; i++) {
      const endSeg = i === pts.length;
      const prevNeg = pts[segStart].balance < 0;
      const curNeg = i < pts.length ? pts[i].balance < 0 : prevNeg;
      if (endSeg || curNeg !== prevNeg) {
        const slice = pts.slice(segStart, i);
        if (slice.length >= 2) {
          const ptStr = slice.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
          elems.push(
            <Polyline key={`${goalId}-seg${segStart}-${opts.dotted ? 'd' : 's'}`} points={ptStr}
              fill="none" stroke={prevNeg ? RED : color}
              strokeWidth={opts.dotted ? 1.2 : 2.2}
              strokeDasharray={opts.dotted ? '3 3' : undefined}
              strokeLinecap="round" strokeLinejoin="round"
              opacity={opts.dimmed ? 0.35 : 1}
            />
          );
        }
        segStart = Math.max(0, i - 1);
      }
    }
    return elems;
  }

  return (
    <View style={tc.card}>
      <Svg width={svgW} height={CHART_H}>
        {/* グリッドライン */}
        {yTicks.map(v => (
          <G key={v}>
            <SvgLine x1={CHART_PL} y1={yv(v)} x2={svgW - CHART_PR} y2={yv(v)}
              stroke="#ecedef" strokeWidth={0.8} />
            <SvgText x={CHART_PL - 4} y={yv(v) + 3.5} textAnchor="end" fontSize={9.5}
              fill="#a8b0b4">{Math.round(v / 10_000)}万</SvgText>
          </G>
        ))}
        {/* 赤字ゾーン */}
        {minVal < 0 && (
          <Rect x={CHART_PL} y={yZero} width={gW} height={yv(minVal) - yZero}
            fill={RED_BG} />
        )}
        {/* 0ライン */}
        <SvgLine x1={CHART_PL} y1={yZero} x2={svgW - CHART_PR} y2={yZero}
          stroke="#8a9499" strokeWidth={1.5} />
        <SvgText x={CHART_PL - 4} y={yZero + 3.5} textAnchor="end" fontSize={9.5}
          fill="#8a9499" fontWeight="600">0</SvgText>
        {/* 元のライン（プレビュー中は薄い点線で残す） */}
        {isPreview && seriesMapOrig && (Object.entries(seriesMapOrig) as Array<[GoalId, BalanceSeries]>).map(([id, series]) =>
          renderLine(id, series, { dotted: true, dimmed: true })
        )}
        {/* 各ゴールのライン（ドラフトまたは通常） */}
        {(Object.entries(seriesMap) as Array<[GoalId, BalanceSeries]>).map(([id, series]) =>
          renderLine(id, series)
        )}
        {/* ⚠マーカー（現在も赤字のゴール） */}
        {deficits.map(d => {
          if (!d.hasDeficit || !d.minYear) return null;
          const cx = xi(d.minYear);
          const cy = yv(d.minBalance ?? 0);
          return (
            <G key={d.id}>
              <Circle cx={cx} cy={cy} r={5} fill={RED} />
              <SvgText x={cx} y={cy - 8} textAnchor="middle" fontSize={9} fill={RED}>⚠</SvgText>
            </G>
          );
        })}
        {/* ✓マーカー（プレビュー中に解消された赤字） */}
        {resolvedDeficits.map(d => {
          if (!d.minYear) return null;
          const draftSeries = seriesMap[d.id as GoalId];
          const draftPt = draftSeries?.find(p => p.year === d.minYear);
          const cx = xi(d.minYear);
          const cy = draftPt ? yv(Math.max(0, draftPt.balance)) : yZero;
          return (
            <G key={`ok-${d.id}`}>
              <Circle cx={cx} cy={cy} r={7} fill={SAGE} opacity={0.15} />
              <Circle cx={cx} cy={cy} r={5} fill={SAGE} stroke="white" strokeWidth={1.5} />
              <SvgText x={cx} y={cy - 10} textAnchor="middle" fontSize={9} fill={SAGE} fontWeight="700">✓</SvgText>
            </G>
          );
        })}
        {/* X軸ラベル */}
        {xLabels.map(y => (
          <SvgText key={y} x={xi(y)} y={CHART_H - 4} textAnchor="middle" fontSize={10}
            fill="#a8b0b4">{`'${String(y).slice(-2)}`}</SvgText>
        ))}
      </Svg>
      {/* フッター */}
      {mainDeficit?.hasDeficit && mainDeficit.firstDeficitYear ? (
        <View style={tc.footerRed}>
          <Text style={tc.footerRedTxt}>
            ⚠ {mainDeficit.firstDeficitYear}年に{GOAL_NAMES[mainDeficit.id]}が赤字になります
          </Text>
        </View>
      ) : isPreview && resolvedDeficits.length > 0 ? (
        <View style={tc.footerOk}>
          <Text style={tc.footerOkTxt}>
            ✓ {resolvedDeficits.map(d => GOAL_NAMES[d.id as GoalId]).join('・')}の赤字が解消されました
          </Text>
        </View>
      ) : (
        <View style={tc.footerOk}>
          <Text style={tc.footerOkTxt}>✓ すべて順調です</Text>
        </View>
      )}
    </View>
  );
}

const tc = StyleSheet.create({
  card: {
    backgroundColor: colors.card, borderRadius: radius.md,
    paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10,
    marginBottom: 14, ...shadows.card,
  },
  footerRed: {
    marginTop: 8, backgroundColor: '#f8e6e3',
    borderRadius: 8, paddingVertical: 6, paddingHorizontal: 8,
  },
  footerRedTxt: { fontSize: 11, color: RED, fontWeight: '600', textAlign: 'center' },
  footerOk: {
    marginTop: 8, backgroundColor: colors.sageBg,
    borderRadius: 8, paddingVertical: 6, paddingHorizontal: 8,
  },
  footerOkTxt: { fontSize: 11, color: SAGE, fontWeight: '600', textAlign: 'center' },
});

// ─── 年齢軸 ───────────────────────────────────────────────────────────────

function AgeAxis({
  fromYear, toYear, familySelf, familyPartner, familyChild,
  draftFrom, draftTo, partnerName,
}: {
  fromYear: number; toYear: number;
  familySelf: number; familyPartner: number; familyChild: number;
  draftFrom: number; draftTo: number;
  partnerName?: string;
}) {
  const yearCount = toYear - fromYear;
  const step = yearCount <= 12 ? 4 : 8;
  const ticks: number[] = [];
  for (let y = fromYear; y <= toYear; y += step) ticks.push(y);

  const rows = [
    { label: '年', ages: ticks.map(y => `'${String(y).slice(-2)}`) },
    { label: 'あなた', ages: ticks.map(y => String(y - (NOW_YEAR - familySelf))) },
    { label: partnerName ?? '妻', ages: ticks.map(y => String(y - (NOW_YEAR - familyPartner))) },
    { label: '子', ages: ticks.map(y => String(y - (NOW_YEAR - familyChild))) },
  ];

  return (
    <View style={ax.wrap}>
      {rows.map((row, ri) => (
        <View key={ri} style={ax.row}>
          <Text style={[ax.who, ri === 0 && ax.whoYear]}>{row.label}</Text>
          <View style={ax.ages}>
            {row.ages.map((age, ai) => {
              const year = ticks[ai];
              const inRange = year >= draftFrom && year <= draftTo;
              return (
                <Text key={ai} style={[ax.age, inRange && ax.ageHighlight]}>{age}</Text>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const ax = StyleSheet.create({
  wrap: { marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 2, gap: 6 },
  who: { width: 40, fontSize: 9.5, color: '#8a9499', fontWeight: '500', textAlign: 'right' },
  whoYear: { color: '#1a2226', fontWeight: '700' },
  ages: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  age: { flex: 1, fontSize: 9.5, color: '#1a2226', fontWeight: '500', textAlign: 'center' },
  ageHighlight: { color: SAGE, fontWeight: '700', backgroundColor: '#dde7d8', borderRadius: 3 },
});

// ─── 範囲スライダー ────────────────────────────────────────────────────────

function RangeSlider({
  minYear, maxYear, fromYear, toYear, onFromChange, onToChange,
}: {
  minYear: number; maxYear: number;
  fromYear: number; toYear: number;
  onFromChange: (y: number) => void;
  onToChange: (y: number) => void;
}) {
  const [width, setWidth] = useState(0);
  const activeThumb = useRef<'from' | 'to' | null>(null);

  const yearToX = (y: number) => ((y - minYear) / Math.max(maxYear - minYear, 1)) * width;
  const xToYear = (x: number) => {
    const ratio = Math.max(0, Math.min(1, x / Math.max(width, 1)));
    return Math.round(minYear + ratio * (maxYear - minYear));
  };

  const fromX = yearToX(fromYear);
  const toX = yearToX(toYear);

  return (
    <View
      style={sl.container}
      onLayout={e => setWidth(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onResponderGrant={e => {
        const x = e.nativeEvent.locationX;
        if (Math.abs(x - fromX) <= Math.abs(x - toX)) {
          activeThumb.current = 'from';
        } else {
          activeThumb.current = 'to';
        }
      }}
      onResponderMove={e => {
        const x = e.nativeEvent.locationX;
        const y = xToYear(x);
        if (activeThumb.current === 'from') {
          onFromChange(Math.max(minYear, Math.min(y, toYear - 1)));
        } else {
          onToChange(Math.max(fromYear + 1, Math.min(y, maxYear)));
        }
      }}
      onResponderRelease={() => { activeThumb.current = null; }}
    >
      <View style={sl.rail} />
      {width > 0 && (
        <View style={[sl.filled, { left: fromX, width: Math.max(0, toX - fromX) }]} />
      )}
      {width > 0 && (
        <View style={[sl.thumb, { left: fromX - 10 }]} />
      )}
      {width > 0 && (
        <View style={[sl.thumb, { left: toX - 10 }]} />
      )}
    </View>
  );
}

const sl = StyleSheet.create({
  container: { height: 32, position: 'relative', marginVertical: 8 },
  rail: { position: 'absolute', top: 14, left: 0, right: 0, height: 4, backgroundColor: '#ecedef', borderRadius: 2 },
  filled: { position: 'absolute', top: 14, height: 4, backgroundColor: SAGE, borderRadius: 2 },
  thumb: {
    position: 'absolute', top: 6, width: 20, height: 20,
    borderRadius: 10, backgroundColor: SAGE, borderWidth: 3, borderColor: 'white',
    shadowColor: SAGE, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6,
    elevation: 3,
  },
});

// ─── 積み上げ配分グラフ ────────────────────────────────────────────────────

const SC_PL = 22, SC_PR = 8, SC_PT = 20, SC_PB = 10, SC_H = 140;

function StackedAllocationChart({
  entries, svgW, draftFromYear, draftToYear, maxMonthly, draftAllocations, draftPeriod, chartToYear,
}: {
  entries: AllocationEntry[]; svgW: number;
  draftFromYear: number; draftToYear: number;
  maxMonthly: number;
  draftAllocations: Record<string, number>;
  draftPeriod: { from: number; to: number };
  chartToYear?: number;
}) {
  const fromYear = Math.min(...entries.map(e => e.fromYear), NOW_YEAR);
  const toYear = chartToYear ?? CHART_TO;
  const yearSpan = toYear - fromYear || 1;
  const gW = svgW - SC_PL - SC_PR;
  const gH = SC_H - SC_PT - SC_PB;

  const xi = (year: number) => SC_PL + ((year - fromYear) / yearSpan) * gW;
  const yv = (val: number) => SC_PT + gH * (1 - Math.min(val / maxMonthly, 1));

  // 期間区切り: エントリーの fromYear で段差
  const sortedEntries = [...entries].sort((a, b) => a.fromYear - b.fromYear);
  // 最後の期間を追加
  const periods: Array<{ from: number; to: number; allocs: Record<string, number> }> = [];
  for (let i = 0; i < sortedEntries.length; i++) {
    const from = sortedEntries[i].fromYear;
    const to = i + 1 < sortedEntries.length ? sortedEntries[i + 1].fromYear : toYear + 1;
    periods.push({ from, to, allocs: sortedEntries[i].monthlyAmounts });
  }

  const goalOrder: GoalId[] = ['edu', 'ret', 'car', 'trip'];

  function buildAreaPath(goalId: GoalId, prevStack: number[], curStack: number[]) {
    if (!periods.length) return null;
    const pathParts: string[] = [];
    // top edge (left to right)
    periods.forEach((p, i) => {
      const x1 = xi(Math.max(p.from, fromYear));
      const x2 = xi(Math.min(p.to, toYear + 1));
      const y1 = yv(curStack[i]);
      const y2 = yv(curStack[i]);
      if (i === 0) pathParts.push(`M ${x1} ${y1}`);
      else pathParts.push(`L ${x1} ${yv(curStack[i])}`);
      pathParts.push(`L ${x2} ${y2}`);
    });
    // bottom edge (right to left)
    const prevReversed = [...periods].reverse();
    prevReversed.forEach((p, i) => {
      const ri = periods.length - 1 - i;
      const x2 = xi(Math.min(p.to, toYear + 1));
      const x1 = xi(Math.max(p.from, fromYear));
      pathParts.push(`L ${x2} ${yv(prevStack[ri])}`);
      pathParts.push(`L ${x1} ${yv(prevStack[ri])}`);
    });
    pathParts.push('Z');
    return pathParts.join(' ');
  }

  // Compute cumulative stacks for each period
  const stacks: number[][] = periods.map(p => {
    let cum = 0;
    return goalOrder.map(gid => {
      cum += p.allocs[gid] ?? 0;
      return cum;
    });
  });
  const prevStacks: number[][] = periods.map(p => {
    let cum = 0;
    return goalOrder.map((gid, gi) => {
      if (gi === 0) return 0;
      cum += p.allocs[goalOrder[gi - 1]] ?? 0;
      return cum;
    });
  });

  // Selected range rect
  const selX1 = Math.max(xi(draftFromYear), SC_PL);
  const selX2 = Math.min(xi(draftToYear + 1), svgW - SC_PR);

  return (
    <Svg width={svgW} height={SC_H}>
      <SvgLine x1={SC_PL} y1={SC_PT} x2={svgW - SC_PR} y2={SC_PT}
        stroke="#1a2226" strokeWidth={1} strokeDasharray="3 2" />
      <SvgText x={svgW - SC_PR - 2} y={SC_PT - 4} textAnchor="end" fontSize={8}
        fill="#1a2226" fontWeight="700">上限 月{maxMonthly / 10_000}万</SvgText>
      <SvgLine x1={SC_PL} y1={SC_PT + gH / 2} x2={svgW - SC_PR} y2={SC_PT + gH / 2}
        stroke="#ecedef" strokeWidth={0.8} />
      <SvgText x={SC_PL - 2} y={SC_PT + gH / 2 + 3} textAnchor="end" fontSize={8}
        fill="#a8b0b4">{maxMonthly / 2 / 10_000}万</SvgText>

      {/* 積み上げ面積 */}
      {goalOrder.map((gid, gi) => {
        const curStack = stacks.map(s => s[gi]);
        const prevStack = prevStacks.map(s => s[gi]);
        const d = buildAreaPath(gid, prevStack, curStack);
        if (!d) return null;
        return <Path key={gid} d={d} fill={GOAL_COLORS[gid]} opacity={0.85} />;
      })}

      {/* 選択範囲ハイライト */}
      {selX1 < selX2 && (
        <>
          <Rect x={selX1} y={SC_PT} width={selX2 - selX1} height={gH}
            fill={GREEN_BG_ALPHA} />
          <SvgLine x1={selX1} y1={SC_PT} x2={selX1} y2={SC_PT + gH}
            stroke={SAGE} strokeWidth={1.5} strokeDasharray="2 2" />
          <SvgLine x1={selX2} y1={SC_PT} x2={selX2} y2={SC_PT + gH}
            stroke={SAGE} strokeWidth={1.5} strokeDasharray="2 2" />
        </>
      )}

      {/* 下端ライン */}
      <SvgLine x1={SC_PL} y1={SC_PT + gH} x2={svgW - SC_PR} y2={SC_PT + gH}
        stroke="#ecedef" strokeWidth={0.8} />
    </Svg>
  );
}

// ─── 期間セクション ────────────────────────────────────────────────────────

function PeriodPicker({
  entries, svgW, draftFromYear, draftToYear, onFromChange, onToChange,
  draftAllocations, familySelf, familyPartner, familyChild, chartToYear, onExpandChange, familyPartnerName,
}: {
  entries: AllocationEntry[]; svgW: number;
  draftFromYear: number; draftToYear: number;
  onFromChange: (y: number) => void; onToChange: (y: number) => void;
  draftAllocations: Record<string, number>;
  familySelf: number; familyPartner: number; familyChild: number;
  chartToYear?: number;
  onExpandChange?: (expanded: boolean) => void;
  familyPartnerName?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const animH = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    if (!expanded) {
      setExpanded(true);
      onExpandChange?.(true);
      Animated.spring(animH, { toValue: 1, useNativeDriver: false, speed: 16, bounciness: 0 }).start();
    } else {
      Animated.spring(animH, { toValue: 0, useNativeDriver: false, speed: 16, bounciness: 0 }).start(() => {
        setExpanded(false);
        onExpandChange?.(false);
      });
    }
  };

  const childLabel = () => {
    const childAge = draftFromYear - (NOW_YEAR - familyChild);
    const childAgeEnd = draftToYear - (NOW_YEAR - familyChild);
    if (childAge > 0) return `子供${childAge}〜${childAgeEnd}歳期`;
    return `${draftFromYear} 〜 ${draftToYear}`;
  };

  return (
    <View style={pp.container}>
      <Pressable style={[pp.header, expanded && pp.headerActive]} onPress={toggle}>
        <View>
          <Text style={pp.label}>適用期間{expanded ? `（${childLabel()}）` : ''}</Text>
          <View style={pp.vals}>
            <Text style={[pp.year, expanded && pp.yearGreen]}>{draftFromYear}</Text>
            <Text style={pp.tilde}>〜</Text>
            <Text style={[pp.year, expanded && pp.yearGreen]}>{draftToYear}</Text>
          </View>
        </View>
        <Text style={[pp.chevron, expanded && pp.chevronGreen]}>
          {expanded ? '▼ 閉じる' : '期間を選ぶ ›'}
        </Text>
      </Pressable>

      {expanded && (
        <View style={pp.body}>
          <Text style={pp.hint}>配分の歴史と家族の年齢を見ながら期間を選ぶ</Text>
          <StackedAllocationChart
            entries={entries}
            svgW={svgW - 28}
            draftFromYear={draftFromYear}
            draftToYear={draftToYear}
            maxMonthly={MAX_MONTHLY_POOL}
            draftAllocations={draftAllocations}
            draftPeriod={{ from: draftFromYear, to: draftToYear }}
            chartToYear={chartToYear}
          />
          <AgeAxis
            fromYear={NOW_YEAR} toYear={chartToYear ?? CHART_TO}
            familySelf={familySelf} familyPartner={familyPartner} familyChild={familyChild}
            draftFrom={draftFromYear} draftTo={draftToYear}
            partnerName={familyPartnerName}
          />
          <RangeSlider
            minYear={NOW_YEAR} maxYear={chartToYear ?? CHART_TO}
            fromYear={draftFromYear} toYear={draftToYear}
            onFromChange={onFromChange} onToChange={onToChange}
          />
        </View>
      )}
    </View>
  );
}

const pp = StyleSheet.create({
  container: {
    backgroundColor: 'white', borderRadius: 14, marginBottom: 12,
    overflow: 'hidden', ...shadows.card,
  },
  header: {
    paddingHorizontal: 14, paddingVertical: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerActive: { backgroundColor: '#dde7d8' },
  label: { fontSize: 11, color: '#8a9499', marginBottom: 2 },
  vals: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  year: { fontSize: 16, fontWeight: '700', color: '#1a2226' },
  yearGreen: { color: SAGE },
  tilde: { fontSize: 16, color: '#8a9499' },
  chevron: { fontSize: 13, fontWeight: '600', color: colors.chart2 },
  chevronGreen: { color: SAGE },
  body: {
    paddingHorizontal: 14, paddingBottom: 14,
    borderTopWidth: 1, borderTopColor: '#e8eaec',
  },
  hint: { fontSize: 11, color: '#8a9499', textAlign: 'center', marginVertical: 8 },
});

// ─── 使いみち別+/-ステッパー ───────────────────────────────────────────────

function GoalAllocationStepper({
  goalId, value, onMinus, onPlus, isDeficit, isResolved, canIncrease, isLive,
}: {
  goalId: GoalId; value: number;
  onMinus: () => void; onPlus: () => void;
  isDeficit: boolean; isResolved: boolean; canIncrease: boolean;
  isLive?: boolean;
}) {
  const [bumped, setBumped] = useState(false);
  const [pressing, setPressing] = useState<'+' | '-' | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const liveAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (pressing !== null) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.5, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => { loop.stop(); pulseAnim.setValue(1); };
    } else {
      pulseAnim.setValue(1);
    }
  }, [pressing]);

  useEffect(() => {
    if (isLive) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(liveAnim, { toValue: 0.3, duration: 500, useNativeDriver: true }),
          Animated.timing(liveAnim, { toValue: 1.0, duration: 500, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => { loop.stop(); liveAnim.setValue(1); };
    } else {
      liveAnim.setValue(1);
    }
  }, [isLive]);

  const handlePlus = () => {
    if (!canIncrease) return;
    setPressing('+');
    onPlus();
    setBumped(true);
    setTimeout(() => { setPressing(null); setBumped(false); }, 600);
  };
  const handleMinus = () => {
    setPressing('-');
    onMinus();
    setBumped(true);
    setTimeout(() => { setPressing(null); setBumped(false); }, 600);
  };

  return (
    <View style={gs.card}>
      <View style={gs.head}>
        <View style={[gs.dot, { backgroundColor: GOAL_COLORS[goalId] }]} />
        <Text style={gs.name}>{GOAL_NAMES[goalId]}</Text>
        {isLive && (
          <Animated.View style={[gs.badgeLive, { opacity: liveAnim }]}>
            <Text style={gs.badgeLiveTxt}>LIVE</Text>
          </Animated.View>
        )}
        {isDeficit && <View style={gs.badge}><Text style={gs.badgeTxt}>⚠ 赤字</Text></View>}
        {isResolved && <View style={gs.badgeOk}><Text style={gs.badgeOkTxt}>✓ 赤字解消</Text></View>}
      </View>
      <View style={gs.stepper}>
        <Animated.View style={{ opacity: pressing === '-' ? pulseAnim : 1 }}>
          <Pressable style={[gs.btn, pressing === '-' && gs.btnActive]} onPress={handleMinus}>
            <Text style={[gs.btnTxt, pressing === '-' && gs.btnTxtActive]}>−</Text>
          </Pressable>
        </Animated.View>
        <Text style={[gs.val, bumped && gs.valBumped]}>
          {value / 10_000}<Text style={gs.valUnit}>万円/月</Text>
        </Text>
        <Animated.View style={[{ opacity: pressing === '+' ? pulseAnim : 1 }, !canIncrease && gs.btnDisabled]}>
          <Pressable
            style={[gs.btn, pressing === '+' && gs.btnActive]}
            onPress={handlePlus}
            disabled={!canIncrease}
          >
            <Text style={[gs.btnTxt, pressing === '+' && gs.btnTxtActive]}>+</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const gs = StyleSheet.create({
  card: {
    backgroundColor: 'white', borderRadius: 14, padding: 14,
    marginBottom: 8, ...shadows.card,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  name: { fontSize: 14, fontWeight: '700', flex: 1, color: '#1a2226' },
  badge: { backgroundColor: '#f8e6e3', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  badgeTxt: { fontSize: 11, fontWeight: '600', color: RED },
  badgeOk: { backgroundColor: '#dde7d8', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  badgeOkTxt: { fontSize: 11, fontWeight: '600', color: SAGE },
  badgeLive: { backgroundColor: SAGE, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  badgeLiveTxt: { fontSize: 10, fontWeight: '700', color: 'white', letterSpacing: 0.5 },
  stepper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f5f0e6', borderRadius: 10, padding: 6,
  },
  btn: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: 'white',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#1a2226', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2,
    elevation: 1,
  },
  btnActive: { backgroundColor: SAGE },
  btnDisabled: { opacity: 0.4 },
  btnTxt: { fontSize: 18, fontWeight: '600', color: '#4a7ba6' },
  btnTxtActive: { color: 'white' },
  val: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#1a2226' },
  valBumped: { color: SAGE },
  valUnit: { fontSize: 11, color: '#8a9499', fontWeight: '500' },
});

// ─── 積立調整モーダル ──────────────────────────────────────────────────────

type PillMode = '生涯' | '5年' | '1年';

function AdjustmentModal({
  visible, onClose, onSave,
  entries, svgW,
  draftAllocations, onChangeDraft,
  draftFromYear, draftToYear,
  onDraftFromChange, onDraftToChange,
  seriesMapDraft, resolvedGoalIds, liveGoalIds,
  familySelf, familyPartner, familyChild, familyPartnerName,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  entries: AllocationEntry[];
  svgW: number;
  draftAllocations: Record<string, number>;
  onChangeDraft: (goalId: string, delta: number) => void;
  draftFromYear: number; draftToYear: number;
  onDraftFromChange: (y: number) => void;
  onDraftToChange: (y: number) => void;
  seriesMapDraft: Partial<Record<GoalId, BalanceSeries>>;
  resolvedGoalIds: GoalId[];
  liveGoalIds: Set<string>;
  familySelf: number; familyPartner: number; familyChild: number;
  familyPartnerName?: string;
}) {
  const { height: screenH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const slideY = useRef(new Animated.Value(screenH)).current;
  const modalH = useRef(new Animated.Value(screenH * 0.65)).current;
  const [pillMode, setPillMode] = useState<PillMode>('生涯');

  const pillRangeTo = pillMode === '生涯' ? CHART_TO : pillMode === '5年' ? NOW_YEAR + 5 : NOW_YEAR + 1;

  const handlePeriodExpandChange = (expanded: boolean) => {
    Animated.spring(modalH, {
      toValue: expanded ? screenH * 0.78 : screenH * 0.65,
      useNativeDriver: false, speed: 14, bounciness: 0,
    }).start();
  };

  useEffect(() => {
    if (visible) {
      Animated.spring(slideY, {
        toValue: 0, useNativeDriver: true, speed: 16, bounciness: 0,
      }).start();
    } else {
      Animated.spring(slideY, {
        toValue: screenH, useNativeDriver: true, speed: 20, bounciness: 0,
      }).start();
    }
  }, [visible]);

  const deficits = (Object.entries(seriesMapDraft) as Array<[GoalId, BalanceSeries]>)
    .filter(([, s]) => detectDeficit(s).hasDeficit)
    .map(([id]) => id as GoalId);

  const totalDraft = Object.values(draftAllocations).reduce((a, b) => a + b, 0);
  const remaining = MAX_MONTHLY_POOL - totalDraft;

  const STEP = 10_000;

  return (
    <>
      {visible && (
        <Pressable
          style={[StyleSheet.absoluteFillObject, { zIndex: 55 }]}
          onPress={onClose}
        />
      )}
      <Animated.View
        style={[
          mo.modal,
          { height: modalH, paddingBottom: insets.bottom + 16, transform: [{ translateY: slideY }] },
        ]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <View style={mo.grabber} />
        <View style={mo.header}>
          <Text style={mo.title}>積立を調整する</Text>
          <Pressable style={mo.closeBtn} onPress={onClose}>
            <Text style={mo.closeTxt}>✕</Text>
          </Pressable>
        </View>

        {/* ピルタブ */}
        <View style={mo.pills}>
          {(['生涯', '5年', '1年'] as const).map(p => (
            <Pressable key={p}
              style={[mo.pill, pillMode === p && mo.pillActive]}
              onPress={() => setPillMode(p)}
            >
              <Text style={[mo.pillTxt, pillMode === p && mo.pillTxtActive]}>{p}</Text>
            </Pressable>
          ))}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
        >
          {/* 期間セクション */}
          <PeriodPicker
            entries={entries}
            svgW={svgW - 32}
            draftFromYear={draftFromYear}
            draftToYear={draftToYear}
            onFromChange={onDraftFromChange}
            onToChange={onDraftToChange}
            draftAllocations={draftAllocations}
            familySelf={familySelf}
            familyPartner={familyPartner}
            familyChild={familyChild}
            chartToYear={pillRangeTo}
            onExpandChange={handlePeriodExpandChange}
            familyPartnerName={familyPartnerName}
          />

          {/* 合計表示 */}
          <View style={mo.totalRow}>
            <Text style={mo.totalLabel}>月合計</Text>
            <Text style={[mo.totalVal, totalDraft > MAX_MONTHLY_POOL && mo.totalOver]}>
              {totalDraft / 10_000}万円/月
            </Text>
            <Text style={mo.totalMax}>（上限 {MAX_MONTHLY_POOL / 10_000}万）</Text>
          </View>

          {/* 各使いみちの+/- */}
          {GOAL_IDS.map(goalId => {
            const val = draftAllocations[goalId] ?? 0;
            const canInc = remaining >= STEP;
            return (
              <GoalAllocationStepper
                key={goalId}
                goalId={goalId}
                value={val}
                onMinus={() => onChangeDraft(goalId, -STEP)}
                onPlus={() => onChangeDraft(goalId, STEP)}
                isDeficit={deficits.includes(goalId)}
                isResolved={resolvedGoalIds.includes(goalId)}
                canIncrease={canInc}
                isLive={liveGoalIds.has(goalId)}
              />
            );
          })}

          {/* 保存ボタン */}
          <Pressable style={mo.saveBtn} onPress={onSave}>
            <Text style={mo.saveTxt}>保存する</Text>
          </Pressable>
        </ScrollView>
      </Animated.View>
    </>
  );
}

const mo = StyleSheet.create({
  modal: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#f5f0e6',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    shadowColor: '#1f2a2e', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 24, elevation: 16,
    zIndex: 60,
  },
  grabber: {
    width: 40, height: 4, backgroundColor: '#d4d8db', borderRadius: 2,
    alignSelf: 'center', marginTop: 12, marginBottom: 14,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 10,
  },
  title: { fontSize: 17, fontWeight: '800', color: '#1a2226', letterSpacing: -0.3 },
  closeBtn: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: 'white',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#1f2a2e', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
  },
  closeTxt: { fontSize: 14, color: '#4a5a60' },
  pills: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 12 },
  pill: {
    backgroundColor: 'white', paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: '#e8eaec',
  },
  pillActive: { backgroundColor: '#4a7ba6', borderColor: '#4a7ba6' },
  pillTxt: { fontSize: 13, fontWeight: '500', color: '#4a5a60' },
  pillTxtActive: { color: 'white', fontWeight: '600' },
  totalRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 6, marginBottom: 4,
  },
  totalLabel: { fontSize: 12, color: '#8a9499', fontWeight: '500' },
  totalVal: { fontSize: 15, fontWeight: '700', color: '#1a2226' },
  totalOver: { color: RED },
  totalMax: { fontSize: 11, color: '#8a9499' },
  saveBtn: {
    backgroundColor: SAGE, borderRadius: radius.md,
    paddingVertical: 14, alignItems: 'center', marginTop: 8,
    ...shadows.card,
  },
  saveTxt: { fontSize: 15, fontWeight: '600', color: 'white' },
});

// ─── AIインサイトカード ────────────────────────────────────────────────────

function AiInsightCard({ text }: { text: string }) {
  if (!text) return null;
  return (
    <View style={ai.wrap}>
      <Text style={ai.icon}>✦</Text>
      <View style={{ flex: 1 }}>
        <Text style={ai.label}>AIインサイト</Text>
        <Text style={ai.txt}>{text}</Text>
      </View>
    </View>
  );
}

const ai = StyleSheet.create({
  wrap: {
    backgroundColor: colors.sageBg, borderRadius: radius.lg, padding: 16,
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    marginBottom: 14,
  },
  icon: { fontSize: 14, color: colors.sage, lineHeight: 22 },
  label: { fontSize: 13, color: colors.sage, fontWeight: '700', marginBottom: 4 },
  txt: { fontSize: 12.5, color: colors.text, lineHeight: 1.7 * 12.5 },
});

// ─── 配分バー ─────────────────────────────────────────────────────────────────

function AllocationBar({
  goals, pfTotal, extras,
}: {
  goals: Array<{ id: GoalId; color: string; balance: number }>;
  pfTotal: number;
  extras?: Array<{ name: string; color: string; balance: number }>;
}) {
  const denominator = Math.max(pfTotal, 1);

  return (
    <View style={ab.card}>
      <View style={ab.bar}>
        {goals.map(g => (
          <View key={g.id} style={{ flex: g.balance / denominator, backgroundColor: g.color, height: 10 }} />
        ))}
        {extras?.map((e, i) => (
          <View key={`ex-${i}`} style={{ flex: e.balance / denominator, backgroundColor: e.color, height: 10 }} />
        ))}
      </View>
      <View style={ab.legend}>
        {goals.map(g => (
          <View key={g.id} style={ab.lgItem}>
            <View style={[ab.lgDot, { backgroundColor: g.color }]} />
            <Text style={ab.lgTxt}>{GOAL_NAMES[g.id]} {Math.round(g.balance / denominator * 100)}%</Text>
          </View>
        ))}
        {extras?.map((e, i) => (
          <View key={`exl-${i}`} style={ab.lgItem}>
            <View style={[ab.lgDot, { backgroundColor: e.color }]} />
            <Text style={ab.lgTxt}>{e.name} {Math.round(e.balance / denominator * 100)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const ab = StyleSheet.create({
  card: {
    backgroundColor: colors.card, borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 14, ...shadows.card,
  },
  bar: {
    flexDirection: 'row', height: 10, borderRadius: 5,
    overflow: 'hidden', marginBottom: 10, backgroundColor: '#ecedef',
  },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  lgItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lgDot: { width: 8, height: 8, borderRadius: 4 },
  lgTxt: { fontSize: 11, color: colors.textMid, fontFamily: typography.display },
});

// ─── PJカード（整合性表示・月積立額なし） ─────────────────────────────────

type CardStatus = 'ok' | 'adj' | 'deficit';

function PjCard({
  color, name, amount, status, projectId, isDeficit, deficitAmt,
  progress,
  onLiveBalance, onCommit,
}: {
  color: string; name: string; amount: number;
  status?: 'ok' | 'warn'; projectId?: string;
  isDeficit: boolean; deficitAmt?: number;
  progress?: number;
  onLiveBalance?: (id: string, val: number | null) => void;
  onCommit?: (id: string, newVal: number) => void;
}) {
  function toMan(y: number) { return Math.floor(Math.abs(y) / 10_000); }
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState('');

  const startEdit = () => {
    setEditVal(String(toMan(amount)));
    setEditing(true);
  };
  const commit = () => {
    const n = parseInt(editVal.replace(/\D/g, ''), 10);
    if (!isNaN(n) && n >= 0 && projectId) {
      const newVal = n * 10_000;
      if (newVal !== amount) onCommit?.(projectId, newVal);
    }
    onLiveBalance?.(projectId!, null);
    setEditing(false);
  };

  const cardStatus: CardStatus = isDeficit ? 'deficit' : status === 'ok' ? 'ok' : 'adj';

  return (
    <View style={[crd.card, { borderLeftColor: color }, isDeficit && crd.cardDeficit]}>
      <Pressable style={{ flex: 1 }} onPress={() => !editing && projectId && router.push(`/project/${projectId}`)}>
        <Text style={crd.name}>{name}</Text>
        {cardStatus === 'ok' && <Text style={crd.statusOk}>✓ 順調</Text>}
        {cardStatus === 'adj' && <Text style={crd.statusAdj}>△ 調整の余地</Text>}
        {cardStatus === 'deficit' && (
          <Text style={crd.statusDeficit}>⚠ 赤字{deficitAmt ? ` −${Math.round(Math.abs(deficitAmt) / 10_000)}万` : ''}</Text>
        )}
        {progress !== undefined && (
          <View style={crd.progressTrack}>
            <View style={[crd.progressFill, { flex: Math.min(1, Math.max(0.001, progress)), backgroundColor: color }]} />
            {progress < 1 && <View style={{ flex: Math.max(0, 1 - progress) }} />}
          </View>
        )}
      </Pressable>
      <View style={crd.right}>
        {editing ? (
          <View style={crd.editInline}>
            <TextInput
              style={crd.editInput}
              value={editVal}
              onChangeText={v => {
                const cleaned = v.replace(/\D/g, '');
                setEditVal(cleaned);
                const n = parseInt(cleaned, 10);
                if (!isNaN(n) && projectId) onLiveBalance?.(projectId, n * 10_000);
              }}
              keyboardType="number-pad"
              autoFocus
              onBlur={commit}
              onSubmitEditing={commit}
              selectTextOnFocus
            />
            <Text style={crd.amtUnit}>万円</Text>
          </View>
        ) : (
          <Pressable style={crd.amtPressable} onPress={startEdit} hitSlop={8}>
            <Text style={[crd.amt, isDeficit && crd.amtRed]}>{toMan(amount)}</Text>
            <Text style={crd.amtUnit}>万円</Text>
            <Text style={crd.pencil}>✎</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const crd = StyleSheet.create({
  card: {
    backgroundColor: colors.card, borderRadius: radius.sm,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8,
    borderLeftWidth: 3, ...shadows.card,
  },
  cardDeficit: { backgroundColor: '#faf0ee' },
  name: { fontSize: 17, fontWeight: '600', color: colors.text, marginBottom: 4 },
  statusOk: { fontSize: 12, color: colors.sage },
  statusAdj: { fontSize: 12, color: colors.honey },
  statusDeficit: { fontSize: 12, color: RED, fontWeight: '600' },
  right: { alignItems: 'flex-end' },
  amtPressable: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  amt: { fontSize: 20, fontWeight: '700', color: colors.chart2 },
  amtRed: { color: RED },
  amtUnit: { fontSize: 12, color: colors.textMid, fontWeight: '500' },
  pencil: { fontSize: 13, color: colors.chart2 },
  editInline: { flexDirection: 'row', alignItems: 'baseline', gap: 2, borderBottomWidth: 1.5, borderBottomColor: colors.chart2, paddingBottom: 1 },
  editInput: { fontSize: 20, fontWeight: '700', color: colors.chart2, minWidth: 50, paddingVertical: 0 },
  progressTrack: {
    flexDirection: 'row', height: 4, borderRadius: 2,
    backgroundColor: '#ecedef', marginTop: 6, overflow: 'hidden',
  },
  progressFill: { height: 4, borderRadius: 2 },
});

// ─── メイン画面 ──────────────────────────────────────────────────────────────

function getMonthlyAmt(entries: AllocationEntry[], goalId: string): number {
  const sorted = [...entries].sort((a, b) => b.fromYear - a.fromYear);
  return sorted.find(e => e.fromYear <= NOW_YEAR)?.monthlyAmounts[goalId] ?? 0;
}

function generateAiInsight(goalDeficits: GoalId[]): string {
  if (goalDeficits.length > 0) {
    const names = goalDeficits.map(id => GOAL_NAMES[id]).join('と');
    return `${names}の積立が赤字になります。積立を調整して赤字を解消しましょう。`;
  }
  return '4つの使いみち向けに順調に積み上がっています。このペースを維持しましょう。';
}

export default function DreamsScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { balances, savingsAllocation, saveSavingsAllocation, familyMembers, poolItems, pfItems, updateBalance, aiInsights } = useStore();

  const svgW = screenWidth - 32;
  const [modalOpen, setModalOpen] = useState(false);
  const [draftAllocations, setDraftAllocations] = useState<Record<string, number>>({});
  const [draftFromYear, setDraftFromYear] = useState(NOW_YEAR);
  const [draftToYear, setDraftToYear] = useState(CHART_TO);
  const [liveGoalIds, setLiveGoalIds] = useState<Set<string>>(new Set());

  const selfBirthYear = familyMembers.find(m => m.id === 'self')?.birthYear ?? 1988;
  const partnerBirthYear = familyMembers.find(m => m.role === 'partner')?.birthYear ?? 1990;
  const childBirthYear = familyMembers.find(m => m.role === 'child')?.birthYear ?? 2025;
  const partnerName = familyMembers.find(m => m.role === 'partner')?.name ?? 'パートナー';

  const selfAge = NOW_YEAR - selfBirthYear;
  const partnerAge = NOW_YEAR - partnerBirthYear;
  const childAge = NOW_YEAR - childBirthYear;

  const poolTotal = useMemo(() =>
    poolItems.reduce((sum, i) => sum + (i.projectId ? (balances[i.projectId] ?? i.amount) : i.amount), 0),
    [poolItems, balances]
  );

  const [livePfBalances, setLivePfBalances] = useState<Record<string, number>>({});
  const handlePjLiveChange = (id: string, val: number | null) => {
    setLivePfBalances(prev => {
      if (val === null) { const next = { ...prev }; delete next[id]; return next; }
      return { ...prev, [id]: val };
    });
  };
  const handlePjBalanceSave = (id: string, newVal: number) => {
    const item = pfItems.find(i => i.projectId === id);
    if (!item) return;
    updateBalance(id, balances[id] ?? item.amount, newVal, '残高修正');
  };

  const pfTotalForHeader = useMemo(() =>
    pfItems.reduce((sum, i) => {
      const id = i.projectId;
      const live = id ? livePfBalances[id] : undefined;
      return sum + (live !== undefined ? live : (id ? (balances[id] ?? i.amount) : i.amount));
    }, 0),
    [pfItems, balances, livePfBalances]
  );

  const headerDiffMan = Math.round((pfTotalForHeader - poolTotal) / 10_000);
  const isHeaderAligned = headerDiffMan === 0;

  const diffColorAnim = useRef(new Animated.Value(isHeaderAligned ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(diffColorAnim, {
      toValue: isHeaderAligned ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isHeaderAligned]);
  const animDiffColor = diffColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.honey, colors.sage],
  });

  const avgInterestRate = useMemo(() => {
    const rates = savingsAllocation.interestRates ?? {};
    const totalBal = poolItems.reduce((s, i) => s + (balances[i.projectId!] ?? i.amount), 0);
    if (totalBal === 0) return 0.04;
    const weighted = poolItems.reduce((s, i) => {
      const id = i.projectId!;
      const bal = balances[id] ?? i.amount;
      const rate = rates[id] ?? DEFAULT_POOL_RATES[id] ?? 0.04;
      return s + rate * bal;
    }, 0);
    return weighted / totalBal;
  }, [poolItems, balances, savingsAllocation.interestRates]);

  // 現在の積立配分
  const currentAllocations = useMemo(() => {
    const result: Record<string, number> = {};
    for (const id of GOAL_IDS) {
      result[id] = getMonthlyAmt(savingsAllocation.entries, id);
    }
    return result;
  }, [savingsAllocation]);

  // 残高シリーズ（通常表示）
  const seriesMapOrig = useMemo(() => {
    const map: Partial<Record<GoalId, BalanceSeries>> = {};
    for (const goalId of GOAL_IDS) {
      const item = pfItems.find(i => i.projectId === goalId);
      const bal = balances[goalId] ?? item?.amount ?? 0;
      map[goalId] = calcGoalBalanceOverTime(goalId, bal, savingsAllocation.entries, CHART_FROM, CHART_TO, avgInterestRate);
    }
    return map;
  }, [pfItems, balances, savingsAllocation, avgInterestRate]);

  // ドラフト表示用シリーズ（モーダル操作中）
  const seriesMapDraft = useMemo(() => {
    if (!modalOpen) return seriesMapOrig;
    const map: Partial<Record<GoalId, BalanceSeries>> = {};
    const draftEntries: AllocationEntry[] = [
      ...savingsAllocation.entries.filter(e => e.fromYear < draftFromYear || e.fromYear > draftToYear),
      { fromYear: draftFromYear, monthlyAmounts: draftAllocations },
    ];
    for (const goalId of GOAL_IDS) {
      const item = pfItems.find(i => i.projectId === goalId);
      const bal = balances[goalId] ?? item?.amount ?? 0;
      map[goalId] = calcGoalBalanceOverTime(goalId, bal, draftEntries, CHART_FROM, CHART_TO, avgInterestRate);
    }
    return map;
  }, [pfItems, modalOpen, draftAllocations, draftFromYear, draftToYear, balances, savingsAllocation, seriesMapOrig, avgInterestRate]);

  // 赤字ゴール
  const deficitGoals = useMemo(() =>
    GOAL_IDS.filter(id => {
      const s = (modalOpen ? seriesMapDraft : seriesMapOrig)[id];
      return s ? detectDeficit(s).hasDeficit : false;
    }),
    [seriesMapOrig, seriesMapDraft, modalOpen]
  );

  // 解消された赤字ゴール（ドラフトで赤字が消えたもの）
  const resolvedGoalIds = useMemo(() =>
    modalOpen ? GOAL_IDS.filter(id => {
      const origDef = seriesMapOrig[id] ? detectDeficit(seriesMapOrig[id]!).hasDeficit : false;
      const draftDef = seriesMapDraft[id] ? detectDeficit(seriesMapDraft[id]!).hasDeficit : false;
      return origDef && !draftDef;
    }) : [] as GoalId[],
    [modalOpen, seriesMapOrig, seriesMapDraft]
  );

  // 各ゴールの最小残高（赤字表示用）
  const minBalances = useMemo(() => {
    const map: Record<GoalId, number | undefined> = { edu: undefined, ret: undefined, car: undefined, trip: undefined };
    for (const id of GOAL_IDS) {
      const s = (modalOpen ? seriesMapDraft : seriesMapOrig)[id];
      if (s) {
        const def = detectDeficit(s);
        if (def.hasDeficit) map[id] = def.minBalance;
      }
    }
    return map;
  }, [seriesMapOrig, seriesMapDraft, modalOpen]);

  const aiText = aiInsights['explore'] ?? generateAiInsight(deficitGoals);

  const openModal = () => {
    setDraftAllocations({ ...currentAllocations });
    setDraftFromYear(NOW_YEAR);
    setDraftToYear(CHART_TO);
    setLiveGoalIds(new Set());
    setModalOpen(true);
  };

  const handleChangeDraft = useCallback((goalId: string, delta: number) => {
    setDraftAllocations(prev => {
      const cur = prev[goalId] ?? 0;
      return { ...prev, [goalId]: Math.max(0, cur + delta) };
    });
    setLiveGoalIds(prev => new Set([...prev, goalId]));
  }, []);

  const handleSave = useCallback(() => {
    const existing = savingsAllocation.entries.find(e => e.fromYear === draftFromYear);
    let newEntries;
    if (existing) {
      newEntries = savingsAllocation.entries.map(e =>
        e.fromYear === draftFromYear
          ? { ...e, monthlyAmounts: { ...e.monthlyAmounts, ...draftAllocations } }
          : e
      );
    } else {
      const sorted = [...savingsAllocation.entries].sort((a, b) => b.fromYear - a.fromYear);
      const base = sorted.find(e => e.fromYear <= draftFromYear);
      newEntries = [
        ...savingsAllocation.entries,
        { fromYear: draftFromYear, monthlyAmounts: { ...(base?.monthlyAmounts ?? {}), ...draftAllocations } },
      ].sort((a, b) => a.fromYear - b.fromYear);
    }
    saveSavingsAllocation({ entries: newEntries });
    setModalOpen(false);
  }, [draftAllocations, draftFromYear, savingsAllocation, saveSavingsAllocation]);

  const displaySeries = modalOpen ? seriesMapDraft : seriesMapOrig;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* ヘッダー */}
      <View style={s.header}>
        <View style={s.headerMainRow}>
          <Text style={s.pageTitle}>使いみち</Text>
          <View style={s.amtInline}>
            <Text style={s.mainAmt}>{Math.floor(pfTotalForHeader / 10_000)}</Text>
            <Text style={s.mainUnit}>万円</Text>
          </View>
          {modalOpen && <Text style={s.previewBadge}>プレビュー中</Text>}
        </View>
        <Animated.Text style={[s.diffRow, { color: animDiffColor }]}>
          {isHeaderAligned
            ? '(プール金と一致 ✓)'
            : `(プール金より ${headerDiffMan > 0 ? '+' : '−'}${Math.abs(headerDiffMan)}万円)`}
        </Animated.Text>
      </View>

      {/* スクロール領域 */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 160 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 推移グラフ（モーダル中も鮮明に表示） */}
        <UsageTrendChart
          seriesMap={displaySeries}
          svgW={svgW}
          isPreview={modalOpen}
          seriesMapOrig={modalOpen ? seriesMapOrig : undefined}
        />

        {/* AIインサイト＋使いみちカード（モーダル中は薄く） */}
        <View style={{ opacity: modalOpen ? 0.35 : 1 }} pointerEvents={modalOpen ? 'none' : 'auto'}>
          <AllocationBar
            goals={GOAL_IDS.map(id => ({
              id,
              color: GOAL_COLORS[id],
              balance: balances[id] ?? pfItems.find(i => i.projectId === id)?.amount ?? 0,
            }))}
            pfTotal={pfTotalForHeader}
            extras={(() => {
              const surplus = pfItems.find(i => !i.projectId);
              return surplus ? [{ name: '余剰', color: surplus.color, balance: surplus.amount }] : [];
            })()}
          />
          <AiInsightCard text={aiText} />

          {GOAL_IDS.map(goalId => {
            const item = pfItems.find(i => i.projectId === goalId);
            if (!item) return null;
            const balance = balances[goalId] ?? item.amount;
            const isDeficit = deficitGoals.includes(goalId);
            return (
              <PjCard
                key={goalId}
                color={GOAL_COLORS[goalId]}
                name={item.name}
                amount={balance}
                status={item.status}
                projectId={goalId}
                isDeficit={isDeficit}
                deficitAmt={minBalances[goalId]}
                progress={Math.min(1, balance / GOAL_TARGETS[goalId])}
                onLiveBalance={handlePjLiveChange}
                onCommit={handlePjBalanceSave}
              />
            );
          })}
        </View>
      </ScrollView>

      {/* 積立調整ボタン */}
      <View style={[s.bottomBar, { bottom: insets.bottom + TAB_BAR_HEIGHT + TAB_BAR_MARGIN + BUTTON_BAR_BOTTOM_GAP }]}>
        <Pressable style={s.allocBtn} onPress={openModal}>
          <Text style={s.allocBtnTxt}>積立を調整する</Text>
        </Pressable>
      </View>

      {/* 積立調整モーダル */}
      <AdjustmentModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        entries={savingsAllocation.entries}
        svgW={svgW}
        draftAllocations={draftAllocations}
        onChangeDraft={handleChangeDraft}
        draftFromYear={draftFromYear}
        draftToYear={draftToYear}
        onDraftFromChange={setDraftFromYear}
        onDraftToChange={setDraftToYear}
        seriesMapDraft={seriesMapDraft}
        resolvedGoalIds={resolvedGoalIds}
        liveGoalIds={liveGoalIds}
        familySelf={selfAge}
        familyPartner={partnerAge}
        familyChild={childAge}
        familyPartnerName={partnerName}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.sm,
  },
  headerMainRow: { flexDirection: 'row', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' },
  amtInline: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  pageTitle: { fontSize: fontSizes.pageTitle, fontFamily: typography.bodyBold, color: colors.text, lineHeight: fontSizes.pageTitle * 1.1 },
  mainAmt: { fontSize: 26, fontWeight: '500', color: colors.text, letterSpacing: -0.5, fontFamily: typography.display },
  mainUnit: { fontSize: 14, color: colors.textMid, fontFamily: typography.display },
  diffRow: { fontSize: 13, fontWeight: '500', marginTop: 3, fontFamily: typography.display },
  diffWarn: { color: colors.honey },
  diffOk: { color: colors.sage },
  previewBadge: { fontSize: 12, color: SAGE, fontWeight: '700', marginLeft: 8 },
  content: { paddingHorizontal: spacing.lg, paddingTop: 4 },
  bottomBar: {
    position: 'absolute', left: 0, right: 0,
    paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: 10,
    backgroundColor: colors.bg,
    borderTopWidth: 1, borderTopColor: colors.divider,
    zIndex: 10,
  },
  allocBtn: {
    backgroundColor: colors.sage, borderRadius: radius.sm,
    paddingVertical: 14, alignItems: 'center',
  },
  allocBtnTxt: { fontSize: 15, fontWeight: '600', color: '#fff', fontFamily: typography.bodyMedium },
});
