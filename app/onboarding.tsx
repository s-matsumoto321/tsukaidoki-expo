import { useState, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  TextInput, Animated, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useStore, type FamilyMember, type Dream } from '@/store/useStore';


const C = {
  brand: '#5B8E7D',
  green: '#5B8E7D',
  amber: '#E8B86D',
  red: '#E8B86D',
  purple: '#B8AFD9',
  bg: '#FAF7F2',
  card: '#ffffff',
  textPrimary: '#2C3539',
  textSecondary: '#6B7378',
  border: '#EDE8DF',
};

const { width: SW } = Dimensions.get('window');

// ─── 進捗ステップ ─────────────────────────────────────────────────

const STEPS = ['夢', '興味', '質問', '資産', '家族', '積立', '給料日', '試算'] as const;
type Step = typeof STEPS[number];

function ProgressBar({ currentStep }: { currentStep: Step }) {
  const idx = STEPS.indexOf(currentStep);
  return (
    <View style={pb.wrap}>
      {STEPS.map((step, i) => (
        <View key={step} style={pb.item}>
          <View style={[pb.dot, i <= idx && pb.dotActive, i === idx && pb.dotCurrent]}>
            {i < idx && <Text style={pb.dotTick}>✓</Text>}
            {i === idx && <View style={pb.dotInner} />}
          </View>
          <Text style={[pb.label, i === idx && pb.labelActive]}>{step}</Text>
          {i < STEPS.length - 1 && (
            <View style={[pb.line, i < idx && pb.lineActive]} />
          )}
        </View>
      ))}
    </View>
  );
}

const pb = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: C.card,
    borderBottomWidth: 0.5, borderBottomColor: C.border,
  },
  item: { flex: 1, alignItems: 'center', position: 'relative' },
  dot: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.bg,
    justifyContent: 'center', alignItems: 'center',
  },
  dotActive: { borderColor: C.brand },
  dotCurrent: { backgroundColor: C.brand },
  dotTick: { fontSize: 10, color: C.brand },
  dotInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  label: { fontSize: 9, color: C.textSecondary, marginTop: 3 },
  labelActive: { color: C.brand, fontWeight: '600' },
  line: {
    position: 'absolute', top: 10, left: '60%',
    right: '-60%', height: 1.5,
    backgroundColor: C.border,
  },
  lineActive: { backgroundColor: C.brand },
});

// ─── ウェルカムスライド ───────────────────────────────────────────

const WELCOME_SLIDES = [
  { icon: '📒', title: 'これは家計簿ではありません', sub: '過去の記録ではなく、未来への試算を描くアプリです' },
  { icon: '✨', title: '夢を、現実的に試算します', sub: '「いつ・いくら」必要かを逆算して可視化します' },
  { icon: '🔄', title: 'いつでも、いくらでも変えられます', sub: '試算は何度でも変更できます。縛りはありません' },
  { icon: '🌱', title: 'さあ、はじめましょう', sub: 'まず、あなたの夢の話から聞かせてください', cta: true },
];

function WelcomeStep({ onNext }: { onNext: () => void }) {
  const [slide, setSlide] = useState(0);
  const isLast = slide === WELCOME_SLIDES.length - 1;
  const current = WELCOME_SLIDES[slide];

  return (
    <View style={ws.wrap}>
      <View style={ws.slideWrap}>
        <Text style={ws.icon}>{current.icon}</Text>
        <Text style={ws.title}>{current.title}</Text>
        <Text style={ws.sub}>{current.sub}</Text>
      </View>
      <View style={ws.dots}>
        {WELCOME_SLIDES.map((_, i) => (
          <View key={i} style={[ws.dot, i === slide && ws.dotActive]} />
        ))}
      </View>
      <Pressable
        style={[ws.btn, !isLast && ws.btnOutline]}
        onPress={() => isLast ? onNext() : setSlide(s => s + 1)}
      >
        <Text style={[ws.btnTxt, !isLast && ws.btnTxtOutline]}>
          {isLast ? '始める' : '次へ'}
        </Text>
      </Pressable>
    </View>
  );
}

