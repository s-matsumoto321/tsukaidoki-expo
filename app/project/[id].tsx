import { useState, useRef, useMemo, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  useWindowDimensions, Modal,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line as SvgLine, Polyline, Circle, Text as SvgText, G } from 'react-native-svg';
import { type Project } from '@/constants/projects';
import { useStore } from '@/store/useStore';
import { BalanceSheet } from '@/components/balance-sheet';

// ── カラー定数
const PLAN_C    = '#185FA5';
const ACTUAL_C  = '#1D9E75';
const EXPENSE_C = '#E24B4A';
const ORANGE_C  = '#EF9F27';
const BG        = '#f5f4ee';
const CARD      = '#ffffff';
const TXT_PRI   = '#2c2c2a';
const TXT_SEC   = '#73726c';
const TXT_TER   = '#9c9a92';
const BORDER    = 'rgba(0,0,0,0.08)';
const BORDER_MD = 'rgba(0,0,0,0.18)';
const WARN_TXT  = '#9c5800';

// ── 型
type Period   = '生涯' | '5年' | '1年';
type TabType  = 'saving' | 'expense';
type CardType = 'plan-saving' | 'actual-saving' | 'plan-expense' | 'actual-expense';

type MonthEntry = { month: string; plan: number; actual: number };
const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

// ── ヘルパー
function parseYear(s: string): number {
  const n = parseInt(s.replace("'", ''), 10);
  if (n >= 1000) return n;
  return n < 50 ? 2000 + n : 1900 + n;
}
function fmtYAxis(v: number): string {
  if (v === 0) return '0';
  if (v >= 10000) return `${v / 10000}億`;
  if (v >= 1000) return `${Math.round(v / 1000)}千万`;
  return `${v}`;
}
function niceTickStep(maxVal: number, targetTicks: number): number {
  const rough = maxVal / targetTicks;
  const mag   = Math.pow(10, Math.floor(Math.log10(rough)));
  const cands = [1, 2, 5, 10].map(m => m * mag);
  return cands.find(c => c >= rough) ?? cands[cands.length - 1];
}
function yearToIdx(years: string[], year: number): number {
  let closest = 0, minDiff = Infinity;
  years.forEach((y, i) => {
    const d = Math.abs(parseYear(y) - year);
    if (d < minDiff) { minDiff = d; closest = i; }
  });
  return closest;
}
function makeMonthData(planPerMonth: number): MonthEntry[] {
  return MONTHS.map(m => ({ month: m, plan: planPerMonth, actual: planPerMonth }));
}

const NOW_YEAR = new Date().getFullYear();
const SVG_H = 150;
const PL = 38, PR = 10, PT = 12, PB = 22;

// ══════════════════════════════════════════════
// グラフ
// ══════════════════════════════════════════════
function PlanActualChart({
  project, chartPlan, svgW, period, lifetimeYears,
  highlightYearIdx, pulseOpacity, selectedCardType,
}: {
  project: Project | undefined;
  chartPlan: number[];
  svgW: number;
  period: Period;
  lifetimeYears: number;
  highlightYearIdx: number | null;
  pulseOpacity: number;
  selectedCardType: CardType | null;
}) {
  if (!project) return null;
  const limitMap: Record<Period, number> = { '生涯': lifetimeYears, '5年': 5, '1年': 1 };
  const firstYear = parseYear(project.years[0]);
  const limit  = firstYear + limitMap[period];
  const cutIdx = project.years.findIndex(yr => parseYear(yr) > limit);
  const endN   = cutIdx === -1 ? project.years.length : Math.max(2, cutIdx);
  const years  = project.years.slice(0, endN);
  const plan   = chartPlan.slice(0, endN);
  const actual = project.actual.slice(0, endN);
  const gW = svgW - PL - PR, gH = SVG_H - PT - PB, n = years.length;

  const allVals = [...plan, ...actual.filter((v): v is number => v !== null)];
  const rawMax  = Math.max(...allVals, 1);
  const step    = niceTickStep(rawMax, 4);
  const maxVal  = Math.ceil(rawMax / step) * step;
  const xi = (i: number) => PL + (n === 1 ? gW / 2 : i * (gW / (n - 1)));
  const yv = (v: number) => PT + gH - (v / maxVal) * gH;
  const ticks: number[] = [];
  for (let v = 0; v <= maxVal; v += step) ticks.push(v);
  const xStep = Math.max(1, Math.ceil(n / 5));
  const planPts = plan.map((v, i) => `${xi(i)},${yv(v)}`).join(' ');
  const actIdxs: number[] = [];
  actual.forEach((v, i) => { if (v !== null) actIdxs.push(i); });
  const actPts = actIdxs.map(i => `${xi(i)},${yv(actual[i]!)}`).join(' ');
  const expEvs  = project.events.filter(ev => ev.type === 'spend' && ev.idx < endN);
  const mileEvs = project.events.filter(ev => ev.type !== 'spend' && ev.idx < endN);

  const isActCard = selectedCardType === 'actual-saving' || selectedCardType === 'actual-expense';
  const hlColor   = isActCard ? ACTUAL_C : PLAN_C;
  let hlPos: { x: number; y: number } | null = null;
  if (highlightYearIdx !== null && highlightYearIdx < endN) {
    if (isActCard && actual[highlightYearIdx] !== null) {
      hlPos = { x: xi(highlightYearIdx), y: yv(actual[highlightYearIdx]!) };
    } else {
      hlPos = { x: xi(highlightYearIdx), y: yv(plan[highlightYearIdx]) };
    }
  }

  return (
    <Svg width={svgW} height={SVG_H}>
      {ticks.map(v => (
        <G key={v}>
          <SvgLine x1={PL} y1={yv(v)} x2={svgW - PR} y2={yv(v)} stroke="rgba(0,0,0,0.06)" strokeWidth={0.5} />
          <SvgText x={PL - 3} y={yv(v) + 3} textAnchor="end" fontSize={8} fill={TXT_TER}>{fmtYAxis(v)}</SvgText>
        </G>
      ))}
      {years.map((yr, i) =>
        (i % xStep === 0 || i === n - 1) ? (
          <SvgText key={i} x={xi(i)} y={SVG_H - 5} textAnchor="middle" fontSize={8} fill={TXT_TER}>{yr}</SvgText>
        ) : null
      )}
      {expEvs.map(ev => (
        <SvgLine key={`vl${ev.idx}`} x1={xi(ev.idx)} y1={PT} x2={xi(ev.idx)} y2={PT + gH}
          stroke={EXPENSE_C} strokeWidth={0.5} strokeDasharray="3 2" opacity={0.3} />
      ))}
      <Polyline points={planPts} fill="none" stroke={PLAN_C} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.7} />
      {actIdxs.length > 1 && (
        <Polyline points={actPts} fill="none" stroke={ACTUAL_C} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      )}
      {mileEvs.map(ev => {
        const c = ev.type === 'start' ? ACTUAL_C : ev.type === 'in' ? ORANGE_C : PLAN_C;
        return <Circle key={`ms${ev.idx}`} cx={xi(ev.idx)} cy={yv(plan[ev.idx])} r={4} fill={c} stroke="#fff" strokeWidth={1.5} />;
      })}
      {expEvs.map(ev => (
        <Circle key={`ep${ev.idx}`} cx={xi(ev.idx)} cy={yv(plan[ev.idx])} r={5} fill={EXPENSE_C} />
      ))}
      {actIdxs.map(i => (
        <Circle key={`ad${i}`} cx={xi(i)} cy={yv(actual[i]!)} r={2.5} fill={ACTUAL_C} />
      ))}
      {hlPos && (
        <G>
          <Circle cx={hlPos.x} cy={hlPos.y} r={12} fill={hlColor} opacity={pulseOpacity} />
          <Circle cx={hlPos.x} cy={hlPos.y} r={7}  fill={hlColor} opacity={Math.min(0.45, pulseOpacity * 2)} />
        </G>
      )}
    </Svg>
  );
}

