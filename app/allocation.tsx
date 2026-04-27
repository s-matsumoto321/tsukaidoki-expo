import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  TextInput,
  Switch,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Polyline } from 'react-native-svg';
import { PROJECTS } from '@/constants/projects';
import { PF_ITEMS } from '@/constants/data';
import { useStore } from '@/store/useStore';

const C = {
  brand: '#0C447C',
  green: '#1D9E75',
  bg: '#f5f4ee',
  card: '#ffffff',
  textPrimary: '#2c2c2a',
  textSecondary: '#73726c',
  border: 'rgba(0,0,0,0.08)',
};

const PROJECT_ORDER = ['edu', 'ret', 'car', 'trip'] as const;

function getProjectColor(projectId: string): string {
  return PF_ITEMS.find(item => item.projectId === projectId)?.color ?? C.brand;
}

function Sparkline({ plan, color, width }: { plan: number[]; color: string; width: number }) {
  const height = 44;
  const pad = 4;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const n = plan.length;
  if (n < 2) return null;
  const maxV = Math.max(...plan);
  const minV = Math.min(...plan);
  const range = maxV - minV || 1;
  const xi = (i: number) => pad + (i / (n - 1)) * w;
  const yv = (v: number) => pad + h - ((v - minV) / range) * h;
  const pts = plan.map((v, i) => `${xi(i)},${yv(v)}`).join(' ');
  return (
    <Svg width={width} height={height}>
      <Polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} opacity={0.7} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function AllocationBar({ amounts }: { amounts: Record<string, number> }) {
  const total = PROJECT_ORDER.reduce((sum, id) => sum + (amounts[id] ?? 0), 0);
  if (total === 0) return null;
  return (
    <View style={bar.wrap}>
      {PROJECT_ORDER.map(id => {
        const ratio = (amounts[id] ?? 0) / total;
        if (ratio <= 0) return null;
        return (
          <View
            key={id}
            style={[bar.seg, { flex: ratio, backgroundColor: getProjectColor(id) }]}
          />
        );
      })}
    </View>
  );
}

const bar = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  seg: { height: 12 },
});

