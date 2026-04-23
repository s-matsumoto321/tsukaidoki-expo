import { Fragment } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Line as SvgLine,
  Polyline,
  Circle,
  Text as SvgText,
  G,
  Rect,
  Path,
} from 'react-native-svg';
import { useState, useRef, useCallback } from 'react';
import { PROJECTS, type ProjectEvent, type ActualEvent } from '@/constants/projects';
import { useStore } from '@/store/useStore';
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
  danger: '#FCEBEB',
  posText: '#27500A',
  negText: '#791F1F',
};

// ─── Chart helpers ───────────────────────────────────────────────

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

const SVG_H = 140;
const PL = 42;
const PR = 10;
const PT = 10;
const PB = 20;

type TooltipState = { x: number; y: number; event: ProjectEvent };
type Period = '生涯' | '5年' | '1年';

// ─── LineChart ───────────────────────────────────────────────────

function LineChart({ id, svgW, selectedIdx, onSelect, period }: {
  id: string;
  svgW: number;
  selectedIdx: number | null;
  onSelect: (ev: ProjectEvent, x: number, y: number) => void;
  period: Period;
}) {
  const project = PROJECTS[id];
  if (!project) return null;

  const limitMap: Record<Period, number> = { '生涯': Infinity, '5年': 5, '1年': 1 };
  const firstYear = parseYear(project.years[0]);
  const limit = firstYear + limitMap[period];
  const cutIdx = project.years.findIndex(yr => parseYear(yr) > limit);
  const endN = cutIdx === -1 ? project.years.length : Math.max(2, cutIdx);

  const years = project.years.slice(0, endN);
  const plan = project.plan.slice(0, endN);
  const actual = project.actual.slice(0, endN);
  const visibleEvents = project.events.filter(ev => ev.idx < endN);

  const gW = svgW - PL - PR;
  const gH = SVG_H - PT - PB;
  const n = years.length;

  const allVals = [...plan, ...actual.filter((v): v is number => v !== null)];
  const rawMax = Math.max(...allVals);
  const step = niceTickStep(rawMax, 4);
  const maxVal = Math.ceil(rawMax / step) * step;

  const xi = (i: number) => PL + (n === 1 ? gW / 2 : i * (gW / (n - 1)));
  const yv = (v: number) => PT + gH - (v / maxVal) * gH;

  const ticks: number[] = [];
  for (let v = 0; v <= maxVal; v += step) ticks.push(v);

  const xStep = period === '1年' ? 1 : Math.max(1, Math.ceil(n / 5));
  const actualIdx = actual.map((v, i) => (v !== null ? i : -1)).filter(i => i !== -1);

  const planPts = plan.map((v, i) => `${xi(i)},${yv(v)}`).join(' ');
  const actualPts = actualIdx.map(i => `${xi(i)},${yv(actual[i]!)}`).join(' ');

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
      {period === '1年' && years.map((_, i) =>
        i > 0 && i < n - 1 ? (
          <SvgLine key={`vg-${i}`} x1={xi(i)} y1={PT} x2={xi(i)} y2={PT + gH} stroke="rgba(128,128,128,0.1)" strokeWidth={0.5} />
        ) : null
      )}
      <Polyline points={planPts} fill="none" stroke={C.brand} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.7} />
      {actualIdx.length > 1 && (
        <Polyline points={actualPts} fill="none" stroke={C.green} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      )}
      {visibleEvents.filter(ev => ev.type === 'spend').map(ev => (
        <SvgLine key={`vl-${ev.idx}`} x1={xi(ev.idx)} y1={PT} x2={xi(ev.idx)} y2={PT + gH} stroke={C.red} strokeWidth={0.5} strokeDasharray="3 2" opacity={0.3} />
      ))}
      {visibleEvents.map(ev => {
        const cx = xi(ev.idx);
        const cy = yv(project.plan[ev.idx]);
        const color = ev.type === 'spend' ? C.red : ev.type === 'in' ? C.orange : C.brand;
        const sel = selectedIdx === ev.idx;
        return (
          <G key={`ev-${ev.idx}`} onPress={() => onSelect(ev, cx, cy)}>
            <Circle cx={cx} cy={cy} r={14} fill="rgba(0,0,0,0)" />
            {sel && <Circle cx={cx} cy={cy} r={9} fill={color} opacity={0.2} />}
            {ev.type === 'spend'
              ? <Circle cx={cx} cy={cy} r={sel ? 6 : 5} fill={color} />
              : <Circle cx={cx} cy={cy} r={sel ? 5 : 4} fill={color} stroke="#fff" strokeWidth={1.5} />
            }
          </G>
        );
      })}
      {actualIdx.map(i => (
        <Circle key={`ad-${i}`} cx={xi(i)} cy={yv(actual[i]!)} r={2.5} fill={C.green} />
      ))}
      {actualIdx.length > 0 && (() => {
        const li = actualIdx[actualIdx.length - 1];
        return <Circle cx={xi(li)} cy={yv(actual[li]!)} r={6} fill={C.green} opacity={0.2} />;
      })()}
    </Svg>
  );
}

