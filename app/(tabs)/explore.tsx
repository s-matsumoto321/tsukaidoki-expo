import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, Pressable, StyleSheet, StatusBar, TextInput } from 'react-native';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { router } from 'expo-router';
import { PF_ITEMS, type FinancialItem } from '@/constants/data';
import { useStore } from '@/store/useStore';
import { Logo } from '@/components/logo';

const C = {
  brand: '#0C447C',
  green: '#1D9E75',
  greenBg: '#EAF3DE',
  greenText: '#27500A',
  orange: '#EF9F27',
  orangeBg: '#FEF3E2',
  aiCard: '#E6F1FB',
  bg: '#f5f4ee',
  card: '#ffffff',
  textPrimary: '#2c2c2a',
  textSecondary: '#73726c',
  border: 'rgba(0,0,0,0.08)',
};

// PJごとのゴール年・目標金額（動的進捗計算用）
const GOAL_YEARS: Record<string, number> = { edu: 2044, ret: 2050, car: 2028, trip: 2037 };
const PJ_TARGETS: Record<string, number> = { edu: 5_000_000, ret: 30_000_000, car: 2_000_000, trip: 2_660_000 };
const SHOWN_IDS = ['edu', 'ret', 'car', 'trip'];

type SortMode = 'custom' | 'urgent' | 'deadline';
type CardItem = FinancialItem & { amount: number };

// ─── 月の積立量を取得 ─────────────────────────────────────────────

function getMonthlyAmt(
  entries: { fromYear: number; monthlyAmounts: Record<string, number> }[],
  projectId: string,
): number {
  const now = new Date().getFullYear();
  const sorted = [...entries].sort((a, b) => b.fromYear - a.fromYear);
  const entry = sorted.find(e => e.fromYear <= now);
  return entry?.monthlyAmounts[projectId] ?? 0;
}

// ─── AIインサイトカード ───────────────────────────────────────────

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

// ─── 積立・残高金調整パネル（本体のみ） ──────────────────────────

type AllocationPanelProps = {
  pfItems: CardItem[];
  balances: Record<string, number>;
  localMonthly: Record<string, number>;
  onChangeMonthly: (projectId: string, newAmt: number) => void;
  onSave: () => void;
};

function AllocationPanel({ pfItems, balances, localMonthly, onChangeMonthly, onSave }: AllocationPanelProps) {
  const totalMonthly = pfItems.reduce(
    (sum, i) => sum + (i.projectId ? (localMonthly[i.projectId] ?? 0) : 0), 0,
  );

  return (
    <View style={ap.wrap}>
      <View style={ap.body}>
        {/* 月の積立配分バー */}
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

        {/* 各PJ調整行 */}
        <Text style={[ap.sectionLabel, { marginTop: 14 }]}>各PJ 月積立・残高調整</Text>
        {pfItems.filter(i => i.projectId).map(item => {
          const balance = item.projectId ? (balances[item.projectId] ?? item.amount) : item.amount;
          const monthly = item.projectId ? (localMonthly[item.projectId] ?? 0) : 0;
          return (
            <View key={item.projectId} style={ap.row}>
              <View style={[ap.pjDot, { backgroundColor: item.color }]} />
              <View style={ap.pjInfo}>
                <Text style={ap.pjName} numberOfLines={1}>{item.name}</Text>
                <Text style={ap.pjBalance}>残高 ¥{balance.toLocaleString('ja-JP')}</Text>
              </View>
              <View style={ap.stepper}>
                <Pressable
                  style={ap.stepBtn}
                  onPress={() => item.projectId && onChangeMonthly(item.projectId, Math.max(0, monthly - 1000))}
                >
                  <Text style={ap.stepBtnTxt}>−</Text>
                </Pressable>
                <TextInput
                  style={ap.stepInput}
                  value={String(monthly)}
                  onChangeText={v => {
                    const n = parseInt(v.replace(/[^0-9]/g, ''), 10);
                    if (item.projectId) onChangeMonthly(item.projectId, isNaN(n) ? 0 : n);
                  }}
                  keyboardType="number-pad"
                  selectTextOnFocus
                />
                <Pressable
                  style={ap.stepBtn}
                  onPress={() => item.projectId && onChangeMonthly(item.projectId, monthly + 1000)}
                >
                  <Text style={ap.stepBtnTxt}>＋</Text>
                </Pressable>
              </View>
            </View>
          );
        })}

        <Pressable style={ap.applyBtn} onPress={onSave}>
          <Text style={ap.applyBtnTxt}>適用する</Text>
        </Pressable>
      </View>
    </View>
  );
}