export default function AllocationScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { savingsAllocation, saveSavingsAllocation } = useStore();

  const [amounts, setAmounts] = useState<Record<string, number>>(
    savingsAllocation.monthlyAmounts,
  );
  const [autoActual, setAutoActual] = useState(true);

  const total = PROJECT_ORDER.reduce((sum, id) => sum + (amounts[id] ?? 0), 0);
  const cardInnerWidth = screenWidth - 14 * 2 - 16 * 2;

  const handleSave = () => {
    saveSavingsAllocation({ monthlyAmounts: amounts });
    router.back();
  };

  const updateAmount = (id: string, text: string) => {
    const val = parseInt(text.replace(/[^0-9]/g, ''), 10) || 0;
    setAmounts(prev => ({ ...prev, [id]: val }));
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={s.backTxt}>‹ 戻る</Text>
        </Pressable>
        <Text style={s.headerTitle}>積立 配分設定</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 90 }}
      >
        <View style={s.sectionCard}>
          <Text style={s.sectionLabel}>月の積立合計</Text>
          <Text style={s.totalAmt}>¥{total.toLocaleString('ja-JP')}円/月</Text>
        </View>

        <Text style={s.sectionHeader}>プロジェクト別 配分</Text>

        {PROJECT_ORDER.map(id => {
          const project = PROJECTS[id];
          if (!project) return null;
          const color = getProjectColor(id);
          const amt = amounts[id] ?? 0;
          const pct = total > 0 ? Math.round((amt / total) * 100) : 0;

          return (
            <View key={id} style={s.projectCard}>
              <View style={[s.colorBar, { backgroundColor: color }]} />
              <View style={s.projectContent}>
                <View style={s.projectTopRow}>
                  <Text style={s.projectName}>{project.name}</Text>
                  <View style={[s.pctBadge, { backgroundColor: color + '22' }]}>
                    <Text style={[s.pctTxt, { color }]}>{pct}%</Text>
                  </View>
                </View>

                <View style={s.amtInputRow}>
                  <View style={s.amtInputWrap}>
                    <Text style={s.amtPrefix}>¥</Text>
                    <TextInput
                      style={s.amtInput}
                      value={amt > 0 ? String(amt) : ''}
                      onChangeText={v => updateAmount(id, v)}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor={C.textSecondary}
                      selectTextOnFocus
                    />
                    <Text style={s.amtSuffix}>円/月</Text>
                  </View>
                </View>

                <View style={{ marginTop: 6 }}>
                  <Sparkline plan={project.plan} color={color} width={cardInnerWidth} />
                </View>
              </View>
            </View>
          );
        })}

        <View style={s.allocBarCard}>
          <Text style={s.allocBarLabel}>配分バー</Text>
          <AllocationBar amounts={amounts} />
          <View style={s.allocLegendRow}>
            {PROJECT_ORDER.map(id => {
              const project = PROJECTS[id];
              const color = getProjectColor(id);
              const amt = amounts[id] ?? 0;
              const pct = total > 0 ? Math.round((amt / total) * 100) : 0;
              return (
                <View key={id} style={s.allocLegendItem}>
                  <View style={[s.allocLegendDot, { backgroundColor: color }]} />
                  <Text style={s.allocLegendTxt}>{project?.name ?? id} {pct}%</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={s.toggleCard}>
          <View style={{ flex: 1 }}>
            <Text style={s.toggleLabel}>毎月自動で実績に反映</Text>
            <Text style={s.toggleSub}>スイッチONにすると、積立予定通りに実績が自動入力されます</Text>
          </View>
          <Switch
            value={autoActual}
            onValueChange={setAutoActual}
            trackColor={{ false: 'rgba(0,0,0,0.1)', true: C.brand }}
            thumbColor={C.card}
          />
        </View>
      </ScrollView>

      <View style={[s.saveWrap, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable style={s.saveBtn} onPress={handleSave}>
          <Text style={s.saveTxt}>保存して適用する</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    backgroundColor: C.brand,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  backTxt: { fontSize: 18, color: '#fff', fontWeight: '500', marginBottom: 6, letterSpacing: 0.2 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#fff' },

  sectionCard: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  sectionLabel: { fontSize: 12, color: C.textSecondary, marginBottom: 4 },
  totalAmt: { fontSize: 26, fontWeight: '700', color: C.textPrimary },

  sectionHeader: {
    fontSize: 13,
    fontWeight: '500',
    color: C.textSecondary,
    marginBottom: 8,
    marginLeft: 2,
  },

  projectCard: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: C.border,
    marginBottom: 10,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  colorBar: { width: 4 },
  projectContent: { flex: 1, padding: 12 },
  projectTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  projectName: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  pctBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pctTxt: { fontSize: 12, fontWeight: '600' },

  amtInputRow: { flexDirection: 'row', alignItems: 'center' },
  amtInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    borderRadius: 10,
    paddingHorizontal: 10,
    backgroundColor: C.bg,
    flex: 1,
  },
  amtPrefix: { fontSize: 16, color: C.textSecondary, marginRight: 2 },
  amtInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '500',
    color: C.textPrimary,
    paddingVertical: 8,
  },
  amtSuffix: { fontSize: 13, color: C.textSecondary },

  allocBarCard: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: C.border,
    padding: 14,
    marginBottom: 10,
  },
  allocBarLabel: { fontSize: 12, color: C.textSecondary, marginBottom: 8 },
  allocLegendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  allocLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  allocLegendDot: { width: 8, height: 8, borderRadius: 4 },
  allocLegendTxt: { fontSize: 11, color: C.textSecondary },

  toggleCard: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: C.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  toggleLabel: { fontSize: 14, fontWeight: '500', color: C.textPrimary, marginBottom: 3 },
  toggleSub: { fontSize: 11, color: C.textSecondary, lineHeight: 16 },

  saveWrap: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: C.bg,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
  },
  saveBtn: {
    backgroundColor: C.brand,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  saveTxt: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