// ─── Car image ───────────────────────────────────────────────────

function CarImageCard() {
  return (
    <View style={s.carCard}>
      <View style={s.carImgArea}>
        <Svg width={160} height={80} viewBox="0 0 160 80">
          <Rect x={0} y={66} width={160} height={4} rx={2} fill="rgba(0,0,0,0.15)" />
          <Path d="M12,62 L12,42 Q12,38 16,38 L42,38 Q50,28 58,24 L110,24 Q118,24 124,34 L140,38 Q146,38 148,42 L148,62 Z" fill="#888780" />
          <Path d="M52,37 L60,25 L108,25 L118,37 Z" fill="#A0A09A" />
          <Path d="M56,36 L63,26 L100,26 L110,36 Z" fill="rgba(174,214,241,0.75)" />
          <Rect x={63} y={26} width={44} height={10} rx={2} fill="rgba(174,214,241,0.75)" />
          <SvgLine x1={88} y1={37} x2={88} y2={62} stroke="rgba(0,0,0,0.15)" strokeWidth={0.8} />
          <Rect x={142} y={46} width={6} height={5} rx={2} fill="#F5E08A" />
          <Rect x={12} y={46} width={5} height={5} rx={2} fill="#E24B4A" opacity={0.8} />
          <Circle cx={120} cy={63} r={13} fill="#333" />
          <Circle cx={120} cy={63} r={7} fill="#888" />
          <Circle cx={120} cy={63} r={3} fill="#aaa" />
          <Circle cx={46} cy={63} r={13} fill="#333" />
          <Circle cx={46} cy={63} r={7} fill="#888" />
          <Circle cx={46} cy={63} r={3} fill="#aaa" />
        </Svg>
      </View>
      <Text style={s.carCaption}>新車イメージ · 2028年 買い替え予定</Text>
    </View>
  );
}

// ─── Timeline pair row ───────────────────────────────────────────

