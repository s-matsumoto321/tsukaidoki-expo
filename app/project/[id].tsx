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
import { useState, useRef, useCallback } from 'react';
import { PROJECTS, type ProjectEvent } from '@/constants/projects';
import { useStore } from '@/store/useStore';
import { BalanceSheet } from '@/components/balance-sheet';

const C = {
  brand: '#1A5C6B',
  brandDark: '#134754',
  green: '#1D9E75',
  red: '#D64040',
  orange: '#C4622D',
  bg: '#F7F3EC',
  card: '#FFFDF8',
  aiCard: '#E4F2F6',
  textPrimary: '#2C2825',
  textSecondary: '#7A7268',
  textTertiary: '#A09890',
  border: 'rgba(0,0,0,0.07)',
  borderMd: 'rgba(0,0,0,0.15)',
  warn: '#FBF0E6',
  danger: '#FCEBEB',
  posText: '#0F5C3A',
  negText: '#791F1F',
};

// ─── Chart helpers ───────────────────────────────────────────────

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

// ─── LineChart ───────────────────────────────────────────────────

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

  return (
    <Svg width={svgW} height={SVG_H}>
      {/* Grid + Y labels */}
      {ticks.map(v => (
        <G key={v}>
          <SvgLine
            x1={PL} y1={yv(v)} x2={svgW - PR} y2={yv(v)}
            stroke="rgba(26,92,107,0.12)" strokeWidth={0.5}
          />
          <SvgText x={PL - 4} y={yv(v) + 3} textAnchor="end" fontSize={8} fill="#9A9088">
            {fmtY(v)}
          </SvgText>
        </G>
      ))}

      {/* X labels */}
      {project.years.map((yr, i) =>
        (i % xStep === 0 || i === n - 1) ? (
          <SvgText key={i} x={xi(i)} y={SVG_H - 4} textAnchor="middle" fontSize={8} fill="#9A9088">
            {yr}
          </SvgText>
        ) : null
      )}

      {/* Plan line */}
      <Polyline
        points={planPts}
        fill="none" stroke={C.brand} strokeWidth={1.5}
        strokeDasharray="4 3" opacity={0.65}
      />

      {/* Actual line */}
      {actualIdx.length > 1 && (
        <Polyline
          points={actualPts}
          fill="none" stroke={C.green} strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round"
        />
      )}

      {/* Spend vertical dashes */}
      {project.events
        .filter(ev => ev.type === 'spend')
        .map(ev => (
          <SvgLine
            key={`vl-${ev.idx}`}
            x1={xi(ev.idx)} y1={PT} x2={xi(ev.idx)} y2={PT + gH}
            stroke={C.red} strokeWidth={0.5} strokeDasharray="3 2" opacity={0.3}
          />
        ))}

      {/* Event hit areas + dots */}
      {project.events.map(ev => {
        const cx = xi(ev.idx);
        const cy = yv(project.plan[ev.idx]);
        const color = ev.type === 'spend' ? C.red : ev.type === 'in' ? C.orange : C.brand;
        const sel = selectedIdx === ev.idx;
        return (
          <G key={`ev-${ev.idx}`} onPress={() => onSelect(ev, cx, cy)}>
            <Circle cx={cx} cy={cy} r={14} fill="rgba(0,0,0,0)" />
            {sel && <Circle cx={cx} cy={cy} r={9} fill={color} opacity={0.2} />}
            {ev.type === 'spend' ? (
              <Circle cx={cx} cy={cy} r={sel ? 6 : 5} fill={color} />
            ) : (
              <Circle cx={cx} cy={cy} r={sel ? 5 : 4} fill={color} stroke="#fff" strokeWidth={1.5} />
            )}
          </G>
        );
      })}

      {/* Actual dots */}
      {actualIdx.map(i => (
        <Circle key={`ad-${i}`} cx={xi(i)} cy={yv(project.actual[i]!)} r={2.5} fill={C.green} />
      ))}

      {/* Glow on last actual point */}
      {actualIdx.length > 0 && (() => {
        const li = actualIdx[actualIdx.length - 1];
        return <Circle cx={xi(li)} cy={yv(project.actual[li]!)} r={6} fill={C.green} opacity={0.2} />;
      })()}
    </Svg>
  );
}

