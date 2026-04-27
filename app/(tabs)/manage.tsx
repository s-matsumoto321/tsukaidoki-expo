import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View, Text, Pressable, StyleSheet, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { POOL_ITEMS, PF_ITEMS } from '@/constants/data';
import { useStore } from '@/store/useStore';
import { Logo } from '@/components/logo';

const C = {
  brand: '#0C447C',
  green: '#1D9E75',
  greenBg: '#EAF3DE',
  greenText: '#27500A',
  bg: '#f5f4ee',
  card: '#ffffff',
  textPrimary: '#2c2c2a',
  textSecondary: '#73726c',
  border: 'rgba(0,0,0,0.08)',
};

type MenuItemProps = {
  label: string;
  sub: string;
  onPress: () => void;
  accent?: string;
};

function MenuItem({ label, sub, onPress, accent = C.brand }: MenuItemProps) {
  return (
    <Pressable style={s.menuItem} onPress={onPress}>
      <View style={[s.menuAccent, { backgroundColor: accent }]} />
      <View style={s.menuBody}>
        <Text style={s.menuLabel}>{label}</Text>
        <Text style={s.menuSub}>{sub}</Text>
      </View>
      <Text style={s.menuArrow}>›</Text>
    </Pressable>
  );
}

export default function ManageScreen() {
  const { balances } = useStore();

  const poolTotal = POOL_ITEMS.reduce(
    (sum, item) => sum + (balances[item.projectId!] ?? item.amount),
    0
  );
  const pfTotal = PF_ITEMS.reduce(
    (sum, item) => sum + (item.projectId ? (balances[item.projectId] ?? item.amount) : item.amount),
    0
  );

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.brand} />
      <View style={s.header}>
        <Logo iconSize={26} />
        <Text style={s.headerSub}>ライフマネープラン</Text>
      </View>
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>

        {/* サマリー */}
        <View style={s.summaryRow}>
          <View style={s.summaryCard}>
            <Text style={s.summaryLabel}>プール金</Text>
            <Text style={s.summaryAmt}>¥{Math.round(poolTotal / 10000).toLocaleString()}万</Text>
          </View>
          <View style={[s.summaryCard, { borderLeftWidth: 0.5, borderLeftColor: C.border }]}>
            <Text style={s.summaryLabel}>ポートフォリオ</Text>
            <Text style={s.summaryAmt}>¥{Math.round(pfTotal / 10000).toLocaleString()}万</Text>
          </View>
        </View>

        {/* メニュー */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>資産状況</Text>
          <View style={s.menuCard}>
            <MenuItem
              label="プール金"
              sub={`${POOL_ITEMS.length}口座 · ¥${poolTotal.toLocaleString('ja-JP')}`}
              accent={C.brand}
              onPress={() => router.push('/pool')}
            />
            <View style={s.divider} />
            <MenuItem
              label="ポートフォリオ"
              sub={`${PF_ITEMS.length}件 · ¥${pfTotal.toLocaleString('ja-JP')}`}
              accent={C.green}
              onPress={() => {}}
            />
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>操作</Text>
          <View style={s.menuCard}>
            <MenuItem
              label="口座振替"
              sub="口座間の資金を移動する"
              accent="#888780"
              onPress={() => router.push('/transfer')}
            />
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    backgroundColor: C.brand,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 3 },

  scroll: { flex: 1 },
  content: { backgroundColor: C.bg, paddingHorizontal: 14, paddingTop: 16, paddingBottom: 32 },

  summaryRow: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: C.border,
    marginBottom: 20,
    overflow: 'hidden',
  },
  summaryCard: { flex: 1, paddingVertical: 14, paddingHorizontal: 16 },
  summaryLabel: { fontSize: 13, color: C.textSecondary },
  summaryAmt: { fontSize: 22, fontWeight: '600', color: C.brand, marginTop: 4 },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 13, color: C.textSecondary, marginBottom: 8, paddingHorizontal: 4 },

  menuCard: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: C.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  menuAccent: { width: 4, height: 36, borderRadius: 2, marginRight: 12 },
  menuBody: { flex: 1 },
  menuLabel: { fontSize: 16, fontWeight: '600', color: C.textPrimary },
  menuSub: { fontSize: 13, color: C.textSecondary, marginTop: 2 },
  menuArrow: { fontSize: 20, color: C.textSecondary },

  divider: { height: 0.5, backgroundColor: C.border, marginLeft: 30 },
});
