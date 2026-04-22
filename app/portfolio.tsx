import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { DonutChart } from '@/components/donut-chart';
import { PF_ITEMS } from '@/constants/data';
import { PROJECTS } from '@/constants/projects';
import { useStore } from '@/store/useStore';

const C = {
  brand: '#1A5C6B',
  green: '#1D9E75',
  bg: '#F7F3EC',
  card: '#FFFDF8',
  textPrimary: '#2C2825',
  textSecondary: '#7A7268',
  border: 'rgba(0,0,0,0.07)',
  okBg: '#E8F5EF',
  okText: '#0F5C3A',
  warnBg: '#FBF0E6',
  warnText: '#7A3A0A',
};

function fmtJpy(amount: number): string {
  return `¥${amount.toLocaleString('ja-JP')}`;
}

function fmtPct(amount: number, total: number): string {
  return `${Math.round((amount / total) * 100)}%`;
}

export default function PortfolioScreen() {
  const { balances } = useStore();
  const items = PF_ITEMS.map(item => ({
    ...item,
    amount: item.projectId ? (balances[item.projectId] ?? item.amount) : item.amount,
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
            centerSub={`${PF_ITEMS.length}PJ`}
          />
          <Text style={s.totalLabel}>合計</Text>
          <Text style={s.totalAmt}>{fmtJpy(total)}</Text>
        </View>

        <View style={s.listCard}>
          {items.map((item, i) => {
            const isLast = i === items.length - 1;
            const hasDetail = !!item.projectId && item.projectId in PROJECTS;
            return (
              <Pressable
                key={item.name}
                style={[s.itemCard, !isLast && s.itemBorder]}
                onPress={() => hasDetail && router.push(`/project/${item.projectId}`)}
                disabled={!hasDetail}
              >
                <View style={s.itemTop}>
                  <View style={s.itemLeft}>
                    <View style={[s.dot, { backgroundColor: item.color }]} />
                    <Text style={s.itemName}>{item.name}</Text>
                    {item.status && (
                      <View style={item.status === 'ok' ? s.badgeOk : s.badgeWarn}>
                        <Text style={item.status === 'ok' ? s.badgeOkTxt : s.badgeWarnTxt}>
                          {item.status === 'ok' ? '◎' : '△'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={s.itemRight}>
                    <Text style={s.itemAmt}>{fmtJpy(item.amount)}</Text>
                    <Text style={s.itemPct}>{fmtPct(item.amount, total)}</Text>
                  </View>
                </View>

                {item.meta && (
                  <Text style={s.itemMeta}>{item.meta}</Text>
                )}

                {item.progress !== undefined && (
                  <View style={s.barBg}>
                    <View style={[s.barFill, { width: `${Math.round(item.progress * 100)}%`, backgroundColor: item.color }]} />
                  </View>
                )}

                {hasDetail && (
                  <Text style={s.arrow}>›</Text>
                )}
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
  totalAmt: { fontSize: 28, fontWeight: '700', color: C.green, marginTop: 2, letterSpacing: -0.5 },

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
  itemCard: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    position: 'relative',
  },
  itemBorder: { borderBottomWidth: 0.5, borderBottomColor: C.border },

  itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1, minWidth: 0 },
  dot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  itemName: { fontSize: 12, fontWeight: '600', color: C.textPrimary },
  itemRight: { alignItems: 'flex-end' },
  itemAmt: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  itemPct: { fontSize: 9, color: C.textSecondary, marginTop: 1 },

  badgeOk: { backgroundColor: C.okBg, borderRadius: 20, paddingHorizontal: 5, paddingVertical: 1 },
  badgeOkTxt: { fontSize: 8, color: C.okText },
  badgeWarn: { backgroundColor: C.warnBg, borderRadius: 20, paddingHorizontal: 5, paddingVertical: 1 },
  badgeWarnTxt: { fontSize: 8, color: C.warnText },

  itemMeta: { fontSize: 9, color: C.textSecondary, marginLeft: 17, marginBottom: 5 },

  barBg: { backgroundColor: '#EAE4DA', borderRadius: 4, height: 4, overflow: 'hidden', marginLeft: 17 },
  barFill: { height: '100%', borderRadius: 4 },

  arrow: {
    position: 'absolute',
    right: 14,
    top: '50%',
    marginTop: -8,
    fontSize: 16,
    color: C.textSecondary,
  },
});
