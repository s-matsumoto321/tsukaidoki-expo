import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { POOL_ITEMS as DEFAULT_POOL_ITEMS, PF_ITEMS as DEFAULT_PF_ITEMS, type FinancialItem } from '@/constants/data';
import { PROJECTS as DEFAULT_PROJECTS, type Project } from '@/constants/projects';
import { poolPalette, usePalette, semantic } from '@/constants/colors';

export type UserEvent = {
  id: string;
  type: 'start' | 'in' | 'spend';
  dot: string;
  date: string;
  name: string;
  detail: string;
  amt: string;
  pos: boolean;
};

export type ActualOverride = {
  balanceMan: number;
  date: string;
  memo: string;
};

export type SpendPlanOverride = {
  amtMan: number;
  date: string;
  memo: string;
};

export type AllocationEntry = {
  fromYear: number;
  monthlyAmounts: Record<string, number>;
};

export type SavingsAllocation = {
  entries: AllocationEntry[];
  interestRates?: Record<string, number>;
};

export type ScenarioMeta = {
  id: string;
  systemLabel: string;
  userLabel: string;
};

export type Dream = {
  id: string;
  year: number;
  title: string;
  projectId: string;
};

export type FamilyMember = {
  id: string;
  name: string;
  role: 'self' | 'partner' | 'child' | 'pet' | 'other';
  birthYear: number;
};

// ─── Data Model v3 ─────────────────────────────────────────────────────────
// tsukaidoki_data_model.md 準拠のエンティティ定義。
// プール金（口座視点）と使いみち（PJ視点）を独立した試算視点として保持する。
// 既存の FinancialItem / Project（表示モデル）と並走させ、UI 側の差し替えは後続で実施する。

// ① 口座。シナリオ間で共通。
export type Account = {
  id: string;
  name: string;
  subName: string;
  currentBalance: number;
  annualRate: number;
  color: string;
};

// ② 口座への積立計画。シナリオごと独立。endYear/endMonth 未指定で無期限。
export type AccountSavingPlan = {
  id: string;
  accountId: string;
  startYear: number;
  startMonth: number;
  endYear?: number;
  endMonth?: number;
  monthlyAmount: number;
};

// ④ プロジェクト（使いみち）。シナリオごと独立。
// 既存の Project 型（constants/projects.ts）は表示用集計モデルのため、
// データモデル側は ProjectEntity として別名で持つ。
export type ProjectEntity = {
  id: string;
  name: string;
  subName: string;
  currentBalance: number;
  assumedRate: number;
  color: string;
};

// ⑤ PJへの積立計画。シナリオごと独立。任意の(Y,M)で ②合計 ≧ ⑤合計 の制約。
export type ProjectSavingPlan = {
  id: string;
  projectId: string;
  startYear: number;
  startMonth: number;
  endYear?: number;
  endMonth?: number;
  monthlyAmount: number;
};

export type ExpenseUnit = 'year' | 'month';

// ③⑥ 支出イベント。1イベントで ③（口座から出る支出）と ⑥（PJ取り崩し）を同時に表す。
export type Expense = {
  id: string;
  name: string;
  projectId: string;
  accountId: string;
  year: number;
  month?: number;
  unit: ExpenseUnit;
  amount: number;
  isRecurring: boolean;
  endYear?: number;
  endMonth?: number;
};

export type ScenarioData = {
  balances: Record<string, number>;
  userEvents: Record<string, UserEvent[]>;
  dreamOrder: string[];
  actualOverrides: Record<string, Record<number, ActualOverride>>;
  spendPlanOverrides: Record<string, Record<number, SpendPlanOverride>>;
  savingsAllocation: SavingsAllocation;
  dreams: Dream[];
  // Data Model v3（シナリオごと独立）
  accountSavingPlans: AccountSavingPlan[];
  projectEntities: ProjectEntity[];
  projectSavingPlans: ProjectSavingPlan[];
  expenses: Expense[];
};

const DEFAULT_DREAMS: Dream[] = [
  { id: 'd1', year: 2027, title: 'ハワイ旅行', projectId: 'trip' },
  { id: 'd2', year: 2028, title: '車の買い替え', projectId: 'car' },
  { id: 'd3', year: 2034, title: '子の大学入学', projectId: 'edu' },
  { id: 'd4', year: 2050, title: '定年退職', projectId: 'ret' },
];

