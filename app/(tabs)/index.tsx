import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View, Text, Pressable, StyleSheet, StatusBar } from 'react-native';

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

const POOL_ITEMS = [
  { color: '#0C447C', name: '証券口座', val: '¥300万' },
  { color: '#185FA5', name: '定期預金', val: '¥250万' },
  { color: '#378ADD', name: '積立NISA', val: '¥100万' },
  { color: '#85B7EB', name: 'メイン銀行', val: '¥80万' },
  { color: '#B5D4F4', name: 'サブ銀行', val: '¥45万' },
];

const PF_ITEMS = [
  { color: '#0C447C', name: '教育PJ', val: '¥300万' },
  { color: '#1D9E75', name: '老後PJ', val: '¥250万' },
  { color: '#888780', name: '車PJ', val: '¥100万' },
  { color: '#534AB7', name: 'その他', val: '¥115万' },
  { color: '#EF9F27', name: '旅行PJ', val: '¥10万' },
];

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
  items: LegendItemProps[];
  onPress: () => void;
};

function ChartCard({ title, badge, badgeStyle, badgeTextStyle, total, sub, items, onPress }: ChartCardProps) {
  return (
    <Pressable style={s.chartCard} onPress={onPress}>
      <View style={s.chartLabelRow}>
        <Text style={s.chartLabel}>{title}</Text>
        <View style={badgeStyle}>
          <Text style={badgeTextStyle}>{badge}</Text>
        </View>
      </View>
      <View style={s.chartCircle}>
        <Text style={s.chartTotal}>{total}</Text>
        <Text style={s.chartSub}>{sub}</Text>
      </View>
      {items.map(item => <LegendItem key={item.name} {...item} />)}
    </Pressable>
  );
}

export default function HomeScreen() {
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.brand} />
      <ScrollView style={s.scrollView} contentContainerStyle={s.content}>

        {/* ヘッダー */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.logo}>ツカイドキβ版</Text>
            <Text style={s.headerSub}>総資産</Text>
            <Text style={s.headerTotal}>¥7,750,000</Text>
            <Text style={s.headerNote}>プール金・ポートフォリオ 両方の合計</Text>
          </View>
          <Pressable style={s.menuBtn} onPress={() => {}}>
            <View style={s.menuLine} />
            <View style={s.menuLine} />
            <View style={s.menuLine} />
          </Pressable>
        </View>

        {/* 一致バー */}
        <View style={s.matchBar}>
          <View style={s.matchDot}>
            <Text style={s.matchDotTxt}>✓</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.matchTxt}>プール金 ＝ ポートフォリオ　一致</Text>
            <Text style={s.matchSub}>差額 ¥0 · 記録は整合しています</Text>
          </View>
        </View>

        {/* チャート 2列 */}
        <View style={s.dualChart}>
          <ChartCard
            title="プール金"
            badge="口座別"
            badgeStyle={s.badgeBlue}
            badgeTextStyle={s.badgeBlueText}
            total="¥775万"
            sub="5口座"
            items={POOL_ITEMS}
            onPress={() => {}}
          />
          <ChartCard
            title="ポートフォリオ"
            badge="用途別"
            badgeStyle={s.badgeGreen}
            badgeTextStyle={s.badgeGreenText}
            total="¥775万"
            sub="5PJ"
            items={PF_ITEMS}
            onPress={() => {}}
          />
        </View>

        {/* 差額カード */}
        <View style={s.diffCard}>
          <View style={s.diffRow}>
            <Text style={s.diffLabel}>プール金 合計</Text>
            <Text style={[s.diffVal, s.diffBig]}>¥7,750,000</Text>
          </View>
          <View style={s.diffRow}>
            <Text style={s.diffLabel}>ポートフォリオ 合計</Text>
            <Text style={[s.diffVal, s.diffBig]}>¥7,750,000</Text>
          </View>
          <View style={[s.diffRow, s.diffRowLast]}>
            <Text style={[s.diffLabel, s.diffLabelGreen]}>差額</Text>
            <Text style={[s.diffVal, s.diffValGreen]}>¥0 ✓</Text>
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
  menuBtn: { width: 28, height: 28, justifyContent: 'center', alignItems: 'flex-end', marginTop: 4 },
  menuLine: { width: 16, height: 1.5, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 1, marginVertical: 1.5 },

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
  matchTxt: { fontSize: 11, fontWeight: '500', color: C.greenText },
  matchSub: { fontSize: 9, marginTop: 1, color: C.greenSub },

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
  chartCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 10,
    borderColor: '#dde8f4',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
  chartTotal: { fontSize: 12, fontWeight: '500', color: C.textPrimary },
  chartSub: { fontSize: 8, color: C.textSecondary, marginTop: 1 },
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
