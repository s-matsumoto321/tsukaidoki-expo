import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View, Text, Pressable, StyleSheet, StatusBar } from 'react-native';
import { Link, router, type Href } from 'expo-router';
import { DonutChart } from '@/components/donut-chart';
import { Logo } from '@/components/logo';
import { POOL_ITEMS, PF_ITEMS, type FinancialItem } from '@/constants/data';
import { useStore } from '@/store/useStore';

const C = {
  brand: '#0C447C',
  green: '#1D9E75',
  greenBg: '#EAF3DE',
  greenText: '#27500A',
  greenSub: '#3B6D11',
  bg: '#f5f4ee',
  card: '#ffffff',
  textPrimary: '#2c2c2a',
  textSecondary: '#73726c',
  border: 'rgba(0,0,0,0.08)',
};

// -------------------------------------------------------
// 案A: ドーナツ2列（現行）
// -------------------------------------------------------
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
  headerColor: string;
  total: string;
  sub: string;
  items: FinancialItem[];
  route: Href;
};

function ChartCard({ title, badge, headerColor, total, sub, items, route }: ChartCardProps) {
  const segments = items.map(i => ({ color: i.color, value: i.amount }));
  return (
    <Link href={route} asChild>
      <Pressable style={s.chartCard}>
        <View style={[s.chartHeader, { borderTopColor: headerColor }]}>
          <Text style={s.chartHeaderTitle}>{title}</Text>
          <Text style={s.chartHeaderBadge}>{badge}</Text>
        </View>
        <View style={s.chartBody}>
          <DonutChart segments={segments} size={106} thickness={11} centerLabel={total} centerSub={sub} />
          {items.map(item => <LegendItem key={item.name} {...item} />)}
        </View>
      </Pressable>
    </Link>
  );
}

// -------------------------------------------------------
// 案B: 左右ミラーリスト（コメントアウト中）
// -------------------------------------------------------
/*
type MirrorItemProps = { color: string; name: string; amount: number; total: number };

function MirrorItem({ color, name, amount, total }: MirrorItemProps) {
  const pct = total > 0 ? amount / total : 0;
  return (
    <View style={s.mItem}>
      <View style={s.mItemTop}>
        <View style={[s.mDot, { backgroundColor: color }]} />
        <Text style={s.mName} numberOfLines={1}>{name}</Text>
      </View>
      <View style={s.mItemBottom}>
        <View style={s.mBarBg}>
          <View style={[s.mBarFill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
        </View>
        <Text style={s.mAmt}>{Math.round(amount / 10000)}万</Text>
      </View>
    </View>
  );
}

type MirrorCardProps = {
  poolItems: FinancialItem[];
  pfItems: FinancialItem[];
  poolTotal: number;
  pfTotal: number;
};

function MirrorCard({ poolItems, pfItems, poolTotal, pfTotal }: MirrorCardProps) {
  const rows = Math.max(poolItems.length, pfItems.length);
  return (
    <View style={s.mCard}>
      <View style={s.mHeader}>
        <Pressable style={s.mHeaderHalf} onPress={() => router.push('/pool')}>
          <Text style={s.mHeaderLabel}>プール金</Text>
          <Text style={s.mHeaderTotal}>¥{Math.round(poolTotal / 10000).toLocaleString()}万</Text>
          <Text style={s.mHeaderLink}>詳細 ›</Text>
        </Pressable>
        <View style={s.mColDivider} />
        <Pressable style={s.mHeaderHalf} onPress={() => router.push('/portfolio')}>
          <Text style={s.mHeaderLabel}>ポートフォリオ</Text>
          <Text style={s.mHeaderTotal}>¥{Math.round(pfTotal / 10000).toLocaleString()}万</Text>
          <Text style={s.mHeaderLink}>詳細 ›</Text>
        </Pressable>
      </View>
      <View style={s.mSep} />
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={[s.mRow, i < rows - 1 && s.mRowBorder]}>
          {poolItems[i]
            ? <MirrorItem {...poolItems[i]} total={poolTotal} />
            : <View style={s.mItem} />}
          <View style={s.mColDivider} />
          {pfItems[i]
            ? <MirrorItem {...pfItems[i]} total={pfTotal} />
            : <View style={s.mItem} />}
        </View>
      ))}
    </View>
  );
}
*/

function fmtMan(yen: number): string {
  return `¥${Math.round(yen / 10000).toLocaleString('ja-JP')}万`;
}