const ws = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  slideWrap: { alignItems: 'center', marginBottom: 40 },
  icon: { fontSize: 64, marginBottom: 24 },
  title: { fontSize: 22, fontWeight: '700', color: C.textPrimary, textAlign: 'center', marginBottom: 12, lineHeight: 30 },
  sub: { fontSize: 15, color: C.textSecondary, textAlign: 'center', lineHeight: 22 },
  dots: { flexDirection: 'row', gap: 8, marginBottom: 32 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.border },
  dotActive: { backgroundColor: C.brand, width: 20 },
  btn: {
    width: SW - 64, paddingVertical: 16,
    backgroundColor: C.brand, borderRadius: 14, alignItems: 'center',
  },
  btnOutline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: C.brand },
  btnTxt: { fontSize: 16, fontWeight: '700', color: '#fff' },
  btnTxtOutline: { color: C.brand },
});

// ─── 興味カード ───────────────────────────────────────────────────

const INTEREST_GROUPS = [
  {
    label: '暮らしの基盤',
    items: [
      { id: 'ret', icon: '👴', name: '老後', projectId: 'ret' },
      { id: 'edu', icon: '🎓', name: '教育', projectId: 'edu' },
      { id: 'house', icon: '🏡', name: '家', projectId: 'house' },
    ],
  },
  {
    label: 'ライフイベント',
    items: [
      { id: 'wedding', icon: '💍', name: '結婚', projectId: 'wedding' },
      { id: 'baby', icon: '👶', name: '出産', projectId: 'baby' },
      { id: 'care', icon: '🏥', name: '介護', projectId: 'care' },
    ],
  },
  {
    label: '暮らしを楽しむ',
    items: [
      { id: 'car', icon: '🚗', name: '車', projectId: 'car' },
      { id: 'trip', icon: '✈️', name: '旅行', projectId: 'trip' },
      { id: 'pet', icon: '🐾', name: 'ペット', projectId: 'pet' },
    ],
  },
];

type InterestItem = { id: string; icon: string; name: string; projectId: string };

