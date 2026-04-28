import { useState, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  useWindowDimensions, Modal, TextInput, Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Line as SvgLine, Polyline, Circle,
  Text as SvgText, G, Rect, Path,
} from 'react-native-svg';
import { PROJECTS, type Project, type ProjectEvent } from '@/constants/projects';
import { useStore, type AllocationEntry, type Dream } from '@/store/useStore';
import { PF_ITEMS } from '@/constants/data';
import { BalanceSheet } from '@/components/balance-sheet';

const C = {
  brand: '#0C447C',
  green: '#1D9E75',
  red: '#E24B4A',
  orange: '#EF9F27',
  bg: '#f5f4ee',
  card: '#ffffff',
  aiCard: '#E6F1FB',
  textPrimary: '#2c2c2a',
  textSecondary: '#73726c',
  textTertiary: '#9c9a92',
  border: 'rgba(0,0,0,0.08)',
  borderMd: 'rgba(0,0,0,0.18)',
  warn: '#FAEEDA',
  starGold: '#D4A017',
};

function parseYear(s: string): number {
  const n = parseInt(s.replace("'", ''), 10);
  return n < 50 ? 2000 + n : 1900 + n;
}

function niceTickStep(maxVal: number, targetTicks: number): number {
  const rough = maxVal / targetTicks;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const candidates = [1, 2, 5, 10].map(m => m * mag);
  return candidates.find(c => c >= rough) ?? candidates[candidates.length - 1];
}

function fmtY(v: number): string {
  if (v === 0) return '0';
  if (v >= 10000) return `${v / 10000}億`;
  if (v >= 1000) return `${v / 1000}千万`;
  return `${v}万`;
}

function getProjectColor(projectId: string): string {
  return PF_ITEMS.find(i => i.projectId === projectId)?.color ?? C.brand;
}

function getMonthlyForProject(entries: AllocationEntry[], projectId: string, year: number): number {
  const sorted = [...entries].sort((a, b) => b.fromYear - a.fromYear);
  const entry = sorted.find(e => e.fromYear <= year);
  return entry?.monthlyAmounts[projectId] ?? 0;
}

const SVG_H = 140;
const PL = 42;
const PR = 10;
const PT = 10;
const PB = 20;

type Period = '生涯' | '5年' | '1年';

// ─── 折れ線グラフ（試算ライン + ★マーカー） ──────────────────────