function EventPairRow({
  planEv, actual, isLast, selected, onPlanPress, onEmptyPress,
}: {
  planEv: ProjectEvent;
  actual: ActualEvent | null | undefined;
  isLast: boolean;
  selected: boolean;
  onPlanPress: (ev: ProjectEvent) => void;
  onEmptyPress: () => void;
}) {
  const showCarImg = planEv.type === 'spend' && planEv.name.includes('車');

  return (
    <Fragment>
      <View style={[s.pairRow, !isLast && s.pairBorder, selected && s.pairRowSel]}>
        {/* 計画 */}
        <Pressable style={s.planCol} onPress={() => onPlanPress(planEv)}>
          <View style={s.evTopRow}>
            <Text style={s.evYr}>{planEv.year}</Text>
            <View style={[s.evDot, { backgroundColor: planEv.dot }]} />
          </View>
          <Text style={s.evName}>{planEv.name}</Text>
          <Text style={s.evDetail} numberOfLines={1} ellipsizeMode="tail">{planEv.detail}</Text>
          <Text style={[s.evAmt, planEv.pos ? s.evPos : s.evNeg]}>{planEv.amt}</Text>
        </Pressable>

        <View style={s.colDiv} />

        {/* 実績 */}
        {actual != null ? (
          <View style={s.actualCol}>
            <View style={s.evTopRow}>
              <Text style={s.evYr}>{actual.date}</Text>
              <View style={[s.evDot, { backgroundColor: actual.dot }]} />
            </View>
            <Text style={s.evName}>{actual.name}</Text>
            <Text style={s.evDetail} numberOfLines={1} ellipsizeMode="tail">{actual.detail}</Text>
            <Text style={[s.evAmt, actual.pos ? s.evPos : s.evNeg]}>{actual.amt}</Text>
          </View>
        ) : (
          <Pressable style={s.emptyCol} onPress={onEmptyPress}>
            <Text style={s.emptyTxt}>未入力</Text>
            <Text style={s.emptySub}>タップして記録</Text>
          </Pressable>
        )}
      </View>

      {/* 車画像（買い替えイベントの直後） */}
      {showCarImg && <CarImageCard />}
    </Fragment>
  );
}

// ─── Main screen ─────────────────────────────────────────────────

