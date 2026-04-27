import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
};

export type ScenarioMeta = {
  id: string;
  systemLabel: string;
  userLabel: string;
};

export type ScenarioData = {
  balances: Record<string, number>;
  userEvents: Record<string, UserEvent[]>;
  dreamOrder: string[];
  actualOverrides: Record<string, Record<number, ActualOverride>>;
  spendPlanOverrides: Record<string, Record<number, SpendPlanOverride>>;
  savingsAllocation: SavingsAllocation;
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

const DEFAULT_SCENARIO_DATA: ScenarioData = {
  balances: {},
  userEvents: {},
  dreamOrder: ['edu', 'ret', 'car', 'trip'],
  actualOverrides: {},
  spendPlanOverrides: {},
  savingsAllocation: {
    entries: [
      { fromYear: 2025, monthlyAmounts: { edu: 30000, ret: 50000, car: 40000, trip: 10000 } },
    ],
  },
};

const DEFAULT_DREAMS: Dream[] = [
  { id: 'd1', year: 2027, title: 'ハワイ旅行', projectId: 'trip' },
  { id: 'd2', year: 2028, title: '車の買い替え', projectId: 'car' },
  { id: 'd3', year: 2034, title: '子の大学入学', projectId: 'edu' },
  { id: 'd4', year: 2050, title: '定年退職', projectId: 'ret' },
];

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
          { fromYear: 2025, monthlyAmounts: { edu: 30000, ret: 50000, car: 40000, trip: 10000 } },
        ],
      },

      dreams: DEFAULT_DREAMS,
      familyMembers: DEFAULT_FAMILY,
      onboardingDone: true,
      aiInsights: {},

      updateBalance: (projectId, prevAmount, newAmount, note) => {
        const diff = newAmount - prevAmount;
        const event: UserEvent = {
          id: `${Date.now()}-${projectId}`,
          type: diff >= 0 ? 'in' : 'spend',
          dot: diff >= 0 ? '#1D9E75' : '#E24B4A',
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
          type: 'spend', dot: '#E24B4A', date: dateLabel(),
          name: label, detail: '出金',
          amt: `-${amtStr}`, pos: false,
        };
        const toEvent: UserEvent = {
          id: `${Date.now()}-to`,
          type: 'in', dot: '#1D9E75', date: dateLabel(),
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
        const targetData = s.scenariosData[id] ?? DEFAULT_SCENARIO_DATA;
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
        });
      },

      addScenario: (userLabel, copyFromId) => {
        const s = get();
        const id = `plan-${Date.now()}`;
        const newIndex = s.scenarios.length;
        const newMeta: ScenarioMeta = { id, systemLabel: systemLabelFromIndex(newIndex), userLabel };
        const sourceData = copyFromId
          ? (s.scenariosData[copyFromId] ?? (copyFromId === s.activeScenarioId ? snapshotActiveData(s) : DEFAULT_SCENARIO_DATA))
          : DEFAULT_SCENARIO_DATA;
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
          const targetData = newScenariosData[newActiveId] ?? DEFAULT_SCENARIO_DATA;
          patch = {
            balances: targetData.balances,
            userEvents: targetData.userEvents,
            dreamOrder: targetData.dreamOrder,
            actualOverrides: targetData.actualOverrides,
            spendPlanOverrides: targetData.spendPlanOverrides,
            savingsAllocation: targetData.savingsAllocation,
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
        set(s => ({
          dreams: [...s.dreams, { ...dream, id: `dream-${Date.now()}` }],
        })),

      removeDream: (id) =>
        set(s => ({ dreams: s.dreams.filter(d => d.id !== id) })),

      setFamilyMembers: (members) => set({ familyMembers: members }),

      setOnboardingDone: (done) => set({ onboardingDone: done }),

      setAiInsight: (key, text) =>
        set(s => ({ aiInsights: { ...s.aiInsights, [key]: text } })),
    }),
    {
      name: 'tsukaidoki-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
