import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { DonutChart } from '@/components/donut-chart';
import { PF_ITEMS } from '@/constants/data';
import { PROJECTS } from '@/constants/projects';
import { useStore } from '@/store/useStore';

const C = {
  dark: '#072A35',
  green: '#2ECC8F',
  greenBg: '#E5F7F2',
  greenText: '#065C3A',
  red: '#F05050',
  redBg: '#FDECEC',
  redText: '#7A1515',
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

export default function PortfolioScreen() {
  const { balances } = useStore();
  const items = PF_ITEMS.map(item => ({
    ...item,
    amount: item.projectId ? (balances[item.projectId] ?? item.amount) : item.amount,
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
            centerSub={`${PF_ITEMS.length}PJ`}
          />
          <Text style={s.heroLabel}>合計積み立て</Text>
          <Text style={s.heroAmt}>{fmtJpy(total)}</Text>
        </View>

        {/* ── カーブ遷移＋リスト ── */}
        <View style={s.listWrap}>
          {items.map((item, i) => {
            const isLast = i === items.length - 1;
            const hasDetail = !!item.projectId && item.projectId in PROJECTS;
            const pctNum = Math.round(item.progress !== undefined ? item.progress * 100 : (item.amount / total) * 100);
            const isOk = item.status === 'ok';
            const isWarn = item.status === 'warn';
            return (
              <Animated.View
                key={item.name}
                entering={FadeInDown.delay(i * 60).springify().damping(16)}
              >
                <Pressable
                  style={[s.row, !isLast && s.rowBorder]}
                  onPress={() => hasDetail && router.push(`/project/${item.projectId}`)}
                  disabled={!hasDetail}
                >
                  <View style={[s.rowAccent, { backgroundColor: item.color }]} />
                  <View style={s.rowBody}>
                    <View style={s.rowTop}>
                      <View style={s.rowNameWrap}>
                        <Text style={s.rowName}>{item.name}</Text>
                        {isOk && (
                          <View style={s.badgeOk}>
                            <Text style={s.badgeOkTxt}>◎</Text>
                          </View>
                        )}
                        {isWarn && (
                          <View style={s.badgeWarn}>
                            <Text style={s.badgeWarnTxt}>△</Text>
                          </View>
                        )}
                      </View>
                      <Text style={s.rowAmt}>{fmtJpy(item.amount)}</Text>
                    </View>
                    {item.meta && <Text style={s.rowMeta} numberOfLines={1}>{item.meta}</Text>}
                    {item.progress !== undefined && (
                      <View style={s.progressWrap}>
                        <View style={s.barBg}>
                          <View style={[
                            s.barFill,
                            { width: `${Math.min(pctNum, 100)}%`, backgroundColor: item.color }
                          ]} />
                        </View>
                        <Text style={s.progressTxt}>{pctNum}%</Text>
                      </View>
                    )}
                  </View>
                  {hasDetail && <Text style={s.arrow}>›</Text>}
                </Pressable>
              </Animated.View>
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
    paddingVertical: 13,
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
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 },
  rowNameWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 },
  rowName: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  rowAmt: { fontSize: 15, fontWeight: '700', color: C.textPrimary, marginLeft: 8 },
  rowMeta: { fontSize: 10, color: C.textTertiary, marginBottom: 7 },

  badgeOk: { backgroundColor: C.greenBg, borderRadius: 20, paddingHorizontal: 6, paddingVertical: 1 },
  badgeOkTxt: { fontSize: 9, color: C.greenText },
  badgeWarn: { backgroundColor: '#FBF0E6', borderRadius: 20, paddingHorizontal: 6, paddingVertical: 1 },
  badgeWarnTxt: { fontSize: 9, color: '#7A3A0A' },

  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barBg: { flex: 1, height: 5, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  progressTxt: { fontSize: 10, color: C.textSecondary, fontWeight: '600', width: 32, textAlign: 'right' },

  arrow: { fontSize: 20, color: C.textTertiary, marginLeft: 10 },
});