// ─── Data Model v3 初期データ ──────────────────────────────────────────────
// 既存の POOL_ITEMS / PF_ITEMS / savingsAllocation を新スキーマへ写像した初期値。
// assumedRate のデフォルトは仕様書「想定利回りのデフォルト値（推奨）」に準拠。

const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'acc-shoken', name: '証券口座',   subName: 'SBI証券・投資信託・株式', currentBalance: 3_000_000, annualRate: 5.0,   color: poolPalette.tones[0] },
  { id: 'acc-teiki',  name: '定期預金',   subName: '〇〇銀行・1年定期',       currentBalance: 2_500_000, annualRate: 0.2,   color: poolPalette.tones[1] },
  { id: 'acc-nisa',   name: '積立NISA',   subName: 'SBI証券・月¥33,000積立',  currentBalance: 1_000_000, annualRate: 3.0,   color: poolPalette.tones[2] },
  { id: 'acc-main',   name: 'メイン銀行', subName: '普通預金・給与振込',      currentBalance:   800_000, annualRate: 0.001, color: poolPalette.tones[3] },
  { id: 'acc-sub',    name: 'サブ銀行',   subName: '普通預金・生活費',        currentBalance:   450_000, annualRate: 0.001, color: poolPalette.tones[4] },
];

// ②合計 = 150,000円/月。⑤合計（=150,000）と等価で整合性ルール 4-2 を満たす。
const DEFAULT_ACCOUNT_SAVING_PLANS: AccountSavingPlan[] = [
  { id: 'asp-shoken', accountId: 'acc-shoken', startYear: 2025, startMonth: 1, monthlyAmount: 67_000 },
  { id: 'asp-nisa',   accountId: 'acc-nisa',   startYear: 2025, startMonth: 1, monthlyAmount: 33_000 },
  { id: 'asp-main',   accountId: 'acc-main',   startYear: 2025, startMonth: 1, monthlyAmount: 50_000 },
];

const DEFAULT_PROJECT_ENTITIES: ProjectEntity[] = [
  { id: 'edu',     name: '教育資金', subName: '2044年 大学入学まで',                currentBalance: 3_000_000, assumedRate: 3.0, color: usePalette.jewels[0] },
  { id: 'ret',     name: '老後資金', subName: '2050年 定年まで',                    currentBalance: 2_500_000, assumedRate: 5.0, color: usePalette.jewels[1] },
  { id: 'car',     name: '車資金',   subName: '2028年 買い替え',                    currentBalance: 1_000_000, assumedRate: 0.5, color: usePalette.jewels[2] },
  { id: 'trip',    name: '旅行資金', subName: '年1回国内・2031年TDL・2037年豪州',   currentBalance:   500_000, assumedRate: 0.5, color: usePalette.jewels[3] },
  { id: 'surplus', name: '余剰資金', subName: '冠婚葬祭・家修繕などの予備枠',       currentBalance: 1_150_000, assumedRate: 3.0, color: usePalette.neutral   },
];

const DEFAULT_PROJECT_SAVING_PLANS: ProjectSavingPlan[] = [
  { id: 'psp-edu',  projectId: 'edu',  startYear: 2025, startMonth: 1, monthlyAmount: 30_000 },
  { id: 'psp-ret',  projectId: 'ret',  startYear: 2025, startMonth: 1, monthlyAmount: 50_000 },
  { id: 'psp-car',  projectId: 'car',  startYear: 2025, startMonth: 1, monthlyAmount: 40_000 },
  { id: 'psp-trip', projectId: 'trip', startYear: 2025, startMonth: 1, monthlyAmount: 30_000 },
];

// 2026年デモ用の支出イベント。仕様書「2-5 Expense」準拠で③⑥を1イベントで表す。
const DEFAULT_EXPENSES: Expense[] = [
  { id: 'exp-2026-shaken', name: '車検',              projectId: 'car',  accountId: 'acc-main', year: 2026, month: 2, unit: 'year', amount:  80_000, isRecurring: false },
  { id: 'exp-2026-hoiku',  name: '保育園入園金',      projectId: 'edu',  accountId: 'acc-main', year: 2026, month: 5, unit: 'year', amount: 100_000, isRecurring: false },
  { id: 'exp-2026-ryoko',  name: '家族旅行（国内）',  projectId: 'trip', accountId: 'acc-main', year: 2026, month: 8, unit: 'year', amount: 300_000, isRecurring: false },
];

