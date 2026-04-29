import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  Modal, TextInput, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useStore, type Dream, type FamilyMember } from '@/store/useStore';
import { PROJECTS } from '@/constants/projects';
import { PF_ITEMS } from '@/constants/data';
import { brand, neutral, semantic } from '@/constants/colors';

const C = {
  brand: brand.sage.base,
  green: brand.sage.base,
  amber: brand.honey.base,
  red: semantic.negative,
  bg: neutral.bg,
  card: neutral.card,
  textPrimary: neutral.text.primary,
  textSecondary: neutral.text.mid,
  border: 'rgba(0,0,0,0.08)',
  starGold: brand.honey.dark,
};

const NOW_YEAR = new Date().getFullYear();

function getProjectColor(projectId: string): string {
  return PF_ITEMS.find(i => i.projectId === projectId)?.color
    ?? PROJECTS[projectId]?.color
    ?? C.brand;
}

function getProjectName(projectId: string): string {
  return PROJECTS[projectId]?.name
    ?? PF_ITEMS.find(i => i.projectId === projectId)?.name
    ?? projectId;
}

function memberAge(member: FamilyMember, year: number): number {
  return year - member.birthYear;
}

// ─── 夢追加モーダル ────────────────────────────────────────────────

type AddDreamModalProps = {
  visible: boolean;
  defaultYear?: number;
  onClose: () => void;
  onSave: (dream: Omit<Dream, 'id'>) => void;
};

const PJ_OPTIONS = PF_ITEMS.filter(i => i.projectId).map(i => ({
  id: i.projectId!,
  name: i.name,
  color: i.color,
}));

