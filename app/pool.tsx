import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { DonutChart } from '@/components/donut-chart';
import { POOL_ITEMS } from '@/constants/data';

const C = {
  brand: '#0C447C',
  bg: '#f5f4ee',
  card: '#ffffff',
  textPrimary: '#2c2c2a',
  textSecondary: '#73726c',
  border: 'rgba(0,0,0,0.08)',
};

function fmtJpy(amount: number): string {
  return `¥${amount.toLocaleString('ja-JP')}`;
}

function fmtPct(amount: number, total: number): string {
  return `${Math.round((amount / total) * 100)}%`;
}

export default function PoolScreen() {
  const total = POOL_ITEMS.reduce((sum, item) => sum + item.amount, 0);
  const segments = POOL_ITEMS.map(item => ({ color: item.color, value: item.amount }));
  const totalMan = Math.round(total / 10000).toLocaleString('ja-JP');

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        {/* Donut summary */}
        <View style={s.heroCard}>
          <DonutChart
            segments={segments}
            size={160}
            thickness={18}
            centerLabel={`¥${totalMan}万`}
            centerSub={`${POOL_ITEMS.length}口座`}
          />
          <Text style={s.totalLabel}>合計</Text>
          <Text style={s.totalAmt}>{fmtJpy(total)}</Text>
        </View>

        {/* Account list */}
        <View style={s.listCard}>
          {POOL_ITEMS.map((item, i) => {
            const isLast = i === POOL_ITEMS.length - 1;
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
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  totalLabel: { fontSize: 10, color: C.textSecondary, marginTop: 12 },
  totalAmt: { fontSize: 24, fontWeight: '500', color: C.brand, marginTop: 2 },

  listCard: {
    backgroundColor: C.card,
    marginHorizontal: 14,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  rowBorder: { borderBottomWidth: 0.5, borderBottomColor: C.border },
  dot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  rowMid: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 14, color: C.textPrimary },
  rowMeta: { fontSize: 9, color: C.textSecondary, marginTop: 2 },
  rowRight: { alignItems: 'flex-end' },
  rowAmt: { fontSize: 14, fontWeight: '500', color: C.textPrimary },
  rowPct: { fontSize: 10, color: C.textSecondary, marginTop: 2 },
  arrow: { fontSize: 16, color: C.textSecondary, marginLeft: 2 },
});