function LineChart({ id, svgW, period, dreamYears, lifetimeYears }: {
  id: string;
  svgW: number;
  period: Period;
  dreamYears: number[];
  lifetimeYears: number;
}) {
  const project = PROJECTS[id];
  if (!project) return null;

  const limitMap: Record<Period, number> = { '生涯': lifetimeYears, '5年': 5, '1年': 1 };
  const firstYear = parseYear(project.years[0]);
  const limit = firstYear + limitMap[period];
  const cutIdx = project.years.findIndex(yr => parseYear(yr) > limit);
  const endN = cutIdx === -1 ? project.years.length : Math.max(2, cutIdx);

  const years = project.years.slice(0, endN);
  const plan = project.plan.slice(0, endN);
  const gW = svgW - PL - PR;
  const gH = SVG_H - PT - PB;
  const n = years.length;

  const rawMax = Math.max(...plan);
  const step = niceTickStep(rawMax, 4);
  const maxVal = Math.ceil(rawMax / step) * step;

  const xi = (i: number) => PL + (n === 1 ? gW / 2 : i * (gW / (n - 1)));
  const yv = (v: number) => PT + gH - (v / maxVal) * gH;

  const ticks: number[] = [];
  for (let v = 0; v <= maxVal; v += step) ticks.push(v);

  const xStep = period === '1年' ? 1 : Math.max(1, Math.ceil(n / 5));
  const planPts = plan.map((v, i) => `${xi(i)},${yv(v)}`).join(' ');

  return (
    <Svg width={svgW} height={SVG_H}>
      {ticks.map(v => (
        <G key={v}>
          <SvgLine x1={PL} y1={yv(v)} x2={svgW - PR} y2={yv(v)} stroke="rgba(128,128,128,0.2)" strokeWidth={0.5} />
          <SvgText x={PL - 4} y={yv(v) + 4} textAnchor="end" fontSize={10} fill="#888">{fmtY(v)}</SvgText>
        </G>
      ))}
      {years.map((yr, i) =>
        (i % xStep === 0 || i === n - 1) ? (
          <SvgText key={i} x={xi(i)} y={SVG_H - 4} textAnchor="middle" fontSize={10} fill="#888">{yr}</SvgText>
        ) : null
      )}

      {/* 試算ライン（緑） */}
      <Polyline points={planPts} fill="none" stroke={C.green} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

      {/* 支出イベント縦線 */}
      {project.events.filter(ev => ev.type === 'spend' && ev.idx < endN).map(ev => (
        <SvgLine key={`vl-${ev.idx}`} x1={xi(ev.idx)} y1={PT} x2={xi(ev.idx)} y2={PT + gH}
          stroke={C.red} strokeWidth={0.5} strokeDasharray="3 2" opacity={0.35} />
      ))}

      {/* 出来事マーカー */}
      {project.events.filter(ev => ev.idx < endN).map(ev => {
        const cx = xi(ev.idx);
        const cy = yv(plan[ev.idx]);
        const color = ev.type === 'spend' ? C.red : ev.type === 'in' ? C.orange : C.brand;
        return (
          <G key={`ev-${ev.idx}`}>
            <Circle cx={cx} cy={cy} r={5} fill={color} stroke="#fff" strokeWidth={1.5} />
          </G>
        );
      })}

      {/* 夢★マーカー（このPJに紐づく夢） */}
      {dreamYears.map((yr, di) => {
        const idx = years.findIndex(y => parseYear(y) === yr);
        if (idx < 0 || idx >= endN) return null;
        const cx = xi(idx);
        const cy = yv(plan[idx]) - 12;
        return (
          <G key={`dream-${di}`}>
            <Circle cx={cx} cy={cy + 12} r={10} fill={C.starGold} opacity={0.15} />
            <SvgText x={cx} y={cy + 5} textAnchor="middle" fontSize={12} fill={C.starGold}>★</SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

// ─── 積立調整モーダル ─────────────────────────────────────────────

type AllocationModalProps = {
  visible: boolean;
  projectId: string;
  onClose: () => void;
};

const NOW_YEAR = new Date().getFullYear();
const MONTH_STEP = 1000;
const MONTH_STEP_LONG = 10000;

function AllocationModal({ visible, projectId, onClose }: AllocationModalProps) {
  const { savingsAllocation, saveSavingsAllocation } = useStore();
  const [entries, setEntries] = useState<AllocationEntry[]>([]);
  const [selectedFromYear, setSelectedFromYear] = useState(NOW_YEAR);
  const [inputAmt, setInputAmt] = useState('');
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // モーダルが開いた時に初期化
  const onShow = () => {
    const saved = savingsAllocation.entries.length > 0
      ? savingsAllocation.entries
      : [{ fromYear: NOW_YEAR, monthlyAmounts: { [projectId]: 30000 } }];
    setEntries(saved);
    setSelectedFromYear(saved[0].fromYear);
    const current = getMonthlyForProject(saved, projectId, saved[0].fromYear);
    setInputAmt(String(current));
  };

  const currentAmt = parseInt(inputAmt, 10) || 0;

  const updateAmount = (delta: number) => {
    const next = Math.max(0, currentAmt + delta);
    setInputAmt(String(next));
    setEntries(prev => prev.map(e =>
      e.fromYear === selectedFromYear
        ? { ...e, monthlyAmounts: { ...e.monthlyAmounts, [projectId]: next } }
        : e
    ));
  };

  const startLongPress = (delta: number) => {
    longPressTimer.current = setInterval(() => updateAmount(delta), 150);
  };

  const stopLongPress = () => {
    if (longPressTimer.current) clearInterval(longPressTimer.current);
  };

  const handleAddChangePoint = () => {
    Alert.prompt('変更ポイントを追加', '開始年を入力してください（例：2030）', (text) => {
      const yr = parseInt(text ?? '', 10);
      if (!yr || yr < NOW_YEAR) return;
      const base = getMonthlyForProject(entries, projectId, yr);
      setEntries(prev =>
        [...prev, { fromYear: yr, monthlyAmounts: { ...prev[0].monthlyAmounts, [projectId]: base } }]
          .sort((a, b) => a.fromYear - b.fromYear)
      );
      setSelectedFromYear(yr);
      setInputAmt(String(base));
    }, 'plain-text', String(NOW_YEAR + 5));
  };

  const handleSave = () => {
    saveSavingsAllocation({ entries });
    onClose();
  };

  const sortedEntries = [...entries].sort((a, b) => a.fromYear - b.fromYear);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onShow={onShow}
    >
      <View style={al.safe}>
        <View style={al.header}>
          <Text style={al.title}>積立を調整する</Text>
          <Pressable style={al.closeBtn} onPress={onClose}>
            <Text style={al.closeTxt}>✕</Text>
          </Pressable>
        </View>

        <ScrollView style={al.scroll} contentContainerStyle={al.content}>
          <Text style={al.sectionLabel}>月の積立額</Text>
          <View style={al.stepper}>
            <Pressable
              style={al.stepBtn}
              onPress={() => updateAmount(-MONTH_STEP)}
              onLongPress={() => startLongPress(-MONTH_STEP_LONG)}
              onPressOut={stopLongPress}
              delayLongPress={400}
            >
              <Text style={al.stepBtnTxt}>−</Text>
            </Pressable>
            <TextInput
              style={al.stepInput}
              value={inputAmt}
              onChangeText={(v) => {
                const n = parseInt(v.replace(/[^0-9]/g, ''), 10);
                setInputAmt(isNaN(n) ? '0' : String(n));
                setEntries(prev => prev.map(e =>
                  e.fromYear === selectedFromYear
                    ? { ...e, monthlyAmounts: { ...e.monthlyAmounts, [projectId]: isNaN(n) ? 0 : n } }
                    : e
                ));
              }}
              keyboardType="number-pad"
              selectTextOnFocus
            />
            <Pressable
              style={al.stepBtn}
              onPress={() => updateAmount(MONTH_STEP)}
              onLongPress={() => startLongPress(MONTH_STEP_LONG)}
              onPressOut={stopLongPress}
              delayLongPress={400}
            >
              <Text style={al.stepBtnTxt}>＋</Text>
            </Pressable>
          </View>
          <Text style={al.stepUnit}>¥{currentAmt.toLocaleString('ja-JP')} / 月</Text>
          <Text style={al.stepHint}>タップで¥1,000刻み・長押しで¥10,000刻み</Text>

          <Text style={[al.sectionLabel, { marginTop: 20 }]}>変更ポイント</Text>
          {sortedEntries.map((entry) => {
            const amt = entry.monthlyAmounts[projectId] ?? 0;
            const isSel = entry.fromYear === selectedFromYear;
            return (
              <Pressable
                key={entry.fromYear}
                style={[al.entryRow, isSel && al.entryRowSel]}
                onPress={() => {
                  setSelectedFromYear(entry.fromYear);
                  setInputAmt(String(amt));
                }}
              >
                <View style={[al.entryBar, { backgroundColor: isSel ? C.brand : C.textSecondary }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[al.entryYear, isSel && { color: C.brand }]}>
                    ▶ {entry.fromYear}年〜
                  </Text>
                  <Text style={al.entryAmt}>¥{amt.toLocaleString('ja-JP')}/月</Text>
                </View>
              </Pressable>
            );
          })}

          <Pressable style={al.addPointBtn} onPress={handleAddChangePoint}>
            <Text style={al.addPointTxt}>＋ 変更ポイントを追加</Text>
          </Pressable>
        </ScrollView>

        <View style={al.footer}>
          <Pressable style={al.applyBtn} onPress={handleSave}>
            <Text style={al.applyBtnTxt}>適用する</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const al = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 0.5, borderBottomColor: C.border,
    backgroundColor: C.card,
  },
  title: { fontSize: 18, fontWeight: '700', color: C.textPrimary },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center',
  },
  closeTxt: { fontSize: 13, color: C.textSecondary },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 20 },
  sectionLabel: { fontSize: 12, color: C.textSecondary, fontWeight: '500', marginBottom: 10 },
  stepper: {
    flexDirection: 'row', alignItems: 'center', gap: 0,
    backgroundColor: C.card, borderRadius: 12,
    borderWidth: 0.5, borderColor: C.borderMd,
    overflow: 'hidden',
  },
  stepBtn: {
    width: 56, height: 56,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#f0f0f8',
  },
  stepBtnTxt: { fontSize: 24, color: C.brand, fontWeight: '300' },
  stepInput: {
    flex: 1, textAlign: 'center',
    fontSize: 22, fontWeight: '700', color: C.textPrimary,
    paddingVertical: 10,
  },
  stepUnit: { fontSize: 16, fontWeight: '500', color: C.brand, textAlign: 'center', marginTop: 8 },
  stepHint: { fontSize: 11, color: C.textSecondary, textAlign: 'center', marginTop: 4 },

  entryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, paddingHorizontal: 8,
    borderRadius: 8, marginBottom: 4,
  },
  entryRowSel: { backgroundColor: '#EBF2FB' },
  entryBar: { width: 3, height: 32, borderRadius: 2 },
  entryYear: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  entryAmt: { fontSize: 12, color: C.textSecondary, marginTop: 2 },

  addPointBtn: {
    marginTop: 8, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: C.brand, borderStyle: 'dashed',
    alignItems: 'center',
  },
  addPointTxt: { fontSize: 13, fontWeight: '600', color: C.brand },

  footer: {
    paddingHorizontal: 20, paddingVertical: 16,
    borderTopWidth: 0.5, borderTopColor: C.border,
    backgroundColor: C.bg,
  },
  applyBtn: {
    backgroundColor: C.brand, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center',
  },
  applyBtnTxt: { fontSize: 15, fontWeight: '600', color: '#fff' },
});

// ─── 出来事リスト ─────────────────────────────────────────────────

function EventRow({ ev, onPress }: { ev: ProjectEvent; onPress: (ev: ProjectEvent) => void }) {
  const typeColor = ev.type === 'spend' ? C.red : ev.type === 'in' ? C.orange : C.brand;
  return (
    <Pressable style={ev2.row} onPress={() => onPress(ev)}>
      <View style={[ev2.dot, { backgroundColor: typeColor }]} />
      <View style={ev2.body}>
        <Text style={ev2.year}>{ev.year}</Text>
        <Text style={ev2.name}>{ev.name}</Text>
        <Text style={ev2.detail} numberOfLines={1}>{ev.detail}</Text>
      </View>
      <Text style={[ev2.amt, ev.pos ? ev2.pos : ev2.neg]}>{ev.amt}</Text>
    </Pressable>
  );
}

const ev2 = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.card, borderRadius: 10,
    borderWidth: 0.5, borderColor: C.border,
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 6,
  },
  dot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  body: { flex: 1 },
  year: { fontSize: 11, color: C.textSecondary },
  name: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  detail: { fontSize: 11, color: C.textSecondary, marginTop: 1 },
  amt: { fontSize: 13, fontWeight: '600' },
  pos: { color: '#27500A' },
  neg: { color: '#791F1F' },
});

