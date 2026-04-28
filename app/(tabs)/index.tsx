import { useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Animated, View, Text, Pressable,
  StyleSheet, StatusBar, StyleSheet as RN,
} from 'react-native';
import { Link, router, type Href } from 'expo-router';
import { DonutChart } from '@/components/donut-chart';
import { Logo } from '@/components/logo';
import { POOL_ITEMS, PF_ITEMS, type FinancialItem } from '@/constants/data';
import { useStore } from '@/store/useStore';

const C = {
  brand: '#0C447C',
  mustard: '#C4981A',
  green: '#1D9E75',
  greenBg: '#EAF3DE',
  greenText: '#27500A',
  greenSub: '#3B6D11',
  aiCard: '#E6F1FB',
  bg: '#f5f4ee',
  card: '#ffffff',
  textPrimary: '#2c2c2a',
  textSecondary: '#73726c',
  border: 'rgba(0,0,0,0.08)',
};

const MENU_WIDTH = 270;

// ─── 円グラフカード ────────────────────────────────────────────────

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

// ─── AIインサイトカード ────────────────────────────────────────────

function generateHomeInsight(pfItems: FinancialItem[], dreamCount: number): { text: string; isHope: boolean } {
  const warnItems = pfItems.filter(i => i.status === 'warn' && i.projectId);
  const okItems = pfItems.filter(i => i.status === 'ok' && i.projectId);

  if (warnItems.length > 0) {
    const warnName = warnItems[0].name;
    const okNames = okItems.map(i => i.name).join('・');
    let text = `${warnName}の達成が遅れ気味です。積立額を見直すと改善できます。`;
    if (okNames) text += `\n${okNames}は順調に積み上がっています。`;
    return { text, isHope: false };
  }

  return {
    text: `備えはバッチリです。${dreamCount}つの夢に向けて順調に進んでいます。余力で何ができるか、見てみますか？`,
    isHope: true,
  };
}

