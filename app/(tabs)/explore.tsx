import { useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, Pressable, StyleSheet, StatusBar } from 'react-native';
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
  bg: '#f5f4ee',
  card: '#ffffff',
  textPrimary: '#2c2c2a',
  textSecondary: '#73726c',
  border: 'rgba(0,0,0,0.08)',
};

const SHOWN_IDS = ['edu', 'ret', 'car', 'trip'];

type SortMode = 'custom' | 'urgent' | 'deadline';
type CardItem = FinancialItem & { amount: number };

// ─── 横積み比率バー ───────────────────────────────────────────────

function AllocationBar({ items, total }: { items: CardItem[]; total: number }) {
  if (total === 0) return null;
  return (
    <View style={s.allocWrap}>
      <View style={s.allocHeaderRow}>
        <Text style={s.allocTitle}>使いみち配分</Text>
        <Text style={s.allocTotalAmt}>¥{total.toLocaleString('ja-JP')}</Text>
      </View>
      <View style={s.allocBar}>
        {items.map(item => (
          <View
            key={item.projectId ?? item.name}
            style={{ flex: item.amount, backgroundColor: item.color }}
          />
        ))}
      </View>
      <View style={s.allocLegRow}>
        {items.map(item => (
          <View key={item.projectId ?? item.name} style={s.allocLegItem}>
            <View style={[s.allocDot, { backgroundColor: item.color }]} />
            <Text style={s.allocLegName} numberOfLines={1}>{item.name}</Text>
            <Text style={s.allocLegPct}>
              {Math.round((item.amount / total) * 100)}%
            </Text>
          </View>
        ))}
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

// ─── カード ──────────────────────────────────────────────────────

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
              {status === 'ok' ? '◎ 順調' : '△ 要注意'}
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

// ─── メイン画面 ───────────────────────────────────────────────────

export default function DreamsScreen() {
  const { balances, dreamOrder, setDreamOrder } = useStore();
  const [sortMode, setSortMode] = useState<SortMode>('custom');

  const enriched: CardItem[] = useMemo(() =>
    PF_ITEMS
      .filter(i => i.projectId && SHOWN_IDS.includes(i.projectId))
      .map(item => ({
        ...item,
        amount: item.projectId ? (balances[item.projectId] ?? item.amount) : item.amount,
      })),
    [balances],
  );

  const totalAmount = useMemo(
    () => enriched.reduce((sum, i) => sum + i.amount, 0),
    [enriched],
  );

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

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.brand} />
      <View style={s.header}>
        <Logo iconSize={26} />
        <Text style={s.headerSub}>ライフマネープラン</Text>
      </View>
      <SortBar mode={sortMode} onSelect={setSortMode} />
      <DraggableFlatList
        data={sortedItems}
        keyExtractor={item => item.projectId ?? item.name}
        contentContainerStyle={s.content}
        ListHeaderComponent={
          <AllocationBar items={enriched} total={totalAmount} />
        }
        renderItem={renderItem}
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

  sortBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: C.bg,
  },
  sortPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  sortPillActive: { backgroundColor: C.brand, borderColor: C.brand },
  sortPillText: { fontSize: 13, fontWeight: '500', color: C.textSecondary },
  sortPillTextActive: { color: '#fff' },

  // 横積み比率バー
  allocWrap: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: C.border,
    padding: 12,
    marginBottom: 10,
  },
  allocHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  allocTitle: { fontSize: 12, fontWeight: '500', color: C.textSecondary },
  allocTotalAmt: { fontSize: 14, fontWeight: '600', color: C.brand },
  allocBar: {
    flexDirection: 'row',
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
    marginBottom: 8,
  },
  allocLegRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  allocLegItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    width: '50%',
    paddingVertical: 3,
  },
  allocDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  allocLegName: { fontSize: 11, color: C.textSecondary, flex: 1 },
  allocLegPct: { fontSize: 11, fontWeight: '600', color: C.textPrimary, minWidth: 28, textAlign: 'right' },

  content: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 32 },

  card: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: C.border,
    flexDirection: 'row',
    marginBottom: 10,
    overflow: 'hidden',
  },
  cardActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
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
  dragHandle: {
    fontSize: 20,
    color: C.border,
    paddingHorizontal: 10,
    alignSelf: 'center',
  },
});
