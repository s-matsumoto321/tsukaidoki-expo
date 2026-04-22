import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { DonutChart } from '@/components/donut-chart';
import { PF_ITEMS } from '@/constants/data';

const C = {
  brand: '#0C447C',
  green: '#1D9E75',
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

export default function PortfolioScreen() {
  const total = PF_ITEMS.reduce((sum, item) => sum + item.amount, 0);
  const segments = PF_ITEMS.map(item => ({ color: item.color, value: item.amount }));
  const totalMan = Math.round(total / 10000).toLocaleString('ja-JP');

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.heroCard}>
          <DonutChart
            segments={segments}
            size={160}
            thickness={18}
            centerLabel={`¥${totalMan}万`}
            centerSub={`${PF_ITEMS.length}PJ`}
          />
          <Text style={s.totalLabel}>合計</Text>
          <Text style={s.totalAmt}>{fmtJpy(total)}</Text>
        </View>

        <View style={s.listCard}>
          {PF_ITEMS.map((item, i) => (
            <View key={item.name} style={[s.row, i < PF_ITEMS.length - 1 && s.rowBorder]}>
              <View style={[s.dot, { backgroundColor: item.color }]} />
              <Text style={s.rowName}>{item.name}</Text>
              <View style={s.rowRight}>
                <Text style={s.rowAmt}>{fmtJpy(item.amount)}</Text>
                <Text style={s.rowPct}>{fmtPct(item.amount, total)}</Text>
              </View>
            </View>
          ))}
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
  totalAmt: { fontSize: 24, fontWeight: '500', color: C.green, marginTop: 2 },

  listCard: {
    backgroundColor: C.card,
    marginHorizontal: 14,
    borderRadius: 16,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, gap: 10 },
  rowBorder: { borderBottomWidth: 0.5, borderBottomColor: C.border },
  dot: { width: 10, height: 10, borderRadius: 5 },
  rowName: { flex: 1, fontSize: 14, color: C.textPrimary },
  rowRight: { alignItems: 'flex-end' },
  rowAmt: { fontSize: 14, fontWeight: '500', color: C.textPrimary },
  rowPct: { fontSize: 10, color: C.textSecondary, marginTop: 2 },
});
