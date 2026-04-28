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
  { color: '#5B8E7D', name: '証券口座', val: '¥300万', amount: 3_000_000, meta: 'SBI証券 · 投資信託・株式', projectId: 'pool-shoken' },
  { color: '#4A7FA8', name: '定期預金', val: '¥250万', amount: 2_500_000, meta: '〇〇銀行 · 1年定期', projectId: 'pool-teiki' },
  { color: '#E8B86D', name: '積立NISA', val: '¥100万', amount: 1_000_000, meta: '月¥33,000 積立中', projectId: 'pool-nisa' },
  { color: '#C8826B', name: 'メイン銀行', val: '¥80万', amount: 800_000, meta: '普通預金 · 給与振込口座', projectId: 'pool-main' },
  { color: '#B8AFD9', name: 'サブ銀行', val: '¥45万', amount: 450_000, meta: '普通預金 · 生活費', projectId: 'pool-sub' },
];

export const PF_ITEMS: FinancialItem[] = [
  { color: '#4A7FA8', name: '教育資金', val: '¥300万', amount: 3_000_000, meta: '2044年 大学入学まで · 目標¥500万', progress: 0.60, status: 'ok', projectId: 'edu' },
  { color: '#5B8E7D', name: '老後資金', val: '¥250万', amount: 2_500_000, meta: '2050年 定年まで · 目標¥3,000万', progress: 0.08, status: 'warn', projectId: 'ret' },
  { color: '#C8826B', name: '車資金', val: '¥100万', amount: 1_000_000, meta: '2028年 買い替え · 目標¥200万', progress: 0.50, status: 'ok', projectId: 'car' },
  { color: '#B8AFD9', name: '旅行資金', val: '¥50万', amount: 500_000, meta: '年1回国内・2031年TDL・2037年豪州', progress: 0.25, status: 'ok', projectId: 'trip' },
  { color: '#BDC4C7', name: '余剰資金', val: '¥115万', amount: 1_150_000, meta: '冠婚葬祭・家修繕などの予備枠', progress: 1.0, status: 'ok' },
];