export default function ProjectDetailScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const project = PROJECTS[id ?? ''];
  const isAccount = project?.kind === 'account';
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const { balances } = useStore();
  const currentAmount = balances[id ?? ''] ?? project?.now ?? 0;

  const [period, setPeriod]   = useState<Period>('生涯');
  const [selectedIdx, setSelectedIdx]   = useState<number | null>(null);
  const [tooltip, setTooltip]           = useState<TooltipState | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const rowY      = useRef<Record<number, number>>({});
  const tipTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const svgW  = screenWidth - 52;
  const TIP_W = 136;
  const TIP_H = 46;

  const dismiss = useCallback(() => {
    setSelectedIdx(null);
    setTooltip(null);
  }, []);

  const handleSelect = useCallback((ev: ProjectEvent, x: number, y: number) => {
    if (tipTimer.current) clearTimeout(tipTimer.current);
    setSelectedIdx(ev.idx);
    setTooltip({ x, y, event: ev });
    const ry = rowY.current[ev.idx];
    if (ry !== undefined) scrollRef.current?.scrollTo({ y: ry, animated: true });
    tipTimer.current = setTimeout(dismiss, 3500);
  }, [dismiss]);

  const handleRowPress = useCallback((ev: ProjectEvent) => {
    if (tipTimer.current) clearTimeout(tipTimer.current);
    setSelectedIdx(ev.idx);
    setTooltip(null);
    tipTimer.current = setTimeout(dismiss, 3500);
  }, [dismiss]);

  if (!project) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg }}>
        <Text style={{ color: C.textSecondary }}>プロジェクトが見つかりません</Text>
      </View>
    );
  }

  const tipLeft   = tooltip ? Math.max(0, Math.min(tooltip.x - TIP_W / 2, svgW - TIP_W)) : 0;
  const showAbove = tooltip ? tooltip.y - TIP_H - 10 >= 0 : false;
  const tipTop    = tooltip ? (showAbove ? tooltip.y - TIP_H - 10 : tooltip.y + 10) : 0;
  const arrowLeft = tooltip ? Math.max(6, Math.min(tooltip.x - tipLeft - 5, TIP_W - 16)) : 0;

  return (
    <View style={{ flex: 1 }}>
      {/* ── ヘッダー ── */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={s.backTxt}>← {from === 'pool' ? 'プール金' : 'ポートフォリオ'}</Text>
        </Pressable>
        <View style={s.hdrRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.projName}>{project.name}</Text>
            <Text style={s.timing}>{project.timing}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.amtLabel}>{isAccount ? '現在の残高' : '現在の積み立て'}</Text>
            <Text style={s.amt}>¥{currentAmount.toLocaleString('ja-JP')}</Text>
            <Text style={s.amtSub}>{project.goalLabel} · {project.statusTxt}</Text>
          </View>
        </View>
      </View>

      {/* ── コンテンツ ── */}
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        {/* AI insight */}
        <View style={s.aiCard}>
          <Text style={s.aiIcon}>✦</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.aiLabel}>AI インサイト</Text>
            <Text style={s.aiTxt}>{project.ai}</Text>
          </View>
        </View>

        {/* グラフカード */}
        <View style={s.graphCard}>
          <View style={s.legendPeriodRow}>
            <View style={s.legendRow}>
              <View style={s.legendItem}>
                <Svg width={14} height={4}>
                  <SvgLine x1={0} y1={2} x2={14} y2={2} stroke={C.brand} strokeWidth={1.5} strokeDasharray="4 3" />
                </Svg>
                <Text style={s.legendTxt}>計画</Text>
              </View>
              <View style={s.legendItem}>
                <View style={[s.legendSolid, { backgroundColor: C.green }]} />
                <Text style={s.legendTxt}>実績</Text>
              </View>
              <View style={s.legendItem}>
                <View style={s.legendDotR} />
                <Text style={s.legendTxt}>支出</Text>
              </View>
            </View>
            <View style={s.periodRow}>
              {(['生涯', '5年', '1年'] as const).map(p => (
                <Pressable
                  key={p}
                  style={[s.periodBtn, period === p && s.periodBtnActive]}
                  onPress={() => { setPeriod(p); setSelectedIdx(null); setTooltip(null); }}
                >
                  <Text style={[s.periodTxt, period === p && s.periodTxtActive]}>{p}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={{ position: 'relative' }}>
            <LineChart id={id ?? ''} svgW={svgW} selectedIdx={selectedIdx} onSelect={handleSelect} period={period} />
            {tooltip && (
              <View style={[s.tooltip, { left: tipLeft, top: tipTop }]}>
                <Text style={s.tipTitle}>{tooltip.event.year}　{tooltip.event.name}</Text>
                <Text style={[s.tipAmt, tooltip.event.pos ? s.tipPos : s.tipNeg]}>{tooltip.event.amt}</Text>
                <View style={[
                  s.tipArrow,
                  showAbove ? { bottom: -5, borderTopColor: C.card } : { top: -5, borderBottomColor: C.card },
                  { left: arrowLeft },
                ]} />
              </View>
            )}
          </View>
          <Text style={s.graphHint}>● 点をタップ → 下の年表の該当項目へ</Text>
        </View>

        {/* 年表 */}
        <View style={{ flex: 1, paddingBottom: insets.bottom }}>
          <View style={s.secRow}>
            <Text style={s.secTitle}>{isAccount ? '入出金・取引の年表' : '積み立て・支出の年表'}</Text>
          </View>

          <View style={s.evCardWrap}>
            {/* 列ヘッダー */}
            <View style={s.colHeaderRow}>
              <Text style={s.colHeaderTxt}>計画</Text>
              <View style={s.colDiv} />
              <Text style={s.colHeaderTxt}>実績</Text>
            </View>

            <ScrollView
              ref={scrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 10, paddingVertical: 4 }}
            >
              {project.events.map((ev, idx) => (
                <View
                  key={ev.idx}
                  onLayout={e => { rowY.current[ev.idx] = e.nativeEvent.layout.y; }}
                >
                  <EventPairRow
                    planEv={ev}
                    actual={project.actuals?.[ev.idx]}
                    isLast={idx === project.events.length - 1}
                    selected={selectedIdx === ev.idx}
                    onPlanPress={handleRowPress}
                    onEmptyPress={() => setSheetVisible(true)}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>

      <BalanceSheet
        visible={sheetVisible}
        projectId={id ?? ''}
        currentAmount={currentAmount}
        label={project.name}
        onClose={() => setSheetVisible(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  header: { backgroundColor: C.brand, paddingHorizontal: 20, paddingBottom: 12 },
  backTxt: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 6 },
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
  legendDotR: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.red },
  legendTxt: { fontSize: 12, color: C.textSecondary },
  graphHint: { fontSize: 11, color: C.textSecondary, marginTop: 6, textAlign: 'center' },
  periodRow: { flexDirection: 'row', gap: 5 },
  periodBtn: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12, backgroundColor: C.bg,
    borderWidth: 0.5, borderColor: C.borderMd,
  },
  periodBtnActive: { backgroundColor: C.brand, borderColor: C.brand },
  periodTxt: { fontSize: 12, color: C.textSecondary, fontWeight: '500' },
  periodTxtActive: { color: '#fff' },

  tooltip: {
    position: 'absolute', backgroundColor: C.card,
    borderWidth: 0.5, borderColor: C.borderMd, borderRadius: 8,
    paddingVertical: 6, paddingHorizontal: 9,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 4, zIndex: 10, minWidth: 100,
  },
  tipTitle: { fontSize: 12, fontWeight: '500', color: C.textPrimary, marginBottom: 1 },
  tipAmt: { fontSize: 11 },
  tipPos: { color: C.posText },
  tipNeg: { color: C.negText },
  tipArrow: {
    position: 'absolute', width: 0, height: 0, borderStyle: 'solid',
    borderLeftWidth: 5, borderRightWidth: 5,
    borderTopWidth: 5, borderBottomWidth: 5,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: 'transparent', borderBottomColor: 'transparent',
  },

  secRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 4,
  },
  secTitle: { fontSize: 13, fontWeight: '500', color: C.textSecondary },

  evCardWrap: {
    flex: 1, marginHorizontal: 14,
    backgroundColor: C.card, borderWidth: 0.5, borderColor: C.border,
    borderRadius: 12, overflow: 'hidden',
  },

  // 列ヘッダー
  colHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    backgroundColor: C.bg,
  },
  colHeaderTxt: { flex: 1, fontSize: 11, fontWeight: '600', color: C.textSecondary, textAlign: 'center' },

  // 横並び行
  pairRow: { flexDirection: 'row', paddingVertical: 10 },
  pairBorder: { borderBottomWidth: 0.5, borderBottomColor: C.border },
  pairRowSel: { backgroundColor: C.warn },

  planCol:   { flex: 1, paddingRight: 8 },
  actualCol: { flex: 1, paddingLeft: 8 },

  colDiv: { width: 0.5, backgroundColor: C.border, marginVertical: 2 },

  // 未入力スロット
  emptyCol: {
    flex: 1, marginLeft: 8,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.14)', borderStyle: 'dashed', borderRadius: 8,
    justifyContent: 'center', alignItems: 'center', minHeight: 64,
  },
  emptyTxt: { fontSize: 12, color: C.textTertiary, fontWeight: '500' },
  emptySub: { fontSize: 10, color: C.textTertiary, marginTop: 3 },

  // イベント行コンテンツ
  evTopRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  evYr:     { fontSize: 11, color: C.textSecondary },
  evDot:    { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  evName:   { fontSize: 13, fontWeight: '500', color: C.textPrimary, lineHeight: 18 },
  evDetail: { fontSize: 10, color: C.textSecondary, marginTop: 1 },
  evAmt:    { fontSize: 12, fontWeight: '500', marginTop: 3 },
  evPos:    { color: C.posText },
  evNeg:    { color: C.negText },

  // 車画像
  carCard: {
    marginVertical: 8, borderRadius: 10, overflow: 'hidden',
    backgroundColor: '#EDECEA', borderWidth: 0.5, borderColor: C.border,
  },
  carImgArea: { height: 100, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E0DDD9' },
  carCaption: { fontSize: 11, color: C.textSecondary, textAlign: 'center', paddingVertical: 6 },
});