const ap = StyleSheet.create({
  wrap: { marginHorizontal: 14, marginBottom: 6 },
  body: {
    backgroundColor: C.card, borderRadius: 12,
    borderWidth: 0.5, borderColor: C.border,
    padding: 14,
  },
  sectionLabel: { fontSize: 11, color: C.textSecondary, fontWeight: '500', marginBottom: 8 },
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
  allocLegName: { fontSize: 10, color: C.textSecondary, flex: 1 },
  allocLegPct: { fontSize: 10, fontWeight: '600', color: C.textPrimary, minWidth: 24, textAlign: 'right' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8,
    borderTopWidth: 0.5, borderTopColor: C.border,
  },
  pjDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  pjInfo: { flex: 1 },
  pjName: { fontSize: 13, fontWeight: '600', color: C.textPrimary },
  pjBalance: { fontSize: 11, color: C.textSecondary, marginTop: 1 },
  stepper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.bg, borderRadius: 8,
    borderWidth: 0.5, borderColor: C.border,
    overflow: 'hidden',
  },
  stepBtn: {
    width: 32, height: 32,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(12,68,124,0.07)',
  },
  stepBtnTxt: { fontSize: 18, color: C.brand, fontWeight: '300' },
  stepInput: {
    width: 72, textAlign: 'center',
    fontSize: 13, fontWeight: '600', color: C.textPrimary,
    paddingVertical: 6,
  },
  applyBtn: {
    marginTop: 12, backgroundColor: C.brand, borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  applyBtnTxt: { fontSize: 14, fontWeight: '600', color: '#fff' },
});

// ─── AI自動配分調整カード ─────────────────────────────────────────

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
    marginHorizontal: 14, marginBottom: 6,
    backgroundColor: '#FEF3E2', borderRadius: 12,
    borderWidth: 0.5, borderColor: '#EF9F27',
  },
  inner: { padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  mark: { fontSize: 14, color: '#D46000', lineHeight: 22 },
  title: { fontSize: 12, color: '#D46000', fontWeight: '600', marginBottom: 3 },
  txt: { fontSize: 13, color: C.textPrimary, lineHeight: 18 },
  btn: {
    marginTop: 8, backgroundColor: C.orange ?? '#EF9F27',
    borderRadius: 8, paddingVertical: 7, paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  btnTxt: { fontSize: 12, fontWeight: '600', color: '#fff' },
});

// ─── 横積み比率バー ───────────────────────────────────────────────

