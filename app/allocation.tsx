import { useState, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  TextInput, useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Path, Line as SvgLine, Text as SvgText, Rect, G,
} from 'react-native-svg';
import { type FinancialItem } from '@/constants/data';
import { useStore, type AllocationEntry } from '@/store/useStore';
import { brand, neutral, semantic, tints } from '@/constants/colors';

const C = {
  brand: brand.sage.base,
  green: brand.sage.base,
  bg: neutral.bg,
  card: neutral.card,
  textPrimary: neutral.text.primary,
  textSecondary: neutral.text.mid,
  border: 'rgba(0,0,0,0.08)',
  borderMd: 'rgba(0,0,0,0.18)',
};

const START_YEAR = 2025;
const END_YEAR = 2065;
const YEARS = Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, i) => START_YEAR + i);
const NOW_YEAR = new Date().getFullYear();

const SVG_H = 200;
const PL = 44;
const PR = 8;
const PT = 12;
const PB = 28;

function getProjectColor(pfItems: FinancialItem[], projectId: string): string {
  return pfItems.find(i => i.projectId === projectId)?.color ?? C.brand;
}

function getAmountsForYear(
  year: number,
  entries: AllocationEntry[],
): Record<string, number> {
  const sorted = [...entries].sort((a, b) => b.fromYear - a.fromYear);
  return sorted.find(e => e.fromYear <= year)?.monthlyAmounts ?? {};
}

function niceMax(v: number): number {
  if (v <= 0) return 100000;
  const step = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil(v / step) * step;
}

function fmtMan(v: number): string {
  if (v === 0) return '0';
  if (v >= 100000000) return `${v / 100000000}億`;
  if (v >= 10000) return `${v / 10000}万`;
  return `${v}`;
}

// ─── Stacked Area Chart ───────────────────────────────────────────

