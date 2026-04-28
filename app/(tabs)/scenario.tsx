import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ScrollView, View, Text, Pressable, StyleSheet,
  StatusBar, Alert, TextInput, Modal,
} from 'react-native';
import { router } from 'expo-router';
import { useStore, type ScenarioMeta } from '@/store/useStore';
import { POOL_ITEMS } from '@/constants/data';

const C = {
  brand: '#0C447C',
  green: '#1D9E75',
  amber: '#EF9F27',
  red: '#E24B4A',
  purple: '#534AB7',
  bg: '#f5f4ee',
  card: '#ffffff',
  textPrimary: '#2c2c2a',
  textSecondary: '#73726c',
  border: 'rgba(0,0,0,0.08)',
  lockBg: '#f0f0f8',
};

// ─── シナリオ切替ローディングオーバーレイ ──────────────────────────

function SwitchingOverlay() {
  return (
    <View style={ov.wrap}>
      <View style={ov.inner}>
        <Text style={ov.mark}>✦</Text>
        <Text style={ov.title}>試算を読み込み中</Text>
        <Text style={ov.sub}>シナリオを切り替えています...</Text>
      </View>
    </View>
  );
}

const ov = StyleSheet.create({
  wrap: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(12,68,124,0.92)',
    justifyContent: 'center', alignItems: 'center',
    zIndex: 999,
  },
  inner: { alignItems: 'center', paddingHorizontal: 40 },
  mark: { fontSize: 40, color: '#fff', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 8 },
  sub: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
});

// ─── シナリオ追加モーダル ──────────────────────────────────────────

type AddModalProps = {
  visible: boolean;
  scenarios: ScenarioMeta[];
  onClose: () => void;
  onAdd: (label: string, copyFromId?: string) => void;
};