function InterestsStep({ onNext }: { onNext: (selected: InterestItem[]) => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(['ret', 'edu', 'car', 'trip']));

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allItems = INTEREST_GROUPS.flatMap(g => g.items);
  const selectedItems = allItems.filter(i => selected.has(i.id));

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={is.content}>
        <Text style={is.heading}>あなたの興味を選んでください</Text>
        <Text style={is.sub}>気になるものをすべて選んでOKです（あとから変更できます）</Text>
        {INTEREST_GROUPS.map(group => (
          <View key={group.label} style={is.group}>
            <Text style={is.groupLabel}>{group.label}</Text>
            <View style={is.cards}>
              {group.items.map(item => {
                const isSel = selected.has(item.id);
                return (
                  <Pressable
                    key={item.id}
                    style={[is.card, isSel && is.cardSelected]}
                    onPress={() => toggle(item.id)}
                  >
                    <Text style={is.cardIcon}>{item.icon}</Text>
                    <Text style={[is.cardName, isSel && is.cardNameSelected]}>{item.name}</Text>
                    {isSel && <View style={is.check}><Text style={is.checkTxt}>✓</Text></View>}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={is.footer}>
        <Pressable
          style={[is.nextBtn, selected.size === 0 && is.nextBtnDisabled]}
          onPress={() => onNext(selectedItems)}
          disabled={selected.size === 0}
        >
          <Text style={is.nextBtnTxt}>次へ ({selected.size}個選択中)</Text>
        </Pressable>
      </View>
    </View>
  );
}

const is = StyleSheet.create({
  content: { padding: 20, paddingBottom: 16 },
  heading: { fontSize: 20, fontWeight: '700', color: C.textPrimary, marginBottom: 6 },
  sub: { fontSize: 13, color: C.textSecondary, marginBottom: 20, lineHeight: 19 },
  group: { marginBottom: 20 },
  groupLabel: {
    fontSize: 12, fontWeight: '600', color: C.textSecondary,
    marginBottom: 10, paddingHorizontal: 4,
    borderLeftWidth: 3, borderLeftColor: C.brand, paddingLeft: 8,
  },
  cards: { flexDirection: 'row', gap: 10 },
  card: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: C.card, borderWidth: 0.5, borderColor: C.border,
    alignItems: 'center', gap: 4, position: 'relative',
  },
  cardSelected: { borderColor: C.brand, backgroundColor: '#EEF4FB', borderWidth: 1.5 },
  cardIcon: { fontSize: 24 },
  cardName: { fontSize: 12, fontWeight: '500', color: C.textPrimary },
  cardNameSelected: { color: C.brand },
  check: {
    position: 'absolute', top: 6, right: 6,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: C.brand, justifyContent: 'center', alignItems: 'center',
  },
  checkTxt: { fontSize: 10, color: '#fff', fontWeight: '700' },
  footer: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 10 },
  nextBtn: {
    backgroundColor: C.brand, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnTxt: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

// ─── カテゴリ質問 ─────────────────────────────────────────────────

type QuestionAnswer = {
  categoryId: string;
  year?: number;
  skipped: boolean;
};

const CATEGORY_QUESTIONS: Record<string, {
  icon: string;
  title: string;
  yearLabel: string;
  defaultYear: number;
}> = {
  car: { icon: '🚗', title: '車について教えてください', yearLabel: '次の買い替えはいつ頃？', defaultYear: 2028 },
  trip: { icon: '✈️', title: '旅行について教えてください', yearLabel: '次の大きな旅行はいつ頃？', defaultYear: 2027 },
  edu: { icon: '🎓', title: '教育費について教えてください', yearLabel: 'お子さんの大学入学はいつ頃？', defaultYear: 2034 },
  ret: { icon: '👴', title: '老後の計画について教えてください', yearLabel: '定年予定はいつ頃？', defaultYear: 2050 },
  house: { icon: '🏡', title: '家について教えてください', yearLabel: '購入・リフォームはいつ頃？', defaultYear: 2030 },
  wedding: { icon: '💍', title: '結婚について教えてください', yearLabel: '予定はいつ頃？', defaultYear: 2027 },
  baby: { icon: '👶', title: '出産について教えてください', yearLabel: '予定はいつ頃？', defaultYear: 2027 },
  care: { icon: '🏥', title: '介護について教えてください', yearLabel: '介護が必要になりそうな時期は？', defaultYear: 2040 },
  pet: { icon: '🐾', title: 'ペットについて教えてください', yearLabel: 'お迎え予定はいつ頃？', defaultYear: 2026 },
};

function QuestionsStep({
  interests,
  onNext,
}: {
  interests: InterestItem[];
  onNext: (answers: QuestionAnswer[]) => void;
}) {
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState<QuestionAnswer[]>([]);
  const [yearInput, setYearInput] = useState('');

  const current = interests[qIdx];
  const q = current ? CATEGORY_QUESTIONS[current.id] : null;
  const total = interests.length;

  const handleNext = (skipped: boolean) => {
    const year = skipped ? undefined : (parseInt(yearInput, 10) || q?.defaultYear);
    const newAnswers = [...answers, { categoryId: current.id, year, skipped }];
    if (qIdx < total - 1) {
      setAnswers(newAnswers);
      setQIdx(qIdx + 1);
      setYearInput('');
    } else {
      onNext(newAnswers);
    }
  };

  if (!current || !q) {
    onNext(answers);
    return null;
  }

  return (
    <View style={qs.wrap}>
      <Text style={qs.progress}>({qIdx + 1} / {total} カテゴリ)</Text>
      <Text style={qs.icon}>{q.icon}</Text>
      <Text style={qs.title}>{q.title}</Text>

      <View style={qs.field}>
        <Text style={qs.fieldLabel}>{q.yearLabel}</Text>
        <TextInput
          style={qs.input}
          value={yearInput}
          onChangeText={setYearInput}
          keyboardType="number-pad"
          placeholder={String(q.defaultYear)}
          placeholderTextColor={C.textSecondary}
        />
      </View>

      <View style={qs.btnRow}>
        <Pressable style={qs.skipBtn} onPress={() => handleNext(true)}>
          <Text style={qs.skipBtnTxt}>後で答える</Text>
        </Pressable>
        <Pressable style={qs.nextBtn} onPress={() => handleNext(false)}>
          <Text style={qs.nextBtnTxt}>次へ</Text>
        </Pressable>
      </View>
    </View>
  );
}

const qs = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20 },
  progress: { fontSize: 12, color: C.textSecondary, textAlign: 'right', marginBottom: 20 },
  icon: { fontSize: 48, textAlign: 'center', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '700', color: C.textPrimary, textAlign: 'center', marginBottom: 24, lineHeight: 28 },
  field: { marginBottom: 24 },
  fieldLabel: { fontSize: 13, color: C.textSecondary, marginBottom: 8 },
  input: {
    backgroundColor: C.card, borderRadius: 10,
    borderWidth: 0.5, borderColor: C.border,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 18, fontWeight: '600', color: C.textPrimary,
  },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 'auto' as any },
  skipBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: C.card, borderWidth: 0.5, borderColor: C.border,
    alignItems: 'center',
  },
  skipBtnTxt: { fontSize: 14, color: C.textSecondary },
  nextBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 12,
    backgroundColor: C.brand, alignItems: 'center',
  },
  nextBtnTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

// ─── プール金登録 ──────────────────────────────────────────────────

function PoolStep({ onNext }: { onNext: (amount: number) => void }) {
  const [amount, setAmount] = useState('');

  return (
    <View style={ps.wrap}>
      <Text style={ps.icon}>🎉</Text>
      <Text style={ps.title}>夢の輪郭ができました！</Text>
      <Text style={ps.sub}>次は今の状況を教えてください。あなたの夢を現実の数字と照らし合わせて試算します。</Text>

      <View style={ps.field}>
        <Text style={ps.fieldLabel}>今の総貯蓄はいくらくらいですか？</Text>
        <View style={ps.inputRow}>
          <Text style={ps.yen}>¥</Text>
          <TextInput
            style={ps.input}
            value={amount}
            onChangeText={setAmount}
            keyboardType="number-pad"
            placeholder="例：8250000"
            placeholderTextColor={C.textSecondary}
          />
        </View>
        <Text style={ps.hint}>概算で大丈夫です。後から変更できます</Text>
      </View>

      <Pressable
        style={[ps.nextBtn, !amount && ps.nextBtnDisabled]}
        onPress={() => onNext(parseInt(amount.replace(/[^0-9]/g, ''), 10) || 0)}
        disabled={!amount}
      >
        <Text style={ps.nextBtnTxt}>続ける</Text>
      </Pressable>

      <Pressable style={ps.skipBtn} onPress={() => onNext(0)}>
        <Text style={ps.skipBtnTxt}>後で入力する</Text>
      </Pressable>
    </View>
  );
}

const ps = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 },
  icon: { fontSize: 48, textAlign: 'center', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: C.textPrimary, textAlign: 'center', marginBottom: 8 },
  sub: { fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: 28 },
  field: { marginBottom: 24 },
  fieldLabel: { fontSize: 13, color: C.textSecondary, marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, borderRadius: 10,
    borderWidth: 0.5, borderColor: C.border,
    paddingHorizontal: 14,
  },
  yen: { fontSize: 20, color: C.textSecondary, marginRight: 4 },
  input: {
    flex: 1, fontSize: 20, fontWeight: '600', color: C.textPrimary,
    paddingVertical: 13,
  },
  hint: { fontSize: 11, color: C.textSecondary, marginTop: 6 },
  nextBtn: {
    backgroundColor: C.brand, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginBottom: 12,
  },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnTxt: { fontSize: 16, fontWeight: '700', color: '#fff' },
  skipBtn: { alignItems: 'center', padding: 10 },
  skipBtnTxt: { fontSize: 14, color: C.textSecondary },
});