const DEFAULT_SCENARIO_DATA: ScenarioData = {
  balances: {},
  userEvents: {},
  dreamOrder: ['edu', 'ret', 'car', 'trip'],
  actualOverrides: {},
  spendPlanOverrides: {},
  savingsAllocation: {
    entries: [
      { fromYear: 2025, monthlyAmounts: { edu: 30000, ret: 50000, car: 40000, trip: 30000 } },
    ],
  },
  dreams: [],
  accountSavingPlans: [],
  projectEntities: [],
  projectSavingPlans: [],
  expenses: [],
};

const DEFAULT_FAMILY: FamilyMember[] = [
  { id: 'self', name: 'あなた', role: 'self', birthYear: 1988 },
  { id: 'partner', name: '配偶者', role: 'partner', birthYear: 1990 },
  { id: 'child1', name: '太郎', role: 'child', birthYear: 2025 },
];

type State = {
  scenarios: ScenarioMeta[];
  activeScenarioId: string;
  scenariosData: Record<string, ScenarioData>;

  balances: Record<string, number>;
  userEvents: Record<string, UserEvent[]>;
  dreamOrder: string[];
  actualOverrides: Record<string, Record<number, ActualOverride>>;
  spendPlanOverrides: Record<string, Record<number, SpendPlanOverride>>;
  savingsAllocation: SavingsAllocation;
  dreams: Dream[];

  familyMembers: FamilyMember[];
  onboardingDone: boolean;
  aiInsights: Record<string, string>;
  isPremium: boolean;
  paydayDay: number;
  paydayAmount: number;

  poolItems: FinancialItem[];
  pfItems: FinancialItem[];
  projects: Record<string, Project>;

  // ─── Data Model v3 ───
  // accounts はシナリオ間で共通（仕様書 5-1）。
  accounts: Account[];
  // 以下はアクティブシナリオのミラー。scenariosData[activeScenarioId] にも保持される。
  accountSavingPlans: AccountSavingPlan[];
  projectEntities: ProjectEntity[];
  projectSavingPlans: ProjectSavingPlan[];
  expenses: Expense[];
};

type Actions = {
  updateBalance: (projectId: string, prevAmount: number, newAmount: number, note: string) => void;
  addTransfer: (fromId: string, fromPrev: number, toId: string, toPrev: number, amount: number, note: string) => void;
  setDreamOrder: (order: string[]) => void;
  saveActualOverride: (projectId: string, evIdx: number, data: ActualOverride) => void;
  saveSpendPlanOverride: (projectId: string, evIdx: number, data: SpendPlanOverride) => void;
  saveSavingsAllocation: (allocation: SavingsAllocation) => void;

  switchScenario: (id: string) => void;
  addScenario: (userLabel: string, copyFromId?: string) => void;
  renameScenario: (id: string, userLabel: string) => void;
  deleteScenario: (id: string) => void;

  addDream: (dream: Omit<Dream, 'id'>) => void;
  removeDream: (id: string) => void;
  setFamilyMembers: (members: FamilyMember[]) => void;
  setOnboardingDone: (done: boolean) => void;
  setAiInsight: (key: string, text: string) => void;
  setPremium: (val: boolean) => void;
  setPayday: (day: number, amount: number) => void;
  resetToDefaults: () => void;
  updateProject: (id: string, updater: (p: Project) => Project) => void;

  // ─── Data Model v3 ───
  setAccounts: (accounts: Account[]) => void;
  setAccountSavingPlans: (plans: AccountSavingPlan[]) => void;
  setProjectEntities: (entities: ProjectEntity[]) => void;
  setProjectSavingPlans: (plans: ProjectSavingPlan[]) => void;
  setExpenses: (expenses: Expense[]) => void;
};

function dateLabel(): string {
  const now = new Date();
  return `${now.getFullYear()}/${now.getMonth() + 1}`;
}

function systemLabelFromIndex(index: number): string {
  const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  return labels[index] ?? String(index + 1);
}

function snapshotActiveData(s: State): ScenarioData {
  return {
    balances: s.balances,
    userEvents: s.userEvents,
    dreamOrder: s.dreamOrder,
    actualOverrides: s.actualOverrides,
    spendPlanOverrides: s.spendPlanOverrides,
    savingsAllocation: s.savingsAllocation,
    dreams: s.dreams,
    accountSavingPlans: s.accountSavingPlans,
    projectEntities: s.projectEntities,
    projectSavingPlans: s.projectSavingPlans,
    expenses: s.expenses,
  };
}

