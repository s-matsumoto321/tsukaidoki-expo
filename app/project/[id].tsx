import { useState, useRef, useMemo, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  useWindowDimensions, Modal,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line as SvgLine, Polyline, Circle, Text as SvgText, G } from 'react-native-svg';
import { type Project, type ProjectEvent } from '@/constants/projects';
import { useStore } from '@/store/useStore';
import { BalanceSheet } from '@/components/balance-sheet';

// ── カラー定数
const TRIAL_C   = '#1D9E75';
const EXPENSE_C = '#E24B4A';
const DREAM_C   = '#EF9F27';
const BG        = '#f5f4ee';
const CARD      = '#ffffff';
const TXT_PRI   = '#2c2c2a';
const TXT_SEC   = '#73726c';
const TXT_TER   = '#9c9a92';
const BORDER    = 'rgba(0,0,0,0.08)';
const BORDER_MD = 'rgba(0,0,0,0.18)';

// ── 型
type Period   = '生涯' | '5年' | '1年';
type TabType  = 'saving' | 'expense';

const NOW_YEAR = new Date().getFullYear();
const SVG_H = 150;
const PL = 38, PR = 10, PT = 12, PB = 22;

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

// ── 教育費テンプレートデータ
type EduCategory = '幼稚園' | '小学校' | '中学校' | '高校' | '大学' | '習い事';
type EduSubtype = string;

const EDU_TEMPLATE: Record<EduCategory, { subtype: EduSubtype; annualMan: number }[]> = {
  '幼稚園': [
    { subtype: '公立', annualMan: 72 },
    { subtype: '私立', annualMan: 158 },
  ],
  '小学校': [
    { subtype: '公立', annualMan: 31 },
    { subtype: '私立', annualMan: 152 },
  ],
  '中学校': [
    { subtype: '公立', annualMan: 49 },
    { subtype: '私立', annualMan: 140 },
  ],
  '高校': [
    { subtype: '公立', annualMan: 46 },
    { subtype: '私立', annualMan: 97 },
  ],
  '大学': [
    { subtype: '国公立', annualMan: 67 },
    { subtype: '私立文系', annualMan: 110 },
    { subtype: '私立理系', annualMan: 150 },
    { subtype: '私立医歯薬', annualMan: 350 },
  ],
  '習い事': [],
};

const SCHOOL_AGES: Record<EduCategory, { startAge: number; duration: number }> = {
  '幼稚園': { startAge: 3, duration: 3 },
  '小学校': { startAge: 6, duration: 6 },
  '中学校': { startAge: 12, duration: 3 },
  '高校': { startAge: 15, duration: 3 },
  '大学': { startAge: 18, duration: 4 },
  '習い事': { startAge: 0, duration: 1 },
};

const EDU_CATEGORIES: EduCategory[] = ['幼稚園', '小学校', '中学校', '高校', '大学', '習い事'];
const CATEGORY_EMOJI: Record<EduCategory, string> = {
  '幼稚園': '🌸',
  '小学校': '📚',
  '中学校': '🎒',
  '高校': '🏫',
  '大学': '🎓',
  '習い事': '🎵',
};

