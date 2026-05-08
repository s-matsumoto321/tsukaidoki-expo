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
import { brand, neutral, semantic } from '@/constants/colors';

const C = {
  brand: brand.sage.base,
  green: brand.sage.base,
  red: semantic.negative,
  bg: neutral.bg,
  card: neutral.card,
  textPrimary: neutral.text.primary,
  textSecondary: neutral.text.mid,
  border: 'rgba(0,0,0,0.12)',
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
  const [manText, setManText] = useState('');
  const [note, setNote] = useState('');

  const currentMan = Math.floor(currentAmount / 10_000);

  useEffect(() => {
    if (visible) {
      setManText(String(currentMan));
      setNote('');
    }
  }, [visible, currentAmount]);

  const newMan = parseInt(manText, 10) || 0;
  const newAmount = newMan * 10_000;
  const diffMan = newMan - currentMan;
  const canSave = manText.length > 0 && newMan > 0 && newAmount !== currentAmount;

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
            現在　{currentMan}万円
          </Text>

          <Text style={s.fieldLabel}>新しい残高（万円）</Text>
          <View style={s.amtRow}>
            <TextInput
              style={s.amtInput}
              value={manText}
              onChangeText={v => setManText(v.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder="0"
              selectTextOnFocus
              autoFocus
            />
            <Text style={s.unit}>万円</Text>
          </View>

          {manText.length > 0 && newAmount !== currentAmount && (
            <Text style={[s.diff, diffMan >= 0 ? s.diffPos : s.diffNeg]}>
              差額　{diffMan >= 0 ? '+' : ''}{diffMan}万円
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
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 15, fontWeight: '500', color: C.textPrimary, marginBottom: 4 },
  currentLabel: { fontSize: 11, color: C.textSecondary, marginBottom: 16 },

  fieldLabel: { fontSize: 11, color: C.textSecondary, marginBottom: 6 },
  amtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
    backgroundColor: C.bg,
  },
  amtInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '500',
    color: C.textPrimary,
    paddingVertical: 12,
  },
  unit: { fontSize: 16, color: C.textSecondary, marginLeft: 4 },
  diff: { fontSize: 12, fontWeight: '500', marginBottom: 16, marginLeft: 2 },
  diffPos: { color: C.green },
  diffNeg: { color: C.red },

  noteInput: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: C.textPrimary,
    backgroundColor: C.bg,
    marginBottom: 20,
  },

  saveBtn: {
    backgroundColor: C.brand,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: 'rgba(0,0,0,0.1)' },
  saveTxt: { fontSize: 15, fontWeight: '600', color: '#fff' },
  saveTxtDisabled: { color: C.textSecondary },
});
