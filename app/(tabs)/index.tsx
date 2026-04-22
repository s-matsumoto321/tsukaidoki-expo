import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View, Text, Pressable, StyleSheet, StatusBar } from 'react-native';
import { Link, router, type Href } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { DonutChart } from '@/components/donut-chart';
import { POOL_ITEMS, PF_ITEMS, type FinancialItem } from '@/constants/data';
import { useStore } from '@/store/useStore';

const C = {
  dark: '#072A35',
  darkMid: '#0E3D4D',
  accent: '#00C5A3',
  green: '#2ECC8F',
  greenBg: '#E5F7F2',
  greenText: '#065C3A',
  red: '#F05050',
  orange: '#E07845',
  bg: '#EEEAE0',
  card: '#FFFFFF',
  textPrimary: '#161C1E',
  textSecondary: '#717870',
  textTertiary: '#ABA8A2',
  border: 'rgba(0,0,0,0.06)',
};

type ChartCardProps = {
  title: string;
  badge: string;
  total: string;
  sub: string;
  items: FinancialItem[];
  route: Href;
  delay: number;
};

function ChartCard({ title, badge, total, sub, items, route, delay }: ChartCardProps) {
  const segments = items.map(i => ({ color: i.color, value: i.amount }));
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify().damping(16)}>
      <Link href={route} asChild>
        <Pressable style={s.chartCard}>
          <View style={s.cardHead}>
            <View>
              <Text style={s.cardTitle}>{title}</Text>
              <Text style={s.cardTotal}>{total}</Text>
            </View>
            <View style={s.cardBadge}>
              <Text style={s.cardBadgeTxt}>{badge}</Text>
              <Text style={s.cardArrow}>›</Text>
            </View>
          </View>
          <View style={s.cardBody}>
            <DonutChart segments={segments} size={100} thickness={12} centerLabel={sub} centerSub="" />
            <View style={s.cardLegend}>
              {items.map(item => (
                <View key={item.name} style={s.legRow}>
                  <View style={[s.legBar, { backgroundColor: item.color }]} />
                  <Text style={s.legName} numberOfLines={1}>{item.name}</Text>
                  <Text style={s.legVal}>{item.val}</Text>
                </View>
              ))}
            </View>
          </View>
        </Pressable>
      </Link>
    </Animated.View>
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

  const poolTotal = poolItems.reduce((sum, i) => sum + i.amount, 0);
  const pfTotal = pfItems.reduce((sum, i) => sum + i.amount, 0);
  const diff = poolTotal - pfTotal;
  const isBalanced = diff === 0;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── ダークヒーロー ── */}
        <View style={s.hero}>
          <View style={s.heroTop}>
            <Text style={s.logo}>TSUKAIDOKI</Text>
            <Pressable style={s.transferBtn} onPress={() => router.push('/transfer')}>
              <Text style={s.transferBtnTxt}>振替</Text>
            </Pressable>
          </View>

          <View style={s.heroCenter}>
            <Text style={s.heroLabel}>総資産</Text>
            <Text style={s.heroTotal}>¥{poolTotal.toLocaleString('ja-JP')}</Text>
            <Text style={s.heroNote}>プール金とポートフォリオの合計</Text>
          </View>

          <View style={[s.statusChip, !isBalanced && s.statusChipWarn]}>
            <View style={[s.statusDot, !isBalanced && s.statusDotWarn]} />
            <Text style={[s.statusTxt, !isBalanced && s.statusTxtWarn]}>
              {isBalanced
                ? '整合済み — 差額 ¥0'
                : `差異あり — ¥${Math.abs(diff).toLocaleString('ja-JP')} のずれ`}
            </Text>
          </View>
        </View>

        {/* ── ライトコンテンツ（カーブ遷移） ── */}
        <View style={s.content}>

          <ChartCard
            title="プール金"
            badge="口座別"
            total={fmtMan(poolTotal)}
            sub={`${POOL_ITEMS.length}口座`}
            items={poolItems}
            route="/pool"
            delay={60}
          />

          <ChartCard
            title="ポートフォリオ"
            badge="用途別"
            total={fmtMan(pfTotal)}
            sub={`${PF_ITEMS.length}PJ`}
            items={pfItems}
            route="/portfolio"
            delay={140}
          />

          {/* 差額カード */}
          <Animated.View entering={FadeInDown.delay(220).springify().damping(16)}>
            <View style={s.diffCard}>
              <View style={s.diffRow}>
                <Text style={s.diffLabel}>プール金</Text>
                <Text style={s.diffAmt}>¥{poolTotal.toLocaleString('ja-JP')}</Text>
              </View>
              <View style={s.diffDivider} />
              <View style={s.diffRow}>
                <Text style={s.diffLabel}>ポートフォリオ</Text>
                <Text style={s.diffAmt}>¥{pfTotal.toLocaleString('ja-JP')}</Text>
              </View>
              <View style={s.diffDivider} />
              <View style={s.diffRow}>
                <Text style={[s.diffLabel, { color: isBalanced ? C.green : C.red, fontWeight: '600' }]}>差額</Text>
                <Text style={[s.diffAmtLg, { color: isBalanced ? C.green : C.red }]}>
                  {isBalanced ? '¥0 ✓' : `¥${diff.toLocaleString('ja-JP')}`}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* 安心ラインカード */}
          <Animated.View entering={FadeInDown.delay(300).springify().damping(16)}>
            <View style={s.safeCard}>
              <View style={s.safeAccent} />
              <View style={{ flex: 1 }}>
                <Text style={s.safeLabel}>今月の安心ライン</Text>
                <Text style={s.safeAmt}>¥87,000</Text>
                <Text style={s.safeNote}>全プロジェクト計画達成後の余力。この範囲なら自由に使えます。</Text>
              </View>
            </View>
          </Animated.View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.dark },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },

  // ── ヒーロー ──
  hero: {
    backgroundColor: C.dark,
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 48,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  logo: {
    fontSize: 11,
    fontWeight: '700',
    color: C.accent,
    letterSpacing: 2.5,
  },
  transferBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  transferBtnTxt: { fontSize: 12, color: '#fff', fontWeight: '500' },
  heroCenter: { alignItems: 'center', marginBottom: 28 },
  heroLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  heroTotal: {
    fontSize: 44,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -1.5,
    lineHeight: 50,
  },
  heroNote: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 6,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
    backgroundColor: 'rgba(46,204,143,0.15)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  statusChipWarn: { backgroundColor: 'rgba(240,80,80,0.15)' },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.green },
  statusDotWarn: { backgroundColor: C.red },
  statusTxt: { fontSize: 12, color: C.green, fontWeight: '600' },
  statusTxtWarn: { color: C.red },

  // ── ライトコンテンツ ──
  content: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
    paddingTop: 20,
    paddingHorizontal: 16,
    gap: 12,
  },

  // ── チャートカード ──
  chartCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  cardTitle: { fontSize: 12, color: C.textSecondary, fontWeight: '500', marginBottom: 3 },
  cardTotal: { fontSize: 22, fontWeight: '700', color: C.textPrimary, letterSpacing: -0.5 },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: C.bg,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  cardBadgeTxt: { fontSize: 11, color: C.textSecondary },
  cardArrow: { fontSize: 14, color: C.textTertiary },
  cardBody: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  cardLegend: { flex: 1, gap: 6 },
  legRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  legBar: { width: 14, height: 3, borderRadius: 2, flexShrink: 0 },
  legName: { flex: 1, fontSize: 10, color: C.textSecondary },
  legVal: { fontSize: 10, fontWeight: '600', color: C.textPrimary },

  // ── 差額カード ──
  diffCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  diffRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  diffDivider: { height: 0.5, backgroundColor: C.border },
  diffLabel: { fontSize: 13, color: C.textSecondary },
  diffAmt: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  diffAmtLg: { fontSize: 17, fontWeight: '700' },

  // ── 安心ラインカード ──
  safeCard: {
    backgroundColor: C.dark,
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  safeAccent: {
    width: 3,
    borderRadius: 2,
    backgroundColor: C.accent,
    alignSelf: 'stretch',
  },
  safeLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4, letterSpacing: 0.5 },
  safeAmt: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -1, lineHeight: 32 },
  safeNote: { fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 5, lineHeight: 15 },
});
