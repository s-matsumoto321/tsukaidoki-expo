export type FinancialItem = {
  color: string;
  name: string;
  val: string;
  amount: number;
};

export const POOL_ITEMS: FinancialItem[] = [
  { color: '#0C447C', name: '証券口座', val: '¥300万', amount: 3_000_000 },
  { color: '#185FA5', name: '定期預金', val: '¥250万', amount: 2_500_000 },
  { color: '#378ADD', name: '積立NISA', val: '¥100万', amount: 1_000_000 },
  { color: '#85B7EB', name: 'メイン銀行', val: '¥80万', amount: 800_000 },
  { color: '#B5D4F4', name: 'サブ銀行', val: '¥45万', amount: 450_000 },
];

export const PF_ITEMS: FinancialItem[] = [
  { color: '#0C447C', name: '教育PJ', val: '¥300万', amount: 3_000_000 },
  { color: '#1D9E75', name: '老後PJ', val: '¥250万', amount: 2_500_000 },
  { color: '#888780', name: '車PJ', val: '¥100万', amount: 1_000_000 },
  { color: '#534AB7', name: 'その他', val: '¥115万', amount: 1_150_000 },
  { color: '#EF9F27', name: '旅行PJ', val: '¥10万', amount: 100_000 },
];
