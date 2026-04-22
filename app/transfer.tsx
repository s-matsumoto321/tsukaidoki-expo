import { View, Text, Pressable, TextInput, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { POOL_ITEMS } from '@/constants/data';

const C = {
  dark: '#072A35',
  darkMid: '#0E3D4D',
  accent: '#00C5A3',
  green: '#2ECC8F',
  bg: '#EEEAE0',
  card: '#FFFFFF',
  textPrimary: '#161C1E',
  textSecondary: '#717870',
  textTertiary: '#ABA8A2',
  border: 'rgba(0,0,0,0.07)',
  selected: 'rgba(0,197,163,0.08)',
};

export default function TransferScreen() {
  const insets = useSafeAreaInsets();
  const { balances, addTransfer } = useStore();

  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);
  const [amtText, setAmtText] = useState('');
  const [note, setNote] = useState('');

  function getBalance(projectId: string, fallback: number): number {
    return balances[projectId] ?? fallback;
  }

  const amount = parseInt(amtText, 10) || 0;
  const fromItem = POOL_ITEMS.find(i => i.projectId === fromId);
  const toItem = POOL_ITEMS.find(i => i.projectId === toId);
  const fromBalance = fromItem ? getBalance(fromItem.projectId!, fromItem.amount) : 0;
  const toBalance = toItem ? getBalance(toItem.projectId!, toItem.amount) : 0;

  const canExecute =
    fromId !== null && toId !== null &&
    fromId !== toId && amount > 0 && amount <= fromBalance;

  const handleExecute = () => {
    if (!canExecute || !fromItem || !toItem) return;
    addTransfer(fromId!, fromBalance, toId!, toBalance, amount, note);
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.dark }}>
      {/* ダークヘッダー */}
      <View style={[s.header, { paddingTop: insets.top + 14 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={s.backTxt}>✕</Text>
        </Pressable>
        <Text style={s.title}>口座振替</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* カーブ遷移 */}
      <View style={[s.content, { paddingBottom: insets.bottom + 32 }]}>
        <ScrollView showsVerticalScrollIndicator={false}>

          <Text style={s.sectionLabel}>振替元</Text>
          <View style={s.card}>
            {POOL_ITEMS.map((item, i) => {
              const isSelected = fromId === item.projectId;
              const bal = getBalance(item.projectId!, item.amount);
              const isLast = i === POOL_ITEMS.length - 1;
              return (
                <Pressable
                  key={item.name}
                  style={[s.row, !isLast && s.rowBorder, isSelected && s.rowSelected]}
                  onPress={() => setFromId(item.projectId ?? null)}
                >
                  <View style={[s.radio, isSelected && s.radioActive]}>
                    {isSelected && <View style={s.radioDot} />}
                  </View>
                  <View style={[s.colorBar, { backgroundColor: item.color }]} />
                  <Text style={s.rowName}>{item.name}</Text>
                  <Text style={[s.rowBal, isSelected && s.rowBalActive]}>
                    ¥{bal.toLocaleString('ja-JP')}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={s.sectionLabel}>振替先</Text>
          <View style={s.card}>
            {POOL_ITEMS.map((item, i) => {
              const isSelected = toId === item.projectId;
              const isFrom = fromId === item.projectId;
              const bal = getBalance(item.projectId!, item.amount);
              const isLast = i === POOL_ITEMS.length - 1;
              return (
                <Pressable
                  key={item.name}
                  style={[s.row, !isLast && s.rowBorder, isSelected && s.rowSelected, isFrom && s.rowDisabled]}
                  onPress={() => !isFrom && setToId(item.projectId ?? null)}
                  disabled={isFrom}
                >
                  <View style={[s.radio, isSelected && s.radioActive]}>
                    {isSelected && <View style={s.radioDot} />}
                  </View>
                  <View style={[s.colorBar, { backgroundColor: item.color }]} />
                  <Text style={[s.rowName, isFrom && { color: C.textTertiary }]}>{item.name}</Text>
                  <Text style={[s.rowBal, isSelected && s.rowBalActive, isFrom && { color: C.textTertiary }]}>
                    ¥{bal.toLocaleString('ja-JP')}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={s.sectionLabel}>金額</Text>
          <View style={s.card}>
            <View style={s.amtRow}>
              <Text style={s.yen}>¥</Text>
              <TextInput
                style={s.amtInput}
                value={amtText}
                onChangeText={v => setAmtText(v.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={C.textTertiary}
                selectTextOnFocus
              />
            </View>
            {fromId && amount > fromBalance && (
              <Text style={s.errorTxt}>残高（¥{fromBalance.toLocaleString('ja-JP')}）を超えています</Text>
            )}
          </View>

          <Text style={s.sectionLabel}>メモ（任意）</Text>
          <View style={s.card}>
            <TextInput
              style={s.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="口座振替・生活費補充 など"
              placeholderTextColor={C.textTertiary}
              returnKeyType="done"
            />
          </View>

          {canExecute && (
            <View style={s.preview}>
              <Text style={s.previewFrom}>{fromItem?.name}</Text>
              <Text style={s.previewArrow}>→</Text>
              <Text style={s.previewTo}>{toItem?.name}</Text>
              <Text style={s.previewAmt}>¥{amount.toLocaleString('ja-JP')}</Text>
            </View>
          )}

          <Pressable
            style={[s.execBtn, !canExecute && s.execBtnDisabled]}
            onPress={handleExecute}
            disabled={!canExecute}
          >
            <Text style={[s.execTxt, !canExecute && s.execTxtDisabled]}>実行する</Text>
          </Pressable>

        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    backgroundColor: C.dark,
    paddingHorizontal: 22,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backTxt: { fontSize: 18, color: 'rgba(255,255,255,0.7)', fontWeight: '300' },
  title: { fontSize: 16, fontWeight: '700', color: '#fff' },

  content: {
    flex: 1,
    backgroundColor: C.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -8,
    padding: 16,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: C.textTertiary,
    marginTop: 14,
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  rowBorder: { borderBottomWidth: 0.5, borderBottomColor: C.border },
  rowSelected: { backgroundColor: C.selected },
  rowDisabled: { opacity: 0.35 },

  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  radioActive: { borderColor: C.accent },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.accent },
  colorBar: { width: 4, height: 24, borderRadius: 2 },
  rowName: { flex: 1, fontSize: 14, color: C.textPrimary },
  rowBal: { fontSize: 13, fontWeight: '600', color: C.textSecondary },
  rowBalActive: { color: C.accent },

  amtRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 4 },
  yen: { fontSize: 22, color: C.textTertiary, marginRight: 4 },
  amtInput: {
    flex: 1,
    fontSize: 30,
    fontWeight: '800',
    color: C.textPrimary,
    paddingVertical: 12,
    letterSpacing: -1,
  },
  errorTxt: { fontSize: 11, color: '#F05050', paddingHorizontal: 16, paddingBottom: 10 },

  noteInput: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 14,
    color: C.textPrimary,
  },

  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,197,163,0.1)',
    borderRadius: 14,
    padding: 14,
    marginTop: 18,
    gap: 8,
  },
  previewFrom: { fontSize: 13, color: C.textPrimary, fontWeight: '600' },
  previewArrow: { fontSize: 14, color: C.accent, fontWeight: '700' },
  previewTo: { fontSize: 13, color: C.textPrimary, fontWeight: '600', flex: 1 },
  previewAmt: { fontSize: 15, color: C.accent, fontWeight: '800' },

  execBtn: {
    backgroundColor: C.accent,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  execBtnDisabled: {
    backgroundColor: 'rgba(0,0,0,0.08)',
    shadowOpacity: 0,
    elevation: 0,
  },
  execTxt: { fontSize: 16, fontWeight: '700', color: C.dark },
  execTxtDisabled: { color: C.textTertiary },
});