function fmtYen(yen: number): string {
  return `¥${yen.toLocaleString('ja-JP')}`;
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
          <Logo iconSize={26} />
          <Text style={s.headerSub}>ライフマネープラン</Text>
        </View>

        {/* 総資産カード */}
        <View style={s.totalCard}>
          <Text style={s.totalLabel}>総資産</Text>
          <Text style={s.totalAmt}>{fmtYen(poolTotal)}</Text>
          <Text style={s.totalNote}>プール金・ポートフォリオ 両方の合計</Text>
        </View>

        {/* セクション区切り */}
        <View style={s.sectionDivider}>
          <View style={s.sectionLine} />
          <Text style={s.sectionDividerLabel}>内訳</Text>
          <View style={s.sectionLine} />
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

        {/* 案A: ドーナツ2列 */}
        <View style={s.dualChart}>
          <ChartCard
            title="プール金"
            badge="口座別"
            headerColor={C.brand}
            total={fmtMan(poolTotal)}
            sub={`${POOL_ITEMS.length}口座`}
            items={poolItems}
            route="/pool"
          />
          <ChartCard
            title="ポートフォリオ"
            badge="用途別"
            headerColor={C.green}
            total={fmtMan(pfTotal)}
            sub={`${PF_ITEMS.length}件`}
            items={pfItems}
            route="/portfolio"
          />
        </View>

        {/* 案B: 左右ミラーリスト（コメントアウト中）
        <MirrorCard
          poolItems={poolItems}
          pfItems={pfItems}
          poolTotal={poolTotal}
          pfTotal={pfTotal}
        />
        */}

        {/* 差額カード */}
        <View style={s.diffCard}>
          <View style={s.diffRow}>
            <Text style={s.diffLabel}>プール金 合計</Text>
            <Text style={[s.diffVal, s.diffBig]}>{fmtYen(poolTotal)}</Text>
          </View>
          <View style={s.diffRow}>
            <Text style={s.diffLabel}>ポートフォリオ 合計</Text>
            <Text style={[s.diffVal, s.diffBig]}>{fmtYen(pfTotal)}</Text>
          </View>
          <View style={[s.diffRow, s.diffRowLast]}>
            <Text style={[s.diffLabel, isBalanced ? s.diffLabelGreen : s.diffLabelWarn]}>差額</Text>
            <Text style={[s.diffVal, isBalanced ? s.diffValGreen : s.diffValWarn]}>
              {isBalanced ? '¥0 ✓' : fmtYen(diff)}
            </Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scrollView: { flex: 1 },
  content: { backgroundColor: C.bg, paddingBottom: 8 },

  header: {
    backgroundColor: C.brand,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 24, fontWeight: '600', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 3 },

  totalCard: {
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 4,
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: C.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  totalLabel: { fontSize: 12, color: C.textSecondary },
  totalAmt: { fontSize: 30, fontWeight: '500', color: C.brand, marginTop: 2 },
  totalNote: { fontSize: 11, color: C.textSecondary, marginTop: 4 },

  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14,
    marginTop: 16,
    marginBottom: 4,
    gap: 8,
  },
  sectionLine: { flex: 1, height: 0.5, backgroundColor: C.border },
  sectionDividerLabel: { fontSize: 11, color: C.textSecondary },

  matchBar: {
    margin: 8,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.greenBg,
  },
  matchDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.green, justifyContent: 'center', alignItems: 'center' },
  matchDotTxt: { fontSize: 13, fontWeight: '500', color: '#fff' },
  matchBarWarn: { backgroundColor: '#FAEEDA' },
  matchDotWarn: { backgroundColor: '#E24B4A' },
  matchTxt: { fontSize: 13, fontWeight: '500', color: C.greenText },
  matchTxtWarn: { color: '#633806' },
  matchSub: { fontSize: 11, marginTop: 2, color: C.greenSub },
  matchSubWarn: { color: '#633806' },

  // -------------------------------------------------------
  // 案A: ドーナツ2列のスタイル（現行）
  // -------------------------------------------------------
  dualChart: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingTop: 2, paddingBottom: 4 },
  chartCard: {
    flex: 1,
    backgroundColor: C.card,
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  chartHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.card,
    borderTopWidth: 4,
  },
  chartHeaderTitle: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  chartHeaderBadge: { fontSize: 11, color: C.textSecondary },
  chartBody: { padding: 12, alignItems: 'center' },
  legRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, width: '100%' },
  legLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 },
  legDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  legName: { fontSize: 12, color: C.textSecondary, flex: 1 },
  legVal: { fontSize: 12, fontWeight: '600', color: C.textPrimary, minWidth: 44, textAlign: 'right' },

  // -------------------------------------------------------
  // 案B: 左右ミラーリストのスタイル（コメントアウト中）
  // -------------------------------------------------------
  /*
  mCard: {
    marginHorizontal: 14,
    marginTop: 2,
    marginBottom: 8,
    backgroundColor: C.card,
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mHeader: { flexDirection: 'row' },
  mHeaderHalf: { flex: 1, paddingVertical: 10, paddingHorizontal: 12 },
  mHeaderLabel: { fontSize: 10, color: C.textSecondary },
  mHeaderTotal: { fontSize: 18, fontWeight: '600', color: C.brand, marginTop: 2 },
  mHeaderLink: { fontSize: 10, color: C.brand, marginTop: 2 },
  mColDivider: { width: 0.5, backgroundColor: C.border },
  mSep: { height: 0.5, backgroundColor: C.border },
  mRow: { flexDirection: 'row' },
  mRowBorder: { borderBottomWidth: 0.5, borderBottomColor: C.border },
  mItem: { flex: 1, paddingVertical: 9, paddingHorizontal: 12 },
  mItemTop: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 },
  mDot: { width: 7, height: 7, borderRadius: 3.5 },
  mName: { fontSize: 11, fontWeight: '500', color: C.textPrimary, flex: 1 },
  mItemBottom: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mBarBg: { flex: 1, height: 5, backgroundColor: C.border, borderRadius: 2.5, overflow: 'hidden' },
  mBarFill: { height: 5, borderRadius: 2.5 },
  mAmt: { fontSize: 11, fontWeight: '600', color: C.textPrimary, minWidth: 26, textAlign: 'right' },
  */

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
  diffLabel: { fontSize: 13, color: C.textSecondary },
  diffVal: { fontSize: 13, fontWeight: '500', color: C.textPrimary },
  diffBig: { fontSize: 15, color: C.brand },
  diffLabelGreen: { color: C.green, fontWeight: '500' },
  diffValGreen: { color: C.green },
  diffLabelWarn: { color: '#E24B4A', fontWeight: '500' },
  diffValWarn: { color: '#E24B4A' },
});
