import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View, Text, Pressable, StyleSheet, StatusBar } from 'react-native';
import { Link, router, type Href } from 'expo-router';
import { DonutChart } from '@/components/donut-chart';
import { POOL_ITEMS, PF_ITEMS, type FinancialItem } from '@/constants/data';
import { useStore } from '@/store/useStore';

const C = {
  brand: '#1A5C6B',
  brandDark: '#134754',
  green: '#1D9E75',
  greenBg: '#E8F5EF',
  greenText: '#0F5C3A',
  greenSub: '#2A7D55',
  greenDark: '#0A3D26',
  bg: '#F7F3EC',
  card: '#FFFDF8',
  textPrimary: '#2C2825',
  textSecondary: '#7A7268',
  border: 'rgba(0,0,0,0.07)',
};

type LegendItemProps = { color: string; name: string; val: string };

function LegendItem({ color, name, val }: LegendItemProps) {
  return (
    <View style={s.legRow}>
      <View style={s.legLeft}>
        <View style={[s.legDot, { backgroundColor: color }]} />
        <Text style={s.legName} numberOfLines={1}>{name}</Text>
      </View>
      <Text style={s.legVal}>{val}</Text>
    </View>
  );
}

type ChartCardProps = {
  title: string;
  badge: string;
  badgeStyle: object;
  badgeTextStyle: object;
  total: string;
  sub: string;
  items: FinancialItem[];
  route: Href;
};

function ChartCard({ title, badge, badgeStyle, badgeTextStyle, total, sub, items, route }: ChartCardProps) {
  const segments = items.map(i => ({ color: i.color, value: i.amount }));
  return (
    <Link href={route} asChild>
      <Pressable style={s.chartCard}>
        <View style={s.chartLabelRow}>
          <Text style={s.chartLabel}>{title}</Text>
          <View style={badgeStyle}>
            <Text style={badgeTextStyle}>{badge}</Text>
          </View>
        </View>
        <DonutChart
          segments={segments}
          size={90}
          thickness={10}
          centerLabel={total}
          centerSub={sub}
        />
        {items.map(item => <LegendItem key={item.name} {...item} />)}
      </Pressable>
    </Link>
  );
}

function fmtMan(yen: number): string {
  return `¥${Math.round(yen / 10000).toLocaleString('ja-JP')}万`;
}

