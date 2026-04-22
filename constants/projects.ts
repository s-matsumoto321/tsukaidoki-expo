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
  edu: {
    id: 'edu',
    name: '教育プロジェクト',
    timing: '2044年 大学入学まで',
    now: 3_000_000,
    goalLabel: '目標 ¥500万',
    statusTxt: '計画通り',
    color: '#0C447C',
    ai: '教育費ピークの2044年大学入学までに、計画通り積み上がっています。あと8年で目標達成見込み。',
    years: ["'25","'27","'29","'31","'33","'35","'37","'39","'41","'43","'45","'47"],
    plan: [300,650,1010,1380,1760,2150,2550,3100,3700,4000,3000,2000],
    actual: [300,620,980,1340,1700,null,null,null,null,null,null,null],
    events: [
      {idx:0,type:'start',dot:'#0C447C',year:'2025',name:'積立スタート',detail:'月¥30,000 配分中',amt:'+¥30,000/月',pos:true},
      {idx:2,type:'in',dot:'#EF9F27',year:'2027',name:'保育園費用 始動',detail:'支出が始まるが積立が上回る',amt:'-¥720,000/年',pos:false},
      {idx:4,type:'in',dot:'#1D9E75',year:'2033',name:'小学校入学',detail:'教育費が軽減、積立が加速',amt:'-¥309,000/年',pos:false},
      {idx:7,type:'in',dot:'#EF9F27',year:'2038',name:'中学校入学',detail:'教育費が再び増加',amt:'-¥321,000/年',pos:false},
      {idx:9,type:'in',dot:'#EF9F27',year:'2043',name:'高校入学',detail:'学費・塾費用がピーク近く',amt:'-¥488,000/年',pos:false},
      {idx:10,type:'spend',dot:'#E24B4A',year:'2044',name:'大学入学',detail:'まとまった支出が発生',amt:'-¥1,000,000',pos:false},
      {idx:11,type:'spend',dot:'#E24B4A',year:'2046',name:'大学3年次授業料',detail:'継続的な大学費用',amt:'-¥1,000,000',pos:false},
    ],
  },
  ret: {
    id: 'ret',
    name: '老後プロジェクト',
    timing: '2050年 定年まで',
    now: 2_500_000,
    goalLabel: '目標 ¥3,000万',
    statusTxt: '要注意',
    color: '#1D9E75',
    ai: 'このペースでは2058年達成見込み（8年遅れ）。月+¥15,000の増額で計画通りになります。',
    years: ["'25","'28","'31","'34","'37","'40","'43","'46","'49","'52","'55","'58"],
    plan: [250,530,870,1280,1780,2390,3130,4020,5000,4200,3400,2600],
    actual: [250,490,790,1150,1580,null,null,null,null,null,null,null],
    events: [
      {idx:0,type:'start',dot:'#0C447C',year:'2025',name:'積立スタート',detail:'月¥50,000 配分中',amt:'+¥50,000/月',pos:true},
      {idx:4,type:'in',dot:'#1D9E75',year:'2039',name:'積立増額予定',detail:'教育費軽減後、月¥65,000へ',amt:'+¥65,000/月',pos:true},
      {idx:8,type:'spend',dot:'#E24B4A',year:'2050',name:'定年・取り崩し開始',detail:'4%複利運用から年-420万',amt:'-¥4,200,000/年',pos:false},
      {idx:10,type:'spend',dot:'#E24B4A',year:'2055',name:'生活費縮小フェーズ',detail:'年金収入＋取り崩し-300万',amt:'-¥3,000,000/年',pos:false},
    ],
  },
  car: {
    id: 'car',
    name: '車プロジェクト',
    timing: '2028年 買い替え予定',
    now: 1_000_000,
    goalLabel: '目標 ¥200万',
    statusTxt: '順調',
    color: '#888780',
    ai: 'このペースなら2027年12月に達成見込みです。2028年の買い替えに余裕で間に合います。',
    years: ["'25","'26","'27","'28"],
    plan: [100,148,196,200],
    actual: [100,148,null,null],
    events: [
      {idx:0,type:'start',dot:'#0C447C',year:'2025',name:'積立スタート',detail:'月¥40,000 配分中',amt:'+¥40,000/月',pos:true},
      {idx:3,type:'spend',dot:'#E24B4A',year:'2028',name:'車 買い替え（使用）',detail:'車PJから全額使用',amt:'-¥2,000,000',pos:false},
    ],
  },
  trip: {
    id: 'trip',
    name: '旅行プロジェクト',
    timing: '来年夏 ハワイ旅行',
    now: 100_000,
    goalLabel: '目標 ¥30万',
    statusTxt: '順調',
    color: '#EF9F27',
    ai: 'このペースなら来年5月に達成見込みです。夏の旅行に余裕で間に合います。',
    years: ['4月','6月','8月','10月','12月','2月','4月'],
    plan: [10,50,90,130,170,220,300],
    actual: [10,40,80,100,null,null,null],
    events: [
      {idx:0,type:'start',dot:'#0C447C',year:'2025',name:'積立スタート',detail:'月¥10,000 配分中',amt:'+¥10,000/月',pos:true},
      {idx:6,type:'spend',dot:'#E24B4A',year:'2026',name:'ハワイ旅行（使用）',detail:'旅行PJから全額使用',amt:'-¥300,000',pos:false},
    ],
  },
};
