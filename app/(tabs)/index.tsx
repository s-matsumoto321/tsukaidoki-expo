import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View, Text, Pressable, StyleSheet, StatusBar } from 'react-native';
import { Link, router, type Href } from 'expo-router';
import { DonutChart } from '@/components/donut-chart';
import { POOL_ITEMS, PF_ITEMS, type FinancialItem } from '@/constants/data';
import { useStore } from '@/store/useStore';

const C = {
  brand: '#0C447C',
  green: '#1D9E75',
  greenBg: '#EAF3DE',
  greenText: '#27500A',
  greenSub: '#3B6D11',
  greenDark: '#173404',
  bg: '#f5f4ee',
  card: '#ffffff',
  textPrimary: '#2c2c2a',
  textSecondary: '#73726c',
  border: 'rgba(0,0,0,0.08)',
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
      <StatusBar barStyle="light-content" backgroundColor={C.brand} />
      <ScrollView style={s.scrollView} contentContainerStyle={s.content}>

        {/* ヘッダー */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.logo}>ツカイドキβ版</Text>
            <Text style={s.headerSub}>総資産</Text>
            <Text style={s.headerTotal}>¥{poolTotal.toLocaleString('ja-JP')}</Text>
            <Text style={s.headerNote}>プール金・ポートフォリオ 両方の合計</Text>
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
            badgeStyle={s.badgeBlue}
            badgeTextStyle={s.badgeBlueText}
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
  safe: { flex: 1, backgroundColor: C.brand },
  scrollView: { flex: 1 },
  content: { backgroundColor: C.bg, paddingBottom: 20 },

  header: {
    backgroundColor: C.brand,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },
  headerLeft: { flex: 1 },
  logo: { fontSize: 12, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 8 },
  headerTotal: { fontSize: 24, fontWeight: '500', color: '#fff', marginTop: 1 },
  headerNote: { fontSize: 9, color: 'rgba(255,255,255,0.5)', marginTop: 1 },
  transferBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 4,
  },
  transferBtnTxt: { fontSize: 11, color: '#fff', fontWeight: '500' },

  matchBar: {
    margin: 8,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: C.greenBg,
  },
  matchDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.green, justifyContent: 'center', alignItems: 'center' },
  matchDotTxt: { fontSize: 11, fontWeight: '500', color: '#fff' },
  matchBarWarn: { backgroundColor: '#FAEEDA' },
  matchDotWarn: { backgroundColor: '#E24B4A' },
  matchTxt: { fontSize: 11, fontWeight: '500', color: C.greenText },
  matchTxtWarn: { color: '#633806' },
  matchSub: { fontSize: 9, marginTop: 1, color: C.greenSub },
  matchSubWarn: { color: '#633806' },

  dualChart: { flexDirection: 'row', gap: 7, paddingHorizontal: 14, paddingTop: 2, paddingBottom: 6 },
  chartCard: {
    flex: 1,
    backgroundColor: C.card,
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: 12,
    padding: 9,
    alignItems: 'center',
  },
  chartLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginBottom: 4 },
  chartLabel: { fontSize: 10, color: C.textSecondary },
  badgeBlue: { backgroundColor: '#E6F1FB', borderRadius: 20, paddingHorizontal: 5, paddingVertical: 1 },
  badgeBlueText: { fontSize: 8, color: C.brand },
  badgeGreen: { backgroundColor: C.greenBg, borderRadius: 20, paddingHorizontal: 5, paddingVertical: 1 },
  badgeGreenText: { fontSize: 8, color: C.greenText },

  legRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 2, width: '100%' },
  legLeft: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, minWidth: 0 },
  legDot: { width: 6, height: 6, borderRadius: 3 },
  legName: { fontSize: 9, color: C.textSecondary, flex: 1 },
  legVal: { fontSize: 9, fontWeight: '500', color: C.textPrimary },

  diffCard: {
    marginHorizontal: 14,
    marginBottom: 8,
    backgroundColor: C.card,
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  diffRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  diffRowLast: { borderBottomWidth: 0 },
  diffLabel: { fontSize: 11, color: C.textSecondary },
  diffVal: { fontSize: 11, fontWeight: '500', color: C.textPrimary },
  diffBig: { fontSize: 13, color: C.brand },
  diffLabelGreen: { color: C.green, fontWeight: '500' },
  diffValGreen: { color: C.green },
  diffLabelWarn: { color: '#E24B4A', fontWeight: '500' },
  diffValWarn: { color: '#E24B4A' },

  safeCard: {
    marginHorizontal: 14,
    marginBottom: 10,
    backgroundColor: C.greenBg,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  safeLabel: { fontSize: 10, color: C.greenText, marginBottom: 2 },
  safeAmt: { fontSize: 20, fontWeight: '500', color: C.greenDark },
  safeNote: { fontSize: 9, color: C.greenSub, marginTop: 2, lineHeight: 14 },
});
