import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, Pressable, StyleSheet, StatusBar, TextInput } from 'react-native';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { router } from 'expo-router';
import { PF_ITEMS, type FinancialItem } from '@/constants/data';
import { useStore } from '@/store/useStore';
import { colors, typography, fontSizes, spacing, radius, shadows } from '@/constants/theme';
import { usePalette } from '@/constants/colors';

type SortMode = 'custom' | 'urgent' | 'deadline';
type CardItem = FinancialItem & { amount: number };

const GOAL_YEARS: Record<string, number> = { edu: 2044, ret: 2050, car: 2028, trip: 2037 };
const PJ_TARGETS: Record<string, number> = { edu: 5_000_000, ret: 30_000_000, car: 2_000_000, trip: 2_660_000 };
const SHOWN_IDS = ['edu', 'ret', 'car', 'trip'];
const NOW_YEAR = new Date().getFullYear();

function getMonthlyAmt(
  entries: { fromYear: number; monthlyAmounts: Record<string, number> }[],
  projectId: string,
): number {
  const now = new Date().getFullYear();
  const sorted = [...entries].sort((a, b) => b.fromYear - a.fromYear);
  const entry = sorted.find(e => e.fromYear <= now);
  return entry?.monthlyAmounts[projectId] ?? 0;
}

// ─── AIインサイトカード ──────────────────────────────────────────────

