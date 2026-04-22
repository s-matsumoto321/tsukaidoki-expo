export type ProjectEvent = {
  idx: number;
  type: 'start' | 'in' | 'spend';
  dot: string;
  year: string;
  name: string;
  detail: string;
  amt: string;
  pos: boolean;
};

export type Project = {
  id: string;
  kind: 'project' | 'account';
  name: string;
  timing: string;
  now: number;
  goalLabel: string;
  statusTxt: string;
  color: string;
  ai: string;
  years: string[];
  plan: number[];
  actual: (number | null)[];
  events: ProjectEvent[];
};

export const PROJECTS: Record<string, Project> = {
  // ── ポートフォリオ ──────────────────────────────────────────────
  edu: {
    id: 'edu', kind: 'project',
    name: '教育プロジェクト', timing: '2044年 大学入学まで',
    now: 3_000_000, goalLabel: '目標 ¥500万', statusTxt: '計画通り', color: '#1A5C6B',
    ai: '教育費ピークの2044年大学入学までに、計画通り積み上がっています。あと8年で目標達成見込み。',
    years: ["'25","'27","'29","'31","'33","'35","'37","'39","'41","'43","'45","'47"],
    plan:   [300,650,1010,1380,1760,2150,2550,3100,3700,4000,3000,2000],
    actual: [300,620, 980,1340,1700,null,null,null,null,null,null,null],
    events: [
      {idx:0,type:'start',dot:'#1A5C6B',year:'2025',name:'積立スタート',detail:'月¥30,000 配分中',amt:'+¥30,000/月',pos:true},
      {idx:2,type:'in',dot:'#C4622D',year:'2027',name:'保育園費用 始動',detail:'支出が始まるが積立が上回る',amt:'-¥720,000/年',pos:false},
      {idx:4,type:'in',dot:'#1D9E75',year:'2033',name:'小学校入学',detail:'教育費が軽減、積立が加速',amt:'-¥309,000/年',pos:false},
      {idx:7,type:'in',dot:'#C4622D',year:'2038',name:'中学校入学',detail:'教育費が再び増加',amt:'-¥321,000/年',pos:false},
      {idx:9,type:'in',dot:'#C4622D',year:'2043',name:'高校入学',detail:'学費・塾費用がピーク近く',amt:'-¥488,000/年',pos:false},
      {idx:10,type:'spend',dot:'#D64040',year:'2044',name:'大学入学',detail:'まとまった支出が発生',amt:'-¥1,000,000',pos:false},
      {idx:11,type:'spend',dot:'#D64040',year:'2046',name:'大学3年次授業料',detail:'継続的な大学費用',amt:'-¥1,000,000',pos:false},
    ],
  },
  ret: {
    id: 'ret', kind: 'project',
    name: '老後プロジェクト', timing: '2050年 定年まで',
    now: 2_500_000, goalLabel: '目標 ¥3,000万', statusTxt: '要注意', color: '#1D9E75',
    ai: 'このペースでは2058年達成見込み（8年遅れ）。月+¥15,000の増額で計画通りになります。',
    years: ["'25","'28","'31","'34","'37","'40","'43","'46","'49","'52","'55","'58"],
    plan:   [250, 530, 870,1280,1780,2390,3130,4020,5000,4200,3400,2600],
    actual: [250, 490, 790,1150,1580,null,null,null,null,null,null,null],
    events: [
      {idx:0,type:'start',dot:'#1A5C6B',year:'2025',name:'積立スタート',detail:'月¥50,000 配分中',amt:'+¥50,000/月',pos:true},
      {idx:4,type:'in',dot:'#1D9E75',year:'2039',name:'積立増額予定',detail:'教育費軽減後、月¥65,000へ',amt:'+¥65,000/月',pos:true},
      {idx:8,type:'spend',dot:'#D64040',year:'2050',name:'定年・取り崩し開始',detail:'4%複利運用から年-420万',amt:'-¥4,200,000/年',pos:false},
      {idx:10,type:'spend',dot:'#D64040',year:'2055',name:'生活費縮小フェーズ',detail:'年金収入＋取り崩し-300万',amt:'-¥3,000,000/年',pos:false},
    ],
  },
  car: {
    id: 'car', kind: 'project',
    name: '車プロジェクト', timing: '2028年 買い替え予定',
    now: 1_000_000, goalLabel: '目標 ¥200万', statusTxt: '順調', color: '#887F72',
    ai: 'このペースなら2027年12月に達成見込みです。2028年の買い替えに余裕で間に合います。',
    years: ["'25","'26","'27","'28"],
    plan:   [100,148,196,200],
    actual: [100,148,null,null],
    events: [
      {idx:0,type:'start',dot:'#1A5C6B',year:'2025',name:'積立スタート',detail:'月¥40,000 配分中',amt:'+¥40,000/月',pos:true},
      {idx:3,type:'spend',dot:'#D64040',year:'2028',name:'車 買い替え（使用）',detail:'車PJから全額使用',amt:'-¥2,000,000',pos:false},
    ],
  },
  trip: {
    id: 'trip', kind: 'project',
    name: '旅行プロジェクト', timing: '来年夏 ハワイ旅行',
    now: 100_000, goalLabel: '目標 ¥30万', statusTxt: '順調', color: '#C4622D',
    ai: 'このペースなら来年5月に達成見込みです。夏の旅行に余裕で間に合います。',
    years: ['4月','6月','8月','10月','12月','2月','4月'],
    plan:   [10, 50, 90,130,170,220,300],
    actual: [10, 40, 80,100,null,null,null],
    events: [
      {idx:0,type:'start',dot:'#1A5C6B',year:'2025',name:'積立スタート',detail:'月¥10,000 配分中',amt:'+¥10,000/月',pos:true},
      {idx:6,type:'spend',dot:'#D64040',year:'2026',name:'ハワイ旅行（使用）',detail:'旅行PJから全額使用',amt:'-¥300,000',pos:false},
    ],
  },

  // ── プール金（口座別） ──────────────────────────────────────────
  'pool-shoken': {
    id: 'pool-shoken', kind: 'account',
    name: '証券口座', timing: 'SBI証券 · 投資信託・株式',
    now: 3_000_000, goalLabel: '運用残高', statusTxt: '運用中', color: '#1A5C6B',
    ai: '計画通り増加中。配当金も順調に入金されています。次回のリバランスは2025年10月を目安に。',
    years: ["'24/4","'24/7","'24/10","'25/1","'25/4"],
    plan:   [250, 265, 278, 290, 300],
    actual: [250, 258, 271, 289, 300],
    events: [
      {idx:0,type:'start',dot:'#1A5C6B',year:'2024/4',name:'積立・運用開始',detail:'月¥50,000 積立設定',amt:'+¥50,000/月',pos:true},
      {idx:2,type:'in',dot:'#1D9E75',year:'2024/10',name:'配当金・分配金入金',detail:'投資信託の分配金',amt:'+¥24,000',pos:true},
      {idx:4,type:'in',dot:'#C4622D',year:'2025/4',name:'追加入金・リバランス',detail:'株式比率を調整',amt:'+¥100,000',pos:true},
    ],
  },
  'pool-teiki': {
    id: 'pool-teiki', kind: 'account',
    name: '定期預金', timing: '〇〇銀行 · 1年定期',
    now: 2_500_000, goalLabel: '預入残高', statusTxt: '自動更新中', color: '#22768A',
    ai: '1年定期を自動更新中。現在の金利で年約¥5,000の利息収入。満期時に一部を証券口座へ移す検討も。',
    years: ["'23","'24","'25","'26","'27"],
    plan:   [250,250,250,250,250],
    actual: [250,250,250,null,null],
    events: [
      {idx:0,type:'start',dot:'#1A5C6B',year:'2023',name:'1年定期 預け入れ',detail:'金利 年0.2%',amt:'¥2,500,000 預け入れ',pos:true},
      {idx:1,type:'in',dot:'#1D9E75',year:'2024',name:'満期・自動更新',detail:'利息¥5,000 入金',amt:'+¥5,000',pos:true},
      {idx:2,type:'in',dot:'#1D9E75',year:'2025',name:'満期・自動更新',detail:'利息¥5,000 入金',amt:'+¥5,000',pos:true},
    ],
  },
  'pool-nisa': {
    id: 'pool-nisa', kind: 'account',
    name: '積立NISA', timing: 'SBI証券 · 月¥33,000 積立中',
    now: 1_000_000, goalLabel: '評価残高', statusTxt: '積立中', color: '#3A9AB0',
    ai: '月¥33,000の積立で計画通り増加中。評価益も出ており非課税枠を最大限活用できています。',
    years: ["'23/1","'23/7","'24/1","'24/7","'25/1","'25/7"],
    plan:   [20, 40, 60, 80,100,120],
    actual: [20, 38, 60, 80,100,null],
    events: [
      {idx:0,type:'start',dot:'#1A5C6B',year:'2023/1',name:'積立NISA 開始',detail:'月¥33,000 積立設定',amt:'+¥33,000/月',pos:true},
      {idx:2,type:'in',dot:'#1D9E75',year:'2024/1',name:'新NISA 制度移行',detail:'年間投資枠が最大360万円に拡大',amt:'枠拡大',pos:true},
      {idx:4,type:'in',dot:'#C4622D',year:'2025/1',name:'含み益 初めてプラスへ',detail:'評価損益 +¥42,000',amt:'+¥42,000 評価益',pos:true},
    ],
  },
  'pool-main': {
    id: 'pool-main', kind: 'account',
    name: 'メイン銀行', timing: '普通預金 · 給与振込口座',
    now: 800_000, goalLabel: '現在残高', statusTxt: '安定', color: '#7BBFCF',
    ai: '月次の収支は安定しています。ボーナス時の余剰資金は証券口座や積立NISAへの振替を推奨します。',
    years: ['4月','6月','8月','10月','12月','2月','4月'],
    plan:   [80, 82, 80, 83, 80, 79, 80],
    actual: [80, 83, 78, 86, 80,null,null],
    events: [
      {idx:0,type:'start',dot:'#1A5C6B',year:'2025/4',name:'給与振込・家賃引き落とし',detail:'毎月の収支サイクル',amt:'+¥280,000 / -¥95,000',pos:true},
      {idx:2,type:'spend',dot:'#D64040',year:'2025/8',name:'車保険 年払い引き落とし',detail:'自動車保険 一括払い',amt:'-¥68,000',pos:false},
      {idx:3,type:'in',dot:'#1D9E75',year:'2025/10',name:'夏ボーナス振込',detail:'余剰分を証券口座へ移動',amt:'+¥800,000',pos:true},
    ],
  },
  'pool-sub': {
    id: 'pool-sub', kind: 'account',
    name: 'サブ銀行', timing: '普通預金 · 生活費',
    now: 450_000, goalLabel: '現在残高', statusTxt: '安定', color: '#AEDAE4',
    ai: '生活費口座として適切な残高水準です。冷蔵庫購入で一時減少しましたが翌月回復しています。',
    years: ['4月','6月','8月','10月','12月','2月'],
    plan:   [45, 47, 44, 47, 45, 43],
    actual: [45, 48, 43, 46, 45,null],
    events: [
      {idx:0,type:'start',dot:'#1A5C6B',year:'2025/4',name:'生活費口座として運用開始',detail:'メイン口座より月¥100,000 振替',amt:'+¥100,000/月',pos:true},
      {idx:1,type:'in',dot:'#1D9E75',year:'2025/6',name:'水道光熱費 口座振替',detail:'電気・ガス・水道 計¥22,000',amt:'-¥22,000/月',pos:false},
      {idx:3,type:'spend',dot:'#D64040',year:'2025/10',name:'家電購入（冷蔵庫）',detail:'突発的な家電買い替え',amt:'-¥120,000',pos:false},
    ],
  },
};
