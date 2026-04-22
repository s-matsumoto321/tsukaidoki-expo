import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';

const C = {
  brand: '#1A5C6B',
  brandDark: '#134754',
  green: '#1D9E75',
  red: '#D64040',
  bg: '#F7F3EC',
  card: '#FFFDF8',
  textPrimary: '#2C2825',
  textSecondary: '#7A7268',
  border: 'rgba(0,0,0,0.1)',
};

type Props = {
  visible: boolean;
  projectId: string;
  currentAmount: number;
  label: string;
  onClose: () => void;
};

export function BalanceSheet({ visible, projectId, currentAmount, label, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { updateBalance } = useStore();
  const [amtText, setAmtText] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (visible) {
      setAmtText(String(currentAmount));
      setNote('');
    }
  }, [visible, currentAmount]);

  const newAmount = parseInt(amtText, 10) || 0;
  const diff = newAmount - currentAmount;
  const canSave = amtText.length > 0 && newAmount > 0 && newAmount !== currentAmount;

  const handleSave = () => {
    if (!canSave) return;
    updateBalance(projectId, currentAmount, newAmount, note);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[s.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={s.handle} />

          <Text style={s.title}>{label}　残高を修正</Text>
          <Text style={s.currentLabel}>
            現在　¥{currentAmount.toLocaleString('ja-JP')}
          </Text>

          <Text style={s.fieldLabel}>新しい残高</Text>
          <View style={s.amtRow}>
            <Text style={s.yen}>¥</Text>
            <TextInput
              style={s.amtInput}
              value={amtText}
              onChangeText={v => setAmtText(v.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder="0"
              selectTextOnFocus
              autoFocus
            />
          </View>

          {amtText.length > 0 && newAmount !== currentAmount && (
            <Text style={[s.diff, diff >= 0 ? s.diffPos : s.diffNeg]}>
              差額　{diff >= 0 ? '+' : ''}¥{diff.toLocaleString('ja-JP')}
            </Text>
          )}

          <Text style={s.fieldLabel}>メモ（任意）</Text>
          <TextInput
            style={s.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="複利補正・利息入金 など"
            returnKeyType="done"
            placeholderTextColor={C.textSecondary}
          />

          <Pressable
            style={[s.saveBtn, !canSave && s.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!canSave}
          >
            <Text style={[s.saveTxt, !canSave && s.saveTxtDisabled]}>保存する</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.12)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 15, fontWeight: '600', color: C.textPrimary, marginBottom: 4 },
  currentLabel: { fontSize: 11, color: C.textSecondary, marginBottom: 16 },

  fieldLabel: { fontSize: 11, color: C.textSecondary, marginBottom: 6, letterSpacing: 0.2 },
  amtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 6,
    backgroundColor: C.bg,
  },
  yen: { fontSize: 18, color: C.textSecondary, marginRight: 4 },
  amtInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: C.textPrimary,
    paddingVertical: 12,
    letterSpacing: -0.5,
  },
  diff: { fontSize: 12, fontWeight: '600', marginBottom: 16, marginLeft: 2 },
  diffPos: { color: C.green },
  diffNeg: { color: C.red },

  noteInput: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: C.textPrimary,
    backgroundColor: C.bg,
    marginBottom: 20,
  },

  saveBtn: {
    backgroundColor: C.brand,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: C.brandDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: {
    backgroundColor: 'rgba(0,0,0,0.08)',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveTxt: { fontSize: 15, fontWeight: '600', color: '#fff' },
  saveTxtDisabled: { color: C.textSecondary },
});