// ══════════════════════════════════════════════
// 積立計画ポップアップ
// ══════════════════════════════════════════════
function PlanSavingPopup({
  visible, yearLabel, initAmt,
  onClose, onAmountChange, onSave,
}: {
  visible: boolean; yearLabel: string; initAmt: number;
  onClose: () => void;
  onAmountChange: (amt: number) => void;
  onSave: (amt: number) => void;
}) {
  const { height: H } = useWindowDimensions();
  const [amt, setAmt] = useState(initAmt);
  useEffect(() => { if (visible) setAmt(initAmt); }, [visible, initAmt]);
  const minus = () => { const n = Math.max(0, amt - 1); setAmt(n); onAmountChange(n); };
  const plus  = () => { const n = amt + 1; setAmt(n); onAmountChange(n); };
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <Pressable style={pop.backdrop} onPress={onClose} />
        <View style={[pop.sheet, { height: H * 0.6 }]}>
          <View style={pop.handle} />
          <Text style={pop.title}>いくら積み立てる？</Text>
          <Text style={pop.sub}>計画 ・ {yearLabel}</Text>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 4 }}>
            <Text style={pop.fieldLabel}>月の積立額</Text>
            <View style={pop.sliderRow}>
              <Pressable style={pop.sliderBtn} onPress={minus}><Text style={pop.sliderBtnTxt}>−</Text></Pressable>
              <Text style={pop.sliderVal}>{amt}<Text style={pop.sliderUnit}> 万円/月</Text></Text>
              <Pressable style={pop.sliderBtn} onPress={plus}><Text style={pop.sliderBtnTxt}>+</Text></Pressable>
            </View>
          </ScrollView>
          <View style={pop.actions}>
            <Pressable style={pop.btnSec} onPress={onClose}><Text style={pop.btnSecTxt}>閉じる</Text></Pressable>
            <Pressable style={pop.btnPri} onPress={() => { onSave(amt); onClose(); }}>
              <Text style={pop.btnPriTxt}>保存する</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ══════════════════════════════════════════════
