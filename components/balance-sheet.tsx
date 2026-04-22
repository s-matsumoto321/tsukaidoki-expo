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
  dark: '#072A35',
  accent: '#00C5A3',
  green: '#2ECC8F',
  red: '#F05050',
  bg: '#EEEAE0',
  card: '#FFFFFF',
  textPrimary: '#161C1E',
  textSecondary: '#717870',
  textTertiary: '#ABA8A2',
  border: 'rgba(0,0,0,0.08)',
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
        <View style={[s.sheet, { paddingBottom: insets.bottom + 24 }]}>
          <View style={s.handle} />

          <View style={s.titleRow}>
            <View>
              <Text style={s.titleSub}>残高を修正</Text>
              <Text style={s.title}>{label}</Text>
            </View>
            <View style={s.currentBadge}>
              <Text style={s.currentBadgeTxt}>現在</Text>
              <Text style={s.currentAmt}>¥{currentAmount.toLocaleString('ja-JP')}</Text>
            </View>
          </View>

          <Text style={s.fieldLabel}>新しい残高</Text>
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
              autoFocus
            />
            {amtText.length > 0 && newAmount !== currentAmount && (
              <View style={[s.diffBadge, diff >= 0 ? s.diffBadgePos : s.diffBadgeNeg]}>
                <Text style={[s.diffTxt, diff >= 0 ? s.diffPos : s.diffNeg]}>
                  {diff >= 0 ? '+' : ''}¥{diff.toLocaleString('ja-JP')}
                </Text>
              </View>
            )}
          </View>

          <Text style={s.fieldLabel}>メモ（任意）</Text>
          <TextInput
            style={s.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="複利補正・利息入金 など"
            returnKeyType="done"
            placeholderTextColor={C.textTertiary}
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
    backgroundColor: 'rgba(7,42,53,0.5)',
  },
  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 14,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignSelf: 'center',
    marginBottom: 20,
  },

  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 22,
  },
  titleSub: { fontSize: 10, color: C.textTertiary, letterSpacing: 0.5, marginBottom: 2 },
  title: { fontSize: 17, fontWeight: '700', color: C.textPrimary },
  currentBadge: {
    alignItems: 'flex-end',
    backgroundColor: C.bg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  currentBadgeTxt: { fontSize: 9, color: C.textTertiary, marginBottom: 1 },
  currentAmt: { fontSize: 14, fontWeight: '700', color: C.textSecondary },

  fieldLabel: { fontSize: 11, fontWeight: '600', color: C.textTertiary, marginBottom: 8, letterSpacing: 0.3 },
  amtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.08)',
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 18,
    backgroundColor: C.bg,
  },
  yen: { fontSize: 20, color: C.textTertiary, marginRight: 4 },
  amtInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '800',
    color: C.textPrimary,
    paddingVertical: 14,
    letterSpacing: -1,
  },
  diffBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  diffBadgePos: { backgroundColor: 'rgba(46,204,143,0.12)' },
  diffBadgeNeg: { backgroundColor: 'rgba(240,80,80,0.12)' },
  diffTxt: { fontSize: 12, fontWeight: '700' },
  diffPos: { color: C.green },
  diffNeg: { color: C.red },

  noteInput: {
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.08)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: C.textPrimary,
    backgroundColor: C.bg,
    marginBottom: 24,
  },

  saveBtn: {
    backgroundColor: C.accent,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  saveBtnDisabled: { backgroundColor: 'rgba(0,0,0,0.08)', shadowOpacity: 0, elevation: 0 },
  saveTxt: { fontSize: 16, fontWeight: '700', color: C.dark },
  saveTxtDisabled: { color: C.textTertiary },
});
