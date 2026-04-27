import { useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Animated, ScrollView, View, Text, Pressable,
  StyleSheet, StatusBar, StyleSheet as RN,
} from 'react-native';
import { Link, type Href } from 'expo-router';
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
  bg: '#f5f4ee',
  card: '#ffffff',
  textPrimary: '#2c2c2a',
  textSecondary: '#73726c',
  border: 'rgba(0,0,0,0.08)',
};


const MENU_WIDTH = 270;

// -------------------------------------------------------
// ChartCard
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
// Helpers
// -------------------------------------------------------
function fmtMan(yen: number): string {
  return `¥${Math.round(yen / 10000).toLocaleString('ja-JP')}万`;
}
function fmtYen(yen: number): string {
  return `¥${yen.toLocaleString('ja-JP')}`;
}

// -------------------------------------------------------
// HomeScreen
// -------------------------------------------------------
const MENU_ITEMS = [
  { label: 'ホーム',   icon: '⌂' },
  { label: '使いみち', icon: '★' },
  { label: '管理',     icon: '≡' },
  { label: '設定',     icon: '⚙' },
];

export default function HomeScreen() {
  const { balances } = useStore();

  // --- menu animation ---
  const [menuVisible, setMenuVisible] = useState(false);
  const menuAnim   = useRef(new Animated.Value(MENU_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const btnScale   = useRef(new Animated.Value(1)).current;

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

  // --- data ---
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

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="light-content" backgroundColor={C.brand} />
        <ScrollView style={s.scrollView} contentContainerStyle={s.content}>

          {/* ヘッダー */}
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

          {/* 総資産カード */}
          <View style={s.totalCard}>
            <Text style={s.totalLabel}>総資産</Text>
            <Text style={s.totalAmt}>{fmtYen(poolTotal)}</Text>
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

          {/* ドーナツ2列 */}
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
              title="使いみち"
              badge="用途別"
              headerColor={C.mustard}
              total={fmtMan(pfTotal)}
              sub={`${PF_ITEMS.length}件`}
              items={pfItems}
              route="/(tabs)/explore"
            />
          </View>

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
  scrollView: { flex: 1 },
  content: { backgroundColor: C.bg, paddingBottom: 8 },

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

  // ハンバーガーボタン
  menuBtn: {
    padding: 9,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLine: {
    width: 20,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 1,
    marginVertical: 2.5,
  },

  // スライドメニューパネル
  menuPanel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: MENU_WIDTH,
    backgroundColor: C.brand,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 24,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  menuCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuCloseTxt: { fontSize: 13, color: '#fff' },
  menuList: { paddingTop: 8 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  menuItemIcon: { fontSize: 18, color: 'rgba(255,255,255,0.65)', width: 22, textAlign: 'center' },
  menuItemLabel: { fontSize: 16, fontWeight: '500', color: '#fff' },

  // 総資産カード
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