// 支出計画ポップアップ
// ══════════════════════════════════════════════
function PlanExpensePopup({
  visible, eventName, initAmt,
  onClose, onAmountChange, onSave,
}: {
  visible: boolean; eventName: string; initAmt: number;
  onClose: () => void;
  onAmountChange: (amt: number) => void;
  onSave: (amt: number) => void;
}) {
  const { height: H } = useWindowDimensions();
  const [amt, setAmt] = useState(initAmt);
  const [unit, setUnit] = useState<'year' | 'month'>('year');
  useEffect(() => { if (visible) setAmt(initAmt); }, [visible, initAmt]);
  const minus = () => { const n = Math.max(1, amt - 1); setAmt(n); onAmountChange(n); };
  const plus  = () => { const n = amt + 1; setAmt(n); onAmountChange(n); };
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <Pressable style={pop.backdrop} onPress={onClose} />
        <View style={[pop.sheet, { height: H * 0.6 }]}>
          <View style={pop.handle} />
          <Text style={pop.title}>いつ、いくら使う予定？</Text>
          <Text style={pop.sub}>計画 ・ {eventName}</Text>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 4 }}>
            <Text style={pop.fieldLabel}>単位</Text>
            <View style={pop.unitTabs}>
              {(['year', 'month'] as const).map(u => (
                <Pressable key={u} style={[pop.unitTab, unit === u && pop.unitTabActive]} onPress={() => setUnit(u)}>
                  <Text style={[pop.unitTabTxt, unit === u && pop.unitTabTxtActive]}>{u === 'year' ? '年単位' : '月単位'}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={pop.fieldLabel}>金額</Text>
            <View style={pop.sliderRow}>
              <Pressable style={pop.sliderBtn} onPress={minus}><Text style={pop.sliderBtnTxt}>−</Text></Pressable>
              <Text style={pop.sliderVal}>{amt}<Text style={pop.sliderUnit}> {unit === 'year' ? '万円/年' : '万円/月'}</Text></Text>
              <Pressable style={pop.sliderBtn} onPress={plus}><Text style={pop.sliderBtnTxt}>+</Text></Pressable>
            </View>
          </ScrollView>
          <View style={pop.actions}>
            <Pressable style={pop.btnSec} onPress={onClose}><Text style={pop.btnSecTxt}>閉じる</Text></Pressable>
            <Pressable style={pop.btnPri} onPress={() => { onSave(amt); onClose(); }}>
              <Text style={pop.btnPriTxt}>保存する</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ══════════════════════════════════════════════
// 実績入力ポップアップ（積立・支出 共通UI）
// ══════════════════════════════════════════════
function ActualRecordPopup({
  visible, title, sub, isExpense,
  monthData, onDataChange, onClose, onSave,
}: {
  visible: boolean; title: string; sub: string; isExpense: boolean;
  monthData: MonthEntry[];
  onDataChange: (idx: number, delta: number) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const { height: H } = useWindowDimensions();
  const maxVal = Math.max(5, ...monthData.map(m => Math.max(m.plan, m.actual))) + 1;
  const BAR_H = 80;

  function getActualColor(plan: number, actual: number): string {
    if (isExpense) {
      if (actual > plan) return ORANGE_C;
      if (actual < plan) return PLAN_C;
      return ACTUAL_C;
    } else {
      if (actual < plan) return ORANGE_C;
      if (actual > plan) return PLAN_C;
      return ACTUAL_C;
    }
  }
  function getStatusLabel(plan: number, actual: number): string {
    if (isExpense) {
      if (actual > plan) return `⚠ ${actual - plan}万円超過`;
      if (actual < plan && actual > 0) return `✓ ${plan - actual}万円少なめ`;
      return '';
    } else {
      if (actual < plan) return `⚠ ${plan - actual}万円不足`;
      if (actual > plan) return `✓ ${actual - plan}万円多め`;
      return '';
    }
  }
  function isWarnRow(plan: number, actual: number): boolean {
    return isExpense ? actual > plan : actual < plan;
  }

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <Pressable style={pop.backdrop} onPress={onClose} />
        <View style={[pop.sheet, { height: H * 0.8 }]}>
          <View style={pop.handle} />
          <Text style={pop.title}>{title}</Text>
          <Text style={pop.sub}>{sub}</Text>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 4 }}>
            <Text style={pop.fieldLabel}>月別の予定 vs 実績</Text>
            {/* 棒グラフ */}
            <View style={bar.wrap}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={bar.chart}>
                  {monthData.map((m, i) => {
                    const planH = Math.max(2, (m.plan / maxVal) * BAR_H);
                    const actH  = Math.max(0, (m.actual / maxVal) * BAR_H);
                    const actC  = getActualColor(m.plan, m.actual);
                    return (
                      <View key={i} style={bar.col}>
                        <View style={bar.pair}>
                          <View style={[bar.barBase, { height: planH, opacity: 0.4, backgroundColor: PLAN_C }]} />
                          <View style={[bar.barBase, { height: actH, backgroundColor: actC }]} />
                        </View>
                        <Text style={bar.label}>{m.month.replace('月', '')}</Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            <Text style={[pop.fieldLabel, { marginTop: 12 }]}>{isExpense ? '月別の支出金額' : '月別の積立金額'}</Text>
            <View style={bar.listWrap}>
              {monthData.map((m, i) => {
                const status = getStatusLabel(m.plan, m.actual);
                const warn   = isWarnRow(m.plan, m.actual);
                return (
                  <View key={i} style={[bar.row, warn && bar.rowWarn]}>
                    <Text style={bar.month}>{m.month}</Text>
                    <Text style={bar.planLbl}>予定 {m.plan}万円</Text>
                    {status ? <Text style={bar.statusLbl}>{status}</Text> : null}
                    <View style={bar.ctrl}>
                      <Pressable style={bar.ctrlBtn} onPress={() => onDataChange(i, -1)}>
                        <Text style={bar.ctrlBtnTxt}>−</Text>
                      </Pressable>
                      <Text style={bar.ctrlVal}>{m.actual}<Text style={bar.ctrlUnit}>万円</Text></Text>
                      <Pressable style={bar.ctrlBtn} onPress={() => onDataChange(i, 1)}>
                        <Text style={bar.ctrlBtnTxt}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
          <View style={pop.actions}>
            <Pressable style={pop.btnSec} onPress={onClose}><Text style={pop.btnSecTxt}>閉じる</Text></Pressable>
            <Pressable style={pop.btnPri} onPress={() => { onSave(); onClose(); }}>
              <Text style={pop.btnPriTxt}>保存する</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ══════════════════════════════════════════════
// 年表カード（計画 | 実績 の2カラム）
// ══════════════════════════════════════════════
type SideInfo =
  | { empty: false; yearLabel: string; name: string; detail?: string; amtLabel: string; amtPos: boolean }
  | { empty: true; yearLabel?: string };

function EventCard({
  planSide, actualSide, planCardId, actualCardId,
  planCardType, actualCardType, planYearIdx, actualYearIdx,
  dotFilled, dotExpense, selectedCardId,
  onSelect,
}: {
  planSide: SideInfo; actualSide: SideInfo;
  planCardId: string; actualCardId: string;
  planCardType: CardType; actualCardType: CardType;
  planYearIdx: number; actualYearIdx: number;
  dotFilled: boolean; dotExpense: boolean;
  selectedCardId: string | null;
  onSelect: (cid: string, type: CardType, yIdx: number) => void;
}) {
  const planSel   = selectedCardId === planCardId;
  const actualSel = selectedCardId === actualCardId;
  return (
    <View style={ec.card}>
      {/* 計画側 */}
      <Pressable style={[ec.side, planSel && ec.sideSel]} onPress={() => onSelect(planCardId, planCardType, planYearIdx)}>
        {!planSide.empty && (
          <>
            <Text style={ec.year}>{planSide.yearLabel}</Text>
            <Text style={ec.name}>{planSide.name}</Text>
            {planSide.detail ? <Text style={ec.detail}>{planSide.detail}</Text> : null}
            <Text style={[ec.amt, planSide.amtPos ? ec.amtPos : ec.amtNeg]}>{planSide.amtLabel}</Text>
          </>
        )}
      </Pressable>
      {/* 中央 */}
      <View style={ec.div}>
        <View style={[ec.dot,
          dotExpense && ec.dotExp,
          dotFilled && !dotExpense && ec.dotFill,
        ]} />
      </View>
      {/* 実績側 */}
      <Pressable style={[ec.side, actualSel && ec.sideSel]} onPress={() => onSelect(actualCardId, actualCardType, actualYearIdx)}>
        {actualSide.empty ? (
          <View style={ec.emptyBox}>
            <Text style={ec.emptyIcon}>+</Text>
            <Text style={ec.emptyTxt}>記録する</Text>
          </View>
        ) : (
          <>
            {actualSide.yearLabel ? <Text style={ec.year}>{actualSide.yearLabel}</Text> : null}
            <Text style={ec.name}>{actualSide.name}</Text>
            {actualSide.detail ? <Text style={ec.detail}>{actualSide.detail}</Text> : null}
            <Text style={[ec.amt, actualSide.amtPos ? ec.amtPos : ec.amtNeg]}>{actualSide.amtLabel}</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

// ══════════════════════════════════════════════
// PJ詳細 メイン
// ══════════════════════════════════════════════
export default function ProjectDetailScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const { balances, savingsAllocation, saveSavingsAllocation, aiInsights, familyMembers, projects } = useStore();
  const project = projects[id ?? ''];
  const isAccount = project?.kind === 'account';
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const svgW = screenWidth - 52;

  const currentAmount = balances[id ?? ''] ?? project?.now ?? 0;
  const aiText = aiInsights[id ?? ''] ?? project?.ai ?? '';

  const selfBirthYear = familyMembers.find(m => m.id === 'self')?.birthYear ?? 1990;
  const lifeYears = (selfBirthYear + 100) - NOW_YEAR;

  // ── state
  const [period, setPeriod] = useState<Period>('生涯');
  const [activeTab, setActiveTab] = useState<TabType>('saving');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedCardType, setSelectedCardType] = useState<CardType | null>(null);
  const [highlightYearIdx, setHighlightYearIdx] = useState<number | null>(null);
  const [pulseOpacity, setPulseOpacity] = useState(0.15);
  const [activePopup, setActivePopup] = useState<CardType | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  // ── グラフデータ（ローカルコピー、リアルタイム更新用）
  const [chartPlan, setChartPlan] = useState<number[]>(project?.plan ?? []);
  useEffect(() => { if (project) setChartPlan([...project.plan]); }, [id]);

  // ── 脈動アニメ
  const pulseRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (highlightYearIdx !== null) {
      let phase = 0;
      pulseRef.current = setInterval(() => {
        phase += 0.05;
        setPulseOpacity(0.10 + Math.sin(phase) * 0.07);
      }, 50);
    } else {
      if (pulseRef.current) { clearInterval(pulseRef.current); pulseRef.current = null; }
      setPulseOpacity(0.15);
    }
    return () => { if (pulseRef.current) clearInterval(pulseRef.current); };
  }, [highlightYearIdx]);

  // ── 月別データ（ポップアップ用）
  const [savingMonthData, setSavingMonthData] = useState<MonthEntry[]>(makeMonthData(3));
  const [expenseMonthData, setExpenseMonthData] = useState<MonthEntry[]>(makeMonthData(6));
  const [popupContext, setPopupContext] = useState<{ label: string; name: string; amtMan: number }>({ label: '', name: '', amtMan: 0 });

  // ── 積立タブ カードデータ
  const savingPlanCards = useMemo(() => {
    const rawEntries = savingsAllocation.entries.length > 0
      ? [...savingsAllocation.entries].sort((a, b) => a.fromYear - b.fromYear)
      : [{ fromYear: NOW_YEAR, monthlyAmounts: { [id ?? '']: 30000 } }];
    return rawEntries.map((e, i) => {
      const amtYen = e.monthlyAmounts[id ?? ''] ?? 0;
      const amtMan = Math.round(amtYen / 10000);
      const yr     = e.fromYear;
      const yIdx   = project ? yearToIdx(project.years, yr) : 0;
      return {
        cardId: `ps-${i}`, cardType: 'plan-saving' as CardType,
        yearLabel: `${yr}年〜`, yearIdx: yIdx,
        monthlyAmtMan: amtMan,
        name: i === 0 ? `月${amtMan}万円 積立` : `月${amtMan}万円に増額`,
        detail: i === 0 ? '積立スタート' : '積立額の変更',
        amtLabel: `+${amtMan}万円/月`,
        fromYear: yr,
      };
    });
  }, [savingsAllocation, id, project]);

  const savingActualCards = useMemo(() => {
    if (!project) return [];
    return savingPlanCards.map((pc, i) => {
      const actual = project.actuals?.[pc.yearIdx];
      const done   = actual !== undefined && actual !== null;
      const yr     = parseYear(project.years[pc.yearIdx] ?? project.years[0]);
      return {
        cardId: `as-${i}`, cardType: 'actual-saving' as CardType,
        yearLabel: `${yr}年`, yearIdx: pc.yearIdx,
        empty: !done,
        name: done ? (actual?.name ?? '記録済み') : '',
        detail: done ? (actual?.detail ?? '') : '',
        amtLabel: done ? (actual?.amt ?? '') : '',
        amtPos: done ? (actual?.pos ?? true) : true,
      };
    });
  }, [savingPlanCards, project]);

  // ── 支出タブ カードデータ
  const expensePlanCards = useMemo(() => {
    if (!project) return [];
    return project.events
      .filter(ev => !ev.pos)
      .map((ev, i) => {
        const amtStr = ev.amt.replace(/[^0-9]/g, '');
        const amtMan = Math.round(parseInt(amtStr, 10) / 10000) || 1;
        return {
          cardId: `pe-${i}`, cardType: 'plan-expense' as CardType,
          yearLabel: `${ev.year}年`, yearIdx: ev.idx,
          name: ev.name, detail: ev.detail,
          amtLabel: ev.amt, amtMan,
        };
      });
  }, [project]);

  const expenseActualCards = useMemo(() => {
    if (!project) return [];
    return expensePlanCards.map((pc, i) => {
      const actual = project.actuals?.[pc.yearIdx];
      const done   = actual !== undefined && actual !== null;
      const yr     = parseYear(project.events.filter(ev => !ev.pos)[i]?.year ?? "'25");
      return {
        cardId: `ae-${i}`, cardType: 'actual-expense' as CardType,
        yearLabel: `${yr}年`, yearIdx: pc.yearIdx,
        empty: !done,
        name: done ? (actual?.name ?? '記録済み') : '',
        detail: done ? (actual?.detail ?? '') : '',
        amtLabel: done ? (actual?.amt ?? '') : '',
        amtPos: done ? (actual?.pos ?? false) : false,
      };
    });
  }, [expensePlanCards, project]);

  // ── カード選択
  function handleCardSelect(cid: string, type: CardType, yIdx: number) {
    if (cid === selectedCardId) {
      setSelectedCardId(null);
      setSelectedCardType(null);
      setHighlightYearIdx(null);
      return;
    }
    setSelectedCardId(cid);
    setSelectedCardType(type);
    setHighlightYearIdx(yIdx);
  }

  function clearSelection() {
    setSelectedCardId(null);
    setSelectedCardType(null);
    setHighlightYearIdx(null);
  }

  // ── タブ切替
  function switchTab(tab: TabType) {
    setActiveTab(tab);
    clearSelection();
  }

  // ── 下部ボタン
  const LABEL_MAP: Record<CardType, string> = {
    'plan-saving':   '積立計画を編集',
    'actual-saving': '積立実績を記録',
    'plan-expense':  '支出計画を編集',
    'actual-expense':'支出実績を記録',
  };
  const editBtnLabel   = selectedCardType ? LABEL_MAP[selectedCardType] : 'カードを選んで編集';
  const editBtnEnabled = selectedCardId !== null;

  function handleEditPress() {
    if (!selectedCardType || !selectedCardId) return;

    // ポップアップ用コンテキストを設定
    if (selectedCardType === 'plan-saving') {
      const idx = parseInt(selectedCardId.split('-')[1]);
      const pc  = savingPlanCards[idx];
      if (pc) setPopupContext({ label: pc.yearLabel, name: pc.name, amtMan: pc.monthlyAmtMan });
    } else if (selectedCardType === 'actual-saving') {
      const idx = parseInt(selectedCardId.split('-')[1]);
      const pc  = savingPlanCards[idx];
      const ac  = savingActualCards[idx];
      if (pc && ac) {
        setPopupContext({ label: ac.yearLabel, name: pc.name, amtMan: pc.monthlyAmtMan });
        setSavingMonthData(makeMonthData(pc.monthlyAmtMan));
      }
    } else if (selectedCardType === 'plan-expense') {
      const idx = parseInt(selectedCardId.split('-')[1]);
      const pc  = expensePlanCards[idx];
      if (pc) setPopupContext({ label: pc.yearLabel, name: pc.name, amtMan: pc.amtMan });
    } else if (selectedCardType === 'actual-expense') {
      const idx = parseInt(selectedCardId.split('-')[1]);
      const pc  = expensePlanCards[idx];
      const ac  = expenseActualCards[idx];
      if (pc && ac) {
        setPopupContext({ label: ac.yearLabel, name: pc.name, amtMan: pc.amtMan });
        setExpenseMonthData(makeMonthData(Math.max(1, Math.round(pc.amtMan / 12))));
      }
    }
    setActivePopup(selectedCardType);
  }

  // ── リアルタイムグラフ更新（積立計画）
  function handlePlanSavingAmountChange(monthlyAmt: number) {
    if (!project) return;
    const idx = parseInt((selectedCardId ?? 'ps-0').split('-')[1]);
    const pc  = savingPlanCards[idx];
    if (!pc) return;
    const startIdx = pc.yearIdx;
    const newPlan  = [...chartPlan];
    for (let i = startIdx; i < newPlan.length; i++) {
      const prev = i > 0 ? newPlan[i - 1] : 0;
      const gap  = i > 0 ? parseYear(project.years[i]) - parseYear(project.years[i - 1]) : 1;
      newPlan[i] = prev + monthlyAmt * 12 * gap;
    }
    setChartPlan(newPlan);
  }

  // ── 保存
  function handleSavePlanSaving(amt: number) {
    const idx = parseInt((selectedCardId ?? 'ps-0').split('-')[1]);
    const pc  = savingPlanCards[idx];
    if (!pc) return;
    const newEntries = [...savingsAllocation.entries];
    const entryIdx   = newEntries.findIndex(e => e.fromYear === pc.fromYear);
    if (entryIdx >= 0) {
      newEntries[entryIdx] = {
        ...newEntries[entryIdx],
        monthlyAmounts: { ...newEntries[entryIdx].monthlyAmounts, [id ?? '']: amt * 10000 },
      };
    } else {
      newEntries.push({ fromYear: pc.fromYear, monthlyAmounts: { [id ?? '']: amt * 10000 } });
    }
    saveSavingsAllocation({ entries: newEntries });
  }

  if (!project) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG }}>
        <Text style={{ color: TXT_SEC }}>プロジェクトが見つかりません</Text>
      </View>
    );
  }

  const planCards   = activeTab === 'saving' ? savingPlanCards   : expensePlanCards;
  const actualCards = activeTab === 'saving' ? savingActualCards : expenseActualCards;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>

      {/* ヘッダー */}
      <View style={[s.hdr, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={s.back}>‹ {from === 'pool' ? 'プール金' : '使いみち'}</Text>
        </Pressable>
        <View style={s.hdrRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.projName}>{project.name}</Text>
            <Text style={s.timing}>{project.timing}</Text>
          </View>
          <Pressable onPress={() => setSheetVisible(true)} style={{ alignItems: 'flex-end' }}>
            <Text style={s.amtLabel}>{isAccount ? '現在の残高' : '現在の積み立て'}</Text>
            <Text style={s.amt}>{Math.round(currentAmount / 10000)}<Text style={s.amtUnit}>万円</Text></Text>
            <Text style={s.amtSub}>{project.goalLabel} · {project.statusTxt}</Text>
          </Pressable>
        </View>
      </View>

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

      {/* グラフカード */}
      <View style={s.graphCard}>
        <View style={s.graphTop}>
          {/* 凡例 */}
          <View style={s.legend}>
            <View style={s.legendItem}><View style={s.legendDash} /><Text style={s.legendTxt}>計画</Text></View>
            <View style={s.legendItem}><View style={s.legendLine} /><Text style={s.legendTxt}>実績</Text></View>
            <View style={s.legendItem}><View style={s.legendDot} /><Text style={s.legendTxt}>支出</Text></View>
            <Text style={s.legendUnit}>単位:万円</Text>
          </View>
          {/* 期間タブ */}
          <View style={s.periodRow}>
            {(['生涯', '5年', '1年'] as const).map(p => (
              <Pressable key={p} style={[s.periodBtn, period === p && s.periodBtnActive]} onPress={() => setPeriod(p)}>
                <Text style={[s.periodTxt, period === p && s.periodTxtActive]}>{p}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <PlanActualChart
          project={project} chartPlan={chartPlan} svgW={svgW}
          period={period} lifetimeYears={lifeYears}
          highlightYearIdx={highlightYearIdx} pulseOpacity={pulseOpacity}
          selectedCardType={selectedCardType}
        />
      </View>

      {/* 積立/支出タブ */}
      <View style={s.typeTabs}>
        {(['saving', 'expense'] as const).map(tab => (
          <Pressable key={tab} style={[s.typeTab, activeTab === tab && s.typeTabActive]} onPress={() => switchTab(tab)}>
            <Text style={s.typeTabIcon}>{tab === 'saving' ? '📈' : '💸'}</Text>
            <Text style={[s.typeTabTxt, activeTab === tab && s.typeTabTxtActive]}>{tab === 'saving' ? '積立' : '支出'}</Text>
          </Pressable>
        ))}
      </View>

      {/* 計画/実績ヘッダー */}
      <View style={s.splitHdr}>
        <View style={[s.splitH, { borderBottomColor: PLAN_C }]}>
          <Text style={[s.splitHTxt, { color: PLAN_C }]}>計画</Text>
        </View>
        <View style={[s.splitH, { borderBottomColor: ACTUAL_C }]}>
          <Text style={[s.splitHTxt, { color: ACTUAL_C }]}>実績</Text>
        </View>
      </View>

      {/* 年表エリア */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.eventsContent, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {planCards.map((pc, i) => {
          const ac = actualCards[i];
          if (!ac) return null;
          const isExp = activeTab === 'expense';
          const dotFilled  = !ac.empty && !isExp;
          const dotExpense = isExp;
          const planSide: SideInfo = {
            empty: false,
            yearLabel: pc.yearLabel,
            name: pc.name,
            detail: 'detail' in pc ? pc.detail : undefined,
            amtLabel: pc.amtLabel,
            amtPos: !isExp,
          };
          const actualSide: SideInfo = ac.empty
            ? { empty: true }
            : { empty: false, yearLabel: ac.yearLabel, name: ac.name, detail: ac.detail || undefined, amtLabel: ac.amtLabel, amtPos: ac.amtPos };
          return (
            <EventCard
              key={pc.cardId}
              planSide={planSide}
              actualSide={actualSide}
              planCardId={pc.cardId}
              actualCardId={ac.cardId}
              planCardType={pc.cardType}
              actualCardType={ac.cardType}
              planYearIdx={pc.yearIdx}
              actualYearIdx={ac.yearIdx}
              dotFilled={dotFilled}
              dotExpense={dotExpense}
              selectedCardId={selectedCardId}
              onSelect={handleCardSelect}
            />
          );
        })}
      </ScrollView>

      {/* 下部固定ボタン */}
      {!isAccount && (
        <View style={[s.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
          <Pressable
            style={[s.editBtn, !editBtnEnabled && s.editBtnDisabled]}
            onPress={handleEditPress}
            disabled={!editBtnEnabled}
          >
            <Text style={[s.editBtnTxt, !editBtnEnabled && s.editBtnTxtDisabled]}>{editBtnLabel}</Text>
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

      {/* ── ポップアップ */}
      <PlanSavingPopup
        visible={activePopup === 'plan-saving'}
        yearLabel={popupContext.label}
        initAmt={popupContext.amtMan}
        onClose={() => setActivePopup(null)}
        onAmountChange={handlePlanSavingAmountChange}
        onSave={handleSavePlanSaving}
      />

      <PlanExpensePopup
        visible={activePopup === 'plan-expense'}
        eventName={popupContext.name}
        initAmt={popupContext.amtMan}
        onClose={() => setActivePopup(null)}
        onAmountChange={() => {}}
        onSave={() => {}}
      />

      <ActualRecordPopup
        visible={activePopup === 'actual-saving'}
        title="積立を記録する"
        sub={`実績 ・ ${popupContext.label}`}
        isExpense={false}
        monthData={savingMonthData}
        onDataChange={(idx, delta) => {
          setSavingMonthData(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], actual: Math.max(0, next[idx].actual + delta) };
            return next;
          });
        }}
        onClose={() => setActivePopup(null)}
        onSave={() => {}}
      />

      <ActualRecordPopup
        visible={activePopup === 'actual-expense'}
        title="支出を記録する"
        sub={`実績 ・ ${popupContext.label}`}
        isExpense={true}
        monthData={expenseMonthData}
        onDataChange={(idx, delta) => {
          setExpenseMonthData(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], actual: Math.max(0, next[idx].actual + delta) };
            return next;
          });
        }}
        onClose={() => setActivePopup(null)}
        onSave={() => {}}
      />
    </View>
  );
}

// ══════════════════════════════════════════════
// スタイル
// ══════════════════════════════════════════════

const s = StyleSheet.create({
  hdr: { backgroundColor: BG, paddingHorizontal: 16, paddingBottom: 10 },
  back: { fontSize: 16, color: ACTUAL_C, fontWeight: '500', marginBottom: 6 },
  hdrRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  projName: { fontSize: 20, fontWeight: '600', color: TXT_PRI, letterSpacing: -0.3, lineHeight: 24 },
  timing: { fontSize: 11, color: TXT_TER, marginTop: 2 },
  amtLabel: { fontSize: 10, color: TXT_TER },
  amt: { fontSize: 18, fontWeight: '500', color: TXT_PRI, letterSpacing: -0.5, lineHeight: 22, marginTop: 1 },
  amtUnit: { fontSize: 11, color: TXT_SEC },
  amtSub: { fontSize: 10, color: TXT_TER, marginTop: 1 },

  aiCard: {
    marginHorizontal: 16, marginBottom: 6,
    backgroundColor: '#EAF3DE', borderRadius: 12, padding: 9,
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
  },
  aiIcon: { fontSize: 14, color: ACTUAL_C, lineHeight: 22 },
  aiLabel: { fontSize: 11, color: ACTUAL_C, fontWeight: '500', marginBottom: 1 },
  aiTxt: { fontSize: 12, color: ACTUAL_C, lineHeight: 16 },

  graphCard: {
    backgroundColor: CARD, borderRadius: 12,
    marginHorizontal: 16, marginBottom: 8,
    paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6,
    borderWidth: 0.5, borderColor: BORDER,
  },
  graphTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 8 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDash: { width: 14, height: 0, borderTopWidth: 2, borderTopColor: PLAN_C, borderStyle: 'dashed' },
  legendLine: { width: 14, height: 2, backgroundColor: ACTUAL_C, borderRadius: 1 },
  legendDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: EXPENSE_C },
  legendTxt: { fontSize: 10, color: TXT_SEC },
  legendUnit: { fontSize: 9, color: TXT_TER, marginLeft: 4 },
  periodRow: { flexDirection: 'row', gap: 4 },
  periodBtn: {
    paddingHorizontal: 9, paddingVertical: 3, borderRadius: 14,
    borderWidth: 0.5, borderColor: BORDER_MD,
  },
  periodBtnActive: { backgroundColor: PLAN_C, borderColor: PLAN_C },
  periodTxt: { fontSize: 10, color: TXT_SEC },
  periodTxtActive: { color: '#fff', fontWeight: '500' },

  typeTabs: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, marginBottom: 8 },
  typeTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 8, borderRadius: 10,
    borderWidth: 0.5, borderColor: BORDER_MD,
  },
  typeTabActive: { backgroundColor: ACTUAL_C, borderColor: ACTUAL_C },
  typeTabIcon: { fontSize: 14 },
  typeTabTxt: { fontSize: 13, fontWeight: '500', color: TXT_SEC },
  typeTabTxtActive: { color: '#fff', fontWeight: '600' },

  splitHdr: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 6 },
  splitH: { flex: 1, alignItems: 'center', paddingVertical: 5, borderBottomWidth: 2 },
  splitHTxt: { fontSize: 12, fontWeight: '600' },

  eventsContent: { paddingHorizontal: 16 },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 10,
    backgroundColor: 'transparent',
  },
  editBtn: {
    backgroundColor: ACTUAL_C, borderRadius: 14,
    paddingVertical: 13, alignItems: 'center',
  },
  editBtnDisabled: { backgroundColor: 'rgba(0,0,0,0.15)' },
  editBtnTxt: { fontSize: 14, fontWeight: '600', color: '#fff' },
  editBtnTxtDisabled: { color: TXT_TER },
});

const ec = StyleSheet.create({
  card: {
    backgroundColor: CARD, borderRadius: 12, marginBottom: 6,
    borderWidth: 0.5, borderColor: BORDER,
    flexDirection: 'row', alignItems: 'stretch', overflow: 'hidden',
  },
  side: {
    flex: 1, padding: 10, minHeight: 70,
    borderWidth: 1.5, borderColor: 'transparent', borderRadius: 10, margin: -1,
  },
  sideSel: { backgroundColor: '#E6F1FB', borderColor: '#185FA5' },
  div: { width: 1, backgroundColor: BORDER, justifyContent: 'center', alignItems: 'center' },
  dot: {
    width: 10, height: 10, borderRadius: 5,
    borderWidth: 1.5, borderColor: BORDER_MD, backgroundColor: CARD,
    position: 'absolute',
  },
  dotFill: { backgroundColor: ACTUAL_C, borderColor: ACTUAL_C },
  dotExp: { backgroundColor: EXPENSE_C, borderColor: EXPENSE_C },
  year: { fontSize: 11, color: TXT_SEC, marginBottom: 2 },
  name: { fontSize: 12, fontWeight: '600', color: TXT_PRI, lineHeight: 16, marginBottom: 1 },
  detail: { fontSize: 10, color: TXT_TER, lineHeight: 14, marginBottom: 2 },
  amt: { fontSize: 12, fontWeight: '600' },
  amtPos: { color: PLAN_C },
  amtNeg: { color: EXPENSE_C },
  emptyBox: {
    flex: 1, margin: 8, borderWidth: 1, borderColor: BORDER_MD,
    borderStyle: 'dashed', borderRadius: 8,
    justifyContent: 'center', alignItems: 'center', gap: 2, minHeight: 54,
  },
  emptyIcon: { fontSize: 14, color: TXT_TER },
  emptyTxt: { fontSize: 11, fontWeight: '500', color: TXT_SEC },
});

const pop = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: {
    backgroundColor: BG,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16,
    flexDirection: 'column',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 20,
    elevation: 20,
  },
  handle: { width: 36, height: 4, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '600', color: TXT_PRI, marginBottom: 2 },
  sub: { fontSize: 11, color: TXT_TER, marginBottom: 14 },
  fieldLabel: { fontSize: 11, color: TXT_SEC, marginTop: 10, marginBottom: 4 },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sliderBtn: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 0.5, borderColor: BORDER_MD, backgroundColor: CARD,
    justifyContent: 'center', alignItems: 'center',
  },
  sliderBtnTxt: { fontSize: 18, color: TXT_PRI },
  sliderVal: { flex: 1, textAlign: 'center', fontSize: 24, fontWeight: '600', color: TXT_PRI },
  sliderUnit: { fontSize: 14, fontWeight: '500', color: TXT_SEC },
  unitTabs: { flexDirection: 'row', gap: 4, marginTop: 4 },
  unitTab: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14,
    borderWidth: 0.5, borderColor: BORDER_MD,
  },
  unitTabActive: { backgroundColor: PLAN_C, borderColor: PLAN_C },
  unitTabTxt: { fontSize: 11, color: TXT_SEC },
  unitTabTxtActive: { color: '#fff', fontWeight: '500' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  btnSec: {
    paddingVertical: 12, paddingHorizontal: 18,
    borderWidth: 0.5, borderColor: BORDER_MD, borderRadius: 12,
  },
  btnSecTxt: { fontSize: 14, color: TXT_SEC },
  btnPri: { flex: 1, backgroundColor: ACTUAL_C, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  btnPriTxt: { fontSize: 14, fontWeight: '600', color: '#fff' },
});

const bar = StyleSheet.create({
  wrap: {
    backgroundColor: CARD, borderRadius: 10,
    padding: 10, borderWidth: 0.5, borderColor: BORDER,
    marginBottom: 12,
  },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 100, paddingBottom: 16 },
  col: { width: 32, alignItems: 'center', marginHorizontal: 2 },
  pair: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 80, justifyContent: 'center' },
  barBase: { width: 10, borderRadius: 2 },
  label: { fontSize: 9, color: TXT_TER, marginTop: 2 },
  listWrap: { backgroundColor: CARD, borderRadius: 10, borderWidth: 0.5, borderColor: BORDER, overflow: 'hidden' },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12,
    borderBottomWidth: 0.5, borderBottomColor: BORDER, gap: 8,
  },
  rowWarn: { backgroundColor: 'rgba(239,159,39,0.06)' },
  month: { fontSize: 12, color: TXT_SEC, fontWeight: '500', width: 38 },
  planLbl: { flex: 1, fontSize: 10, color: TXT_TER },
  statusLbl: { fontSize: 10, color: WARN_TXT, fontWeight: '500', marginRight: 4 },
  ctrl: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ctrlBtn: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 0.5, borderColor: BORDER_MD, backgroundColor: CARD,
    justifyContent: 'center', alignItems: 'center',
  },
  ctrlBtnTxt: { fontSize: 14, color: TXT_PRI },
  ctrlVal: { fontSize: 13, fontWeight: '600', color: TXT_PRI, minWidth: 50, textAlign: 'center' },
  ctrlUnit: { fontSize: 10, color: TXT_SEC, fontWeight: '400' },
});
