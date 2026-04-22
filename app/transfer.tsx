import { View, Text, Pressable, TextInput, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { POOL_ITEMS } from '@/constants/data';

const C = {
  brand: '#1A5C6B',
  brandDark: '#134754',
  green: '#1D9E75',
  bg: '#F7F3EC',
  card: '#FFFDF8',
  textPrimary: '#2C2825',
  textSecondary: '#7A7268',
  border: 'rgba(0,0,0,0.07)',
  selected: '#E4F2F6',
  selectedBorder: '#1A5C6B',
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
    fromId !== null &&
    toId !== null &&
    fromId !== toId &&
    amount > 0 &&
    amount <= fromBalance;

  const handleExecute = () => {
    if (!canExecute || !fromItem || !toItem) return;
    addTransfer(fromId!, fromBalance, toId!, toBalance, amount, note);
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={s.backTxt}>✕　閉じる</Text>
        </Pressable>
        <Text style={s.title}>口座振替</Text>
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}>
        {/* From */}
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
                <View style={[s.radio, isSelected && s.radioSelected]}>
                  {isSelected && <View style={s.radioDot} />}
                </View>
                <View style={[s.colorDot, { backgroundColor: item.color }]} />
                <Text style={s.rowName}>{item.name}</Text>
                <Text style={[s.rowBal, isSelected && s.rowBalSelected]}>
                  ¥{bal.toLocaleString('ja-JP')}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* To */}
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
                <View style={[s.radio, isSelected && s.radioSelected]}>
                  {isSelected && <View style={s.radioDot} />}
                </View>
                <View style={[s.colorDot, { backgroundColor: item.color }]} />
                <Text style={[s.rowName, isFrom && s.rowNameDisabled]}>{item.name}</Text>
                <Text style={[s.rowBal, isSelected && s.rowBalSelected, isFrom && s.rowNameDisabled]}>
                  ¥{bal.toLocaleString('ja-JP')}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Amount */}
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
              placeholderTextColor={C.textSecondary}
              selectTextOnFocus
            />
          </View>
          {fromId && amount > fromBalance && (
            <Text style={s.errorTxt}>振替元の残高（¥{fromBalance.toLocaleString('ja-JP')}）を超えています</Text>
          )}
        </View>

        {/* Note */}
        <Text style={s.sectionLabel}>メモ（任意）</Text>
        <View style={s.card}>
          <TextInput
            style={s.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="口座振替・生活費補充 など"
            placeholderTextColor={C.textSecondary}
            returnKeyType="done"
          />
        </View>

        {/* Preview */}
        {canExecute && (
          <View style={s.preview}>
            <Text style={s.previewTxt}>
              {fromItem?.name}　→　{toItem?.name}　¥{amount.toLocaleString('ja-JP')}
            </Text>
          </View>
        )}

        {/* Execute button */}
        <Pressable
          style={[s.execBtn, !canExecute && s.execBtnDisabled]}
          onPress={handleExecute}
          disabled={!canExecute}
        >
          <Text style={[s.execTxt, !canExecute && s.execTxtDisabled]}>実行する</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    backgroundColor: C.brand,
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backTxt: { fontSize: 11, color: 'rgba(255,255,255,0.65)' },
  title: { fontSize: 16, fontWeight: '600', color: '#fff' },

  content: { padding: 14 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: C.textSecondary,
    marginTop: 14,
    marginBottom: 6,
    marginLeft: 2,
    letterSpacing: 0.3,
  },

  card: {
    backgroundColor: C.card,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#1A3040',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  rowBorder: { borderBottomWidth: 0.5, borderBottomColor: C.border },
  rowSelected: { backgroundColor: C.selected },
  rowDisabled: { opacity: 0.35 },

  radio: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  radioSelected: { borderColor: C.brand },
  radioDot: {
    width: 9, height: 9, borderRadius: 4.5,
    backgroundColor: C.brand,
  },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  rowName: { flex: 1, fontSize: 14, color: C.textPrimary },
  rowNameDisabled: { color: C.textSecondary },
  rowBal: { fontSize: 13, fontWeight: '500', color: C.textPrimary },
  rowBalSelected: { color: C.brand },

  amtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  yen: { fontSize: 20, color: C.textSecondary, marginRight: 4 },
  amtInput: {
    flex: 1,
    fontSize: 26,
    fontWeight: '700',
    color: C.textPrimary,
    paddingVertical: 10,
    letterSpacing: -0.5,
  },
  errorTxt: { fontSize: 11, color: '#D64040', paddingHorizontal: 14, paddingBottom: 10 },

  noteInput: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: C.textPrimary,
  },

  preview: {
    backgroundColor: C.selected,
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  previewTxt: { fontSize: 13, color: C.brand, fontWeight: '600' },

  execBtn: {
    backgroundColor: C.brand,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: C.brandDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  execBtnDisabled: {
    backgroundColor: 'rgba(0,0,0,0.08)',
    shadowOpacity: 0,
    elevation: 0,
  },
  execTxt: { fontSize: 15, fontWeight: '600', color: '#fff' },
  execTxtDisabled: { color: C.textSecondary },
});