// ══════════════════════════════════════════════
// グラフ（試算ライン1本）
// ══════════════════════════════════════════════
function TrialChart({
  project, chartPlan, svgW, period, lifetimeYears,
  highlightYearIdx, pulseOpacity,
}: {
  project: Project | undefined;
  chartPlan: number[];
  svgW: number;
  period: Period;
  lifetimeYears: number;
  highlightYearIdx: number | null;
  pulseOpacity: number;
}) {
  if (!project) return null;
  const limitMap: Record<Period, number> = { '生涯': lifetimeYears, '5年': 5, '1年': 1 };
  const firstYear = parseYear(project.years[0]);
  const limit  = firstYear + limitMap[period];
  const cutIdx = project.years.findIndex(yr => parseYear(yr) > limit);
  const endN   = cutIdx === -1 ? project.years.length : Math.max(2, cutIdx);
  const years  = project.years.slice(0, endN);
  const plan   = chartPlan.slice(0, endN);
  const gW = svgW - PL - PR, gH = SVG_H - PT - PB, n = years.length;

  const rawMax  = Math.max(...plan, 1);
  const step    = niceTickStep(rawMax, 4);
  const maxVal  = Math.ceil(rawMax / step) * step;
  const xi = (i: number) => PL + (n === 1 ? gW / 2 : i * (gW / (n - 1)));
  const yv = (v: number) => PT + gH - (v / maxVal) * gH;
  const ticks: number[] = [];
  for (let v = 0; v <= maxVal; v += step) ticks.push(v);
  const xStep = Math.max(1, Math.ceil(n / 5));
  const planPts = plan.map((v, i) => `${xi(i)},${yv(v)}`).join(' ');
  const expEvs  = project.events.filter(ev => ev.type === 'spend' && ev.idx < endN);
  const mileEvs = project.events.filter(ev => ev.type !== 'spend' && ev.idx < endN);

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
      <Polyline points={planPts} fill="none" stroke={TRIAL_C} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {mileEvs.map(ev => (
        <Circle key={`ms${ev.idx}`} cx={xi(ev.idx)} cy={yv(plan[ev.idx])} r={4} fill={DREAM_C} stroke="#fff" strokeWidth={1.5} />
      ))}
      {expEvs.map(ev => (
        <Circle key={`ep${ev.idx}`} cx={xi(ev.idx)} cy={yv(plan[ev.idx])} r={5} fill={EXPENSE_C} />
      ))}
      {highlightYearIdx !== null && highlightYearIdx < endN && (
        <G>
          <Circle cx={xi(highlightYearIdx)} cy={yv(plan[highlightYearIdx])} r={12} fill={TRIAL_C} opacity={pulseOpacity} />
          <Circle cx={xi(highlightYearIdx)} cy={yv(plan[highlightYearIdx])} r={7} fill={TRIAL_C} opacity={Math.min(0.45, pulseOpacity * 2)} />
        </G>
      )}
    </Svg>
  );
}