function AddScenarioModal({ visible, scenarios, onClose, onAdd }: AddModalProps) {
  const [mode, setMode] = useState<'select' | 'copy' | 'new' | null>(null);
  const [label, setLabel] = useState('');
  const [copyFromId, setCopyFromId] = useState<string | undefined>(undefined);

  const reset = () => {
    setMode(null);
    setLabel('');
    setCopyFromId(undefined);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleAdd = () => {
    if (!label.trim()) return;
    onAdd(label.trim(), copyFromId);
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={ma.safe}>
        <View style={ma.header}>
          <Text style={ma.title}>新しいシナリオを作る</Text>
          <Pressable style={ma.closeBtn} onPress={handleClose}>
            <Text style={ma.closeTxt}>✕</Text>
          </Pressable>
        </View>

        <ScrollView style={ma.scroll} contentContainerStyle={ma.content}>
          {mode === null && (
            <>
              <Pressable style={ma.optionCard} onPress={() => setMode('copy')}>
                <Text style={ma.optionIcon}>📋</Text>
                <View style={ma.optionBody}>
                  <Text style={ma.optionTitle}>既存をコピーして編集</Text>
                  <Text style={ma.optionDesc}>メインプランをベースに少しだけ変えたい時に</Text>
                </View>
                <Text style={ma.optionArrow}>›</Text>
              </Pressable>

              <Pressable style={[ma.optionCard, { marginTop: 12 }]} onPress={() => setMode('new')}>
                <Text style={ma.optionIcon}>✨</Text>
                <View style={ma.optionBody}>
                  <Text style={ma.optionTitle}>ゼロから作る</Text>
                  <Text style={ma.optionDesc}>まったく違う人生プランを最初からセットアップ</Text>
                </View>
                <Text style={ma.optionArrow}>›</Text>
              </Pressable>
            </>
          )}

          {mode === 'copy' && (
            <>
              <Text style={ma.stepLabel}>コピー元を選ぶ</Text>
              {scenarios.map(sc => (
                <Pressable
                  key={sc.id}
                  style={[ma.scItem, copyFromId === sc.id && ma.scItemSelected]}
                  onPress={() => setCopyFromId(sc.id)}
                >
                  <View style={[ma.scDot, copyFromId === sc.id && ma.scDotSelected]} />
                  <Text style={ma.scLabel}>プラン{sc.systemLabel}：{sc.userLabel}</Text>
                </Pressable>
              ))}

              <Text style={[ma.stepLabel, { marginTop: 20 }]}>新しいシナリオ名</Text>
              <TextInput
                style={ma.input}
                placeholder="例：FIREプラン"
                placeholderTextColor={C.textSecondary}
                value={label}
                onChangeText={setLabel}
              />

              <Pressable
                style={[ma.addBtn, (!label.trim() || !copyFromId) && ma.addBtnDisabled]}
                onPress={handleAdd}
                disabled={!label.trim() || !copyFromId}
              >
                <Text style={ma.addBtnTxt}>作成する</Text>
              </Pressable>

              <Pressable style={ma.backBtn} onPress={() => { setMode(null); setCopyFromId(undefined); }}>
                <Text style={ma.backBtnTxt}>← 戻る</Text>
              </Pressable>
            </>
          )}

          {mode === 'new' && (
            <>
              <Text style={ma.stepLabel}>新しいシナリオ名</Text>
              <TextInput
                style={ma.input}
                placeholder="例：ハワイ移住プラン"
                placeholderTextColor={C.textSecondary}
                value={label}
                onChangeText={setLabel}
              />

              <Pressable
                style={[ma.addBtn, !label.trim() && ma.addBtnDisabled]}
                onPress={handleAdd}
                disabled={!label.trim()}
              >
                <Text style={ma.addBtnTxt}>作成する</Text>
              </Pressable>

              <Pressable style={ma.backBtn} onPress={() => setMode(null)}>
                <Text style={ma.backBtnTxt}>← 戻る</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const ma = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 0.5, borderBottomColor: C.border,
    backgroundColor: C.card,
  },
  title: { fontSize: 18, fontWeight: '700', color: C.textPrimary },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center',
  },
  closeTxt: { fontSize: 13, color: C.textSecondary },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  optionCard: {
    backgroundColor: C.card, borderRadius: 12,
    borderWidth: 0.5, borderColor: C.border,
    padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  optionIcon: { fontSize: 28 },
  optionBody: { flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: '600', color: C.textPrimary },
  optionDesc: { fontSize: 13, color: C.textSecondary, marginTop: 3 },
  optionArrow: { fontSize: 20, color: C.textSecondary },
  stepLabel: { fontSize: 13, color: C.textSecondary, marginBottom: 10 },
  scItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 14,
    backgroundColor: C.card, borderRadius: 10,
    borderWidth: 0.5, borderColor: C.border, marginBottom: 8,
  },
  scItemSelected: { borderColor: C.brand, backgroundColor: '#EEF4FB' },
  scDot: {
    width: 14, height: 14, borderRadius: 7,
    borderWidth: 2, borderColor: C.textSecondary,
  },
  scDotSelected: { borderColor: C.brand, backgroundColor: C.brand },
  scLabel: { fontSize: 15, color: C.textPrimary },
  input: {
    backgroundColor: C.card, borderRadius: 10,
    borderWidth: 0.5, borderColor: C.border,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, color: C.textPrimary, marginBottom: 20,
  },
  addBtn: {
    backgroundColor: C.brand, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  addBtnDisabled: { opacity: 0.4 },
  addBtnTxt: { fontSize: 16, fontWeight: '600', color: '#fff' },
  backBtn: { marginTop: 12, alignItems: 'center', padding: 10 },
  backBtnTxt: { fontSize: 14, color: C.textSecondary },
});

// ─── ScenarioScreen ────────────────────────────────────────────────

export default function ScenarioScreen() {
  const { scenarios, activeScenarioId, scenariosData, balances, dreams, switchScenario, addScenario, renameScenario, deleteScenario } = useStore();
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [switching, setSwitching] = useState(false);
  const isPremium = useStore(s => s.isPremium);

  const poolTotal = POOL_ITEMS.reduce(
    (sum, item) => sum + (balances[item.projectId!] ?? item.amount),
    0,
  );

  const getScenarioTotal = (id: string) => {
    if (id === activeScenarioId) return poolTotal;
    const data = scenariosData[id];
    if (!data) return poolTotal;
    return POOL_ITEMS.reduce(
      (sum, item) => sum + (data.balances[item.projectId!] ?? item.amount),
      0,
    );
  };

  const getDreamCount = (id: string) => {
    if (id === activeScenarioId) return dreams.length;
    const data = scenariosData[id];
    return data?.dreams?.length ?? 0;
  };

  const handleScenarioPress = (id: string) => {
    if (id === activeScenarioId) return;
    setSwitching(true);
    switchScenario(id);
    setTimeout(() => {
      setSwitching(false);
      router.replace('/(tabs)/index' as any);
    }, 1200);
  };

  const handleLongPress = (sc: ScenarioMeta) => {
    if (sc.id === activeScenarioId && scenarios.length === 1) return;
    Alert.alert(
      `プラン${sc.systemLabel}：${sc.userLabel}`,
      '',
      [
        {
          text: '名前を変更',
          onPress: () => {
            Alert.prompt(
              '名前を変更',
              `プラン${sc.systemLabel}：`,
              (text) => { if (text?.trim()) renameScenario(sc.id, text.trim()); },
              'plain-text',
              sc.userLabel,
            );
          },
        },
        ...(scenarios.length > 1 && sc.id !== activeScenarioId
          ? [{
              text: '削除',
              style: 'destructive' as const,
              onPress: () => {
                Alert.alert('削除しますか？', `プラン${sc.systemLabel}：${sc.userLabel} を削除します。この操作は取り消せません。`, [
                  { text: 'キャンセル', style: 'cancel' },
                  { text: '削除', style: 'destructive', onPress: () => deleteScenario(sc.id) },
                ]);
              },
            }]
          : []),
        { text: 'キャンセル', style: 'cancel' },
      ],
    );
  };

  const handleAddPress = () => {
    if (!isPremium) {
      router.push('/premium' as any);
      return;
    }
    setAddModalVisible(true);
  };

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="light-content" backgroundColor={C.brand} />
        <View style={s.header}>
          <Text style={s.headerTitle}>シナリオ</Text>
        </View>

        <ScrollView style={s.scroll} contentContainerStyle={s.content}>

          <Text style={s.sectionLabel}>現在のシナリオ</Text>

          {scenarios.map(sc => {
            const isActive = sc.id === activeScenarioId;
            const total = getScenarioTotal(sc.id);
            const dreamCount = getDreamCount(sc.id);
            return (
              <Pressable
                key={sc.id}
                style={[s.scenarioCard, isActive && s.scenarioCardActive]}
                onPress={() => handleScenarioPress(sc.id)}
                onLongPress={() => handleLongPress(sc)}
                delayLongPress={500}
              >
                <View style={s.cardHeader}>
                  <View style={[s.radioOuter, isActive && s.radioOuterActive]}>
                    {isActive && <View style={s.radioInner} />}
                  </View>
                  <Text style={[s.cardTitle, isActive && s.cardTitleActive]}>
                    プラン{sc.systemLabel}：{sc.userLabel}
                  </Text>
                  {isActive && (
                    <View style={s.activeBadge}>
                      <Text style={s.activeBadgeTxt}>選択中</Text>
                    </View>
                  )}
                </View>
                <View style={s.cardStats}>
                  <View style={s.stat}>
                    <Text style={s.statLabel}>総資産</Text>
                    <Text style={[s.statVal, isActive && s.statValActive]}>
                      ¥{Math.round(total / 10000).toLocaleString()}万
                    </Text>
                  </View>
                  <View style={[s.stat, s.statBorder]}>
                    <Text style={s.statLabel}>夢</Text>
                    <Text style={[s.statVal, isActive && s.statValActive]}>{dreamCount}個</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}

          <Text style={[s.sectionLabel, { marginTop: 24 }]}>もう一つ試してみる？</Text>
          <Pressable style={s.addCard} onPress={handleAddPress}>
            <View style={s.addIconWrap}>
              <Text style={s.addIcon}>＋</Text>
            </View>
            <View style={s.addBody}>
              <Text style={s.addTitle}>もしもプランを追加する</Text>
              {!isPremium && (
                <View style={s.lockRow}>
                  <Text style={s.lockIcon}>🔒</Text>
                  <Text style={s.lockTxt}>プレミアム機能</Text>
                </View>
              )}
            </View>
          </Pressable>

          <Text style={s.hint}>長押しで名前変更・削除ができます</Text>

        </ScrollView>

        <AddScenarioModal
          visible={addModalVisible}
          scenarios={scenarios}
          onClose={() => setAddModalVisible(false)}
          onAdd={addScenario}
        />
      </SafeAreaView>

      {switching && <SwitchingOverlay />}
    </View>
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
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },

  scroll: { flex: 1 },
  content: { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 40 },

  sectionLabel: { fontSize: 13, color: C.textSecondary, marginBottom: 10, paddingHorizontal: 4 },

  scenarioCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: C.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  scenarioCardActive: {
    borderColor: C.brand,
    borderWidth: 1.5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  radioOuter: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: C.textSecondary,
    justifyContent: 'center', alignItems: 'center',
  },
  radioOuterActive: { borderColor: C.brand },
  radioInner: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: C.brand,
  },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: C.textSecondary },
  cardTitleActive: { color: C.textPrimary },
  activeBadge: {
    backgroundColor: '#EEF4FB',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6,
  },
  activeBadgeTxt: { fontSize: 11, color: C.brand, fontWeight: '600' },
  cardStats: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: C.border,
  },
  stat: { flex: 1, paddingVertical: 12, paddingHorizontal: 16 },
  statBorder: { borderLeftWidth: 0.5, borderLeftColor: C.border },
  statLabel: { fontSize: 12, color: C.textSecondary },
  statVal: { fontSize: 18, fontWeight: '600', color: C.textSecondary, marginTop: 2 },
  statValActive: { color: C.brand },

  addCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: C.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  addIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.lockBg,
    justifyContent: 'center', alignItems: 'center',
  },
  addIcon: { fontSize: 22, color: C.brand },
  addBody: { flex: 1 },
  addTitle: { fontSize: 16, fontWeight: '600', color: C.textPrimary },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  lockIcon: { fontSize: 12 },
  lockTxt: { fontSize: 12, color: C.textSecondary },

  hint: { fontSize: 11, color: C.textSecondary, textAlign: 'center', marginTop: 16 },
});
