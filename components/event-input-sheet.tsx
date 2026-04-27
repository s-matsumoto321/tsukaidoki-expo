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
import { type ProjectEvent } from '@/constants/projects';
import { useStore, type ActualOverride, type SpendPlanOverride } from '@/store/useStore';

const C = {
  brand: '#0C447C',
  green: '#1D9E75',
  red: '#E24B4A',
  bg: '#f5f4ee',
  card: '#ffffff',
  textPrimary: '#2c2c2a',
  textSecondary: '#73726c',
  border: 'rgba(0,0,0,0.12)',
};

type Props = {
  visible: boolean;
  mode: 'actual' | 'plan';
  projectId: string;
  event: ProjectEvent | null;
  planBalanceMan: number;
  existingActual?: ActualOverride | null;
  existingPlan?: SpendPlanOverride | null;
  onClose: () => void;
  onSaved: () => void;
};

export function EventInputSheet({
  visible,
  mode,
  projectId,
  event,
  planBalanceMan,
  existingActual,
  existingPlan,
  onClose,
  onSaved,
}: Props) {
  const insets = useSafeAreaInsets();
  const { saveActualOverride, saveSpendPlanOverride } = useStore();

  const [dateText, setDateText] = useState('');
  const [amtText, setAmtText] = useState('');
  const [memo, setMemo] = useState('');

  useEffect(() => {
    if (visible && event) {
      if (mode === 'actual') {
        setDateText(existingActual?.date ?? '');
        setAmtText(String(existingActual?.balanceMan ?? planBalanceMan));
        setMemo(existingActual?.memo ?? '');
      } else {
        setDateText(existingPlan?.date ?? event.year ?? '');
        setAmtText(String(existingPlan?.amtMan ?? 0));
        setMemo(existingPlan?.memo ?? '');
      }
    }
  }, [visible, event, mode, existingActual, existingPlan, planBalanceMan]);

  const amtNum = parseInt(amtText, 10) || 0;

  const canSave = mode === 'actual'
    ? dateText.trim().length > 0 && amtNum > 0
    : dateText.trim().length > 0 && amtNum > 0;

  const diff = mode === 'actual' ? amtNum - planBalanceMan : 0;

  const handleSave = () => {
    if (!canSave || !event) return;
    if (mode === 'actual') {
      saveActualOverride(projectId, event.idx, {
        balanceMan: amtNum,
        date: dateText.trim(),
        memo: memo.trim(),
      });
    } else {
      saveSpendPlanOverride(projectId, event.idx, {
        amtMan: amtNum,
        date: dateText.trim(),
        memo: memo.trim(),
      });
    }
    onSaved();
    onClose();
  };

  const title = mode === 'actual'
    ? (existingActual ? '実績を修正' : '実績を記録')
    : '計画を修正';

  const subtitle = event ? `${event.name} · ${event.year}` : '';

  const refLabel = mode === 'actual'
    ? `計画 ¥${planBalanceMan}万`
    : `現在の計画 ${event?.amt ?? ''}`;

  const datePlaceholder = mode === 'actual' ? '例: 2025/4' : '例: 2025/4';
  const dateLabel = mode === 'actual' ? '時期' : '予定時期';
  const amtLabel = mode === 'actual' ? '実績残高' : '金額';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[s.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={s.handle} />

          <Text style={s.title}>{title}</Text>
          <Text style={s.subtitle}>{subtitle}</Text>
          <View style={s.refRow}>
            <Text style={s.refTxt}>{refLabel}</Text>
          </View>

          <Text style={s.fieldLabel}>{dateLabel}</Text>
          <TextInput
            style={s.textInput}
            value={dateText}
            onChangeText={setDateText}
            placeholder={datePlaceholder}
            placeholderTextColor={C.textSecondary}
            returnKeyType="next"
          />

          <Text style={s.fieldLabel}>{amtLabel}</Text>
          <View style={s.amtRow}>
            <TextInput
              style={s.amtInput}
              value={amtText}
              onChangeText={v => setAmtText(v.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder="0"
              selectTextOnFocus
            />
            <Text style={s.amtSuffix}>万円</Text>
          </View>

          {mode === 'actual' && amtText.length > 0 && amtNum !== planBalanceMan && (
            <Text style={[s.diffHint, diff >= 0 ? s.diffPos : s.diffNeg]}>
              計画比 {diff >= 0 ? '+' : ''}{diff}万
            </Text>
          )}

          <Text style={s.fieldLabel}>メモ（任意）</Text>
          <TextInput
            style={s.noteInput}
            value={memo}
            onChangeText={setMemo}
            placeholder="メモを入力"
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
  title: { fontSize: 15, fontWeight: '500', color: C.textPrimary, marginBottom: 2 },
  subtitle: { fontSize: 12, color: C.textSecondary, marginBottom: 10 },
  refRow: {
    backgroundColor: C.bg,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 14,
  },
  refTxt: { fontSize: 12, color: C.textSecondary },

  fieldLabel: { fontSize: 11, color: C.textSecondary, marginBottom: 6 },

  textInput: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: C.textPrimary,
    backgroundColor: C.bg,
    marginBottom: 14,
  },

  amtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: C.bg,
    marginBottom: 6,
  },
  amtInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '500',
    color: C.textPrimary,
    paddingVertical: 12,
  },
  amtSuffix: { fontSize: 14, color: C.textSecondary, marginLeft: 4 },

  diffHint: { fontSize: 12, fontWeight: '500', marginBottom: 14, marginLeft: 2 },
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