function AiInsightCard({ text }: { text: string }) {
  if (!text) return null;
  return (
    <View style={s.aiWrap}>
      <View style={s.aiCard}>
        <Text style={s.aiIcon}>✦</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.aiLabel}>AIインサイト</Text>
          <Text style={s.aiTxt}>{text}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── 積立金調整パネル ─────────────────────────────────────────────────

type AllocationPanelProps = {
  pfItems: CardItem[];
  balances: Record<string, number>;
  localMonthly: Record<string, number>;
  localBalances: Record<string, number>;
  onChangeMonthly: (projectId: string, newAmt: number) => void;
  onChangeBalance: (projectId: string, newAmt: number) => void;
  onAiApply: (newMonthly: Record<string, number>) => void;
  onSave: () => void;
};

function AllocationPanel({
  pfItems, balances, localMonthly, localBalances,
  onChangeMonthly, onChangeBalance, onAiApply, onSave,
}: AllocationPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const totalMonthly = pfItems.reduce(
    (sum, i) => sum + (i.projectId ? (localMonthly[i.projectId] ?? 0) : 0), 0,
  );

  return (
    <View style={ap.wrap}>
      <View style={ap.body}>
        <Text style={ap.sectionLabel}>
          月の積立配分　合計 ¥{totalMonthly.toLocaleString('ja-JP')}/月
        </Text>
        {totalMonthly > 0 && (
          <View style={ap.allocBar}>
            {pfItems.filter(i => i.projectId).map(item => {
              const amt = item.projectId ? (localMonthly[item.projectId] ?? 0) : 0;
              if (amt <= 0) return null;
              return (
                <Fragment key={item.projectId}>
                  <View style={{ flex: amt, backgroundColor: item.color }} />
                </Fragment>
              );
            })}
          </View>
        )}
        <View style={ap.allocLegRow}>
          {pfItems.filter(i => i.projectId).map(item => {
            const amt = item.projectId ? (localMonthly[item.projectId] ?? 0) : 0;
            if (totalMonthly === 0) return null;
            const pct = Math.round((amt / totalMonthly) * 100);
            return (
              <View key={item.projectId} style={ap.allocLegItem}>
                <View style={[ap.allocDot, { backgroundColor: item.color }]} />
                <Text style={ap.allocLegName} numberOfLines={1}>{item.name}</Text>
                <Text style={ap.allocLegPct}>{pct}%</Text>
              </View>
            );
          })}
        </View>

        <Text style={[ap.sectionLabel, { marginTop: 14 }]}>各PJ調整（月積立 / 残高）</Text>
        {pfItems.filter(i => i.projectId).map(item => {
          const id = item.projectId!;
          const balance = localBalances[id] ?? balances[id] ?? item.amount;
          const monthly = localMonthly[id] ?? 0;
          const isEditingBal = editingId === id;
          return (
            <View key={id} style={ap.row}>
              <View style={[ap.pjDot, { backgroundColor: item.color }]} />
              <View style={ap.pjInfo}>
                <Text style={ap.pjName} numberOfLines={1}>{item.name}</Text>
                {isEditingBal ? (
                  <View style={ap.balanceEditRow}>
                    <Text style={ap.balancePrefix}>¥</Text>
                    <TextInput
                      style={ap.balanceInput}
                      value={String(balance)}
                      onChangeText={v => {
                        const n = parseInt(v.replace(/[^0-9]/g, ''), 10);
                        onChangeBalance(id, isNaN(n) ? 0 : n);
                      }}
                      keyboardType="number-pad"
                      autoFocus
                      onBlur={() => setEditingId(null)}
                      selectTextOnFocus
                    />
                  </View>
                ) : (
                  <Pressable style={ap.balancePressable} onPress={() => setEditingId(id)}>
                    <Text style={ap.pjBalance}>残高 ¥{balance.toLocaleString('ja-JP')}</Text>
                    <Text style={ap.editIcon}>✎</Text>
                  </Pressable>
                )}
              </View>
              <View style={ap.stepper}>
                <Pressable style={ap.stepBtn} onPress={() => onChangeMonthly(id, Math.max(0, monthly - 1000))}>
                  <Text style={ap.stepBtnTxt}>−</Text>
                </Pressable>
                <TextInput
                  style={ap.stepInput}
                  value={String(monthly)}
                  onChangeText={v => {
                    const n = parseInt(v.replace(/[^0-9]/g, ''), 10);
                    onChangeMonthly(id, isNaN(n) ? 0 : n);
                  }}
                  keyboardType="number-pad"
                  selectTextOnFocus
                />
                <Pressable style={ap.stepBtn} onPress={() => onChangeMonthly(id, monthly + 1000)}>
                  <Text style={ap.stepBtnTxt}>＋</Text>
                </Pressable>
              </View>
            </View>
          );
        })}

        <AiAllocationCard items={pfItems} localMonthly={localMonthly} onApply={onAiApply} />

        <Pressable style={ap.applyBtn} onPress={onSave}>
          <Text style={ap.applyBtnTxt}>適用する</Text>
        </Pressable>
      </View>
    </View>
  );
}

const ap = StyleSheet.create({
  wrap: { marginHorizontal: spacing.lg, marginBottom: spacing.sm },
  body: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    ...shadows.card,
    padding: 14,
  },
  sectionLabel: { fontSize: 11, color: colors.textMid, fontWeight: '500', marginBottom: 8, fontFamily: typography.display },
  allocBar: {
    flexDirection: 'row', height: 14, borderRadius: 7,
    overflow: 'hidden', marginBottom: 8,
  },
  allocLegRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  allocLegItem: {
    width: '50%', flexDirection: 'row', alignItems: 'center',
    gap: 4, paddingVertical: 2,
  },
  allocDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  allocLegName: { fontSize: 10, color: colors.textMid, flex: 1, fontFamily: typography.display },
  allocLegPct: { fontSize: 10, fontWeight: '600', color: colors.text, minWidth: 24, textAlign: 'right', fontFamily: typography.display },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: colors.divider,
  },
  pjDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  pjInfo: { flex: 1 },
  pjName: { fontSize: 13, fontWeight: '600', color: colors.text, fontFamily: typography.display },
  balancePressable: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  pjBalance: { fontSize: 11, color: colors.textMid, fontFamily: typography.display },
  editIcon: { fontSize: 11, color: colors.sage, fontFamily: typography.display },
  balanceEditRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 2, borderBottomWidth: 1, borderBottomColor: colors.sage,
    paddingBottom: 1,
  },
  balancePrefix: { fontSize: 12, color: colors.sage, fontWeight: '600', marginRight: 2, fontFamily: typography.display },
  balanceInput: {
    fontSize: 13, fontWeight: '600', color: colors.sage,
    paddingVertical: 0, minWidth: 80, fontFamily: typography.display,
  },
  stepper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bg, borderRadius: 8,
    borderWidth: 1, borderColor: colors.divider,
    overflow: 'hidden',
  },
  stepBtn: {
    width: 32, height: 32,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.sageBg,
  },
  stepBtnTxt: { fontSize: 18, color: colors.sage, fontWeight: '300', fontFamily: typography.display },
  stepInput: {
    width: 72, textAlign: 'center',
    fontSize: 13, fontWeight: '600', color: colors.text,
    paddingVertical: 6, fontFamily: typography.display,
  },
  applyBtn: {
    marginTop: 12, backgroundColor: colors.sage, borderRadius: radius.sm,
    paddingVertical: 12, alignItems: 'center',
  },
  applyBtnTxt: { fontSize: 14, fontWeight: '600', color: '#fff', fontFamily: typography.display },
});