export default function HomeScreen() {
  const { balances } = useStore();

  const poolItems = POOL_ITEMS.map(item => ({
    ...item,
    amount: balances[item.projectId!] ?? item.amount,
  }));
  const pfItems = PF_ITEMS.map(item => ({
    ...item,
    amount: item.projectId ? (balances[item.projectId] ?? item.amount) : item.amount,
  }));

  const poolTotal = poolItems.reduce((sum, item) => sum + item.amount, 0);
  const pfTotal = pfItems.reduce((sum, item) => sum + item.amount, 0);
  const diff = poolTotal - pfTotal;
  const isBalanced = diff === 0;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.brandDark} />
      <ScrollView style={s.scrollView} contentContainerStyle={s.content}>

        {/* ヘッダー */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.logo}>ツカイドキ</Text>
            <Text style={s.headerSub}>総資産</Text>
            <Text style={s.headerTotal}>¥{poolTotal.toLocaleString('ja-JP')}</Text>
            <Text style={s.headerNote}>プール金・ポートフォリオの合計</Text>
          </View>
          <Pressable style={s.transferBtn} onPress={() => router.push('/transfer')}>
            <Text style={s.transferBtnTxt}>振替</Text>
          </Pressable>
        </View>

        {/* 一致バー */}
        <View style={[s.matchBar, !isBalanced && s.matchBarWarn]}>
          <View style={[s.matchDot, !isBalanced && s.matchDotWarn]}>
            <Text style={s.matchDotTxt}>{isBalanced ? '✓' : '!'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.matchTxt, !isBalanced && s.matchTxtWarn]}>
              {isBalanced ? 'プール金 ＝ ポートフォリオ　一致' : 'プール金 ≠ ポートフォリオ　差異あり'}
            </Text>
            <Text style={[s.matchSub, !isBalanced && s.matchSubWarn]}>
              {isBalanced
                ? '差額 ¥0 · 記録は整合しています'
                : `差額 ¥${Math.abs(diff).toLocaleString('ja-JP')} · 残高修正が必要です`}
            </Text>
          </View>
        </View>

        {/* チャート 2列 */}
        <View style={s.dualChart}>
          <ChartCard
            title="プール金"
            badge="口座別"
            badgeStyle={s.badgeTeal}
            badgeTextStyle={s.badgeTealText}
            total={fmtMan(poolTotal)}
            sub={`${POOL_ITEMS.length}口座`}
            items={poolItems}
            route="/pool"
          />
          <ChartCard
            title="ポートフォリオ"
            badge="用途別"
            badgeStyle={s.badgeGreen}
            badgeTextStyle={s.badgeGreenText}
            total={fmtMan(pfTotal)}
            sub={`${PF_ITEMS.length}PJ`}
            items={pfItems}
            route="/portfolio"
          />
        </View>

        {/* 差額カード */}
        <View style={s.diffCard}>
          <View style={s.diffRow}>
            <Text style={s.diffLabel}>プール金 合計</Text>
            <Text style={[s.diffVal, s.diffBig]}>¥{poolTotal.toLocaleString('ja-JP')}</Text>
          </View>
          <View style={s.diffRow}>
            <Text style={s.diffLabel}>ポートフォリオ 合計</Text>
            <Text style={[s.diffVal, s.diffBig]}>¥{pfTotal.toLocaleString('ja-JP')}</Text>
          </View>
          <View style={[s.diffRow, s.diffRowLast]}>
            <Text style={[s.diffLabel, isBalanced ? s.diffLabelGreen : s.diffLabelWarn]}>差額</Text>
            <Text style={[s.diffVal, isBalanced ? s.diffValGreen : s.diffValWarn]}>
              {isBalanced ? '¥0 ✓' : `¥${diff.toLocaleString('ja-JP')}`}
            </Text>
          </View>
        </View>

        {/* 安心ラインカード */}
        <View style={s.safeCard}>
          <Text style={s.safeLabel}>今月の安心ライン</Text>
          <Text style={s.safeAmt}>¥87,000</Text>
          <Text style={s.safeNote}>全プロジェクト計画達成後の余力。この範囲なら自由に使えます。</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.brandDark },
  scrollView: { flex: 1 },
  content: { backgroundColor: C.bg, paddingBottom: 24 },

  header: {
    backgroundColor: C.brand,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 18,
  },
  headerLeft: { flex: 1 },
  logo: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.5)', letterSpacing: 1.5 },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 10 },
  headerTotal: { fontSize: 30, fontWeight: '700', color: '#fff', marginTop: 2, letterSpacing: -0.5 },
  headerNote: { fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 3 },
  transferBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 6,
    marginTop: 6,
  },
  transferBtnTxt: { fontSize: 11, color: '#fff', fontWeight: '500' },

  matchBar: {
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 2,
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: C.greenBg,
  },
  matchDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.green, justifyContent: 'center', alignItems: 'center' },
  matchDotTxt: { fontSize: 11, fontWeight: '600', color: '#fff' },
  matchBarWarn: { backgroundColor: '#FBF0E6' },
  matchDotWarn: { backgroundColor: '#D64040' },
  matchTxt: { fontSize: 11, fontWeight: '500', color: C.greenText },
  matchTxtWarn: { color: '#7A3A0A' },
  matchSub: { fontSize: 9, marginTop: 1, color: C.greenSub },
  matchSubWarn: { color: '#7A3A0A' },

  dualChart: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6 },
  chartCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    shadowColor: '#1A3040',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  chartLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginBottom: 4 },
  chartLabel: { fontSize: 10, color: C.textSecondary },
  badgeTeal: { backgroundColor: '#DFF0F4', borderRadius: 20, paddingHorizontal: 5, paddingVertical: 1 },
  badgeTealText: { fontSize: 8, color: C.brand },
  badgeGreen: { backgroundColor: C.greenBg, borderRadius: 20, paddingHorizontal: 5, paddingVertical: 1 },
  badgeGreenText: { fontSize: 8, color: C.greenText },

  legRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 2, width: '100%' },
  legLeft: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, minWidth: 0 },
  legDot: { width: 6, height: 6, borderRadius: 3 },
  legName: { fontSize: 9, color: C.textSecondary, flex: 1 },
  legVal: { fontSize: 9, fontWeight: '500', color: C.textPrimary },

  diffCard: {
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: C.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    shadowColor: '#1A3040',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  diffRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  diffRowLast: { borderBottomWidth: 0 },
  diffLabel: { fontSize: 11, color: C.textSecondary },
  diffVal: { fontSize: 11, fontWeight: '500', color: C.textPrimary },
  diffBig: { fontSize: 13, color: C.brand },
  diffLabelGreen: { color: C.green, fontWeight: '500' },
  diffValGreen: { color: C.green },
  diffLabelWarn: { color: '#D64040', fontWeight: '500' },
  diffValWarn: { color: '#D64040' },

  safeCard: {
    marginHorizontal: 12,
    marginBottom: 10,
    backgroundColor: '#E4F2F6',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  safeLabel: { fontSize: 10, color: C.brand, marginBottom: 3, fontWeight: '500' },
  safeAmt: { fontSize: 24, fontWeight: '700', color: C.brandDark, letterSpacing: -0.5 },
  safeNote: { fontSize: 9, color: C.brand, marginTop: 3, lineHeight: 14, opacity: 0.75 },
});