export const useStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      scenarios: [{ id: 'plan-a', systemLabel: 'A', userLabel: 'メイン' }],
      activeScenarioId: 'plan-a',
      scenariosData: {},

      balances: {},
      userEvents: {},
      dreamOrder: ['edu', 'ret', 'car', 'trip'],
      actualOverrides: {},
      spendPlanOverrides: {},
      savingsAllocation: {
        entries: [
          { fromYear: 2025, monthlyAmounts: { edu: 30000, ret: 50000, car: 40000, trip: 30000 } },
        ],
      },
      dreams: DEFAULT_DREAMS,

      familyMembers: DEFAULT_FAMILY,
      onboardingDone: true,
      aiInsights: {},
      isPremium: false,
      paydayDay: 25,
      paydayAmount: 0,

      poolItems: DEFAULT_POOL_ITEMS,
      pfItems: DEFAULT_PF_ITEMS,
      projects: DEFAULT_PROJECTS,

      accounts: DEFAULT_ACCOUNTS,
      accountSavingPlans: DEFAULT_ACCOUNT_SAVING_PLANS,
      projectEntities: DEFAULT_PROJECT_ENTITIES,
      projectSavingPlans: DEFAULT_PROJECT_SAVING_PLANS,
      expenses: DEFAULT_EXPENSES,

      updateBalance: (projectId, prevAmount, newAmount, note) => {
        const diff = newAmount - prevAmount;
        const event: UserEvent = {
          id: `${Date.now()}-${projectId}`,
          type: diff >= 0 ? 'in' : 'spend',
          dot: diff >= 0 ? semantic.positive : semantic.negative,
          date: dateLabel(),
          name: note || '残高修正',
          detail: `¥${prevAmount.toLocaleString('ja-JP')} → ¥${newAmount.toLocaleString('ja-JP')}`,
          amt: `${diff >= 0 ? '+' : ''}¥${diff.toLocaleString('ja-JP')}`,
          pos: diff >= 0,
        };
        set(s => {
          const newBalances = { ...s.balances, [projectId]: newAmount };
          const newUserEvents = {
            ...s.userEvents,
            [projectId]: [...(s.userEvents[projectId] ?? []), event],
          };
          return {
            balances: newBalances,
            userEvents: newUserEvents,
            scenariosData: {
              ...s.scenariosData,
              [s.activeScenarioId]: {
                ...snapshotActiveData(s),
                balances: newBalances,
                userEvents: newUserEvents,
              },
            },
          };
        });
      },

      setDreamOrder: (order) =>
        set(s => ({
          dreamOrder: order,
          scenariosData: {
            ...s.scenariosData,
            [s.activeScenarioId]: { ...snapshotActiveData(s), dreamOrder: order },
          },
        })),

      addTransfer: (fromId, fromPrev, toId, toPrev, amount, note) => {
        const label = note || '振替';
        const amtStr = `¥${amount.toLocaleString('ja-JP')}`;
        const fromEvent: UserEvent = {
          id: `${Date.now()}-from`,
          type: 'spend', dot: semantic.negative, date: dateLabel(),
          name: label, detail: '出金',
          amt: `-${amtStr}`, pos: false,
        };
        const toEvent: UserEvent = {
          id: `${Date.now()}-to`,
          type: 'in', dot: semantic.positive, date: dateLabel(),
          name: label, detail: '入金',
          amt: `+${amtStr}`, pos: true,
        };
        set(s => {
          const newBalances = {
            ...s.balances,
            [fromId]: fromPrev - amount,
            [toId]: toPrev + amount,
          };
          const newUserEvents = {
            ...s.userEvents,
            [fromId]: [...(s.userEvents[fromId] ?? []), fromEvent],
            [toId]: [...(s.userEvents[toId] ?? []), toEvent],
          };
          return {
            balances: newBalances,
            userEvents: newUserEvents,
            scenariosData: {
              ...s.scenariosData,
              [s.activeScenarioId]: {
                ...snapshotActiveData(s),
                balances: newBalances,
                userEvents: newUserEvents,
              },
            },
          };
        });
      },

      saveActualOverride: (projectId, evIdx, data) =>
        set(s => {
          const newOverrides = {
            ...s.actualOverrides,
            [projectId]: { ...(s.actualOverrides[projectId] ?? {}), [evIdx]: data },
          };
          return {
            actualOverrides: newOverrides,
            scenariosData: {
              ...s.scenariosData,
              [s.activeScenarioId]: { ...snapshotActiveData(s), actualOverrides: newOverrides },
            },
          };
        }),

      saveSpendPlanOverride: (projectId, evIdx, data) =>
        set(s => {
          const newOverrides = {
            ...s.spendPlanOverrides,
            [projectId]: { ...(s.spendPlanOverrides[projectId] ?? {}), [evIdx]: data },
          };
          return {
            spendPlanOverrides: newOverrides,
            scenariosData: {
              ...s.scenariosData,
              [s.activeScenarioId]: { ...snapshotActiveData(s), spendPlanOverrides: newOverrides },
            },
          };
        }),

      saveSavingsAllocation: (allocation) =>
        set(s => ({
          savingsAllocation: allocation,
          scenariosData: {
            ...s.scenariosData,
            [s.activeScenarioId]: { ...snapshotActiveData(s), savingsAllocation: allocation },
          },
        })),

      switchScenario: (id) => {
        const s = get();
        if (s.activeScenarioId === id) return;
        const targetData = s.scenariosData[id] ?? {
          ...DEFAULT_SCENARIO_DATA,
          dreams: DEFAULT_DREAMS,
          accountSavingPlans: DEFAULT_ACCOUNT_SAVING_PLANS,
          projectEntities: DEFAULT_PROJECT_ENTITIES,
          projectSavingPlans: DEFAULT_PROJECT_SAVING_PLANS,
        };
        set({
          activeScenarioId: id,
          scenariosData: {
            ...s.scenariosData,
            [s.activeScenarioId]: snapshotActiveData(s),
          },
          balances: targetData.balances,
          userEvents: targetData.userEvents,
          dreamOrder: targetData.dreamOrder,
          actualOverrides: targetData.actualOverrides,
          spendPlanOverrides: targetData.spendPlanOverrides,
          savingsAllocation: targetData.savingsAllocation,
          dreams: targetData.dreams ?? DEFAULT_DREAMS,
          accountSavingPlans: targetData.accountSavingPlans ?? [],
          projectEntities: targetData.projectEntities ?? [],
          projectSavingPlans: targetData.projectSavingPlans ?? [],
          expenses: targetData.expenses ?? [],
        });
      },

      addScenario: (userLabel, copyFromId) => {
        const s = get();
        const id = `plan-${Date.now()}`;
        const newIndex = s.scenarios.length;
        const newMeta: ScenarioMeta = { id, systemLabel: systemLabelFromIndex(newIndex), userLabel };
        const sourceData = copyFromId
          ? (s.scenariosData[copyFromId] ?? (copyFromId === s.activeScenarioId ? snapshotActiveData(s) : { ...DEFAULT_SCENARIO_DATA, dreams: DEFAULT_DREAMS }))
          : { ...DEFAULT_SCENARIO_DATA, dreams: [] };
        set({
          scenarios: [...s.scenarios, newMeta],
          scenariosData: {
            ...s.scenariosData,
            [s.activeScenarioId]: snapshotActiveData(s),
            [id]: { ...sourceData },
          },
        });
      },

      renameScenario: (id, userLabel) =>
        set(s => ({
          scenarios: s.scenarios.map(sc => sc.id === id ? { ...sc, userLabel } : sc),
        })),

      deleteScenario: (id) => {
        const s = get();
        if (s.scenarios.length <= 1) return;
        const newScenarios = s.scenarios.filter(sc => sc.id !== id);
        const newScenariosData = { ...s.scenariosData };
        delete newScenariosData[id];
        let newActiveId = s.activeScenarioId;
        let patch: Partial<State> = {};
        if (newActiveId === id) {
          newActiveId = newScenarios[0].id;
          const targetData = newScenariosData[newActiveId] ?? { ...DEFAULT_SCENARIO_DATA, dreams: DEFAULT_DREAMS };
          patch = {
            balances: targetData.balances,
            userEvents: targetData.userEvents,
            dreamOrder: targetData.dreamOrder,
            actualOverrides: targetData.actualOverrides,
            spendPlanOverrides: targetData.spendPlanOverrides,
            savingsAllocation: targetData.savingsAllocation,
            dreams: targetData.dreams ?? DEFAULT_DREAMS,
            accountSavingPlans: targetData.accountSavingPlans ?? [],
            projectEntities: targetData.projectEntities ?? [],
            projectSavingPlans: targetData.projectSavingPlans ?? [],
            expenses: targetData.expenses ?? [],
          };
        }
        set({
          scenarios: newScenarios.map((sc, i) => ({ ...sc, systemLabel: systemLabelFromIndex(i) })),
          activeScenarioId: newActiveId,
          scenariosData: newScenariosData,
          ...patch,
        });
      },

      addDream: (dream) =>
        set(s => {
          const newDreams = [...s.dreams, { ...dream, id: `dream-${Date.now()}` }];
          return {
            dreams: newDreams,
            scenariosData: {
              ...s.scenariosData,
              [s.activeScenarioId]: { ...snapshotActiveData(s), dreams: newDreams },
            },
          };
        }),

      removeDream: (id) =>
        set(s => {
          const newDreams = s.dreams.filter(d => d.id !== id);
          return {
            dreams: newDreams,
            scenariosData: {
              ...s.scenariosData,
              [s.activeScenarioId]: { ...snapshotActiveData(s), dreams: newDreams },
            },
          };
        }),

      setFamilyMembers: (members) => set({ familyMembers: members }),

      setOnboardingDone: (done) => set({ onboardingDone: done }),

      setAiInsight: (key, text) =>
        set(s => ({ aiInsights: { ...s.aiInsights, [key]: text } })),

      setPremium: (val) => set({ isPremium: val }),

      setPayday: (day, amount) => set({ paydayDay: day, paydayAmount: amount }),

      resetToDefaults: () => set({
        poolItems: DEFAULT_POOL_ITEMS,
        pfItems: DEFAULT_PF_ITEMS,
        projects: DEFAULT_PROJECTS,
        balances: {},
        userEvents: {},
        dreamOrder: ['edu', 'ret', 'car', 'trip'],
        actualOverrides: {},
        spendPlanOverrides: {},
        savingsAllocation: {
          entries: [
            { fromYear: 2025, monthlyAmounts: { edu: 30000, ret: 50000, car: 40000, trip: 30000 } },
          ],
        },
        dreams: DEFAULT_DREAMS,
        familyMembers: DEFAULT_FAMILY,
        scenarios: [{ id: 'plan-a', systemLabel: 'A', userLabel: 'メイン' }],
        activeScenarioId: 'plan-a',
        scenariosData: {},
        aiInsights: {},
        accounts: DEFAULT_ACCOUNTS,
        accountSavingPlans: DEFAULT_ACCOUNT_SAVING_PLANS,
        projectEntities: DEFAULT_PROJECT_ENTITIES,
        projectSavingPlans: DEFAULT_PROJECT_SAVING_PLANS,
        expenses: DEFAULT_EXPENSES,
      }),

      updateProject: (id, updater) =>
        set(s => {
          if (!s.projects[id]) return s;
          return { projects: { ...s.projects, [id]: updater(s.projects[id]) } };
        }),

      setAccounts: (accounts) => set({ accounts }),

      setAccountSavingPlans: (plans) =>
        set(s => ({
          accountSavingPlans: plans,
          scenariosData: {
            ...s.scenariosData,
            [s.activeScenarioId]: { ...snapshotActiveData(s), accountSavingPlans: plans },
          },
        })),

      setProjectEntities: (entities) =>
        set(s => ({
          projectEntities: entities,
          scenariosData: {
            ...s.scenariosData,
            [s.activeScenarioId]: { ...snapshotActiveData(s), projectEntities: entities },
          },
        })),

      setProjectSavingPlans: (plans) =>
        set(s => ({
          projectSavingPlans: plans,
          scenariosData: {
            ...s.scenariosData,
            [s.activeScenarioId]: { ...snapshotActiveData(s), projectSavingPlans: plans },
          },
        })),

      setExpenses: (expenses) =>
        set(s => ({
          expenses,
          scenariosData: {
            ...s.scenariosData,
            [s.activeScenarioId]: { ...snapshotActiveData(s), expenses },
          },
        })),
    }),
    {
      name: 'tsukaidoki-store',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      // v1 → v2：v3 エンティティのフィールドを欠落していたら初期値で補完する。
      // 既存のシナリオ/残高/userEvents 等は保持する。
      migrate: (persistedState, version) => {
        if (version < 2 && persistedState && typeof persistedState === 'object') {
          const ps = persistedState as Record<string, unknown>;
          return {
            ...ps,
            accounts: ps.accounts ?? DEFAULT_ACCOUNTS,
            accountSavingPlans: ps.accountSavingPlans ?? DEFAULT_ACCOUNT_SAVING_PLANS,
            projectEntities: ps.projectEntities ?? DEFAULT_PROJECT_ENTITIES,
            projectSavingPlans: ps.projectSavingPlans ?? DEFAULT_PROJECT_SAVING_PLANS,
            expenses: ps.expenses ?? DEFAULT_EXPENSES,
          };
        }
        return persistedState;
      },
    },
  ),
);