// ─── AI自動配分調整カード ──────────────────────────────────────────────

type AiAllocCardProps = {
  items: CardItem[];
  localMonthly: Record<string, number>;
  onApply: (newMonthly: Record<string, number>) => void;
};

function AiAllocationCard({ items, localMonthly, onApply }: AiAllocCardProps) {
  const warnItems = items.filter(i => i.status === 'warn' && i.projectId);
  const hasWarn = warnItems.length > 0;

  const suggestion: Record<string, number> = { ...localMonthly };
  for (const item of warnItems) {
    if (item.projectId) {
      suggestion[item.projectId] = (localMonthly[item.projectId] ?? 0) + 15_000;
    }
  }
  const increase = 15_000 * warnItems.length;
  const warnNames = warnItems.map(i => i.name).join('と');

  return (
    <View style={aa.card}>
      <View style={aa.inner}>
        <Text style={aa.mark}>✦</Text>
        <View style={{ flex: 1 }}>
          <Text style={aa.title}>AI自動配分調整</Text>
          {hasWarn ? (
            <>
              <Text style={aa.txt}>
                {warnNames}の達成が遅れています。月+¥{increase.toLocaleString('ja-JP')}の増額を提案します。
              </Text>
              <Pressable style={aa.btn} onPress={() => onApply(suggestion)}>
                <Text style={aa.btnTxt}>提案を適用</Text>
              </Pressable>
            </>
          ) : (
            <Text style={aa.txt}>現在の配分は最適です。このままのペースを維持しましょう。</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const aa = StyleSheet.create({
  card: {
    marginTop: 12,
    backgroundColor: colors.honeyBg, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.honey,
  },
  inner: { padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  mark: { fontSize: 14, color: colors.honey, lineHeight: 22, fontFamily: typography.display },
  title: { fontSize: 12, color: colors.honey, fontWeight: '600', marginBottom: 3, fontFamily: typography.display },
  txt: { fontSize: 13, color: colors.text, lineHeight: 18, fontFamily: typography.display },
  btn: {
    marginTop: 8, backgroundColor: colors.honey,
    borderRadius: 8, paddingVertical: 7, paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  btnTxt: { fontSize: 12, fontWeight: '600', color: '#fff', fontFamily: typography.display },
});

// ─── 横積み比率バー ────────────────────────────────────────────────────

function AllocationBar({ items, surplus, total }: {
  items: CardItem[];
  surplus: number;
  total: number;
}) {
  if (total === 0) return null;
  const surplusColor = usePalette.neutral;
  return (
    <View style={s.allocWrap}>
      <View style={s.allocBar}>
        {items.map((item, i) => (
          <Fragment key={item.projectId ?? item.name}>
            {i > 0 && <View style={{ width: 2, backgroundColor: '#fff' }} />}
            <View style={{ flex: item.amount, backgroundColor: item.color }} />
          </Fragment>
        ))}
        {surplus > 0 && (
          <>
            <View style={{ width: 2, backgroundColor: '#fff' }} />
            <View style={{ flex: surplus, backgroundColor: surplusColor }} />
          </>
        )}
      </View>
      <View style={s.allocLegRow}>
        {items.map(item => (
          <View key={item.projectId ?? item.name} style={s.allocLegItem}>
            <View style={[s.allocDot, { backgroundColor: item.color }]} />
            <Text style={s.allocLegName} numberOfLines={1}>{item.name}</Text>
            <Text style={s.allocLegPct}>{Math.round((item.amount / total) * 100)}%</Text>
          </View>
        ))}
        {surplus > 0 && (
          <View style={s.allocLegItem}>
            <View style={[s.allocDot, { backgroundColor: surplusColor }]} />
            <Text style={s.allocLegName}>余剰資金</Text>
            <Text style={s.allocLegPct}>{Math.round((surplus / total) * 100)}%</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── プログレスバー ────────────────────────────────────────────────────

function ProgressBar({ progress, color }: { progress: number; color: string }) {
  return (
    <View style={s.barBg}>
      <View style={[s.barFill, { width: `${Math.min(progress * 100, 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

// ─── PJカード ──────────────────────────────────────────────────────────

function PjCard({
  color, name, amount, progress = 0, status, projectId, drag, isActive,
}: CardItem & { drag?: () => void; isActive?: boolean }) {
  const pct = Math.round(progress * 100);
  const onPress = () => projectId && router.push(`/project/${projectId}`);

  return (
    <Pressable
      style={[s.card, isActive && s.cardActive]}
      onPress={onPress}
      onLongPress={drag}
      delayLongPress={300}
    >
      <View style={[s.cardAccent, { backgroundColor: color }]} />
      <View style={s.cardBody}>
        <View style={s.cardTop}>
          <Text style={s.cardName}>{name}</Text>
          {status && (
            <View style={[s.badge, status === 'ok' ? s.badgeOk : s.badgeWarn]}>
              <Text style={[s.badgeTxt, status === 'ok' ? s.badgeOkTxt : s.badgeWarnTxt]}>
                {status === 'ok' ? '順調' : '要注意'}
              </Text>
            </View>
          )}
        </View>
        <View style={s.cardBottom}>
          <ProgressBar progress={progress} color={color} />
          <View style={s.cardStats}>
            <Text style={s.cardAmt}>¥{amount.toLocaleString('ja-JP')}</Text>
            <Text style={s.cardPct}>{pct}%</Text>
          </View>
        </View>
      </View>
      {drag && <Text style={s.dragHandle}>⠿</Text>}
    </Pressable>
  );
}

// ─── ソートバー ────────────────────────────────────────────────────────

function SortBar({ mode, onSelect }: { mode: SortMode; onSelect: (m: SortMode) => void }) {
  const options: { key: SortMode; label: string }[] = [
    { key: 'custom', label: 'カスタム' },
    { key: 'urgent', label: '緊急順' },
    { key: 'deadline', label: '時期順' },
  ];
  return (
    <View style={s.sortBar}>
      {options.map(o => (
        <Pressable
          key={o.key}
          style={[s.sortPill, mode === o.key && s.sortPillActive]}
          onPress={() => onSelect(o.key)}
        >
          <Text style={[s.sortPillText, mode === o.key && s.sortPillTextActive]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// ─── AIインサイト生成 ──────────────────────────────────────────────────

function generateAiInsight(items: CardItem[], dreams: { year: number; title: string; projectId: string }[]): string {
  const warnItems = items.filter(i => i.status === 'warn');
  const totalDreams = dreams.length;
  if (warnItems.length > 0) {
    const warnNames = warnItems.map(i => i.name).join('と');
    return `${totalDreams}つの夢のうち、${warnNames}の達成が遅れ気味です。積立額を見直すと改善できます。`;
  }
  return `${totalDreams}つの夢に向けて順調に積み上がっています。現在のペースを維持しましょう。`;
}

// ─── メイン画面 ────────────────────────────────────────────────────────

export default function DreamsScreen() {
  const { balances, dreamOrder, setDreamOrder, dreams, aiInsights, savingsAllocation, saveSavingsAllocation, updateBalance } = useStore();
  const [sortMode, setSortMode] = useState<SortMode>('custom');
  const [panelOpen, setPanelOpen] = useState(false);
  const [localMonthly, setLocalMonthly] = useState<Record<string, number>>({});
  const [localBalances, setLocalBalances] = useState<Record<string, number>>({});

  useEffect(() => {
    if (panelOpen) {
      const monthly: Record<string, number> = {};
      const bals: Record<string, number> = {};
      PF_ITEMS.forEach(item => {
        if (item.projectId && SHOWN_IDS.includes(item.projectId)) {
          monthly[item.projectId] = getMonthlyAmt(savingsAllocation.entries, item.projectId);
          bals[item.projectId] = balances[item.projectId] ?? item.amount;
        }
      });
      setLocalMonthly(monthly);
      setLocalBalances(bals);
    }
  }, [panelOpen, savingsAllocation, balances]);

  const enriched: CardItem[] = useMemo(() => {
    return PF_ITEMS
      .filter(item => item.projectId != null && SHOWN_IDS.includes(item.projectId!))
      .map(item => {
        const id = item.projectId!;
        const balance = panelOpen
          ? (localBalances[id] ?? balances[id] ?? item.amount)
          : (balances[id] ?? item.amount);
        const goalYear = GOAL_YEARS[id] ?? NOW_YEAR + 10;
        const yearsLeft = Math.max(0, goalYear - NOW_YEAR);
        const monthly = panelOpen
          ? (localMonthly[id] ?? getMonthlyAmt(savingsAllocation.entries, id))
          : getMonthlyAmt(savingsAllocation.entries, id);
        const projected = balance + monthly * 12 * yearsLeft;
        const target = PJ_TARGETS[id] ?? 1;
        const progress = Math.min(projected / target, 1);
        const status: 'ok' | 'warn' = projected >= target ? 'ok' : 'warn';
        return { ...item, amount: balance, progress, status };
      });
  }, [balances, localBalances, localMonthly, panelOpen, savingsAllocation]);

  const surplusItem = PF_ITEMS.find(i => i.name === '余剰資金');
  const surplusAmt = surplusItem ? surplusItem.amount : 0;

  const totalAmount = useMemo(
    () => enriched.reduce((sum, i) => sum + i.amount, 0) + surplusAmt,
    [enriched, surplusAmt],
  );

  const aiText = aiInsights['explore'] ?? generateAiInsight(enriched, dreams);

  const handleChangeMonthly = useCallback((projectId: string, newAmt: number) => {
    setLocalMonthly(prev => ({ ...prev, [projectId]: Math.max(0, newAmt) }));
  }, []);

  const handleChangeBalance = useCallback((projectId: string, newAmt: number) => {
    setLocalBalances(prev => ({ ...prev, [projectId]: Math.max(0, newAmt) }));
  }, []);

  const handleSaveAllocation = useCallback(() => {
    const now = NOW_YEAR;
    const sorted = [...savingsAllocation.entries].sort((a, b) => a.fromYear - b.fromYear);
    const hasCurrentEntry = sorted.some(e => e.fromYear <= now);
    let updatedEntries = sorted.map(entry => {
      if (entry.fromYear <= now) {
        return { ...entry, monthlyAmounts: { ...entry.monthlyAmounts, ...localMonthly } };
      }
      return entry;
    });
    if (!hasCurrentEntry) {
      updatedEntries = [{ fromYear: now, monthlyAmounts: localMonthly }, ...updatedEntries];
    }
    saveSavingsAllocation({ entries: updatedEntries });
    SHOWN_IDS.forEach(id => {
      const newBal = localBalances[id];
      if (newBal === undefined) return;
      const origBal = balances[id] ?? (PF_ITEMS.find(i => i.projectId === id)?.amount ?? 0);
      if (newBal !== origBal) {
        updateBalance(id, origBal, newBal, '残高修正');
      }
    });
    setPanelOpen(false);
  }, [localMonthly, localBalances, savingsAllocation, saveSavingsAllocation, balances, updateBalance]);

  const handleAiApply = useCallback((newMonthly: Record<string, number>) => {
    setLocalMonthly(newMonthly);
  }, []);

  const sortedItems = useMemo(() => {
    if (sortMode === 'custom') {
      const orderMap = dreamOrder.reduce<Record<string, number>>(
        (m, id, i) => ({ ...m, [id]: i }), {},
      );
      return [...enriched].sort((a, b) =>
        (orderMap[a.projectId ?? ''] ?? 999) - (orderMap[b.projectId ?? ''] ?? 999),
      );
    }
    if (sortMode === 'urgent') {
      return [...enriched].sort((a, b) => {
        if (a.status === 'warn' && b.status !== 'warn') return -1;
        if (a.status !== 'warn' && b.status === 'warn') return 1;
        return (a.progress ?? 1) - (b.progress ?? 1);
      });
    }
    return [...enriched].sort((a, b) => {
      const ay = parseInt(a.meta?.match(/(\d{4})年/)?.[1] ?? '9999');
      const by = parseInt(b.meta?.match(/(\d{4})年/)?.[1] ?? '9999');
      return ay - by;
    });
  }, [sortMode, enriched, dreamOrder]);

  const renderItem = ({ item, drag, isActive }: RenderItemParams<CardItem>) => (
    <ScaleDecorator activeScale={1.03}>
      <PjCard
        {...item}
        drag={sortMode === 'custom' ? drag : undefined}
        isActive={isActive}
      />
    </ScaleDecorator>
  );

  const listHeader = (
    <>
      <AllocationBar items={enriched} surplus={surplusAmt} total={totalAmount} />
      <AiInsightCard text={aiText} />

      <View style={s.actionBtnRow}>
        <Pressable
          style={[s.actionBtn, panelOpen && s.actionBtnActive]}
          onPress={() => setPanelOpen(v => !v)}
        >
          <Text style={[s.actionBtnTxt, panelOpen && s.actionBtnTxtActive]}>積立金調整</Text>
          <Text style={[s.actionBtnArrow, panelOpen && s.actionBtnTxtActive]}>{panelOpen ? '∧' : '∨'}</Text>
        </Pressable>
      </View>

      {panelOpen && (
        <AllocationPanel
          pfItems={enriched}
          balances={balances}
          localMonthly={localMonthly}
          localBalances={localBalances}
          onChangeMonthly={handleChangeMonthly}
          onChangeBalance={handleChangeBalance}
          onAiApply={handleAiApply}
          onSave={handleSaveAllocation}
        />
      )}

      <SortBar mode={sortMode} onSelect={setSortMode} />
    </>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* ページタイトル */}
      <View style={s.titleRow}>
        <Text style={s.pageTitle}>使いみち</Text>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={s.totalLbl}>総資産</Text>
          <Text style={s.totalAmt}>¥{totalAmount.toLocaleString('ja-JP')}</Text>
        </View>
      </View>

      <DraggableFlatList
        data={sortedItems}
        keyExtractor={item => item.projectId ?? item.name}
        contentContainerStyle={s.content}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        onDragEnd={({ data }) => {
          if (sortMode === 'custom') {
            setDreamOrder(data.map(i => i.projectId ?? i.name));
          }
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  titleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.md,
  },
  pageTitle: {
    fontSize: fontSizes.pageTitle,
    fontFamily: typography.display,
    color: colors.text,
  },
  totalLbl: { fontSize: 11, color: colors.textMid, fontFamily: typography.display },
  totalAmt: {
    fontSize: fontSizes.amountMedium, fontWeight: '600', color: colors.text,
    fontFamily: typography.display,
  },

  // AIインサイト
  aiWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: 2 },
  aiCard: {
    backgroundColor: colors.sageBg, borderRadius: radius.lg, padding: 16,
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
  },
  aiIcon: { fontSize: 14, color: colors.sage, lineHeight: 22, fontFamily: typography.display },
  aiLabel: { fontSize: 11, color: colors.sage, fontWeight: '700', marginBottom: 4, fontFamily: typography.display },
  aiTxt: { fontSize: 13, color: colors.text, lineHeight: 20, fontFamily: typography.display },

  // アクションボタン
  actionBtnRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: 2,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.divider,
    paddingHorizontal: 12, paddingVertical: 11,
    ...shadows.card,
  },
  actionBtnActive: { backgroundColor: colors.sage, borderColor: colors.sage },
  actionBtnTxt: { fontSize: 12, fontWeight: '600', color: colors.text, fontFamily: typography.display },
  actionBtnTxtActive: { color: '#fff' },
  actionBtnArrow: { fontSize: 11, color: colors.textMid, fontFamily: typography.display },

  sortBar: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: spacing.lg, paddingVertical: 10,
  },
  sortPill: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: radius.pill, backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.divider,
  },
  sortPillActive: { backgroundColor: colors.sage, borderColor: colors.sage },
  sortPillText: { fontSize: 13, fontWeight: '500', color: colors.textMid, fontFamily: typography.display },
  sortPillTextActive: { color: '#fff' },

  // 横積み比率バー
  allocWrap: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  allocBar: {
    flexDirection: 'row', height: 14, borderRadius: 7,
    overflow: 'hidden', marginBottom: 8,
  },
  allocLegRow: { flexDirection: 'row', flexWrap: 'wrap' },
  allocLegItem: {
    width: '50%', flexDirection: 'row', alignItems: 'center',
    gap: 4, paddingVertical: 3,
  },
  allocDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  allocLegName: { fontSize: 11, color: colors.textMid, flex: 1, fontFamily: typography.display },
  allocLegPct: { fontSize: 11, fontWeight: '600', color: colors.text, minWidth: 26, textAlign: 'right', fontFamily: typography.display },

  content: { paddingHorizontal: spacing.lg, paddingTop: 4, paddingBottom: 100 },

  card: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    flexDirection: 'row', marginBottom: 10, overflow: 'hidden',
    ...shadows.card,
  },
  cardActive: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 8,
  },
  cardAccent: { width: 4 },
  cardBody: { flex: 1, paddingHorizontal: 12, paddingVertical: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { fontSize: 16, fontWeight: '600', color: colors.text, fontFamily: typography.display },
  badge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill,
  },
  badgeOk: { backgroundColor: colors.sageBg },
  badgeWarn: { backgroundColor: colors.honeyBg },
  badgeTxt: { fontSize: 11, fontWeight: '600', fontFamily: typography.display },
  badgeOkTxt: { color: colors.sage },
  badgeWarnTxt: { color: colors.honey },
  cardBottom: { marginTop: 8 },
  barBg: { height: 5, backgroundColor: colors.divider, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 3 },
  cardStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  cardAmt: { fontSize: 15, fontWeight: '600', color: colors.text, fontFamily: typography.display },
  cardPct: { fontSize: 13, color: colors.textMid, fontFamily: typography.display },
  dragHandle: { fontSize: 20, color: colors.divider, paddingHorizontal: 10, alignSelf: 'center', fontFamily: typography.display },
});