// ─── Main screen ─────────────────────────────────────────────────

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

  const svgW = screenWidth - 52;
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

  const tipLeft = tooltip
    ? Math.max(0, Math.min(tooltip.x - TIP_W / 2, svgW - TIP_W))
    : 0;
  const showAbove = tooltip ? tooltip.y - TIP_H - 10 >= 0 : false;
  const tipTop = tooltip
    ? (showAbove ? tooltip.y - TIP_H - 10 : tooltip.y + 10)
    : 0;
  const arrowLeft = tooltip
    ? Math.max(6, Math.min(tooltip.x - tipLeft - 5, TIP_W - 16))
    : 0;

  return (
    <View style={{ flex: 1 }}>
      {/* ── Brand header ── */}
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={s.amt}>¥{currentAmount.toLocaleString('ja-JP')}</Text>
              <Pressable onPress={() => setSheetVisible(true)} style={s.editBtn} hitSlop={8}>
                <Text style={s.editTxt}>修正</Text>
              </Pressable>
            </View>
            <Text style={s.amtSub}>{project.goalLabel} · {project.statusTxt}</Text>
          </View>
        </View>
      </View>

      {/* ── Content ── */}
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        {/* AI insight */}
        <View style={s.aiCard}>
          <Text style={s.aiIcon}>✦</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.aiLabel}>AI インサイト</Text>
            <Text style={s.aiTxt}>{project.ai}</Text>
          </View>
        </View>

        {/* Graph card */}
        <View style={s.graphCard}>
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

          <View style={{ position: 'relative' }}>
            <LineChart
              id={id ?? ''}
              svgW={svgW}
              selectedIdx={selectedIdx}
              onSelect={handleSelect}
            />
            {tooltip && (
              <View style={[s.tooltip, { left: tipLeft, top: tipTop }]}>
                <Text style={s.tipTitle}>{tooltip.event.year}　{tooltip.event.name}</Text>
                <Text style={[s.tipAmt, tooltip.event.pos ? s.tipPos : s.tipNeg]}>
                  {tooltip.event.amt}
                </Text>
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

        {/* Events section */}
        <View style={{ flex: 1, paddingBottom: insets.bottom }}>
          <View style={s.secRow}>
            <Text style={s.secTitle}>{isAccount ? '入出金・取引の年表' : '積み立て・支出の年表'}</Text>
            <Text style={s.secSub}>スクロールで確認</Text>
          </View>
          <View style={s.evCardWrap}>
            <ScrollView
              ref={scrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingVertical: 4, paddingHorizontal: 12 }}
            >
              {project.events.map((ev, idx) => {
                const sel = selectedIdx === ev.idx;
                const isLast = idx === project.events.length - 1 && myUserEvents.length === 0;
                return (
                  <Pressable
                    key={ev.idx}
                    style={[
                      s.evRow,
                      !isLast && s.evRowBorder,
                      sel && { backgroundColor: ev.type === 'spend' ? C.danger : C.warn, borderRadius: 8 },
                    ]}
                    onLayout={e => { rowY.current[ev.idx] = e.nativeEvent.layout.y; }}
                    onPress={() => handleRowPress(ev)}
                  >
                    <Text style={s.evYr}>{ev.year}</Text>
                    <View style={[s.evDot, { backgroundColor: ev.dot }]} />
                    <View style={{ flex: 1, minWidth: 0 }}>
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
                  <View
                    key={ev.id}
                    style={[s.evRow, !isLast && s.evRowBorder]}
                  >
                    <Text style={s.evYr}>{ev.date}</Text>
                    <View style={[s.evDot, { backgroundColor: ev.dot }]} />
                    <View style={{ flex: 1, minWidth: 0 }}>
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
    backgroundColor: C.brand,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  backTxt: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 6 },
  hdrRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 },
  projName: { fontSize: 15, fontWeight: '600', color: '#fff', lineHeight: 20 },
  timing: { fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 1 },
  amtLabel: { fontSize: 9, color: 'rgba(255,255,255,0.5)' },
  editBtn: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  editTxt: { fontSize: 10, color: '#fff', fontWeight: '500' },
  amt: { fontSize: 20, fontWeight: '700', color: '#fff', lineHeight: 24, letterSpacing: -0.3 },
  amtSub: { fontSize: 9, color: 'rgba(255,255,255,0.5)', marginTop: 2 },

  aiCard: {
    margin: 10,
    marginBottom: 6,
    backgroundColor: C.aiCard,
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  aiIcon: { fontSize: 13, color: C.brand, lineHeight: 20 },
  aiLabel: { fontSize: 9, color: C.brand, fontWeight: '600', marginBottom: 2, letterSpacing: 0.3 },
  aiTxt: { fontSize: 11, color: C.brandDark, lineHeight: 16 },

  graphCard: {
    marginHorizontal: 14,
    marginBottom: 6,
    backgroundColor: C.card,
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    shadowColor: '#1A3040',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  legendRow: { flexDirection: 'row', gap: 12, marginBottom: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendSolid: { width: 14, height: 2, borderRadius: 1 },
  legendDotR: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.red },
  legendTxt: { fontSize: 10, color: C.textSecondary },
  graphHint: { fontSize: 9, color: C.textTertiary, marginTop: 4, textAlign: 'center' },

  tooltip: {
    position: 'absolute',
    backgroundColor: C.card,
    borderWidth: 0.5,
    borderColor: C.borderMd,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 9,
    shadowColor: '#1A3040',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 10,
    minWidth: 100,
  },
  tipTitle: { fontSize: 10, fontWeight: '500', color: C.textPrimary, marginBottom: 1 },
  tipAmt: { fontSize: 9 },
  tipPos: { color: C.posText },
  tipNeg: { color: C.negText },
  tipArrow: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 5,
    borderBottomWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },

  secRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  secTitle: { fontSize: 10, fontWeight: '500', color: C.textSecondary },
  secSub: { fontSize: 9, color: C.textTertiary },
  evCardWrap: {
    flex: 1,
    marginHorizontal: 14,
    backgroundColor: C.card,
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#1A3040',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  evRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 6,
    marginHorizontal: -6,
  },
  evRowBorder: { borderBottomWidth: 0.5, borderBottomColor: C.border },
  evYr: { fontSize: 10, color: C.textSecondary, width: 34, paddingTop: 1 },
  evDot: { width: 8, height: 8, borderRadius: 4, marginTop: 3, flexShrink: 0 },
  evName: { fontSize: 11, fontWeight: '500', color: C.textPrimary },
  evDetail: { fontSize: 9, color: C.textSecondary, marginTop: 1 },
  evAmt: { fontSize: 10, fontWeight: '500', marginTop: 1 },
  evPos: { color: C.posText },
  evNeg: { color: C.negText },
});