function AiInsightCard({ pfItems, dreamCount }: { pfItems: FinancialItem[]; dreamCount: number }) {
  const { text, isHope } = generateHomeInsight(pfItems, dreamCount);
  return (
    <View style={s.aiCard}>
      <View style={s.aiInner}>
        <Text style={s.aiMark}>✦</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.aiLabel}>AIインサイト</Text>
          <Text style={s.aiTxt}>{text}</Text>
          {isHope && (
            <Pressable style={s.aiBtn} onPress={() => router.push('/(tabs)/explore' as any)}>
              <Text style={s.aiBtnTxt}>試算してみる</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── ヘルパー ───────────────────────────────────────────────────────

function fmtMan(yen: number): string {
  return `¥${Math.round(yen / 10000).toLocaleString('ja-JP')}万`;
}
function fmtYen(yen: number): string {
  return `¥${yen.toLocaleString('ja-JP')}`;
}

// ─── ホーム画面 ────────────────────────────────────────────────────

const MENU_ITEMS = [
  { label: 'ホーム',   icon: '⌂' },
  { label: '使いみち', icon: '★' },
  { label: '管理',     icon: '≡' },
  { label: '設定',     icon: '⚙' },
];

export default function HomeScreen() {
  const { balances, scenarios, activeScenarioId, dreams } = useStore();
  const activeScenario = scenarios.find(sc => sc.id === activeScenarioId) ?? scenarios[0];

  const [menuVisible, setMenuVisible] = useState(false);
  const menuAnim    = useRef(new Animated.Value(MENU_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const btnScale    = useRef(new Animated.Value(1)).current;

  const openMenu = () => {
    setMenuVisible(true);
    Animated.parallel([
      Animated.spring(menuAnim,    { toValue: 0, useNativeDriver: true, bounciness: 4 }),
      Animated.timing(overlayAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const closeMenu = () => {
    Animated.parallel([
      Animated.timing(menuAnim,    { toValue: MENU_WIDTH, duration: 220, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 0,          duration: 200, useNativeDriver: true }),
    ]).start(() => setMenuVisible(false));
  };

  const onMenuBtnPress = () => {
    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.75, duration: 80, useNativeDriver: true }),
      Animated.spring(btnScale, { toValue: 1, bounciness: 14, useNativeDriver: true }),
    ]).start();
    openMenu();
  };

  const poolItems = POOL_ITEMS.map(item => ({
    ...item,
    amount: balances[item.projectId!] ?? item.amount,
  }));
  const pfItems = PF_ITEMS.map(item => ({
    ...item,
    amount: item.projectId ? (balances[item.projectId] ?? item.amount) : item.amount,
  }));

  const poolTotal = poolItems.reduce((sum, item) => sum + item.amount, 0);
  const pfTotal   = pfItems.reduce((sum, item) => sum + item.amount, 0);
  const diff       = poolTotal - pfTotal;
  const isBalanced = diff === 0;

  const pjCount   = PF_ITEMS.filter(i => i.projectId).length;
  const acctCount = POOL_ITEMS.length;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="light-content" backgroundColor={C.brand} />

        {/* ① ヘッダー */}
        <View style={s.header}>
          <View>
            <Logo iconSize={26} />
            <Text style={s.headerSub}>ライフマネープラン</Text>
          </View>
          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <Pressable style={s.menuBtn} onPress={onMenuBtnPress}>
              <View style={s.menuLine} />
              <View style={s.menuLine} />
              <View style={s.menuLine} />
            </Pressable>
          </Animated.View>
        </View>

        {/* ② シナリオバナー */}
        <Pressable style={s.scenarioBanner} onPress={() => router.push('/(tabs)/scenario' as any)}>
          <Text style={s.scenarioIcon}>📊</Text>
          <Text style={s.scenarioTxt}>
            プラン{activeScenario?.systemLabel}：{activeScenario?.userLabel}
          </Text>
          <Text style={s.scenarioArrow}>›</Text>
        </Pressable>

        {/* ③ 総資産 + 自信表現 */}
        <View style={s.totalCard}>
          <Text style={s.totalLabel}>総資産</Text>
          <Text style={s.totalAmt}>{fmtYen(poolTotal)}</Text>
          <Text style={s.totalNote}>
            {pjCount}PJ・{dreams.length}夢・{acctCount}口座 管理中
          </Text>
        </View>

        {/* ④ 整合バナー */}
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

        {/* ⑤ 円グラフ2枚 */}
        <View style={s.dualChart}>
          <ChartCard
            title="プール金"
            badge="口座別"
            headerColor={C.brand}
            total={fmtMan(poolTotal)}
            sub={`${POOL_ITEMS.length}口座`}
            items={poolItems}
            route={'/(tabs)/pool' as any}
          />
          <ChartCard
            title="使いみち"
            badge="用途別"
            headerColor={C.mustard}
            total={fmtMan(pfTotal)}
            sub={`${PF_ITEMS.length}件`}
            items={pfItems}
            route="/(tabs)/explore"
          />
        </View>

        {/* ⑥ AIインサイト */}
        <AiInsightCard pfItems={pfItems} dreamCount={dreams.length} />

      </SafeAreaView>

      {/* オーバーレイ */}
      {menuVisible && (
        <Animated.View
          style={[RN.absoluteFill, { opacity: overlayAnim }]}
          pointerEvents="auto"
        >
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }}
            onPress={closeMenu}
          />
        </Animated.View>
      )}

      {/* スライドメニュー */}
      {menuVisible && (
        <Animated.View style={[s.menuPanel, { transform: [{ translateX: menuAnim }] }]}>
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
            <View style={s.menuHeader}>
              <Logo iconSize={20} />
              <Pressable style={s.menuCloseBtn} onPress={closeMenu}>
                <Text style={s.menuCloseTxt}>✕</Text>
              </Pressable>
            </View>
            <View style={s.menuList}>
              {MENU_ITEMS.map(item => (
                <Pressable key={item.label} style={s.menuItem}>
                  <Text style={s.menuItemIcon}>{item.icon}</Text>
                  <Text style={s.menuItemLabel}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          </SafeAreaView>
        </Animated.View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  // ヘッダー
  header: {
    backgroundColor: C.brand,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 3 },

  menuBtn: {
    padding: 9,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLine: {
    width: 20, height: 2,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 1, marginVertical: 2.5,
  },

  menuPanel: {
    position: 'absolute', top: 0, right: 0, bottom: 0, width: MENU_WIDTH,
    backgroundColor: C.brand,
    shadowColor: '#000', shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.22, shadowRadius: 12, elevation: 24,
  },
  menuHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  menuCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  menuCloseTxt: { fontSize: 13, color: '#fff' },
  menuList: { paddingTop: 8 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    paddingHorizontal: 24, paddingVertical: 16,
  },
  menuItemIcon: { fontSize: 18, color: 'rgba(255,255,255,0.65)', width: 22, textAlign: 'center' },
  menuItemLabel: { fontSize: 16, fontWeight: '500', color: '#fff' },

  // シナリオバナー
  scenarioBanner: {
    marginHorizontal: 14, marginTop: 10, marginBottom: 4,
    backgroundColor: 'rgba(12,68,124,0.08)',
    borderRadius: 10, borderWidth: 0.5, borderColor: 'rgba(12,68,124,0.2)',
    paddingHorizontal: 12, paddingVertical: 8,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  scenarioIcon: { fontSize: 14 },
  scenarioTxt: { flex: 1, fontSize: 13, fontWeight: '600', color: C.brand },
  scenarioArrow: { fontSize: 16, color: C.brand, opacity: 0.6 },

  // 総資産カード
  totalCard: {
    marginHorizontal: 14, marginTop: 6, marginBottom: 4,
    backgroundColor: C.card, borderRadius: 12,
    borderWidth: 0.5, borderColor: C.border,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  totalLabel: { fontSize: 12, color: C.textSecondary },
  totalAmt: { fontSize: 28, fontWeight: '500', color: C.brand, marginTop: 2 },
  totalNote: { fontSize: 11, color: C.textSecondary, marginTop: 4 },

  // 整合バナー
  matchBar: {
    marginHorizontal: 8, marginBottom: 4,
    borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.greenBg,
  },
  matchDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.green, justifyContent: 'center', alignItems: 'center' },
  matchDotTxt: { fontSize: 12, fontWeight: '500', color: '#fff' },
  matchBarWarn: { backgroundColor: '#FAEEDA' },
  matchDotWarn: { backgroundColor: '#E24B4A' },
  matchTxt: { fontSize: 12, fontWeight: '500', color: C.greenText },
  matchTxtWarn: { color: '#633806' },
  matchSub: { fontSize: 11, marginTop: 1, color: C.greenSub },
  matchSubWarn: { color: '#633806' },

  // 円グラフ
  dualChart: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingTop: 2, paddingBottom: 4 },
  chartCard: {
    flex: 1, backgroundColor: C.card,
    borderWidth: 0.5, borderColor: C.border,
    borderRadius: 12, overflow: 'hidden',
  },
  chartHeader: {
    paddingHorizontal: 12, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.card, borderTopWidth: 4,
  },
  chartHeaderTitle: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  chartHeaderBadge: { fontSize: 11, color: C.textSecondary },
  chartBody: { padding: 12, alignItems: 'center' },
  legRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, width: '100%' },
  legLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 },
  legDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  legName: { fontSize: 11, color: C.textSecondary, flex: 1 },
  legVal: { fontSize: 11, fontWeight: '600', color: C.textPrimary, minWidth: 40, textAlign: 'right' },

  // AIインサイト
  aiCard: {
    marginHorizontal: 14, marginBottom: 8,
    backgroundColor: C.aiCard, borderRadius: 12,
    borderWidth: 0.5, borderColor: 'rgba(12,68,124,0.15)',
  },
  aiInner: {
    padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10,
  },
  aiMark: { fontSize: 16, color: '#185FA5', lineHeight: 22 },
  aiLabel: { fontSize: 11, color: '#185FA5', fontWeight: '600', marginBottom: 3 },
  aiTxt: { fontSize: 13, color: C.brand, lineHeight: 19 },
  aiBtn: {
    marginTop: 10, backgroundColor: C.brand,
    borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  aiBtnTxt: { fontSize: 13, fontWeight: '600', color: '#fff' },
});