// ─── 家族構成 ─────────────────────────────────────────────────────

const ROLE_ICONS: Record<string, string> = {
  self: '👤', partner: '👫', child: '👶', pet: '🐾', other: '👴',
};
const ROLE_LABELS: Record<string, string> = {
  self: 'あなた', partner: '配偶者', child: '子ども', pet: 'ペット', other: 'その他',
};

function FamilyStep({ onNext }: { onNext: (members: FamilyMember[]) => void }) {
  const [members, setMembers] = useState<FamilyMember[]>([
    { id: 'self', name: 'あなた', role: 'self', birthYear: 1988 },
  ]);

  const addMember = (role: FamilyMember['role']) => {
    const id = `member-${Date.now()}`;
    const defaults: Record<FamilyMember['role'], Partial<FamilyMember>> = {
      self: { name: 'あなた', birthYear: 1988 },
      partner: { name: '配偶者', birthYear: 1990 },
      child: { name: `子${members.filter(m => m.role === 'child').length + 1}`, birthYear: 2020 },
      pet: { name: 'ペット', birthYear: 2023 },
      other: { name: '家族', birthYear: 1955 },
    };
    setMembers(prev => [...prev, { id, role, ...defaults[role] } as FamilyMember]);
  };

  const updateMember = (id: string, field: keyof FamilyMember, value: string | number) => {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const removeMember = (id: string) => {
    setMembers(prev => prev.filter(m => m.id !== id || m.role === 'self'));
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={fm.content} keyboardShouldPersistTaps="handled">
        <Text style={fm.heading}>家族構成を教えてください</Text>
        <Text style={fm.sub}>年齢を把握することで、より正確な試算ができます</Text>

        {members.map(member => (
          <View key={member.id} style={fm.memberCard}>
            <Text style={fm.memberIcon}>{ROLE_ICONS[member.role]}</Text>
            <View style={{ flex: 1, gap: 6 }}>
              <TextInput
                style={fm.nameInput}
                value={member.name}
                onChangeText={v => updateMember(member.id, 'name', v)}
                placeholder="名前"
                placeholderTextColor={C.textSecondary}
              />
              <View style={fm.yearRow}>
                <Text style={fm.yearLabel}>生まれた年：</Text>
                <TextInput
                  style={fm.yearInput}
                  value={String(member.birthYear)}
                  onChangeText={v => updateMember(member.id, 'birthYear', parseInt(v, 10) || member.birthYear)}
                  keyboardType="number-pad"
                  selectTextOnFocus
                />
                <Text style={fm.yearSuffix}>年</Text>
              </View>
            </View>
            {member.role !== 'self' && (
              <Pressable onPress={() => removeMember(member.id)} hitSlop={8}>
                <Text style={fm.removeBtn}>✕</Text>
              </Pressable>
            )}
          </View>
        ))}

        <Text style={fm.addLabel}>追加する</Text>
        <View style={fm.addRow}>
          {(['partner', 'child', 'pet', 'other'] as FamilyMember['role'][]).map(role => (
            <Pressable key={role} style={fm.addChip} onPress={() => addMember(role)}>
              <Text style={fm.addChipIcon}>{ROLE_ICONS[role]}</Text>
              <Text style={fm.addChipLabel}>+ {ROLE_LABELS[role]}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <View style={fm.footer}>
        <Pressable style={fm.nextBtn} onPress={() => onNext(members)}>
          <Text style={fm.nextBtnTxt}>次へ</Text>
        </Pressable>
      </View>
    </View>
  );
}

const fm = StyleSheet.create({
  content: { padding: 20, paddingBottom: 16 },
  heading: { fontSize: 20, fontWeight: '700', color: C.textPrimary, marginBottom: 6 },
  sub: { fontSize: 13, color: C.textSecondary, lineHeight: 19, marginBottom: 20 },
  memberCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.card, borderRadius: 12,
    borderWidth: 0.5, borderColor: C.border,
    padding: 12, marginBottom: 10,
  },
  memberIcon: { fontSize: 28 },
  nameInput: {
    backgroundColor: C.bg, borderRadius: 8,
    borderWidth: 0.5, borderColor: C.border,
    paddingHorizontal: 10, paddingVertical: 7,
    fontSize: 15, color: C.textPrimary,
  },
  yearRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  yearLabel: { fontSize: 12, color: C.textSecondary },
  yearInput: {
    backgroundColor: C.bg, borderRadius: 8,
    borderWidth: 0.5, borderColor: C.border,
    paddingHorizontal: 8, paddingVertical: 5,
    fontSize: 15, color: C.textPrimary, width: 64, textAlign: 'center',
  },
  yearSuffix: { fontSize: 12, color: C.textSecondary },
  removeBtn: { fontSize: 16, color: C.textSecondary, padding: 4 },
  addLabel: { fontSize: 12, color: C.textSecondary, marginBottom: 8, marginTop: 4 },
  addRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  addChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.card, borderRadius: 20,
    borderWidth: 0.5, borderColor: C.border,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  addChipIcon: { fontSize: 16 },
  addChipLabel: { fontSize: 13, color: C.brand, fontWeight: '500' },
  footer: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 10 },
  nextBtn: {
    backgroundColor: C.brand, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  nextBtnTxt: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

// ─── 積立ルール ───────────────────────────────────────────────────

const DEFAULT_ALLOCATION = { edu: 30000, ret: 50000, car: 40000, trip: 10000 };
const PJ_CONFIG = [
  { id: 'edu', name: '教育資金', color: '#2B7FC0' },
  { id: 'ret', name: '老後資金', color: '#1D9E75' },
  { id: 'car', name: '車資金', color: '#D46000' },
  { id: 'trip', name: '旅行資金', color: '#7B5EA7' },
];

function SavingsStep({ onNext }: { onNext: (allocation: Record<string, number>) => void }) {
  const [amounts, setAmounts] = useState<Record<string, number>>(DEFAULT_ALLOCATION);
  const total = Object.values(amounts).reduce((s, v) => s + v, 0);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={sv.content} keyboardShouldPersistTaps="handled">
        <Text style={sv.heading}>毎月の積立ルールを設定しましょう</Text>
        <Text style={sv.sub}>あとから何度でも変更できます。まず目安から始めましょう。</Text>

        {PJ_CONFIG.map(pj => (
          <View key={pj.id} style={sv.row}>
            <View style={[sv.dot, { backgroundColor: pj.color }]} />
            <Text style={sv.pjName}>{pj.name}</Text>
            <View style={sv.inputWrap}>
              <Text style={sv.yen}>¥</Text>
              <TextInput
                style={sv.input}
                value={amounts[pj.id] ? String(amounts[pj.id]) : ''}
                onChangeText={v => {
                  const n = parseInt(v.replace(/[^0-9]/g, ''), 10) || 0;
                  setAmounts(prev => ({ ...prev, [pj.id]: n }));
                }}
                keyboardType="number-pad"
                selectTextOnFocus
                placeholder="0"
                placeholderTextColor={C.textSecondary}
              />
              <Text style={sv.suffix}>円/月</Text>
            </View>
          </View>
        ))}

        <View style={sv.totalRow}>
          <Text style={sv.totalLabel}>合計</Text>
          <Text style={sv.totalAmt}>¥{total.toLocaleString('ja-JP')}円/月</Text>
        </View>
      </ScrollView>
      <View style={sv.footer}>
        <Pressable style={sv.nextBtn} onPress={() => onNext(amounts)}>
          <Text style={sv.nextBtnTxt}>次へ</Text>
        </Pressable>
      </View>
    </View>
  );
}

const sv = StyleSheet.create({
  content: { padding: 20, paddingBottom: 16 },
  heading: { fontSize: 20, fontWeight: '700', color: C.textPrimary, marginBottom: 6 },
  sub: { fontSize: 13, color: C.textSecondary, lineHeight: 19, marginBottom: 20 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: 12,
  },
  dot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  pjName: { fontSize: 14, color: C.textPrimary, width: 72 },
  inputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, borderRadius: 8,
    borderWidth: 0.5, borderColor: C.border,
    paddingHorizontal: 10,
  },
  yen: { fontSize: 14, color: C.textSecondary, marginRight: 2 },
  input: {
    flex: 1, fontSize: 16, fontWeight: '500', color: C.textPrimary,
    paddingVertical: 9,
  },
  suffix: { fontSize: 11, color: C.textSecondary },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: 8, paddingTop: 14,
    borderTopWidth: 0.5, borderTopColor: C.border,
  },
  totalLabel: { fontSize: 13, color: C.textSecondary },
  totalAmt: { fontSize: 16, fontWeight: '700', color: C.brand },
  footer: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 10 },
  nextBtn: {
    backgroundColor: C.brand, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  nextBtnTxt: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

// ─── 給料日の設定 ─────────────────────────────────────────────────

const DAY_OPTIONS = [5, 10, 15, 20, 25, 28, 31];

function PaydayStep({ onNext }: { onNext: (day: number, amount: number) => void }) {
  const [day, setDay] = useState(25);
  const [amount, setAmount] = useState('');

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={pd.content} keyboardShouldPersistTaps="handled">
        <Text style={pd.heading}>給料日を教えてください</Text>
        <Text style={pd.sub}>毎月の入金日を登録すると、✦ AIが自動で試算を更新します</Text>

        <Text style={pd.fieldLabel}>給料日</Text>
        <View style={pd.dayRow}>
          {DAY_OPTIONS.map(d => (
            <Pressable
              key={d}
              style={[pd.dayChip, day === d && pd.dayChipActive]}
              onPress={() => setDay(d)}
            >
              <Text style={[pd.dayChipTxt, day === d && pd.dayChipTxtActive]}>{d}日</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[pd.fieldLabel, { marginTop: 20 }]}>毎月の手取り収入（概算）</Text>
        <View style={pd.inputRow}>
          <Text style={pd.yen}>¥</Text>
          <TextInput
            style={pd.input}
            value={amount}
            onChangeText={setAmount}
            keyboardType="number-pad"
            placeholder="例：450000"
            placeholderTextColor={C.textSecondary}
          />
        </View>
        <Text style={pd.hint}>※ 後で変更できます</Text>
      </ScrollView>
      <View style={pd.footer}>
        <Pressable style={pd.nextBtn} onPress={() => onNext(day, parseInt(amount.replace(/[^0-9]/g, ''), 10) || 0)}>
          <Text style={pd.nextBtnTxt}>次へ</Text>
        </Pressable>
      </View>
    </View>
  );
}

const pd = StyleSheet.create({
  content: { padding: 20, paddingBottom: 16 },
  heading: { fontSize: 20, fontWeight: '700', color: C.textPrimary, marginBottom: 6 },
  sub: { fontSize: 13, color: C.textSecondary, lineHeight: 20, marginBottom: 24 },
  fieldLabel: { fontSize: 13, color: C.textSecondary, marginBottom: 10 },
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  dayChip: {
    paddingVertical: 10, paddingHorizontal: 16,
    backgroundColor: C.card, borderRadius: 10,
    borderWidth: 0.5, borderColor: C.border,
  },
  dayChipActive: { backgroundColor: C.brand, borderColor: C.brand },
  dayChipTxt: { fontSize: 15, fontWeight: '600', color: C.textPrimary },
  dayChipTxtActive: { color: '#fff' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, borderRadius: 10,
    borderWidth: 0.5, borderColor: C.border,
    paddingHorizontal: 14,
  },
  yen: { fontSize: 18, color: C.textSecondary, marginRight: 4 },
  input: {
    flex: 1, fontSize: 20, fontWeight: '600', color: C.textPrimary,
    paddingVertical: 12,
  },
  hint: { fontSize: 11, color: C.textSecondary, marginTop: 6 },
  footer: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 10 },
  nextBtn: {
    backgroundColor: C.brand, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  nextBtnTxt: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

// ─── AI試算ローディング ───────────────────────────────────────────

const CALC_STEPS = [
  { id: 'car', label: '車PJを試算しました', amt: '¥250万' },
  { id: 'edu', label: '教育PJを試算しました', amt: '¥800万' },
  { id: 'trip', label: '旅行PJを試算しました', amt: '¥80万' },
  { id: 'ret', label: '老後PJを試算しました', amt: '¥3,000万' },
  { id: 'opt', label: '全体最適化中...', amt: '' },
];

function CalculatingStep({ onDone }: { onDone: () => void }) {
  const [checkedCount, setCheckedCount] = useState(0);

  // ステップを順番にチェック
  const startCalculating = () => {
    let i = 0;
    const tick = () => {
      if (i < CALC_STEPS.length) {
        setCheckedCount(i + 1);
        i++;
        setTimeout(tick, 800);
      } else {
        setTimeout(onDone, 600);
      }
    };
    setTimeout(tick, 500);
  };

  // マウント時に開始
  useState(() => { startCalculating(); });

  return (
    <View style={cs.wrap}>
      <Text style={cs.title}>✦ AIが試算しています...</Text>
      <View style={cs.steps}>
        {CALC_STEPS.map((step, i) => {
          const done = i < checkedCount;
          const active = i === checkedCount - 1 || (i === CALC_STEPS.length - 1 && checkedCount === CALC_STEPS.length);
          return (
            <View key={step.id} style={cs.stepRow}>
              <Text style={[cs.stepCheck, done && cs.stepCheckDone]}>
                {done && i < CALC_STEPS.length - 1 ? '✓' : done && i === CALC_STEPS.length - 1 ? '✓' : '○'}
              </Text>
              <Text style={[cs.stepLabel, done && cs.stepLabelDone]}>
                {step.label}
              </Text>
              {step.amt && done && (
                <Text style={cs.stepAmt}>{step.amt}</Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const cs = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  title: { fontSize: 18, fontWeight: '600', color: C.brand, textAlign: 'center', marginBottom: 32 },
  steps: { gap: 16 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepCheck: { fontSize: 18, color: C.textSecondary, width: 24 },
  stepCheckDone: { color: C.green },
  stepLabel: { flex: 1, fontSize: 14, color: C.textSecondary },
  stepLabelDone: { color: C.textPrimary, fontWeight: '500' },
  stepAmt: { fontSize: 14, fontWeight: '600', color: C.brand },
});

// ─── オンボーディング メイン ──────────────────────────────────────

type OnboardingState = {
  step: 'welcome' | 'interests' | 'questions' | 'pool' | 'family' | 'savings' | 'payday' | 'calculating';
  interests: InterestItem[];
  answers: QuestionAnswer[];
  poolAmount: number;
  family: FamilyMember[];
  allocation: Record<string, number>;
  paydayDay: number;
  paydayAmount: number;
};

export default function OnboardingScreen() {
  const { setOnboardingDone, setFamilyMembers, saveSavingsAllocation, addDream, setPayday } = useStore();

  const [state, setState] = useState<OnboardingState>({
    step: 'welcome',
    interests: [],
    answers: [],
    poolAmount: 0,
    family: [],
    allocation: DEFAULT_ALLOCATION,
    paydayDay: 25,
    paydayAmount: 0,
  });

  const currentStepIndex: Record<OnboardingState['step'], Step> = {
    welcome: '夢',
    interests: '興味',
    questions: '質問',
    pool: '資産',
    family: '家族',
    savings: '積立',
    payday: '給料日',
    calculating: '試算',
  };

  const handleFinish = () => {
    setFamilyMembers(state.family.length > 0 ? state.family : [
      { id: 'self', name: 'あなた', role: 'self', birthYear: 1988 },
    ]);

    saveSavingsAllocation({
      entries: [{ fromYear: new Date().getFullYear(), monthlyAmounts: state.allocation }],
    });

    setPayday(state.paydayDay, state.paydayAmount);

    for (const ans of state.answers) {
      if (!ans.skipped && ans.year) {
        const q = CATEGORY_QUESTIONS[ans.categoryId];
        if (q) {
          addDream({ year: ans.year, title: q.title.replace('について教えてください', ''), projectId: ans.categoryId });
        }
      }
    }

    setOnboardingDone(true);
    router.replace('/(tabs)/explore');
  };

  const step = state.step;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      {/* スキップボタン */}
      {step !== 'calculating' && (
        <Pressable style={ob.skipBtn} onPress={() => {
          setOnboardingDone(true);
          router.replace('/(tabs)/explore');
        }}>
          <Text style={ob.skipTxt}>スキップ</Text>
        </Pressable>
      )}

      {/* 進捗バー（welcomeとcalculating以外） */}
      {step !== 'welcome' && step !== 'calculating' && (
        <ProgressBar currentStep={currentStepIndex[step]} />
      )}

      {/* 各ステップ */}
      {step === 'welcome' && (
        <WelcomeStep onNext={() => setState(s => ({ ...s, step: 'interests' }))} />
      )}
      {step === 'interests' && (
        <InterestsStep
          onNext={(interests) => setState(s => ({ ...s, interests, step: 'questions' }))}
        />
      )}
      {step === 'questions' && (
        <QuestionsStep
          interests={state.interests}
          onNext={(answers) => setState(s => ({ ...s, answers, step: 'pool' }))}
        />
      )}
      {step === 'pool' && (
        <PoolStep
          onNext={(poolAmount) => setState(s => ({ ...s, poolAmount, step: 'family' }))}
        />
      )}
      {step === 'family' && (
        <FamilyStep
          onNext={(family) => setState(s => ({ ...s, family, step: 'savings' }))}
        />
      )}
      {step === 'savings' && (
        <SavingsStep
          onNext={(allocation) => setState(s => ({ ...s, allocation, step: 'payday' }))}
        />
      )}
      {step === 'payday' && (
        <PaydayStep
          onNext={(paydayDay, paydayAmount) => setState(s => ({ ...s, paydayDay, paydayAmount, step: 'calculating' }))}
        />
      )}
      {step === 'calculating' && (
        <CalculatingStep onDone={handleFinish} />
      )}
    </SafeAreaView>
  );
}

const ob = StyleSheet.create({
  skipBtn: {
    position: 'absolute', top: 56, right: 16, zIndex: 100,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  skipTxt: { fontSize: 13, color: C.textSecondary },
});
