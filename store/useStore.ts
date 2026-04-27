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

type State = {
  balances: Record<string, number>;
  userEvents: Record<string, UserEvent[]>;
  dreamOrder: string[];
  actualOverrides: Record<string, Record<number, ActualOverride>>;
  spendPlanOverrides: Record<string, Record<number, SpendPlanOverride>>;
  savingsAllocation: SavingsAllocation;
};

type Actions = {
  updateBalance: (
    projectId: string,
    prevAmount: number,
    newAmount: number,
    note: string,
  ) => void;
  addTransfer: (
    fromId: string,
    fromPrev: number,
    toId: string,
    toPrev: number,
    amount: number,
    note: string,
  ) => void;
  setDreamOrder: (order: string[]) => void;
  saveActualOverride: (projectId: string, evIdx: number, data: ActualOverride) => void;
  saveSpendPlanOverride: (projectId: string, evIdx: number, data: SpendPlanOverride) => void;
  saveSavingsAllocation: (allocation: SavingsAllocation) => void;
};

function dateLabel(): string {
  const now = new Date();
  return `${now.getFullYear()}/${now.getMonth() + 1}`;
}

export const useStore = create<State & Actions>()(
  persist(
    (set) => ({
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
        set(s => ({
          balances: { ...s.balances, [projectId]: newAmount },
          userEvents: {
            ...s.userEvents,
            [projectId]: [...(s.userEvents[projectId] ?? []), event],
          },
        }));
      },

      setDreamOrder: (order) => set({ dreamOrder: order }),

      addTransfer: (fromId, fromPrev, toId, toPrev, amount, note) => {
        const label = note || '口座振替';
        const amtStr = `¥${amount.toLocaleString('ja-JP')}`;
        const fromEvent: UserEvent = {
          id: `${Date.now()}-from`,
          type: 'spend',
          dot: '#E24B4A',
          date: dateLabel(),
          name: label,
          detail: '振替出金',
          amt: `-${amtStr}`,
          pos: false,
        };
        const toEvent: UserEvent = {
          id: `${Date.now()}-to`,
          type: 'in',
          dot: '#1D9E75',
          date: dateLabel(),
          name: label,
          detail: '振替入金',
          amt: `+${amtStr}`,
          pos: true,
        };
        set(s => ({
          balances: {
            ...s.balances,
            [fromId]: fromPrev - amount,
            [toId]: toPrev + amount,
          },
          userEvents: {
            ...s.userEvents,
            [fromId]: [...(s.userEvents[fromId] ?? []), fromEvent],
            [toId]: [...(s.userEvents[toId] ?? []), toEvent],
          },
        }));
      },

      saveActualOverride: (projectId, evIdx, data) =>
        set(s => ({
          actualOverrides: {
            ...s.actualOverrides,
            [projectId]: {
              ...(s.actualOverrides[projectId] ?? {}),
              [evIdx]: data,
            },
          },
        })),

      saveSpendPlanOverride: (projectId, evIdx, data) =>
        set(s => ({
          spendPlanOverrides: {
            ...s.spendPlanOverrides,
            [projectId]: {
              ...(s.spendPlanOverrides[projectId] ?? {}),
              [evIdx]: data,
            },
          },
        })),

      saveSavingsAllocation: (allocation) =>
        set({ savingsAllocation: allocation }),
    }),
    {
      name: 'tsukaidoki-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