function StackedAreaChart({
  entries,
  selectedYearIdx,
  svgW,
  onYearSelect,
  pfItems,
  projectOrder,
}: {
  entries: AllocationEntry[];
  selectedYearIdx: number;
  svgW: number;
  onYearSelect: (idx: number) => void;
  pfItems: FinancialItem[];
  projectOrder: string[];
}) {
  const gW = svgW - PL - PR;
  const gH = SVG_H - PT - PB;
  const n = YEARS.length;

  const yearStacks = useMemo(() => {
    return YEARS.map(yr => {
      const amounts = getAmountsForYear(yr, entries);
      let cum = 0;
      const stacks: Record<string, { bottom: number; top: number }> = {};
      for (const id of projectOrder) {
        const amt = amounts[id] ?? 0;
        stacks[id] = { bottom: cum, top: cum + amt };
        cum += amt;
      }
      return { year: yr, stacks, total: cum };
    });
  }, [entries, projectOrder]);

  const maxTotal = useMemo(() => {
    const raw = Math.max(...yearStacks.map(d => d.total));
    return niceMax(raw);
  }, [yearStacks]);

  const xi = (i: number) => PL + (i / (n - 1)) * gW;
  const yv = (v: number) => PT + gH - (v / maxTotal) * gH;

  const nowIdx = Math.min(Math.max(NOW_YEAR - START_YEAR, 0), n - 1);

  const tickStep = maxTotal / 4;
  const ticks = [0, tickStep, tickStep * 2, tickStep * 3, maxTotal];

  const xLabelStep = Math.ceil(n / 8);
  const changeYears = entries.map(e => e.fromYear - START_YEAR).filter(i => i >= 0 && i < n);

  const buildPath = (id: string) => {
    const tops = yearStacks.map((d, i) => {
      const s = d.stacks[id] ?? { top: 0, bottom: 0 };
      return `${xi(i).toFixed(1)},${yv(s.top).toFixed(1)}`;
    });
    const bots = [...yearStacks].reverse().map((d, i) => {
      const s = d.stacks[id] ?? { top: 0, bottom: 0 };
      return `${xi(n - 1 - i).toFixed(1)},${yv(s.bottom).toFixed(1)}`;
    });
    return `M ${tops.join(' L ')} L ${bots.join(' L ')} Z`;
  };

  const handlePress = useCallback((e: { nativeEvent: { locationX: number } }) => {
    const x = e.nativeEvent.locationX;
    const ratio = Math.max(0, Math.min(1, (x - PL) / gW));
    const idx = Math.round(ratio * (n - 1));
    onYearSelect(idx);
  }, [gW, n, onYearSelect]);

  const selX = xi(selectedYearIdx);
  const nowX = xi(nowIdx);

  return (
    <Svg
      width={svgW}
      height={SVG_H}
      onPress={handlePress}
    >
      {/* Y軸グリッド＆ラベル */}
      {ticks.map((v, ti) => (
        <G key={`tick-${ti}`}>
          <SvgLine
            x1={PL} y1={yv(v)} x2={svgW - PR} y2={yv(v)}
            stroke="rgba(0,0,0,0.08)" strokeWidth={0.5}
          />
          <SvgText x={PL - 4} y={yv(v) + 4} textAnchor="end" fontSize={9} fill="#999">
            {fmtMan(v)}
          </SvgText>
        </G>
      ))}

      {/* 積み上げ面 */}
      {[...projectOrder].reverse().map(id => (
        <Path
          key={id}
          d={buildPath(id)}
          fill={getProjectColor(pfItems, id)}
          opacity={0.72}
        />
      ))}

      {/* 変更ポイントの縦線 */}
      {changeYears.filter(i => i > 0).map(i => (
        <SvgLine
          key={`cp-${i}`}
          x1={xi(i)} y1={PT} x2={xi(i)} y2={PT + gH}
          stroke={C.brand} strokeWidth={1} strokeDasharray="3 2" opacity={0.4}
        />
      ))}

      {/* 今ライン */}
      {nowIdx > 0 && nowIdx < n - 1 && (
        <G>
          <SvgLine
            x1={nowX} y1={PT} x2={nowX} y2={PT + gH}
            stroke={C.green} strokeWidth={1.5} strokeDasharray="4 2"
          />
          <Rect
            x={nowX - 10} y={PT - 10} width={20} height={13}
            rx={3} fill={C.green}
          />
          <SvgText x={nowX} y={PT - 1} textAnchor="middle" fontSize={9} fill="#fff" fontWeight="600">
            今
          </SvgText>
        </G>
      )}

      {/* 選択年の縦線 */}
      <SvgLine
        x1={selX} y1={PT} x2={selX} y2={PT + gH}
        stroke={C.brand} strokeWidth={2}
      />
      <Rect
        x={Math.min(Math.max(selX - 14, PL), svgW - PR - 28)}
        y={PT + gH + 2}
        width={28} height={14}
        rx={3} fill={C.brand}
      />
      <SvgText
        x={Math.min(Math.max(selX, PL + 14), svgW - PR - 14)}
        y={PT + gH + 12}
        textAnchor="middle" fontSize={9} fill="#fff" fontWeight="600"
      >
        {START_YEAR + selectedYearIdx}
      </SvgText>

      {/* X軸ラベル */}
      {YEARS.map((yr, i) => {
        if (i % xLabelStep !== 0 && i !== n - 1) return null;
        const labelX = xi(i);
        if (Math.abs(labelX - selX) < 16) return null;
        return (
          <SvgText key={`xl-${i}`} x={labelX} y={SVG_H - 4} textAnchor="middle" fontSize={9} fill="#999">
            {`'${String(yr).slice(2)}`}
          </SvgText>
        );
      })}
    </Svg>
  );
}

// ─── 凡例 ──────────────────────────────────────────────────────────