// ══════════════════════════════════════════════
// 積立計画ポップアップ
// ══════════════════════════════════════════════
function PlanSavingPopup({
  visible, yearLabel, initAmt, modalHeight,
  onClose, onAmountChange, onSave,
}: {
  visible: boolean; yearLabel: string; initAmt: number; modalHeight: number;
  onClose: () => void;
  onAmountChange: (amt: number) => void;
  onSave: (amt: number) => void;
}) {
  const [amt, setAmt] = useState(initAmt);
  useEffect(() => { if (visible) setAmt(initAmt); }, [visible, initAmt]);
  const minus = () => { const n = Math.max(0, amt - 1); setAmt(n); onAmountChange(n); };
  const plus  = () => { const n = amt + 1; setAmt(n); onAmountChange(n); };
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={pop.backdrop} onPress={onClose} />
        <View style={[pop.sheet, { height: modalHeight }]}>
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
  visible, eventName, initAmt, modalHeight,
  onClose, onAmountChange, onSave,
}: {
  visible: boolean; eventName: string; initAmt: number; modalHeight: number;
  onClose: () => void;
  onAmountChange: (amt: number) => void;
  onSave: (amt: number) => void;
}) {
  const [amt, setAmt] = useState(initAmt);
  const [unit, setUnit] = useState<'year' | 'month'>('year');
  useEffect(() => { if (visible) setAmt(initAmt); }, [visible, initAmt]);
  const displayAmt = unit === 'month' ? Math.round(amt / 12) : amt;
  const minus = () => {
    const n = Math.max(1, displayAmt - 1);
    const newAmt = unit === 'month' ? n * 12 : n;
    setAmt(newAmt); onAmountChange(newAmt);
  };
  const plus = () => {
    const n = displayAmt + 1;
    const newAmt = unit === 'month' ? n * 12 : n;
    setAmt(newAmt); onAmountChange(newAmt);
  };
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={pop.backdrop} onPress={onClose} />
        <View style={[pop.sheet, { height: modalHeight }]}>
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
              <Text style={pop.sliderVal}>{displayAmt}<Text style={pop.sliderUnit}> {unit === 'year' ? '万円/年' : '万円/月'}</Text></Text>
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
// 教育費テンプレート選択モーダル
// ══════════════════════════════════════════════
function ExpenseTemplatePicker({
  visible, onClose, onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (category: EduCategory, subtype: string, annualMan: number) => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState<EduCategory | null>(null);
  const [hobbyMonthlyMan, setHobbyMonthlyMan] = useState('3');

  const resetAndClose = () => {
    setSelectedCategory(null);
    setHobbyMonthlyMan('3');
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={resetAndClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={pop.backdrop} onPress={resetAndClose} />
        <View style={[pop.sheet, { paddingBottom: 24 }]}>
          <View style={pop.handle} />
          <Text style={pop.title}>支出を追加</Text>
          {selectedCategory === null ? (
            <>
              <Text style={[pop.sub, { marginBottom: 16 }]}>カテゴリを選んでください</Text>
              <View style={tpl.grid}>
                {EDU_CATEGORIES.map(cat => (
                  <Pressable key={cat} style={tpl.cell} onPress={() => setSelectedCategory(cat)}>
                    <Text style={tpl.emoji}>{CATEGORY_EMOJI[cat]}</Text>
                    <Text style={tpl.cellTxt}>{cat}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : selectedCategory === '習い事' ? (
            <>
              <Text style={[pop.sub, { marginBottom: 8 }]}>習い事 · 月謝を入力</Text>
              <Text style={pop.fieldLabel}>月謝（万円/月）</Text>
              <View style={pop.sliderRow}>
                <Pressable style={pop.sliderBtn} onPress={() => setHobbyMonthlyMan(String(Math.max(1, parseInt(hobbyMonthlyMan || '0', 10) - 1)))}>
                  <Text style={pop.sliderBtnTxt}>−</Text>
                </Pressable>
                <Text style={pop.sliderVal}>{hobbyMonthlyMan}<Text style={pop.sliderUnit}> 万円/月</Text></Text>
                <Pressable style={pop.sliderBtn} onPress={() => setHobbyMonthlyMan(String(parseInt(hobbyMonthlyMan || '0', 10) + 1))}>
                  <Text style={pop.sliderBtnTxt}>+</Text>
                </Pressable>
              </View>
              <View style={pop.actions}>
                <Pressable style={pop.btnSec} onPress={() => setSelectedCategory(null)}>
                  <Text style={pop.btnSecTxt}>‹ 戻る</Text>
                </Pressable>
                <Pressable style={pop.btnPri} onPress={() => {
                  const monthly = parseInt(hobbyMonthlyMan || '0', 10);
                  onSelect('習い事', '習い事', monthly * 12);
                  setSelectedCategory(null);
                  setHobbyMonthlyMan('3');
                  onClose();
                }}>
                  <Text style={pop.btnPriTxt}>追加する</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Text style={[pop.sub, { marginBottom: 16 }]}>{selectedCategory} · 区分を選んでください</Text>
              {EDU_TEMPLATE[selectedCategory].map(item => (
                <Pressable key={item.subtype} style={tpl.subtypeRow} onPress={() => {
                  onSelect(selectedCategory, item.subtype, item.annualMan);
                  setSelectedCategory(null);
                  onClose();
                }}>
                  <View style={{ flex: 1 }}>
                    <Text style={tpl.subtypeName}>{item.subtype}</Text>
                    <Text style={tpl.subtypeAmt}>年額 ¥{item.annualMan}万円（参考値）</Text>
                  </View>
                  <Text style={tpl.subtypeArrow}>›</Text>
                </Pressable>
              ))}
              <Pressable style={tpl.backBtn} onPress={() => setSelectedCategory(null)}>
                <Text style={tpl.backBtnTxt}>‹ カテゴリに戻る</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ══════════════════════════════════════════════
// 年表カード（計画のみ・1カラム）
// ══════════════════════════════════════════════
function PlanCard({
  yearLabel, name, detail, amtLabel, amtPos,
  isSelected, onPress,
}: {
  yearLabel: string; name: string; detail?: string;
  amtLabel: string; amtPos: boolean;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[pc.card, isSelected && pc.cardSel]} onPress={onPress}>
      <View style={pc.dot} />
      <View style={{ flex: 1, paddingLeft: 12 }}>
        <Text style={pc.year}>{yearLabel}</Text>
        <Text style={pc.name}>{name}</Text>
        {detail ? <Text style={pc.detail}>{detail}</Text> : null}
        <Text style={[pc.amt, amtPos ? pc.amtPos : pc.amtNeg]}>{amtLabel}</Text>
      </View>
    </Pressable>
  );
}

// ══════════════════════════════════════════════
// PJ詳細 メイン
// ══════════════════════════════════════════════
export default function ProjectDetailScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const { balances, savingsAllocation, saveSavingsAllocation, aiInsights, familyMembers, projects, updateProject } = useStore();
  const project = projects[id ?? ''];
  const isAccount = project?.kind === 'account';
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const svgW = screenWidth - 52;
  const graphCardRef = useRef<View>(null);
  const [graphCardBottom, setGraphCardBottom] = useState(0);

  const currentAmount = balances[id ?? ''] ?? project?.now ?? 0;
  const aiText = aiInsights[id ?? ''] ?? project?.ai ?? '';

  const selfBirthYear = familyMembers.find(m => m.id === 'self')?.birthYear ?? 1990;
  const lifeYears = (selfBirthYear + 100) - NOW_YEAR;

  const [period, setPeriod] = useState<Period>('生涯');
  const [activeTab, setActiveTab] = useState<TabType>('saving');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [highlightYearIdx, setHighlightYearIdx] = useState<number | null>(null);
  const [pulseOpacity, setPulseOpacity] = useState(0.15);
  const [activePopup, setActivePopup] = useState<'plan-saving' | 'plan-expense' | 'add-expense' | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const [chartPlan, setChartPlan] = useState<number[]>(project?.plan ?? []);
  useEffect(() => { if (project) setChartPlan([...project.plan]); }, [id]);

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

  const [popupContext, setPopupContext] = useState<{ label: string; name: string; amtMan: number }>({ label: '', name: '', amtMan: 0 });

  // ── 積立タブ カードデータ
  const savingCards = useMemo(() => {
    const rawEntries = savingsAllocation.entries.length > 0
      ? [...savingsAllocation.entries].sort((a, b) => a.fromYear - b.fromYear)
      : [{ fromYear: NOW_YEAR, monthlyAmounts: { [id ?? '']: 30000 } }];
    return rawEntries.map((e, i) => {
      const amtYen = e.monthlyAmounts[id ?? ''] ?? 0;
      const amtMan = Math.round(amtYen / 10000);
      const yr     = e.fromYear;
      const yIdx   = project ? yearToIdx(project.years, yr) : 0;
      return {
        cardId: `ps-${i}`,
        yearLabel: `${yr}年〜`, yearIdx: yIdx,
        monthlyAmtMan: amtMan,
        name: i === 0 ? `月${amtMan}万円 積立` : `月${amtMan}万円に増額`,
        detail: i === 0 ? '積立スタート' : '積立額の変更',
        amtLabel: `+${amtMan}万円/月`,
        fromYear: yr,
      };
    });
  }, [savingsAllocation, id, project]);

  // ── 支出タブ カードデータ
  const expenseCards = useMemo(() => {
    if (!project) return [];
    return project.events
      .filter(ev => !ev.pos)
      .map((ev, i) => {
        const amtStr = ev.amt.replace(/[^0-9]/g, '');
        const amtMan = Math.round(parseInt(amtStr, 10) / 10000) || 1;
        return {
          cardId: `pe-${i}`,
          yearLabel: `${ev.year}年`, yearIdx: ev.idx,
          name: ev.name, detail: ev.detail,
          amtLabel: ev.amt, amtMan,
        };
      });
  }, [project]);

  const planCards = activeTab === 'saving' ? savingCards : expenseCards;

  function handleCardSelect(cid: string, yIdx: number) {
    if (cid === selectedCardId) {
      setSelectedCardId(null);
      setHighlightYearIdx(null);
      return;
    }
    setSelectedCardId(cid);
    setHighlightYearIdx(yIdx);
  }

  function switchTab(tab: TabType) {
    setActiveTab(tab);
    setSelectedCardId(null);
    setHighlightYearIdx(null);
  }

  const editBtnEnabled = selectedCardId !== null;
  const editBtnLabel = activeTab === 'saving' ? '積立計画を編集' : '支出計画を編集';

  function handleEditPress() {
    if (!selectedCardId) return;
    if (activeTab === 'saving') {
      const idx = parseInt(selectedCardId.split('-')[1]);
      const card = savingCards[idx];
      if (card) setPopupContext({ label: card.yearLabel, name: card.name, amtMan: card.monthlyAmtMan });
      setActivePopup('plan-saving');
    } else {
      const idx = parseInt(selectedCardId.split('-')[1]);
      const card = expenseCards[idx];
      if (card) setPopupContext({ label: card.yearLabel, name: card.name, amtMan: card.amtMan });
      setActivePopup('plan-expense');
    }
  }

  function handlePlanSavingAmountChange(monthlyAmt: number) {
    if (!project) return;
    const idx = parseInt((selectedCardId ?? 'ps-0').split('-')[1]);
    const card = savingCards[idx];
    if (!card) return;
    const startIdx = card.yearIdx;
    const newPlan  = [...chartPlan];
    for (let i = startIdx; i < newPlan.length; i++) {
      const prev = i > 0 ? newPlan[i - 1] : 0;
      const gap  = i > 0 ? parseYear(project.years[i]) - parseYear(project.years[i - 1]) : 1;
      newPlan[i] = prev + monthlyAmt * 12 * gap;
    }
    setChartPlan(newPlan);
  }

  function handlePlanExpenseAmountChange(annualAmt: number) {
    if (!project) return;
    const idx = parseInt((selectedCardId ?? 'pe-0').split('-')[1]);
    const card = expenseCards[idx];
    if (!card) return;
    const eventIdx = card.yearIdx;
    const origAmt  = card.amtMan;
    const diff     = annualAmt - origAmt;
    const newPlan  = [...project.plan];
    for (let i = eventIdx; i < newPlan.length; i++) {
      newPlan[i] = Math.max(0, project.plan[i] - diff);
    }
    setChartPlan(newPlan);
  }

  function handleSavePlanSaving(amt: number) {
    const idx = parseInt((selectedCardId ?? 'ps-0').split('-')[1]);
    const card = savingCards[idx];
    if (!card) return;
    const newEntries = [...savingsAllocation.entries];
    const entryIdx   = newEntries.findIndex(e => e.fromYear === card.fromYear);
    if (entryIdx >= 0) {
      newEntries[entryIdx] = {
        ...newEntries[entryIdx],
        monthlyAmounts: { ...newEntries[entryIdx].monthlyAmounts, [id ?? '']: amt * 10000 },
      };
    } else {
      newEntries.push({ fromYear: card.fromYear, monthlyAmounts: { [id ?? '']: amt * 10000 } });
    }
    saveSavingsAllocation({ entries: newEntries });
  }

  function handleSavePlanExpense(annualAmtMan: number) {
    if (!project) return;
    const idx = parseInt((selectedCardId ?? 'pe-0').split('-')[1]);
    const expenseEvents = project.events.filter(ev => !ev.pos);
    const event = expenseEvents[idx];
    if (!event) return;
    const newAmt = `-¥${(annualAmtMan * 10_000).toLocaleString('ja-JP')}/年`;
    const newEvents = project.events.map(ev =>
      ev === event ? { ...ev, amt: newAmt } : ev
    );
    updateProject(project.id, p => ({
      ...p,
      plan: chartPlan,
      events: newEvents,
    }));
  }

  function handleTemplateSelect(cat: EduCategory, subtype: string, annualMan: number) {
    if (!project || annualMan === 0) return;
    const { startAge, duration } = SCHOOL_AGES[cat];
    const childBirthYear = familyMembers.find(m => m.role === 'child')?.birthYear ?? NOW_YEAR;
    const startYear = cat === '習い事' ? NOW_YEAR : childBirthYear + startAge;

    const startIdx = project.years.findIndex(y => parseYear(y) >= startYear);
    const safeIdx = startIdx === -1 ? project.years.length - 1 : startIdx;

    const endYear = startYear + duration - 1;
    const totalMan = annualMan * duration;
    const newPlan = [...chartPlan];
    for (let i = safeIdx; i < newPlan.length; i++) {
      newPlan[i] = Math.max(0, newPlan[i] - totalMan);
    }
    setChartPlan(newPlan);

    const eventName = cat === '習い事'
      ? `習い事（月${Math.round(annualMan / 12)}万円）`
      : `${cat}${subtype !== cat ? `（${subtype}）` : ''}入学`;
    const eventDetail = cat === '習い事'
      ? `${startYear}年〜・月${Math.round(annualMan / 12)}万円`
      : `${startYear}〜${endYear}年・年${annualMan}万円`;

    const newEvent: ProjectEvent = {
      idx: safeIdx,
      type: 'spend',
      dot: EXPENSE_C,
      year: String(startYear),
      name: eventName,
      detail: eventDetail,
      amt: `-¥${(annualMan * 10_000).toLocaleString('ja-JP')}/年`,
      pos: false,
    };

    updateProject(project.id, p => ({
      ...p,
      plan: newPlan,
      events: [...p.events, newEvent].sort((a, b) => a.idx - b.idx),
    }));
  }

  if (!project) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG }}>
        <Text style={{ color: TXT_SEC }}>プロジェクトが見つかりません</Text>
      </View>
    );
  }

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
            <Text style={s.amtSub}>{project.goalLabel}</Text>
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
      <View
        ref={graphCardRef}
        style={s.graphCard}
        onLayout={() => {
          graphCardRef.current?.measure((_x, _y, _w, h, _px, py) => {
            setGraphCardBottom(py + h);
          });
        }}
      >
        <View style={s.graphTop}>
          {/* 凡例 */}
          <View style={s.legend}>
            <View style={s.legendItem}><View style={s.legendLine} /><Text style={s.legendTxt}>試算</Text></View>
            <View style={s.legendItem}><View style={s.legendDot} /><Text style={s.legendTxt}>夢★</Text></View>
            <View style={s.legendItem}><View style={s.legendDotExp} /><Text style={s.legendTxt}>支出</Text></View>
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
        <TrialChart
          project={project} chartPlan={chartPlan} svgW={svgW}
          period={period} lifetimeYears={lifeYears}
          highlightYearIdx={highlightYearIdx} pulseOpacity={pulseOpacity}
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

      {/* 年表エリア（計画のみ1カラム） */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.eventsContent, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {planCards.map(card => (
          <PlanCard
            key={card.cardId}
            yearLabel={card.yearLabel}
            name={card.name}
            detail={'detail' in card ? card.detail : undefined}
            amtLabel={card.amtLabel}
            amtPos={activeTab === 'saving'}
            isSelected={selectedCardId === card.cardId}
            onPress={() => handleCardSelect(card.cardId, card.yearIdx)}
          />
        ))}
        {activeTab === 'expense' && (
          <Pressable style={s.addBtn} onPress={() => setActivePopup('add-expense')}>
            <Text style={s.addBtnTxt}>+ 支出を追加</Text>
          </Pressable>
        )}
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

      {/* 積立計画ポップアップ */}
      <PlanSavingPopup
        visible={activePopup === 'plan-saving'}
        yearLabel={popupContext.label}
        initAmt={popupContext.amtMan}
        modalHeight={graphCardBottom > 0 ? screenHeight - graphCardBottom : screenHeight * 0.6}
        onClose={() => { setActivePopup(null); if (project) setChartPlan([...project.plan]); }}
        onAmountChange={handlePlanSavingAmountChange}
        onSave={handleSavePlanSaving}
      />

      {/* 支出計画ポップアップ */}
      <PlanExpensePopup
        visible={activePopup === 'plan-expense'}
        eventName={popupContext.name}
        initAmt={popupContext.amtMan}
        modalHeight={graphCardBottom > 0 ? screenHeight - graphCardBottom : screenHeight * 0.6}
        onClose={() => { setActivePopup(null); if (project) setChartPlan([...project.plan]); }}
        onAmountChange={handlePlanExpenseAmountChange}
        onSave={handleSavePlanExpense}
      />

      {/* 教育費テンプレート選択モーダル */}
      <ExpenseTemplatePicker
        visible={activePopup === 'add-expense'}
        onClose={() => setActivePopup(null)}
        onSelect={handleTemplateSelect}
      />
    </View>
  );
}

// ══════════════════════════════════════════════
// スタイル
// ══════════════════════════════════════════════

const s = StyleSheet.create({
  hdr: { backgroundColor: BG, paddingHorizontal: 16, paddingBottom: 10 },
  back: { fontSize: 16, color: TRIAL_C, fontWeight: '500', marginBottom: 6 },
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
  aiIcon: { fontSize: 14, color: TRIAL_C, lineHeight: 22 },
  aiLabel: { fontSize: 11, color: TRIAL_C, fontWeight: '500', marginBottom: 1 },
  aiTxt: { fontSize: 12, color: TRIAL_C, lineHeight: 16 },

  graphCard: {
    backgroundColor: CARD, borderRadius: 12,
    marginHorizontal: 16, marginBottom: 8,
    paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6,
    borderWidth: 0.5, borderColor: BORDER,
  },
  graphTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 8 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendLine: { width: 14, height: 2.5, backgroundColor: TRIAL_C, borderRadius: 1 },
  legendDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: DREAM_C },
  legendDotExp: { width: 8, height: 8, borderRadius: 4, backgroundColor: EXPENSE_C },
  legendTxt: { fontSize: 10, color: TXT_SEC },
  legendUnit: { fontSize: 9, color: TXT_TER, marginLeft: 4 },
  periodRow: { flexDirection: 'row', gap: 4 },
  periodBtn: {
    paddingHorizontal: 9, paddingVertical: 3, borderRadius: 14,
    borderWidth: 0.5, borderColor: BORDER_MD,
  },
  periodBtnActive: { backgroundColor: TRIAL_C, borderColor: TRIAL_C },
  periodTxt: { fontSize: 10, color: TXT_SEC },
  periodTxtActive: { color: '#fff', fontWeight: '500' },

  typeTabs: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, marginBottom: 8 },
  typeTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 8, borderRadius: 10,
    borderWidth: 0.5, borderColor: BORDER_MD,
  },
  typeTabActive: { backgroundColor: TRIAL_C, borderColor: TRIAL_C },
  typeTabIcon: { fontSize: 14 },
  typeTabTxt: { fontSize: 13, fontWeight: '500', color: TXT_SEC },
  typeTabTxtActive: { color: '#fff', fontWeight: '600' },

  eventsContent: { paddingHorizontal: 16 },

  addBtn: {
    marginTop: 8, padding: 16,
    borderWidth: 1, borderColor: BORDER_MD, borderStyle: 'dashed',
    borderRadius: 12, alignItems: 'center',
  },
  addBtnTxt: { fontSize: 14, color: TXT_SEC, fontWeight: '500' },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 10,
    backgroundColor: BG,
  },
  editBtn: {
    backgroundColor: TRIAL_C, borderRadius: 14,
    paddingVertical: 13, alignItems: 'center',
  },
  editBtnDisabled: { backgroundColor: 'rgba(0,0,0,0.15)' },
  editBtnTxt: { fontSize: 14, fontWeight: '600', color: '#fff' },
  editBtnTxtDisabled: { color: TXT_TER },
});

const pc = StyleSheet.create({
  card: {
    backgroundColor: CARD, borderRadius: 12, marginBottom: 6,
    borderWidth: 0.5, borderColor: BORDER,
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 12, paddingHorizontal: 14,
    overflow: 'hidden',
  },
  cardSel: { backgroundColor: '#E6F6F1', borderColor: TRIAL_C, borderWidth: 1.5 },
  dot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: TRIAL_C, marginTop: 3,
    flexShrink: 0,
  },
  year: { fontSize: 11, color: TXT_SEC, marginBottom: 2 },
  name: { fontSize: 13, fontWeight: '600', color: TXT_PRI, lineHeight: 16, marginBottom: 1 },
  detail: { fontSize: 10, color: TXT_TER, lineHeight: 14, marginBottom: 2 },
  amt: { fontSize: 12, fontWeight: '600' },
  amtPos: { color: TRIAL_C },
  amtNeg: { color: EXPENSE_C },
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
  unitTabActive: { backgroundColor: TRIAL_C, borderColor: TRIAL_C },
  unitTabTxt: { fontSize: 11, color: TXT_SEC },
  unitTabTxtActive: { color: '#fff', fontWeight: '500' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  btnSec: {
    paddingVertical: 12, paddingHorizontal: 18,
    borderWidth: 0.5, borderColor: BORDER_MD, borderRadius: 12,
  },
  btnSecTxt: { fontSize: 14, color: TXT_SEC },
  btnPri: { flex: 1, backgroundColor: TRIAL_C, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  btnPriTxt: { fontSize: 14, fontWeight: '600', color: '#fff' },
});

const tpl = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: {
    width: '30%', backgroundColor: CARD,
    borderRadius: 12, padding: 12,
    alignItems: 'center', gap: 4,
    borderWidth: 0.5, borderColor: BORDER,
  },
  emoji: { fontSize: 24 },
  cellTxt: { fontSize: 12, fontWeight: '600', color: TXT_PRI, textAlign: 'center' },
  subtypeRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD, borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 0.5, borderColor: BORDER,
  },
  subtypeName: { fontSize: 15, fontWeight: '600', color: TXT_PRI },
  subtypeAmt: { fontSize: 12, color: TXT_SEC, marginTop: 2 },
  subtypeArrow: { fontSize: 22, color: TXT_SEC },
  backBtn: { marginTop: 8, padding: 12, alignItems: 'center' },
  backBtnTxt: { fontSize: 14, color: TRIAL_C, fontWeight: '500' },
});
