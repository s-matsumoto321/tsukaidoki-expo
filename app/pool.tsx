import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { DonutChart } from '@/components/donut-chart';
import { POOL_ITEMS } from '@/constants/data';
import { useStore } from '@/store/useStore';

const C = {
  dark: '#072A35',
  accent: '#00C5A3',
  bg: '#EEEAE0',
  card: '#FFFFFF',
  textPrimary: '#161C1E',
  textSecondary: '#717870',
  textTertiary: '#ABA8A2',
  border: 'rgba(0,0,0,0.06)',
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
  const total = items.reduce((sum, i) => sum + i.amount, 0);
  const segments = items.map(i => ({ color: i.color, value: i.amount }));
  const totalMan = Math.round(total / 10000).toLocaleString('ja-JP');

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── ヒーロー ── */}
        <View style={s.hero}>
          <DonutChart
            segments={segments}
            size={180}
            thickness={20}
            centerLabel={`¥${totalMan}万`}
            centerSub={`${POOL_ITEMS.length}口座`}
          />
          <Text style={s.heroLabel}>合計残高</Text>
          <Text style={s.heroAmt}>{fmtJpy(total)}</Text>
        </View>

        {/* ── カーブ遷移＋リスト ── */}
        <View style={s.listWrap}>
          {items.map((item, i) => {
            const isLast = i === items.length - 1;
            const hasDetail = !!item.projectId;
            const pct = fmtPct(item.amount, total);
            return (
              <View key={item.name}>
                <Pressable
                  style={[s.row, !isLast && s.rowBorder]}
                  onPress={() => hasDetail && router.push(`/project/${item.projectId}?from=pool`)}
                  disabled={!hasDetail}
                >
                  <View style={[s.rowAccent, { backgroundColor: item.color }]} />
                  <View style={s.rowBody}>
                    <View style={s.rowTop}>
                      <Text style={s.rowName}>{item.name}</Text>
                      <Text style={s.rowAmt}>{fmtJpy(item.amount)}</Text>
                    </View>
                    <View style={s.rowBottom}>
                      {item.meta && <Text style={s.rowMeta} numberOfLines={1}>{item.meta}</Text>}
                      <Text style={s.rowPct}>{pct}</Text>
                    </View>
                    <View style={s.barBg}>
                      <View style={[s.barFill, { width: pct, backgroundColor: item.color }]} />
                    </View>
                  </View>
                  {hasDetail && <Text style={s.arrow}>›</Text>}
                </Pressable>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.dark },
  content: { paddingBottom: 40 },

  hero: {
    backgroundColor: C.dark,
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 44,
  },
  heroLabel: { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 16, letterSpacing: 1 },
  heroAmt: { fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: -1, marginTop: 4 },

  listWrap: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
    paddingTop: 8,
    paddingHorizontal: 16,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 0,
  },
  rowBorder: { borderBottomWidth: 0.5, borderBottomColor: C.border },
  rowAccent: {
    width: 4,
    borderRadius: 3,
    alignSelf: 'stretch',
    marginRight: 14,
    minHeight: 44,
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 },
  rowName: { fontSize: 15, fontWeight: '600', color: C.textPrimary },
  rowAmt: { fontSize: 16, fontWeight: '700', color: C.textPrimary },
  rowBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  rowMeta: { fontSize: 10, color: C.textTertiary, flex: 1, marginRight: 8 },
  rowPct: { fontSize: 10, color: C.textSecondary, fontWeight: '600' },
  barBg: { height: 3, backgroundColor: 'rgba(0,0,0,0.07)', borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 2 },
  arrow: { fontSize: 20, color: C.textTertiary, marginLeft: 8 },
});