// ─── 夢行 ────────────────────────────────────────────────────────

function DreamRow({ dream, color }: { dream: Dream; color: string }) {
  return (
    <View style={dr.row}>
      <View style={[dr.badge, { backgroundColor: color + '22', borderColor: color + '66' }]}>
        <Text style={[dr.star, { color }]}>★</Text>
      </View>
      <View style={dr.body}>
        <Text style={dr.year}>{dream.year}年</Text>
        <Text style={dr.title}>{dream.title}</Text>
      </View>
    </View>
  );
}

const dr = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.card, borderRadius: 10,
    borderWidth: 0.5, borderColor: C.border,
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 6,
  },
  badge: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1, justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  star: { fontSize: 16, lineHeight: 20 },
  body: { flex: 1 },
  year: { fontSize: 11, color: C.textSecondary },
  title: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
});

// ─── PJ詳細 メイン ────────────────────────────────────────────────

export default function ProjectDetailScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const project = PROJECTS[id ?? ''];
  const isAccount = project?.kind === 'account';
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const { balances, dreams, savingsAllocation, aiInsights, familyMembers } = useStore();
  const currentAmount = balances[id ?? ''] ?? project?.now ?? 0;

  const [period, setPeriod] = useState<Period>('生涯');
  const [sheetVisible, setSheetVisible] = useState(false);
  const [allocationModalVisible, setAllocationModalVisible] = useState(false);

  const svgW = screenWidth - 52;

  const selfBirthYear = familyMembers.find(m => m.id === 'self')?.birthYear ?? 1990;
  const lifeYears = (selfBirthYear + 100) - NOW_YEAR;

  const projectDreamYears = useMemo(
    () => dreams.filter(d => d.projectId === id).map(d => d.year),
    [dreams, id],
  );

  type TimelineItem =
    | { kind: 'event'; ev: ProjectEvent; sortYear: number }
    | { kind: 'dream'; d: Dream; sortYear: number };

  const timeline = useMemo<TimelineItem[]>(() => {
    if (!project) return [];
    const evItems: TimelineItem[] = project.events.map(ev => ({
      kind: 'event', ev, sortYear: parseYear(ev.year),
    }));
    const dreamItems: TimelineItem[] = dreams
      .filter(d => d.projectId === id)
      .map(d => ({ kind: 'dream', d, sortYear: d.year }));
    return [...evItems, ...dreamItems].sort((a, b) => a.sortYear - b.sortYear);
  }, [project, dreams, id]);

  const currentMonthly = useMemo(
    () => getMonthlyForProject(savingsAllocation.entries, id ?? '', NOW_YEAR),
    [savingsAllocation, id],
  );

  const aiText = aiInsights[id ?? ''] ?? project?.ai ?? '';
  const projectColor = getProjectColor(id ?? '');

  const handleEventPress = useCallback((ev: ProjectEvent) => {
    if (ev.type === 'start') {
      setAllocationModalVisible(true);
    }
  }, []);

  if (!project) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg }}>
        <Text style={{ color: C.textSecondary }}>プロジェクトが見つかりません</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* ヘッダー */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={s.backTxt}>‹ {from === 'pool' ? 'プール金' : '使いみち'}</Text>
        </Pressable>
        <View style={s.hdrRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.projName}>{project.name}</Text>
            <Text style={s.timing}>{project.timing}</Text>
          </View>
          <Pressable onPress={() => setSheetVisible(true)} style={{ alignItems: 'flex-end' }}>
            <Text style={s.amtLabel}>{isAccount ? '現在の残高' : '現在の積み立て'}</Text>
            <Text style={s.amt}>¥{currentAmount.toLocaleString('ja-JP')}</Text>
            <Text style={s.amtSub}>{project.goalLabel} · {project.statusTxt}</Text>
          </Pressable>
        </View>
      </View>

      {/* AIインサイト + グラフ（上半分・スクロール可能） */}
      <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingBottom: 6 }}>

        {/* AIインサイト */}
        {aiText ? (
          <View style={s.aiCard}>
            <Text style={s.aiIcon}>✦</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.aiLabel}>AI インサイト</Text>
              <Text style={s.aiTxt}>{aiText}</Text>
            </View>
          </View>
        ) : null}

        {/* グラフ */}
        <View style={s.graphCard}>
          <View style={s.legendPeriodRow}>
            <View style={s.legendRow}>
              <View style={s.legendItem}>
                <View style={[s.legendSolid, { backgroundColor: C.green }]} />
                <Text style={s.legendTxt}>試算</Text>
              </View>
              <View style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: C.starGold }]} />
                <Text style={s.legendTxt}>夢★</Text>
              </View>
              <View style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: C.red }]} />
                <Text style={s.legendTxt}>支出</Text>
              </View>
            </View>
            <View style={s.periodRow}>
              {(['生涯', '5年', '1年'] as const).map(p => (
                <Pressable
                  key={p}
                  style={[s.periodBtn, period === p && s.periodBtnActive]}
                  onPress={() => setPeriod(p)}
                >
                  <Text style={[s.periodTxt, period === p && s.periodTxtActive]}>{p}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <LineChart id={id ?? ''} svgW={svgW} period={period} dreamYears={projectDreamYears} lifetimeYears={lifeYears} />
        </View>

      </ScrollView>

      {/* 年表パネル（固定・内部スクロール） */}
      <View style={s.timelinePanel}>
        <View style={s.secRow}>
          <Text style={s.secTitle}>{isAccount ? '入出金の年表' : '出来事の年表'}</Text>
          {!isAccount && (
            <Text style={s.secSub}>月 ¥{currentMonthly.toLocaleString('ja-JP')} 積立中</Text>
          )}
        </View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: !isAccount ? (insets.bottom + 70) : 8 }}
          showsVerticalScrollIndicator={false}
        >
          {timeline.map((item) =>
            item.kind === 'event'
              ? <EventRow key={`ev-${item.ev.idx}`} ev={item.ev} onPress={handleEventPress} />
              : <DreamRow key={`dream-${item.d.id}`} dream={item.d} color={projectColor} />
          )}
        </ScrollView>
      </View>

      {/* 積立調整ボタン（下部固定） */}
      {!isAccount && (
        <View style={[s.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
          <Pressable style={s.allocBtn} onPress={() => setAllocationModalVisible(true)}>
            <Text style={s.allocBtnTxt}>⚙ 積立を調整する</Text>
          </Pressable>
        </View>
      )}

      <BalanceSheet
        visible={sheetVisible}
        projectId={id ?? ''}
        currentAmount={currentAmount}
        label={project.name}
        onClose={() => setSheetVisible(false)}
      />

      <AllocationModal
        visible={allocationModalVisible}
        projectId={id ?? ''}
        onClose={() => setAllocationModalVisible(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  header: { backgroundColor: C.brand, paddingHorizontal: 20, paddingBottom: 12 },
  backTxt: { fontSize: 18, color: '#fff', fontWeight: '500', marginBottom: 8 },
  hdrRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 },
  projName: { fontSize: 16, fontWeight: '500', color: '#fff', lineHeight: 22 },
  timing: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 1 },
  amtLabel: { fontSize: 11, color: 'rgba(255,255,255,0.55)' },
  amt: { fontSize: 20, fontWeight: '500', color: '#fff', lineHeight: 26 },
  amtSub: { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 1 },

  aiCard: {
    margin: 10, marginBottom: 6,
    backgroundColor: C.aiCard, borderRadius: 12, padding: 9,
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
  },
  aiIcon: { fontSize: 14, color: '#185FA5', lineHeight: 22 },
  aiLabel: { fontSize: 11, color: '#185FA5', fontWeight: '500', marginBottom: 1 },
  aiTxt: { fontSize: 13, color: C.brand, lineHeight: 19 },

  graphCard: {
    marginHorizontal: 14, marginBottom: 6,
    backgroundColor: C.card, borderWidth: 0.5, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8,
  },
  legendPeriodRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  legendRow: { flexDirection: 'row', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendSolid: { width: 14, height: 2, borderRadius: 1 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendTxt: { fontSize: 12, color: C.textSecondary },
  periodRow: { flexDirection: 'row', gap: 5 },
  periodBtn: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12, backgroundColor: C.bg,
    borderWidth: 0.5, borderColor: C.borderMd,
  },
  periodBtnActive: { backgroundColor: C.brand, borderColor: C.brand },
  periodTxt: { fontSize: 12, color: C.textSecondary, fontWeight: '500' },
  periodTxtActive: { color: '#fff' },

  timelinePanel: {
    flex: 1,
    backgroundColor: C.bg,
    borderTopWidth: 0.5, borderTopColor: C.border,
  },
  secRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 6,
  },
  secTitle: { fontSize: 13, fontWeight: '500', color: C.textSecondary },
  secSub: { fontSize: 12, color: C.brand, fontWeight: '500' },

  bottomBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 10,
    backgroundColor: C.bg,
    borderTopWidth: 0.5, borderTopColor: C.border,
  },
  allocBtn: {
    backgroundColor: C.brand, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  allocBtnTxt: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
