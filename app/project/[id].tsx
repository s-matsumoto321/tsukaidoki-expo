import { View, Text, ScrollView, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Line as SvgLine,
  Polyline,
  Circle,
  Text as SvgText,
  G,
} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useState, useRef, useCallback, useEffect } from 'react';

const AnimatedPolyline = Animated.createAnimatedComponent(Polyline);
import { PROJECTS, type ProjectEvent } from '@/constants/projects';
import { useStore } from '@/store/useStore';
import { BalanceSheet } from '@/components/balance-sheet';

const C = {
  dark: '#072A35',
  darkMid: '#0E3D4D',
  accent: '#00C5A3',
  green: '#2ECC8F',
  red: '#F05050',
  orange: '#E07845',
  bg: '#EEEAE0',
  card: '#FFFFFF',
  textPrimary: '#161C1E',
  textSecondary: '#717870',
  textTertiary: '#ABA8A2',
  border: 'rgba(0,0,0,0.06)',
  borderMd: 'rgba(0,0,0,0.14)',
  warn: '#FBF0E6',
  danger: '#FDECEC',
  posText: '#065C3A',
  negText: '#7A1515',
};

function polylineLength(points: string): number {
  if (!points) return 0;
  const coords = points.trim().split(' ').map(p => {
    const [x, y] = p.split(',').map(Number);
    return { x, y };
  });
  let len = 0;
  for (let i = 1; i < coords.length; i++) {
    const dx = coords[i].x - coords[i - 1].x;
    const dy = coords[i].y - coords[i - 1].y;
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
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

const SVG_H = 160;
const PL = 44;
const PR = 12;
const PT = 12;
const PB = 22;

type TooltipState = { x: number; y: number; event: ProjectEvent };

function LineChart({ id, svgW, selectedIdx, onSelect }: {
  id: string;
  svgW: number;
  selectedIdx: number | null;
  onSelect: (ev: ProjectEvent, x: number, y: number) => void;
}) {
  const project = PROJECTS[id];
  if (!project) return null;

  const gW = svgW - PL - PR;
  const gH = SVG_H - PT - PB;
  const n = project.years.length;

  const allVals = [
    ...project.plan,
    ...project.actual.filter((v): v is number => v !== null),
  ];
  const rawMax = Math.max(...allVals);
  const step = niceTickStep(rawMax, 4);
  const maxVal = Math.ceil(rawMax / step) * step;

  const xi = (i: number) => PL + (n === 1 ? gW / 2 : i * (gW / (n - 1)));
  const yv = (v: number) => PT + gH - (v / maxVal) * gH;

  const ticks: number[] = [];
  for (let v = 0; v <= maxVal; v += step) ticks.push(v);

  const xStep = Math.max(1, Math.ceil(n / 5));
  const actualIdx = project.actual
    .map((v, i) => (v !== null ? i : -1))
    .filter(i => i !== -1);

  const planPts = project.plan.map((v, i) => `${xi(i)},${yv(v)}`).join(' ');
  const actualPts = actualIdx.map(i => `${xi(i)},${yv(project.actual[i]!)}`).join(' ');

  const planLen = polylineLength(planPts);
  const actualLen = polylineLength(actualPts);

  const planOffset = useSharedValue(planLen);
  const actualOffset = useSharedValue(actualLen);

  useEffect(() => {
    planOffset.value = planLen;
    actualOffset.value = actualLen;
    planOffset.value = withTiming(0, { duration: 700, easing: Easing.out(Easing.cubic) });
    actualOffset.value = withDelay(400, withTiming(0, { duration: 1000, easing: Easing.out(Easing.cubic) }));
  }, [id]);

  const planAnimProps = useAnimatedProps(() => ({ strokeDashoffset: planOffset.value }));
  const actualAnimProps = useAnimatedProps(() => ({ strokeDashoffset: actualOffset.value }));

  return (
    <Svg width={svgW} height={SVG_H}>
      {ticks.map(v => (
        <G key={v}>
          <SvgLine
            x1={PL} y1={yv(v)} x2={svgW - PR} y2={yv(v)}
            stroke="rgba(7,42,53,0.08)" strokeWidth={0.5}
          />
          <SvgText x={PL - 5} y={yv(v) + 3} textAnchor="end" fontSize={9} fill="#ABA8A2">
            {fmtY(v)}
          </SvgText>
        </G>
      ))}

      {project.years.map((yr, i) =>
        (i % xStep === 0 || i === n - 1) ? (
          <SvgText key={i} x={xi(i)} y={SVG_H - 4} textAnchor="middle" fontSize={9} fill="#ABA8A2">
            {yr}
          </SvgText>
        ) : null
      )}

      <AnimatedPolyline
        points={planPts}
        fill="none" stroke={C.accent} strokeWidth={1.5}
        strokeDasharray={`${planLen} ${planLen}`}
        opacity={0.6}
        animatedProps={planAnimProps}
      />

      {actualIdx.length > 1 && (
        <AnimatedPolyline
          points={actualPts}
          fill="none" stroke={C.green} strokeWidth={2.5}
          strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray={`${actualLen} ${actualLen}`}
          animatedProps={actualAnimProps}
        />
      )}

      {project.events
        .filter(ev => ev.type === 'spend')
        .map(ev => (
          <SvgLine
            key={`vl-${ev.idx}`}
            x1={xi(ev.idx)} y1={PT} x2={xi(ev.idx)} y2={PT + gH}
            stroke={C.red} strokeWidth={0.5} strokeDasharray="3 2" opacity={0.3}
          />
        ))}

      {project.events.map(ev => {
        const cx = xi(ev.idx);
        const cy = yv(project.plan[ev.idx]);
        const color = ev.type === 'spend' ? C.red : ev.type === 'in' ? C.orange : C.accent;
        const sel = selectedIdx === ev.idx;
        return (
          <G key={`ev-${ev.idx}`} onPress={() => onSelect(ev, cx, cy)}>
            <Circle cx={cx} cy={cy} r={14} fill="rgba(0,0,0,0)" />
            {sel && <Circle cx={cx} cy={cy} r={10} fill={color} opacity={0.18} />}
            {ev.type === 'spend' ? (
              <Circle cx={cx} cy={cy} r={sel ? 6 : 5} fill={color} />
            ) : (
              <Circle cx={cx} cy={cy} r={sel ? 5 : 4} fill={color} stroke="#fff" strokeWidth={1.5} />
            )}
          </G>
        );
      })}

      {actualIdx.map(i => (
        <Circle key={`ad-${i}`} cx={xi(i)} cy={yv(project.actual[i]!)} r={3} fill={C.green} />
      ))}

      {actualIdx.length > 0 && (() => {
        const li = actualIdx[actualIdx.length - 1];
        return (
          <>
            <Circle cx={xi(li)} cy={yv(project.actual[li]!)} r={8} fill={C.green} opacity={0.15} />
            <Circle cx={xi(li)} cy={yv(project.actual[li]!)} r={4} fill={C.green} />
          </>
        );
      })()}
    </Svg>
  );
}

export default function ProjectDetailScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const project = PROJECTS[id ?? ''];
  const isAccount = project?.kind === 'account';
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const { balances, userEvents } = useStore();
  const currentAmount = balances[id ?? ''] ?? project?.now ?? 0;
  const myUserEvents = userEvents[id ?? ''] ?? [];

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const rowY = useRef<Record<number, number>>({});
  const tipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const svgW = screenWidth - 48;
  const TIP_W = 140;
  const TIP_H = 48;

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

  const tipLeft = tooltip ? Math.max(0, Math.min(tooltip.x - TIP_W / 2, svgW - TIP_W)) : 0;
  const showAbove = tooltip ? tooltip.y - TIP_H - 10 >= 0 : false;
  const tipTop = tooltip ? (showAbove ? tooltip.y - TIP_H - 10 : tooltip.y + 10) : 0;
  const arrowLeft = tooltip ? Math.max(6, Math.min(tooltip.x - tipLeft - 5, TIP_W - 16)) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: C.dark }}>
      {/* ── ダークヘッダー ── */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
          <Text style={s.backTxt}>← {from === 'pool' ? 'プール金' : 'ポートフォリオ'}</Text>
        </Pressable>
        <View style={s.hdrBody}>
          <View style={{ flex: 1 }}>
            <Text style={s.projName}>{project.name}</Text>
            <Text style={s.timing}>{project.timing}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.amtLabel}>{isAccount ? '現在の残高' : '現在の積み立て'}</Text>
            <Text style={s.amt}>¥{currentAmount.toLocaleString('ja-JP')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <Text style={s.amtSub}>{project.goalLabel} · {project.statusTxt}</Text>
              <Pressable onPress={() => setSheetVisible(true)} style={s.editBtn} hitSlop={8}>
                <Text style={s.editTxt}>修正</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      {/* ── コンテンツ（カーブ遷移） ── */}
      <View style={{ flex: 1, backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -12 }}>
        {/* AI insight */}
        <View style={s.aiCard}>
          <View style={s.aiDot}><Text style={s.aiDotTxt}>✦</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.aiLabel}>AI インサイト</Text>
            <Text style={s.aiTxt}>{project.ai}</Text>
          </View>
        </View>

        {/* Graph card */}
        <View style={s.graphCard}>
          <View style={s.legendRow}>
            <View style={s.legendItem}>
              <Svg width={16} height={4}>
                <SvgLine x1={0} y1={2} x2={16} y2={2} stroke={C.accent} strokeWidth={2} strokeDasharray="5 3" />
              </Svg>
              <Text style={s.legendTxt}>計画</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.legendSolid, { backgroundColor: C.green }]} />
              <Text style={s.legendTxt}>実績</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: C.red }]} />
              <Text style={s.legendTxt}>支出</Text>
            </View>
          </View>

          <View style={{ position: 'relative' }}>
            <LineChart id={id ?? ''} svgW={svgW} selectedIdx={selectedIdx} onSelect={handleSelect} />
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
          <Text style={s.graphHint}>点をタップで詳細を表示</Text>
        </View>

        {/* Events */}
        <View style={{ flex: 1 }}>
          <View style={s.secRow}>
            <Text style={s.secTitle}>{isAccount ? '入出金・取引の年表' : '積み立て・支出の年表'}</Text>
            <Text style={s.secSub}>タップでハイライト</Text>
          </View>
          <View style={[s.evCard, { marginBottom: insets.bottom + 8 }]}>
            <ScrollView
              ref={scrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingVertical: 4, paddingHorizontal: 14 }}
            >
              {project.events.map((ev, idx) => {
                const sel = selectedIdx === ev.idx;
                const isLast = idx === project.events.length - 1 && myUserEvents.length === 0;
                return (
                  <Pressable
                    key={ev.idx}
                    style={[s.evRow, !isLast && s.evRowBorder, sel && { backgroundColor: ev.type === 'spend' ? C.danger : C.warn, borderRadius: 10 }]}
                    onLayout={e => { rowY.current[ev.idx] = e.nativeEvent.layout.y; }}
                    onPress={() => handleRowPress(ev)}
                  >
                    <Text style={s.evYr}>{ev.year}</Text>
                    <View style={[s.evDot, { backgroundColor: ev.dot }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.evName}>{ev.name}</Text>
                      <Text style={s.evDetail}>{ev.detail}</Text>
                      <Text style={[s.evAmt, ev.pos ? s.evPos : s.evNeg]}>{ev.amt}</Text>
                    </View>
                  </Pressable>
                );
              })}
              {myUserEvents.map((ev, idx) => {
                const isLast = idx === myUserEvents.length - 1;
                return (
                  <View key={ev.id} style={[s.evRow, !isLast && s.evRowBorder]}>
                    <Text style={s.evYr}>{ev.date}</Text>
                    <View style={[s.evDot, { backgroundColor: ev.dot }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.evName}>{ev.name}</Text>
                      <Text style={s.evDetail}>{ev.detail}</Text>
                      <Text style={[s.evAmt, ev.pos ? s.evPos : s.evNeg]}>{ev.amt}</Text>
                    </View>
                  </View>
                );
              })}
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
  header: {
    backgroundColor: C.dark,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backBtn: { marginBottom: 10 },
  backTxt: { fontSize: 12, color: 'rgba(255,255,255,0.55)' },
  hdrBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  projName: { fontSize: 16, fontWeight: '700', color: '#fff', lineHeight: 22 },
  timing: { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  amtLabel: { fontSize: 9, color: 'rgba(255,255,255,0.45)', marginBottom: 2 },
  amt: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  amtSub: { fontSize: 9, color: 'rgba(255,255,255,0.45)' },
  editBtn: { backgroundColor: 'rgba(0,197,163,0.2)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  editTxt: { fontSize: 10, color: C.accent, fontWeight: '600' },

  aiCard: {
    margin: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(0,197,163,0.08)',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,197,163,0.2)',
  },
  aiDot: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(0,197,163,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  aiDotTxt: { fontSize: 12, color: C.accent },
  aiLabel: { fontSize: 9, color: C.accent, fontWeight: '700', letterSpacing: 0.5, marginBottom: 3 },
  aiTxt: { fontSize: 11, color: C.textPrimary, lineHeight: 16 },

  graphCard: {
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: C.card,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  legendRow: { flexDirection: 'row', gap: 14, marginBottom: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendSolid: { width: 16, height: 2.5, borderRadius: 2 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendTxt: { fontSize: 10, color: C.textSecondary },
  graphHint: { fontSize: 9, color: C.textTertiary, marginTop: 5, textAlign: 'center' },

  tooltip: {
    position: 'absolute',
    backgroundColor: C.card,
    borderWidth: 0.5,
    borderColor: C.borderMd,
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 10,
    minWidth: 100,
  },
  tipTitle: { fontSize: 10, fontWeight: '600', color: C.textPrimary, marginBottom: 1 },
  tipAmt: { fontSize: 9 },
  tipPos: { color: C.posText },
  tipNeg: { color: C.negText },
  tipArrow: {
    position: 'absolute',
    width: 0, height: 0,
    borderStyle: 'solid',
    borderLeftWidth: 5, borderRightWidth: 5,
    borderTopWidth: 5, borderBottomWidth: 5,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: 'transparent', borderBottomColor: 'transparent',
  },

  secRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 5,
  },
  secTitle: { fontSize: 11, fontWeight: '600', color: C.textSecondary },
  secSub: { fontSize: 9, color: C.textTertiary },
  evCard: {
    flex: 1,
    marginHorizontal: 12,
    backgroundColor: C.card,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  evRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    paddingVertical: 8,
    paddingHorizontal: 6,
    marginHorizontal: -6,
  },
  evRowBorder: { borderBottomWidth: 0.5, borderBottomColor: C.border },
  evYr: { fontSize: 10, color: C.textTertiary, width: 36, paddingTop: 2 },
  evDot: { width: 8, height: 8, borderRadius: 4, marginTop: 3.5, flexShrink: 0 },
  evName: { fontSize: 11, fontWeight: '600', color: C.textPrimary },
  evDetail: { fontSize: 9, color: C.textSecondary, marginTop: 1 },
  evAmt: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  evPos: { color: C.posText },
  evNeg: { color: C.negText },
});