function AllocationBar({ items, surplus, total }: {
  items: CardItem[];
  surplus: number;
  total: number;
}) {
  if (total === 0) return null;
  const surplusColor = '#888780';
  return (
    <View style={s.allocWrap}>
      <View style={s.allocHeader}>
        <View>
          <Text style={s.allocLabel}>総資産</Text>
          <Text style={s.allocTotal}>¥{total.toLocaleString('ja-JP')}</Text>
        </View>
        <Pressable style={s.dreamBtn} onPress={() => router.push('/dream-timeline' as any)}>
          <Text style={s.dreamBtnTxt}>★ 夢年表を見る →</Text>
        </Pressable>
      </View>
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

// ─── プログレスバー ───────────────────────────────────────────────

function ProgressBar({ progress, color }: { progress: number; color: string }) {
  return (
    <View style={s.barBg}>
      <View style={[s.barFill, { width: `${Math.min(progress * 100, 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

// ─── PJカード ─────────────────────────────────────────────────────

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
            <Text style={[s.badge, status === 'ok' ? s.badgeOk : s.badgeWarn]}>
              {status === 'ok' ? '✓ 順調' : '△ 要注意'}
            </Text>
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

// ─── ソートバー ───────────────────────────────────────────────────

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

// ─── AIインサイト生成 ──────────────────────────────────────────────

function generateAiInsight(items: CardItem[], dreams: { year: number; title: string; projectId: string }[]): string {
  const warnItems = items.filter(i => i.status === 'warn');
  const totalDreams = dreams.length;
  if (warnItems.length > 0) {
    const warnNames = warnItems.map(i => i.name).join('と');
    return `${totalDreams}つの夢のうち、現状ペースで届く夢が多いです。${warnNames}の達成が遅れ気味です。積立額を見直すと改善できます。`;
  }
  return `${totalDreams}つの夢に向けて順調に積み上がっています。現在のペースを維持しましょう。`;
}

// ─── メイン画面 ───────────────────────────────────────────────────

const NOW_YEAR = new Date().getFullYear();

export default function DreamsScreen() {
  const { balances, dreamOrder, setDreamOrder, dreams, aiInsights, savingsAllocation, saveSavingsAllocation } = useStore();
  const [sortMode, setSortMode] = useState<SortMode>('custom');
  const [panelOpen, setPanelOpen] = useState(false);
  const [aiCardOpen, setAiCardOpen] = useState(false);
  const [localMonthly, setLocalMonthly] = useState<Record<string, number>>({});

  // パネルを開いたときストアの値で初期化
  useEffect(() => {
    if (panelOpen || aiCardOpen) {
      const initial: Record<string, number> = {};
      PF_ITEMS.forEach(item => {
        if (item.projectId && SHOWN_IDS.includes(item.projectId)) {
          initial[item.projectId] = getMonthlyAmt(savingsAllocation.entries, item.projectId);
        }
      });
      setLocalMonthly(initial);
    }
  }, [panelOpen, aiCardOpen, savingsAllocation]);

  // 動的プログレス計算（localMonthlyが変わるとリアルタイムに更新）
  const enriched: CardItem[] = useMemo(() => {
    return PF_ITEMS
      .filter(item => item.projectId != null && SHOWN_IDS.includes(item.projectId!))
      .map(item => {
        const balance = item.projectId ? (balances[item.projectId] ?? item.amount) : item.amount;
        const goalYear = GOAL_YEARS[item.projectId!] ?? NOW_YEAR + 10;
        const yearsLeft = Math.max(0, goalYear - NOW_YEAR);
        const isEditing = panelOpen || aiCardOpen;
        const monthly = item.projectId
          ? (isEditing ? (localMonthly[item.projectId] ?? getMonthlyAmt(savingsAllocation.entries, item.projectId)) : getMonthlyAmt(savingsAllocation.entries, item.projectId))
          : 0;
        const projected = balance + monthly * 12 * yearsLeft;
        const target = PJ_TARGETS[item.projectId!] ?? 1;
        const progress = Math.min(projected / target, 1);
        const status: 'ok' | 'warn' = projected >= target ? 'ok' : 'warn';
        return { ...item, amount: balance, progress, status };
      });
  }, [balances, localMonthly, panelOpen, aiCardOpen, savingsAllocation]);

  // 余剰資金
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
    setPanelOpen(false);
  }, [localMonthly, savingsAllocation, saveSavingsAllocation]);

  const handleAiApply = useCallback((newMonthly: Record<string, number>) => {
    setLocalMonthly(newMonthly);
    setAiCardOpen(false);
    setPanelOpen(true);
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

      {/* ─ ボタン行（AIインサイトと並び順の間） ─ */}
      <View style={s.actionBtnRow}>
        <Pressable
          style={[s.actionBtn, panelOpen && s.actionBtnActive]}
          onPress={() => { setPanelOpen(v => !v); setAiCardOpen(false); }}
        >
          <Text style={s.actionBtnIcon}>⚙</Text>
          <Text style={[s.actionBtnTxt, panelOpen && s.actionBtnTxtActive]}>積立・残高金調整</Text>
          <Text style={[s.actionBtnArrow, panelOpen && s.actionBtnTxtActive]}>{panelOpen ? '∧' : '∨'}</Text>
        </Pressable>
        <Pressable
          style={[s.actionBtn, aiCardOpen && s.actionBtnActive]}
          onPress={() => { setAiCardOpen(v => !v); setPanelOpen(false); }}
        >
          <Text style={s.actionBtnIcon}>✦</Text>
          <Text style={[s.actionBtnTxt, aiCardOpen && s.actionBtnTxtActive]}>AI自動配分調整</Text>
          <Text style={[s.actionBtnArrow, aiCardOpen && s.actionBtnTxtActive]}>{aiCardOpen ? '∧' : '∨'}</Text>
        </Pressable>
      </View>

      {/* 積立・残高金調整パネル */}
      {panelOpen && (
        <AllocationPanel
          pfItems={enriched}
          balances={balances}
          localMonthly={localMonthly}
          onChangeMonthly={handleChangeMonthly}
          onSave={handleSaveAllocation}
        />
      )}

      {/* AI自動配分調整カード */}
      {aiCardOpen && (
        <AiAllocationCard
          items={enriched}
          localMonthly={localMonthly}
          onApply={handleAiApply}
        />
      )}

      <SortBar mode={sortMode} onSelect={setSortMode} />
    </>
  );

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.brand} />
      <View style={s.header}>
        <Logo iconSize={26} />
        <Text style={s.headerSub}>ライフマネープラン</Text>
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
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    backgroundColor: C.brand,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 3 },

  // AIインサイト
  aiWrap: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 2, backgroundColor: C.bg },
  aiCard: {
    backgroundColor: C.aiCard, borderRadius: 12, padding: 10,
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
  },
  aiIcon: { fontSize: 14, color: '#185FA5', lineHeight: 22 },
  aiLabel: { fontSize: 11, color: '#185FA5', fontWeight: '600', marginBottom: 1 },
  aiTxt: { fontSize: 13, color: C.brand, lineHeight: 19 },

  // ボタン行
  actionBtnRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 14, paddingTop: 6, paddingBottom: 2,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.card, borderRadius: 12,
    borderWidth: 0.5, borderColor: C.border,
    paddingHorizontal: 12, paddingVertical: 11,
  },
  actionBtnActive: { backgroundColor: C.brand, borderColor: C.brand },
  actionBtnIcon: { fontSize: 14 },
  actionBtnTxt: { flex: 1, fontSize: 12, fontWeight: '600', color: C.textPrimary },
  actionBtnTxtActive: { color: '#fff' },
  actionBtnArrow: { fontSize: 11, color: C.textSecondary },

  sortBar: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: C.bg,
  },
  sortPill: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, backgroundColor: C.card,
    borderWidth: 0.5, borderColor: C.border,
  },
  sortPillActive: { backgroundColor: C.brand, borderColor: C.brand },
  sortPillText: { fontSize: 13, fontWeight: '500', color: C.textSecondary },
  sortPillTextActive: { color: '#fff' },

  // 横積み比率バー
  allocWrap: {
    backgroundColor: C.card,
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10,
    borderBottomWidth: 0.5, borderBottomColor: C.border,
  },
  allocHeader: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    marginBottom: 10,
  },
  allocLabel: { fontSize: 11, color: C.textSecondary, fontWeight: '500', marginBottom: 1 },
  allocTotal: { fontSize: 24, fontWeight: '700', color: C.brand },
  dreamBtn: {
    backgroundColor: '#FEF3E2', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 10, borderWidth: 0.5, borderColor: '#EF9F27',
  },
  dreamBtnTxt: { fontSize: 12, fontWeight: '600', color: '#D46000' },
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
  allocLegName: { fontSize: 11, color: C.textSecondary, flex: 1 },
  allocLegPct: { fontSize: 11, fontWeight: '600', color: C.textPrimary, minWidth: 26, textAlign: 'right' },

  content: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 32 },

  card: {
    backgroundColor: C.card, borderRadius: 12,
    borderWidth: 0.5, borderColor: C.border,
    flexDirection: 'row', marginBottom: 10, overflow: 'hidden',
  },
  cardActive: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 8,
  },
  cardAccent: { width: 4 },
  cardBody: { flex: 1, paddingHorizontal: 12, paddingVertical: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { fontSize: 16, fontWeight: '600', color: C.textPrimary },
  badge: { fontSize: 12, fontWeight: '600', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  badgeOk: { backgroundColor: C.greenBg, color: C.green },
  badgeWarn: { backgroundColor: '#FAEEDA', color: '#E24B4A' },
  cardBottom: { marginTop: 6 },
  barBg: { height: 5, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 3 },
  cardStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  cardAmt: { fontSize: 15, fontWeight: '600', color: C.textPrimary },
  cardPct: { fontSize: 13, color: C.textSecondary },
  dragHandle: { fontSize: 20, color: C.border, paddingHorizontal: 10, alignSelf: 'center' },
});
