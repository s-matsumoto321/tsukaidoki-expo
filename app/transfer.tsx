import { View, Text, Pressable, TextInput, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { POOL_ITEMS } from '@/constants/data';

const C = {
  brand: '#0C447C',
  green: '#1D9E75',
  bg: '#f5f4ee',
  card: '#ffffff',
  textPrimary: '#2c2c2a',
  textSecondary: '#73726c',
  border: 'rgba(0,0,0,0.08)',
  borderFocus: '#0C447C',
  selected: '#E6F1FB',
  selectedBorder: '#0C447C',
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
                <View style={s.radio}>
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
                <View style={s.radio}>
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
  backTxt: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  title: { fontSize: 16, fontWeight: '500', color: '#fff' },

  content: { padding: 14 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: C.textSecondary,
    marginTop: 12,
    marginBottom: 6,
    marginLeft: 2,
  },

  card: {
    backgroundColor: C.card,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: C.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
  },
  rowBorder: { borderBottomWidth: 0.5, borderBottomColor: C.border },
  rowSelected: { backgroundColor: C.selected },
  rowDisabled: { opacity: 0.35 },

  radio: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 1.5, borderColor: C.brand,
    justifyContent: 'center', alignItems: 'center',
  },
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
    fontSize: 24,
    fontWeight: '500',
    color: C.textPrimary,
    paddingVertical: 10,
  },
  errorTxt: { fontSize: 11, color: '#E24B4A', paddingHorizontal: 14, paddingBottom: 10 },

  noteInput: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: C.textPrimary,
  },

  preview: {
    backgroundColor: '#E6F1FB',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  previewTxt: { fontSize: 13, color: C.brand, fontWeight: '500' },

  execBtn: {
    backgroundColor: C.brand,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  execBtnDisabled: { backgroundColor: 'rgba(0,0,0,0.1)' },
  execTxt: { fontSize: 15, fontWeight: '600', color: '#fff' },
  execTxtDisabled: { color: C.textSecondary },
});
