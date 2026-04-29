import { poolPalette, usePalette } from './colors';

export type FinancialItem = {
  color: string;
  name: string;
  val: string;
  amount: number;
  meta?: string;
  progress?: number;
  status?: 'ok' | 'warn';
  projectId?: string;
};

// プール金：金額降順でtone-1(最濃)〜tone-5(最淡)を割り当て
export const POOL_ITEMS: FinancialItem[] = [
  { color: poolPalette.tones[0], name: '証券口座', val: '¥300万', amount: 3_000_000, meta: 'SBI証券 · 投資信託・株式', projectId: 'pool-shoken' },
  { color: poolPalette.tones[1], name: '定期預金', val: '¥250万', amount: 2_500_000, meta: '〇〇銀行 · 1年定期', projectId: 'pool-teiki' },
  { color: poolPalette.tones[2], name: '積立NISA', val: '¥100万', amount: 1_000_000, meta: '月¥33,000 積立中', projectId: 'pool-nisa' },
  { color: poolPalette.tones[3], name: 'メイン銀行', val: '¥80万', amount: 800_000, meta: '普通預金 · 給与振込口座', projectId: 'pool-main' },
  { color: poolPalette.tones[4], name: 'サブ銀行', val: '¥45万', amount: 450_000, meta: '普通預金 · 生活費', projectId: 'pool-sub' },
];

// 使いみち：作成順でjewel-1〜4、余剰資金はneutral
export const PF_ITEMS: FinancialItem[] = [
  { color: usePalette.jewels[0], name: '教育資金', val: '¥300万', amount: 3_000_000, meta: '2044年 大学入学まで · 目標¥500万', progress: 0.60, status: 'ok', projectId: 'edu' },
  { color: usePalette.jewels[1], name: '老後資金', val: '¥250万', amount: 2_500_000, meta: '2050年 定年まで · 目標¥3,000万', progress: 0.08, status: 'warn', projectId: 'ret' },
  { color: usePalette.jewels[2], name: '車資金', val: '¥100万', amount: 1_000_000, meta: '2028年 買い替え · 目標¥200万', progress: 0.50, status: 'ok', projectId: 'car' },
  { color: usePalette.jewels[3], name: '旅行資金', val: '¥50万', amount: 500_000, meta: '年1回国内・2031年TDL・2037年豪州', progress: 0.25, status: 'ok', projectId: 'trip' },
  { color: usePalette.neutral, name: '余剰資金', val: '¥115万', amount: 1_150_000, meta: '冠婚葬祭・家修繕などの予備枠', progress: 1.0, status: 'ok' },
];
