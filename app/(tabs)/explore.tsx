import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View, Text, Pressable, StyleSheet, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { PF_ITEMS } from '@/constants/data';
import { useStore } from '@/store/useStore';

const C = {
  brand: '#0C447C',
  green: '#1D9E75',
  greenBg: '#EAF3DE',
  greenText: '#27500A',
  orange: '#EF9F27',
  orangeBg: '#FEF3E2',
  bg: '#f5f4ee',
  card: '#ffffff',
  textPrimary: '#2c2c2a',
  textSecondary: '#73726c',
  border: 'rgba(0,0,0,0.08)',
  warn: '#E24B4A',
};

const DREAM_IDS = ['car', 'trip'];
const ANSHIN_IDS = ['edu', 'ret'];

function ProgressBar({ progress, color }: { progress: number; color: string }) {
  return (
    <View style={s.barBg}>
      <View style={[s.barFill, { width: `${Math.min(progress * 100, 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

type CardProps = {
  color: string;
  name: string;
  amount: number;
  meta?: string;
  progress?: number;
  status?: 'ok' | 'warn';
  projectId?: string;
};

function PjCard({ color, name, amount, meta, progress = 0, status, projectId }: CardProps) {
  const pct = Math.round(progress * 100);
  const onPress = () => projectId && router.push(`/project/${projectId}`);

  return (
    <Pressable style={s.card} onPress={onPress} disabled={!projectId}>
      <View style={[s.cardAccent, { backgroundColor: color }]} />
      <View style={s.cardBody}>
        <View style={s.cardTop}>
          <Text style={s.cardName}>{name}</Text>
          {status && (
            <Text style={[s.badge, status === 'ok' ? s.badgeOk : s.badgeWarn]}>
              {status === 'ok' ? '◎ 順調' : '△ 要注意'}
            </Text>
          )}
        </View>
        {meta && <Text style={s.cardMeta}>{meta}</Text>}
        <View style={s.cardBottom}>
          <ProgressBar progress={progress} color={color} />
          <View style={s.cardStats}>
            <Text style={s.cardAmt}>¥{amount.toLocaleString('ja-JP')}</Text>
            <Text style={s.cardPct}>{pct}%</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function DreamsScreen() {
  const { balances } = useStore();

  const enriched = PF_ITEMS.map(item => ({
    ...item,
    amount: item.projectId ? (balances[item.projectId] ?? item.amount) : item.amount,
  }));

  const dreams = enriched.filter(i => i.projectId && DREAM_IDS.includes(i.projectId));
  const anshin = enriched.filter(i => i.projectId && ANSHIN_IDS.includes(i.projectId));

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.brand} />
      <View style={s.header}>
        <Text style={s.headerTitle}>夢プロジェクト</Text>
        <Text style={s.headerSub}>夢に近づく実感と、将来への安心を</Text>
      </View>
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>

        <View style={s.section}>
          <View style={[s.sectionBadge, { backgroundColor: C.orangeBg }]}>
            <Text style={[s.sectionBadgeText, { color: C.orange }]}>★ 夢</Text>
          </View>
          <Text style={s.sectionLabel}>使いたい・叶えたいこと</Text>
        </View>
        {dreams.map(item => <PjCard key={item.name} {...item} />)}

        <View style={[s.section, { marginTop: 20 }]}>
          <View style={[s.sectionBadge, { backgroundColor: C.greenBg }]}>
            <Text style={[s.sectionBadgeText, { color: C.green }]}>◎ 安心</Text>
          </View>
          <Text style={s.sectionLabel}>将来の不安を解消するために</Text>
        </View>
        {anshin.map(item => <PjCard key={item.name} {...item} />)}

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
  headerTitle: { fontSize: 24, fontWeight: '600', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 3 },

  scroll: { flex: 1 },
  content: { backgroundColor: C.bg, paddingHorizontal: 14, paddingTop: 16, paddingBottom: 32 },

  section: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  sectionBadgeText: { fontSize: 12, fontWeight: '700' },
  sectionLabel: { fontSize: 13, color: C.textSecondary },

  card: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: C.border,
    flexDirection: 'row',
    marginBottom: 10,
    overflow: 'hidden',
  },
  cardAccent: { width: 4 },
  cardBody: { flex: 1, padding: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { fontSize: 16, fontWeight: '600', color: C.textPrimary },
  badge: { fontSize: 12, fontWeight: '600', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  badgeOk: { backgroundColor: C.greenBg, color: C.green },
  badgeWarn: { backgroundColor: '#FAEEDA', color: '#E24B4A' },
  cardMeta: { fontSize: 12, color: C.textSecondary, marginTop: 4 },

  cardBottom: { marginTop: 10 },
  barBg: { height: 5, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 3 },
  cardStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  cardAmt: { fontSize: 15, fontWeight: '600', color: C.textPrimary },
  cardPct: { fontSize: 13, color: C.textSecondary },
});
