import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ScrollView, View, Text, Pressable, StyleSheet,
  StatusBar, Alert, TextInput, Modal,
} from 'react-native';
import { router } from 'expo-router';
import { useStore, type ScenarioMeta } from '@/store/useStore';
import { colors, typography, fontSizes, spacing, radius, shadows } from '@/constants/theme';
import { Plus } from 'lucide-react-native';

// ─── シナリオ切替ローディングオーバーレイ ───────────────────────────

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
    backgroundColor: 'rgba(44,53,57,0.88)',
    justifyContent: 'center', alignItems: 'center',
    zIndex: 999,
  },
  inner: { alignItems: 'center', paddingHorizontal: 40 },
  mark: { fontSize: 40, color: colors.honey, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 8 },
  sub: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
});

// ─── シナリオ追加モーダル ───────────────────────────────────────────

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

  const reset = () => { setMode(null); setLabel(''); setCopyFromId(undefined); };

  const handleClose = () => { reset(); onClose(); };

  const handleAdd = () => {
    if (!label.trim()) return;
    onAdd(label.trim(), copyFromId);
    reset(); onClose();
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
                placeholderTextColor={colors.textLight}
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
                placeholderTextColor={colors.textLight}
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
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
    backgroundColor: colors.card,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center',
  },
  closeTxt: { fontSize: 13, color: colors.textMid },
  scroll: { flex: 1 },
  content: { padding: spacing.xl, paddingBottom: 40 },
  optionCard: {
    backgroundColor: colors.card, borderRadius: radius.md,
    ...shadows.card,
    padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  optionIcon: { fontSize: 28 },
  optionBody: { flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  optionDesc: { fontSize: 13, color: colors.textMid, marginTop: 3 },
  optionArrow: { fontSize: 20, color: colors.textMid },
  stepLabel: { fontSize: 13, color: colors.textMid, marginBottom: 10 },
  scItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 14,
    backgroundColor: colors.card, borderRadius: 10,
    borderWidth: 1, borderColor: colors.divider, marginBottom: 8,
  },
  scItemSelected: { borderColor: colors.sage, backgroundColor: colors.sageBg },
  scDot: {
    width: 14, height: 14, borderRadius: 7,
    borderWidth: 2, borderColor: colors.textLight,
  },
  scDotSelected: { borderColor: colors.sage, backgroundColor: colors.sage },
  scLabel: { fontSize: 15, color: colors.text },
  input: {
    backgroundColor: colors.card, borderRadius: 10,
    borderWidth: 1, borderColor: colors.divider,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, color: colors.text, marginBottom: 20,
  },
  addBtn: {
    backgroundColor: colors.sage, borderRadius: radius.md,
    paddingVertical: 14, alignItems: 'center',
  },
  addBtnDisabled: { opacity: 0.4 },
  addBtnTxt: { fontSize: 16, fontWeight: '600', color: '#fff' },
  backBtn: { marginTop: 12, alignItems: 'center', padding: 10 },
  backBtnTxt: { fontSize: 14, color: colors.textMid },
});

// ─── ScenarioScreen ─────────────────────────────────────────────────

export default function ScenarioScreen() {
  const { scenarios, activeScenarioId, scenariosData, balances, dreams, poolItems, switchScenario, addScenario, renameScenario, deleteScenario } = useStore();
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [switching, setSwitching] = useState(false);
  const isPremium = useStore(s => s.isPremium);

  const poolTotal = poolItems.reduce(
    (sum, item) => sum + (balances[item.projectId!] ?? item.amount),
    0,
  );

  const getScenarioTotal = (id: string) => {
    if (id === activeScenarioId) return poolTotal;
    const data = scenariosData[id];
    if (!data) return poolTotal;
    return poolItems.reduce(
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
      router.navigate('/(tabs)/' as any);
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
      <SafeAreaView style={s.safe} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

        <ScrollView style={s.scroll} contentContainerStyle={s.content}>

          {/* ページタイトル */}
          <Text style={s.pageTitle}>シナリオ</Text>

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
                {isActive && <View style={s.activeBar} />}
                <View style={s.cardInner}>
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
                </View>
              </Pressable>
            );
          })}

          <Text style={[s.sectionLabel, { marginTop: 24 }]}>もう一つ試してみる？</Text>
          <Pressable style={s.addCard} onPress={handleAddPress}>
            <View style={s.addIconWrap}>
              <Plus size={20} color={colors.sage} strokeWidth={1.5} />
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
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: 100 },

  pageTitle: {
    fontSize: fontSizes.pageTitle,
    fontFamily: typography.display,
    color: colors.text,
    marginBottom: spacing.xxl,
  },

  sectionLabel: {
    fontSize: 12, color: colors.textMid, marginBottom: 10,
    paddingHorizontal: 4, letterSpacing: 0.5,
    textTransform: 'uppercase', fontFamily: typography.display,
  },

  scenarioCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    marginBottom: 12,
    overflow: 'hidden',
    ...shadows.card,
  },
  scenarioCardActive: {
    borderWidth: 1.5,
    borderColor: colors.sage,
  },
  activeBar: {
    height: 4, backgroundColor: colors.sage,
  },
  cardInner: {},
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.lg,
    paddingTop: 14,
    paddingBottom: 10,
  },
  radioOuter: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: colors.textLight,
    justifyContent: 'center', alignItems: 'center',
  },
  radioOuterActive: { borderColor: colors.sage },
  radioInner: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: colors.sage,
  },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.textMid, fontFamily: typography.display },
  cardTitleActive: { color: colors.text },
  activeBadge: {
    backgroundColor: colors.sageBg,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: radius.pill,
  },
  activeBadgeTxt: { fontSize: 11, color: colors.sage, fontWeight: '600', fontFamily: typography.display },
  cardStats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  stat: { flex: 1, paddingVertical: 12, paddingHorizontal: spacing.lg },
  statBorder: { borderLeftWidth: 1, borderLeftColor: colors.divider },
  statLabel: { fontSize: 12, color: colors.textMid, fontFamily: typography.display },
  statVal: {
    fontSize: fontSizes.amountMedium, fontWeight: '600',
    color: colors.textMid, marginTop: 2,
    fontFamily: typography.display,
  },
  statValActive: { color: colors.sage },

  addCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    ...shadows.card,
  },
  addIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.sageBg,
    justifyContent: 'center', alignItems: 'center',
  },
  addBody: { flex: 1 },
  addTitle: { fontSize: 16, fontWeight: '600', color: colors.text, fontFamily: typography.display },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  lockIcon: { fontSize: 12 },
  lockTxt: { fontSize: 12, color: colors.textMid, fontFamily: typography.display },

  hint: { fontSize: 11, color: colors.textLight, textAlign: 'center', marginTop: 16, fontFamily: typography.display },
});
