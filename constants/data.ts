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

export const POOL_ITEMS: FinancialItem[] = [
  { color: '#0C447C', name: '証券口座', val: '¥300万', amount: 3_000_000, meta: 'SBI証券 · 投資信託・株式', projectId: 'pool-shoken' },
  { color: '#185FA5', name: '定期預金', val: '¥250万', amount: 2_500_000, meta: '〇〇銀行 · 1年定期', projectId: 'pool-teiki' },
  { color: '#378ADD', name: '積立NISA', val: '¥100万', amount: 1_000_000, meta: '月¥33,000 積立中', projectId: 'pool-nisa' },
  { color: '#85B7EB', name: 'メイン銀行', val: '¥80万', amount: 800_000, meta: '普通預金 · 給与振込口座', projectId: 'pool-main' },
  { color: '#B5D4F4', name: 'サブ銀行', val: '¥45万', amount: 450_000, meta: '普通預金 · 生活費', projectId: 'pool-sub' },
];

export const PF_ITEMS: FinancialItem[] = [
  { color: '#0C447C', name: '教育PJ', val: '¥300万', amount: 3_000_000, meta: '2044年 大学入学まで · 目標¥500万', progress: 0.60, status: 'ok', projectId: 'edu' },
  { color: '#1D9E75', name: '老後PJ', val: '¥250万', amount: 2_500_000, meta: '2050年 定年まで · 目標¥3,000万', progress: 0.08, status: 'warn', projectId: 'ret' },
  { color: '#888780', name: '車PJ', val: '¥100万', amount: 1_000_000, meta: '2028年 買い替え · 目標¥200万', progress: 0.50, status: 'ok', projectId: 'car' },
  { color: '#534AB7', name: 'その他', val: '¥115万', amount: 1_150_000, meta: '冠婚葬祭・家修繕などの予備枠', progress: 1.0, status: 'ok' },
  { color: '#EF9F27', name: '旅行PJ', val: '¥10万', amount: 100_000, meta: '来年夏 ハワイ旅行 · 目標¥30万', progress: 0.33, status: 'ok', projectId: 'trip' },
];
