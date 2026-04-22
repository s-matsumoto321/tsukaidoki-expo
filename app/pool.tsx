import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { DonutChart } from '@/components/donut-chart';
import { POOL_ITEMS } from '@/constants/data';
import { useStore } from '@/store/useStore';

const C = {
  brand: '#1A5C6B',
  bg: '#F7F3EC',
  card: '#FFFDF8',
  textPrimary: '#2C2825',
  textSecondary: '#7A7268',
  border: 'rgba(0,0,0,0.07)',
};

function fmtJpy(amount: number): string {
  return `¥${amount.toLocaleString('ja-JP')}`;
}

function fmtPct(amount: number, total: number): string {
  return `${Math.round((amount / total) * 100)}%`;
}

export default function PoolScreen() {
  const { balances } = useStore();
  const items = POOL_ITEMS.map(item => ({
    ...item,
    amount: balances[item.projectId!] ?? item.amount,
  }));
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const segments = items.map(item => ({ color: item.color, value: item.amount }));
  const totalMan = Math.round(total / 10000).toLocaleString('ja-JP');

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.heroCard}>
          <DonutChart
            segments={segments}
            size={164}
            thickness={18}
            centerLabel={`¥${totalMan}万`}
            centerSub={`${POOL_ITEMS.length}口座`}
          />
          <Text style={s.totalLabel}>合計</Text>
          <Text style={s.totalAmt}>{fmtJpy(total)}</Text>
        </View>

        <View style={s.listCard}>
          {items.map((item, i) => {
            const isLast = i === items.length - 1;
            const hasDetail = !!item.projectId;
            return (
              <Pressable
                key={item.name}
                style={[s.row, !isLast && s.rowBorder]}
                onPress={() => hasDetail && router.push(`/project/${item.projectId}?from=pool`)}
                disabled={!hasDetail}
              >
                <View style={[s.dot, { backgroundColor: item.color }]} />
                <View style={s.rowMid}>
                  <Text style={s.rowName}>{item.name}</Text>
                  {item.meta && <Text style={s.rowMeta}>{item.meta}</Text>}
                </View>
                <View style={s.rowRight}>
                  <Text style={s.rowAmt}>{fmtJpy(item.amount)}</Text>
                  <Text style={s.rowPct}>{fmtPct(item.amount, total)}</Text>
                </View>
                {hasDetail && <Text style={s.arrow}>›</Text>}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { paddingBottom: 32 },

  heroCard: {
    backgroundColor: C.card,
    margin: 14,
    borderRadius: 16,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#1A3040',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  totalLabel: { fontSize: 11, color: C.textSecondary, marginTop: 14, letterSpacing: 0.3 },
  totalAmt: { fontSize: 28, fontWeight: '700', color: C.brand, marginTop: 2, letterSpacing: -0.5 },

  listCard: {
    backgroundColor: C.card,
    marginHorizontal: 14,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#1A3040',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  rowBorder: { borderBottomWidth: 0.5, borderBottomColor: C.border },
  dot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  rowMid: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 14, color: C.textPrimary },
  rowMeta: { fontSize: 9, color: C.textSecondary, marginTop: 2 },
  rowRight: { alignItems: 'flex-end' },
  rowAmt: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  rowPct: { fontSize: 10, color: C.textSecondary, marginTop: 2 },
  arrow: { fontSize: 16, color: C.textSecondary, marginLeft: 2 },
});