function AddDreamModal({ visible, defaultYear, onClose, onSave }: AddDreamModalProps) {
  const currentYear = defaultYear ?? NOW_YEAR;
  const [year, setYear] = useState(String(currentYear));
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState(PJ_OPTIONS[0]?.id ?? 'trip');

  const reset = () => {
    setYear(String(defaultYear ?? NOW_YEAR));
    setTitle('');
    setProjectId(PJ_OPTIONS[0]?.id ?? 'trip');
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSave = () => {
    const y = parseInt(year, 10);
    if (!title.trim() || isNaN(y)) return;
    onSave({ year: y, title: title.trim(), projectId });
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={m.safe}>
        <View style={m.header}>
          <Text style={m.title}>新しい夢を立てる</Text>
          <Pressable style={m.closeBtn} onPress={handleClose}>
            <Text style={m.closeTxt}>✕</Text>
          </Pressable>
        </View>
        <ScrollView style={m.scroll} contentContainerStyle={m.content} keyboardShouldPersistTaps="handled">
          <Text style={m.label}>いつ？</Text>
          <TextInput
            style={m.input}
            value={year}
            onChangeText={setYear}
            keyboardType="number-pad"
            placeholder="例：2030"
            placeholderTextColor={C.textSecondary}
          />

          <Text style={m.label}>何を？</Text>
          <TextInput
            style={m.input}
            value={title}
            onChangeText={setTitle}
            placeholder="例：ハワイ旅行"
            placeholderTextColor={C.textSecondary}
          />

          <Text style={m.label}>どのPJ？</Text>
          {PJ_OPTIONS.map(pj => (
            <Pressable
              key={pj.id}
              style={[m.pjItem, projectId === pj.id && m.pjItemSelected]}
              onPress={() => setProjectId(pj.id)}
            >
              <View style={[m.pjDot, { backgroundColor: pj.color }]} />
              <Text style={[m.pjName, projectId === pj.id && { color: C.brand, fontWeight: '700' }]}>{pj.name}</Text>
              {projectId === pj.id && <Text style={m.pjCheck}>✓</Text>}
            </Pressable>
          ))}

          <Pressable
            style={[m.saveBtn, (!title.trim() || !year) && m.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!title.trim() || !year}
          >
            <Text style={m.saveBtnTxt}>保存</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const m = StyleSheet.create({
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
  label: { fontSize: 13, color: C.textSecondary, marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: C.card,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: C.textPrimary,
  },
  pjItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.card,
    borderRadius: 10, borderWidth: 0.5, borderColor: C.border,
    paddingVertical: 12, paddingHorizontal: 14,
    marginBottom: 8,
  },
  pjItemSelected: { borderColor: C.brand, backgroundColor: brand.sage.bg },
  pjDot: { width: 12, height: 12, borderRadius: 6 },
  pjName: { flex: 1, fontSize: 15, color: C.textPrimary },
  pjCheck: { fontSize: 14, color: C.brand, fontWeight: '700' },
  saveBtn: {
    marginTop: 24,
    backgroundColor: C.brand, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnTxt: { fontSize: 16, fontWeight: '600', color: '#fff' },
});

// ─── タイムライン本体 ──────────────────────────────────────────────

type DecadeSection = {
  decade: number;       // e.g. 2020, 2030
  years: YearEntry[];
  collapsed: boolean;
};

type YearEntry = {
  year: number;
  isNow: boolean;
  dreams: Dream[];
  ages: { name: string; age: number }[];
};

function buildTimeline(dreams: Dream[], family: FamilyMember[]): DecadeSection[] {
  const maxDreamYear = dreams.length > 0 ? Math.max(...dreams.map(d => d.year)) : NOW_YEAR + 10;
  const endYear = Math.max(maxDreamYear + 2, NOW_YEAR + 10);

  const dreamsByYear: Record<number, Dream[]> = {};
  for (const d of dreams) {
    if (!dreamsByYear[d.year]) dreamsByYear[d.year] = [];
    dreamsByYear[d.year].push(d);
  }

  // collect relevant years: NOW + all dream years
  const relevantYears = new Set<number>([NOW_YEAR]);
  for (const d of dreams) relevantYears.add(d.year);

  // group by decade
  const decadeMap: Record<number, YearEntry[]> = {};
  for (const year of Array.from(relevantYears).sort((a, b) => a - b)) {
    const decade = Math.floor(year / 10) * 10;
    if (!decadeMap[decade]) decadeMap[decade] = [];
    decadeMap[decade].push({
      year,
      isNow: year === NOW_YEAR,
      dreams: dreamsByYear[year] ?? [],
      ages: family.map(m => ({ name: m.name, age: memberAge(m, year) })).filter(a => a.age >= 0),
    });
  }

  return Object.entries(decadeMap)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([decade, years]) => ({
      decade: Number(decade),
      years,
      collapsed: false,
    }));
}

export default function DreamTimelineScreen() {
  const insets = useSafeAreaInsets();
  const { dreams, familyMembers, addDream, removeDream } = useStore();

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addDefaultYear, setAddDefaultYear] = useState<number | undefined>(undefined);
  const [collapsedDecades, setCollapsedDecades] = useState<Set<number>>(new Set());

  const sections = useMemo(
    () => buildTimeline(dreams, familyMembers),
    [dreams, familyMembers],
  );

  const toggleDecade = (decade: number) => {
    setCollapsedDecades(prev => {
      const next = new Set(prev);
      if (next.has(decade)) next.delete(decade);
      else next.add(decade);
      return next;
    });
  };

  const openAddModal = (year?: number) => {
    setAddDefaultYear(year);
    setAddModalVisible(true);
  };

  const handleLongPressDream = (dream: Dream) => {
    Alert.alert(
      `★ ${dream.title}`,
      `${dream.year}年 · ${getProjectName(dream.projectId)}`,
      [
        {
          text: '削除',
          style: 'destructive',
          onPress: () =>
            Alert.alert('削除しますか？', `「${dream.title}」を削除します。`, [
              { text: 'キャンセル', style: 'cancel' },
              { text: '削除', style: 'destructive', onPress: () => removeDream(dream.id) },
            ]),
        },
        { text: 'キャンセル', style: 'cancel' },
      ],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* ヘッダー */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={s.backTxt}>‹ 戻る</Text>
        </Pressable>
        <View style={s.hdrRow}>
          <Text style={s.hdrTitle}>夢年表</Text>
          <Pressable style={s.addBtn} onPress={() => openAddModal()}>
            <Text style={s.addBtnTxt}>＋</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24, paddingTop: 8 }}
      >
        {sections.map(section => {
          const isCollapsed = collapsedDecades.has(section.decade);
          const dreamCount = section.years.reduce((n, y) => n + y.dreams.length, 0);

          return (
            <View key={section.decade} style={s.decadeSection}>
              {/* 年代ヘッダー */}
              <Pressable style={s.decadeHeader} onPress={() => toggleDecade(section.decade)}>
                <Text style={s.decadeArrow}>{isCollapsed ? '▶' : '▼'}</Text>
                <Text style={s.decadeTitle}>{section.decade}年代</Text>
                {isCollapsed && dreamCount > 0 && (
                  <Text style={s.decadeCount}>{dreamCount}つの夢</Text>
                )}
              </Pressable>

              {!isCollapsed && section.years.map(entry => (
                <View key={entry.year} style={s.yearBlock}>
                  {/* 年マーカー */}
                  <View style={s.yearRow}>
                    <View style={[s.yearLine, entry.isNow && s.yearLineNow]} />
                    <Text style={[s.yearLabel, entry.isNow && s.yearLabelNow]}>
                      {entry.year}年{entry.isNow ? '（今）' : ''}
                    </Text>
                    <Pressable style={s.yearAddBtn} onPress={() => openAddModal(entry.year)}>
                      <Text style={s.yearAddBtnTxt}>＋</Text>
                    </Pressable>
                  </View>

                  {/* 夢リスト */}
                  {entry.dreams.map(dream => (
                    <Pressable
                      key={dream.id}
                      style={s.dreamRow}
                      onLongPress={() => handleLongPressDream(dream)}
                      delayLongPress={500}
                    >
                      <View style={[s.dreamStar, { backgroundColor: getProjectColor(dream.projectId) }]}>
                        <Text style={s.dreamStarTxt}>★</Text>
                      </View>
                      <View style={s.dreamBody}>
                        <Text style={s.dreamTitle}>{dream.title}</Text>
                        <Text style={[s.dreamPj, { color: getProjectColor(dream.projectId) }]}>
                          {getProjectName(dream.projectId)}
                        </Text>
                      </View>
                    </Pressable>
                  ))}

                  {/* 家族の年齢 */}
                  {entry.ages.length > 0 && (
                    <View style={s.agesRow}>
                      {entry.ages.map((a, i) => (
                        <Text key={a.name} style={s.ageItem}>
                          {i > 0 ? '　' : ''}{a.name}{a.age}歳
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          );
        })}

        {sections.length === 0 && (
          <View style={s.emptyWrap}>
            <Text style={s.emptyIcon}>★</Text>
            <Text style={s.emptyTitle}>まだ夢がありません</Text>
            <Text style={s.emptySub}>＋ボタンから夢を追加してみましょう</Text>
          </View>
        )}
      </ScrollView>

      <AddDreamModal
        visible={addModalVisible}
        defaultYear={addDefaultYear}
        onClose={() => setAddModalVisible(false)}
        onSave={addDream}
      />
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    backgroundColor: C.brand,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  backTxt: { fontSize: 18, color: '#fff', fontWeight: '500', marginBottom: 8, letterSpacing: 0.2 },
  hdrRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hdrTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
  },
  addBtnTxt: { fontSize: 22, color: '#fff', lineHeight: 26 },

  decadeSection: { marginBottom: 4 },
  decadeHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  decadeArrow: { fontSize: 12, color: C.textSecondary, width: 12 },
  decadeTitle: { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  decadeCount: {
    fontSize: 12, color: C.textSecondary,
    backgroundColor: C.card, paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 10, borderWidth: 0.5, borderColor: C.border,
  },

  yearBlock: {
    marginLeft: 20,
    marginRight: 14,
    marginBottom: 4,
  },
  yearRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 6,
  },
  yearLine: {
    width: 14, height: 2, borderRadius: 1, backgroundColor: C.border,
  },
  yearLineNow: { backgroundColor: C.green, width: 18 },
  yearLabel: { fontSize: 13, fontWeight: '600', color: C.textSecondary, flex: 1 },
  yearLabelNow: { color: C.green },
  yearAddBtn: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: C.border,
    justifyContent: 'center', alignItems: 'center',
  },
  yearAddBtnTxt: { fontSize: 14, color: C.textSecondary, lineHeight: 18 },

  dreamRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.card,
    borderRadius: 10, borderWidth: 0.5, borderColor: C.border,
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 6,
  },
  dreamStar: {
    width: 30, height: 30, borderRadius: 15,
    justifyContent: 'center', alignItems: 'center',
  },
  dreamStarTxt: { fontSize: 14, color: '#fff' },
  dreamBody: { flex: 1 },
  dreamTitle: { fontSize: 15, fontWeight: '600', color: C.textPrimary },
  dreamPj: { fontSize: 12, marginTop: 2, fontWeight: '500' },

  agesRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 4, paddingBottom: 4,
  },
  ageItem: { fontSize: 11, color: C.textSecondary },

  emptyWrap: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, color: C.amber, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: C.textPrimary, marginBottom: 6 },
  emptySub: { fontSize: 13, color: C.textSecondary },
});
