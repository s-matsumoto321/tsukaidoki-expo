import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View, Text, Pressable, StyleSheet, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { PF_ITEMS } from '@/constants/data';
import { useStore } from '@/store/useStore';
import { Logo } from '@/components/logo';

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
  const [activeTab, setActiveTab] = useState<'dream' | 'anshin'>('dream');

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
        <Logo iconSize={26} />
        <Text style={s.headerSub}>ライフマネープラン</Text>
      </View>

      <View style={s.tabBar}>
        <Pressable
          style={[s.tabItem, activeTab === 'dream' && { borderBottomColor: C.orange, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('dream')}
        >
          <Text style={[s.tabText, activeTab === 'dream' && { color: C.orange, fontWeight: '700' }]}>★ 夢</Text>
        </Pressable>
        <Pressable
          style={[s.tabItem, activeTab === 'anshin' && { borderBottomColor: C.green, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('anshin')}
        >
          <Text style={[s.tabText, activeTab === 'anshin' && { color: C.green, fontWeight: '700' }]}>◎ 安心</Text>
        </Pressable>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        {activeTab === 'dream' ? (
          <>
            <View style={[s.sectionBand, { backgroundColor: C.orangeBg, borderLeftColor: C.orange }]}>
              <Text style={[s.sectionBandTitle, { color: C.orange }]}>★ 夢</Text>
              <Text style={s.sectionBandSub}>使いたい・叶えたいこと</Text>
            </View>
            {dreams.map(item => <PjCard key={item.name} {...item} />)}
          </>
        ) : (
          <>
            <View style={[s.sectionBand, { backgroundColor: C.greenBg, borderLeftColor: C.green }]}>
              <Text style={[s.sectionBandTitle, { color: C.greenText }]}>◎ 安心</Text>
              <Text style={s.sectionBandSub}>将来の不安を解消するために</Text>
            </View>
            {anshin.map(item => <PjCard key={item.name} {...item} />)}
          </>
        )}
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

  tabBar: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: { fontSize: 15, fontWeight: '500', color: C.textSecondary },

  scroll: { flex: 1 },
  content: { backgroundColor: C.bg, paddingHorizontal: 14, paddingTop: 16, paddingBottom: 32 },

  sectionBand: {
    marginHorizontal: -14,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderLeftWidth: 5,
    marginBottom: 14,
  },
  sectionBandTitle: { fontSize: 18, fontWeight: '800', letterSpacing: 0.3 },
  sectionBandSub: { fontSize: 13, color: C.textSecondary, marginTop: 4 },

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