function Legend({ pfItems, projects, projectOrder }: {
  pfItems: FinancialItem[];
  projects: Record<string, { name: string }>;
  projectOrder: string[];
}) {
  return (
    <View style={s.legendRow}>
      {projectOrder.map(id => (
        <View key={id} style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: getProjectColor(pfItems, id) }]} />
          <Text style={s.legendTxt}>{projects[id]?.name ?? id}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── 配分エディタ ─────────────────────────────────────────────────

function AllocationEditor({
  selectedYear,
  editAmounts,
  hasEntry,
  onChange,
  onAdd,
  onDelete,
  pfItems,
  projects,
  projectOrder,
}: {
  selectedYear: number;
  editAmounts: Record<string, number>;
  hasEntry: boolean;
  onChange: (id: string, val: number) => void;
  onAdd: () => void;
  onDelete: () => void;
  pfItems: FinancialItem[];
  projects: Record<string, { name: string }>;
  projectOrder: string[];
}) {
  const total = projectOrder.reduce((s, id) => s + (editAmounts[id] ?? 0), 0);

  return (
    <View style={s.editorCard}>
      <View style={s.editorHeader}>
        <Text style={s.editorTitle}>
          {selectedYear}年から の配分
        </Text>
        {hasEntry && selectedYear !== START_YEAR && (
          <Pressable onPress={onDelete} style={s.deleteBtn}>
            <Text style={s.deleteTxt}>削除</Text>
          </Pressable>
        )}
      </View>

      {projectOrder.map(id => {
        const color = getProjectColor(pfItems, id);
        const amt = editAmounts[id] ?? 0;
        return (
          <View key={id} style={s.editorRow}>
            <View style={[s.editorDot, { backgroundColor: color }]} />
            <Text style={s.editorName}>{projects[id]?.name ?? id}</Text>
            <View style={s.editorInputWrap}>
              <Text style={s.editorYen}>¥</Text>
              <TextInput
                style={s.editorInput}
                value={amt > 0 ? String(amt) : ''}
                onChangeText={v => onChange(id, parseInt(v.replace(/[^0-9]/g, ''), 10) || 0)}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={C.textSecondary}
                selectTextOnFocus
              />
              <Text style={s.editorSuffix}>円/月</Text>
            </View>
          </View>
        );
      })}

      <View style={s.editorTotal}>
        <Text style={s.editorTotalLabel}>合計</Text>
        <Text style={s.editorTotalAmt}>¥{total.toLocaleString('ja-JP')}円/月</Text>
      </View>

      {!hasEntry && (
        <Pressable style={s.addBtn} onPress={onAdd}>
          <Text style={s.addTxt}>この年から変更を追加</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── 変更ポイント一覧 ─────────────────────────────────────────────

function EntryList({
  entries,
  selectedYear,
  onSelect,
  projectOrder,
}: {
  entries: AllocationEntry[];
  selectedYear: number;
  onSelect: (year: number) => void;
  projectOrder: string[];
}) {
  const sorted = [...entries].sort((a, b) => a.fromYear - b.fromYear);
  return (
    <View style={s.entryList}>
      <Text style={s.entryListTitle}>変更ポイント</Text>
      {sorted.map((entry, i) => {
        const total = projectOrder.reduce((s, id) => s + (entry.monthlyAmounts[id] ?? 0), 0);
        const isSel = entry.fromYear === selectedYear;
        return (
          <Pressable
            key={entry.fromYear}
            style={[s.entryRow, isSel && s.entryRowSel]}
            onPress={() => onSelect(entry.fromYear - START_YEAR)}
          >
            <View style={[s.entryBar, { backgroundColor: isSel ? C.brand : C.textSecondary }]} />
            <View style={{ flex: 1 }}>
              <Text style={[s.entryYear, isSel && { color: C.brand }]}>
                {entry.fromYear}年〜
                {i === 0 ? '　初期設定' : ''}
              </Text>
              <Text style={s.entrySub}>¥{total.toLocaleString('ja-JP')}円/月</Text>
            </View>
            <Text style={s.entryArrow}>›</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── メイン ───────────────────────────────────────────────────────

export default function AllocationScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { savingsAllocation, saveSavingsAllocation, pfItems, projects, dreamOrder } = useStore();
  const projectOrder = dreamOrder;

  const defaultMonthly = Object.fromEntries(projectOrder.map(id => [id, 30000]));
  const [entries, setEntries] = useState<AllocationEntry[]>(
    savingsAllocation.entries.length > 0
      ? savingsAllocation.entries
      : [{ fromYear: START_YEAR, monthlyAmounts: defaultMonthly }],
  );
  const [selectedYearIdx, setSelectedYearIdx] = useState(0);

  const svgW = screenWidth - 14 * 2;
  const selectedYear = START_YEAR + selectedYearIdx;

  const hasEntry = entries.some(e => e.fromYear === selectedYear);

  const editAmounts: Record<string, number> = useMemo(
    () => getAmountsForYear(selectedYear, entries),
    [selectedYear, entries],
  );

  const handleYearSelect = useCallback((idx: number) => {
    setSelectedYearIdx(idx);
  }, []);

  const handleChange = useCallback((id: string, val: number) => {
    setEntries(prev => {
      const existing = prev.find(e => e.fromYear === selectedYear);
      if (existing) {
        return prev.map(e =>
          e.fromYear === selectedYear
            ? { ...e, monthlyAmounts: { ...e.monthlyAmounts, [id]: val } }
            : e
        );
      }
      const base = getAmountsForYear(selectedYear, prev);
      return [...prev, { fromYear: selectedYear, monthlyAmounts: { ...base, [id]: val } }]
        .sort((a, b) => a.fromYear - b.fromYear);
    });
  }, [selectedYear]);

  const handleAdd = useCallback(() => {
    const base = getAmountsForYear(selectedYear, entries);
    setEntries(prev =>
      [...prev, { fromYear: selectedYear, monthlyAmounts: { ...base } }]
        .sort((a, b) => a.fromYear - b.fromYear)
    );
  }, [selectedYear, entries]);

  const handleDelete = useCallback(() => {
    if (selectedYear === START_YEAR) return;
    setEntries(prev => prev.filter(e => e.fromYear !== selectedYear));
  }, [selectedYear]);

  const handleSave = () => {
    saveSavingsAllocation({ entries });
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={s.backTxt}>‹ 戻る</Text>
        </Pressable>
        <Text style={s.headerTitle}>積立 配分設定</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* グラフ */}
        <View style={s.chartCard}>
          <Text style={s.chartHint}>グラフをタップして年を選択</Text>
          <StackedAreaChart
            entries={entries}
            selectedYearIdx={selectedYearIdx}
            svgW={svgW}
            onYearSelect={handleYearSelect}
            pfItems={pfItems}
            projectOrder={projectOrder}
          />
          <Legend pfItems={pfItems} projects={projects} projectOrder={projectOrder} />
        </View>

        {/* 配分エディタ */}
        <AllocationEditor
          selectedYear={selectedYear}
          editAmounts={editAmounts}
          hasEntry={hasEntry}
          onChange={handleChange}
          onAdd={handleAdd}
          onDelete={handleDelete}
          pfItems={pfItems}
          projects={projects}
          projectOrder={projectOrder}
        />

        {/* 変更ポイント一覧 */}
        <EntryList
          entries={entries}
          selectedYear={selectedYear}
          onSelect={handleYearSelect}
          projectOrder={projectOrder}
        />
      </ScrollView>

      <View style={[s.saveWrap, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable style={s.saveBtn} onPress={handleSave}>
          <Text style={s.saveTxt}>保存して適用する</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    backgroundColor: C.brand,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  backTxt: { fontSize: 18, color: '#fff', fontWeight: '500', marginBottom: 6 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#fff' },

  chartCard: {
    backgroundColor: C.card,
    margin: 14,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: C.border,
    paddingTop: 12,
    paddingBottom: 10,
    overflow: 'hidden',
  },
  chartHint: {
    fontSize: 11,
    color: C.textSecondary,
    textAlign: 'center',
    marginBottom: 6,
  },

  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendTxt: { fontSize: 11, color: C.textSecondary },

  editorCard: {
    backgroundColor: C.card,
    marginHorizontal: 14,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: C.border,
    padding: 14,
  },
  editorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  editorTitle: { fontSize: 14, fontWeight: '600', color: C.brand },
  deleteBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: brand.honey.bg,
  },
  deleteTxt: { fontSize: 12, color: semantic.negative, fontWeight: '500' },

  editorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  editorDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  editorName: { fontSize: 13, color: C.textPrimary, width: 60 },
  editorInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    borderRadius: 8,
    paddingHorizontal: 8,
    backgroundColor: C.bg,
  },
  editorYen: { fontSize: 14, color: C.textSecondary, marginRight: 2 },
  editorInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: C.textPrimary,
    paddingVertical: 8,
  },
  editorSuffix: { fontSize: 11, color: C.textSecondary },

  editorTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    marginTop: 4,
  },
  editorTotalLabel: { fontSize: 12, color: C.textSecondary },
  editorTotalAmt: { fontSize: 16, fontWeight: '700', color: C.textPrimary },

  addBtn: {
    marginTop: 12,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.brand,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  addTxt: { fontSize: 13, fontWeight: '600', color: C.brand },

  entryList: {
    marginHorizontal: 14,
    marginBottom: 10,
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: C.border,
    padding: 14,
  },
  entryListTitle: {
    fontSize: 12,
    color: C.textSecondary,
    fontWeight: '500',
    marginBottom: 10,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    paddingHorizontal: 6,
    gap: 10,
  },
  entryRowSel: { backgroundColor: tints.poolActive },
  entryBar: { width: 3, height: 32, borderRadius: 2 },
  entryYear: { fontSize: 13, fontWeight: '500', color: C.textPrimary },
  entrySub: { fontSize: 11, color: C.textSecondary, marginTop: 2 },
  entryArrow: { fontSize: 18, color: C.textSecondary },

  saveWrap: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: C.bg,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
  },
  saveBtn: {
    backgroundColor: C.brand,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  saveTxt: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
