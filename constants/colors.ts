// ─── Layer 1: ブランド層（固定） ────────────────────────────────────
export const brand = {
  sage: {
    base: '#5B8E7D',
    light: '#8BB0A2',
    bg: '#E8EFEB',
  },
  honey: {
    base: '#E8B86D',
    dark: '#B8893E',
    bg: '#FBF1DD',
  },
};

// ─── Layer 2: プール金パレット（単一青トーン） ──────────────────────
export const poolPalette = {
  // 金額降順でソート済みの口座に順番に割り当てる（濃→淡）
  tones: [
    '#2E5F8A',   // tone-1: 最も濃い（最大金額）
    '#4A7FA8',   // tone-2
    '#6B9BC4',   // tone-3
    '#95B8D4',   // tone-4
    '#C2D5E5',   // tone-5: 最も淡い（最小金額）
  ] as string[],
};

// ─── Layer 2: 使いみちパレット（ジュエルトーン多色） ────────────────
export const usePalette = {
  // カテゴリ非依存。作成順 or ハッシュで動的割り当て
  jewels: [
    '#2E6FB8',   // jewel-1: ロイヤルブルー
    '#3D9670',   // jewel-2: フォレストグリーン
    '#E07142',   // jewel-3: テラコッタオレンジ（赤の代替）
    '#9376C9',   // jewel-4: アメジスト
    '#D4A847',   // jewel-5: マスタードゴールド
    '#C56A9E',   // jewel-6: ローズピンク
  ] as string[],
  neutral: '#A8AFB3',  // 余剰資金・未分類用
};

// ─── Layer 3: グレースケール層 ──────────────────────────────────────
export const neutral = {
  bg: '#FAF7F2',
  card: '#FFFFFF',
  cardAlt: '#FFFEFB',
  divider: '#EDE8DF',
  text: {
    primary: '#2C3539',
    mid: '#6B7378',
    light: '#A0A6A9',
  },
};

// ─── セマンティック（用途別エイリアス） ─────────────────────────────
export const semantic = {
  positive: brand.sage.base,        // 収入・増加イベント
  negative: usePalette.jewels[2],   // 支出イベント（#E07142 テラコッタ、純赤禁止）
  warning: brand.honey.base,        // 注意・未達成・要修正
  warningDark: brand.honey.dark,    // 警告テキスト
};

// ─── 背景ティント（パレット由来の透過色） ───────────────────────────
export const tints = {
  poolActive: 'rgba(74, 127, 168, 0.10)',    // poolPalette.tones[1] ベース
  sageTint: 'rgba(91, 142, 125, 0.10)',      // brand.sage.base ベース
  amethystTint: 'rgba(147, 118, 201, 0.12)', // usePalette.jewels[3] ベース
  terracottaTint: 'rgba(224, 113, 66, 0.10)',// usePalette.jewels[2] ベース
};

// ─── グラフ仕切り ────────────────────────────────────────────────
export const chartSeparator = 'rgba(255, 255, 255, 0.85)';

// ─── ユーティリティ: HSL補間でN段階プールトーン生成 ────────────────
export function generatePoolTones(count: number): string[] {
  const hue = 210, sat = 40, lMin = 25, lMax = 85;
  return Array.from({ length: count }, (_, i) => {
    const l = lMin + (lMax - lMin) * (i / Math.max(count - 1, 1));
    return `hsl(${hue}, ${sat}%, ${l}%)`;
  });
}

function simpleHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// ─── ユーティリティ: 金額降順でプール口座に色を割り当て ─────────────
export function assignPoolColors(
  accounts: { id: string; amount: number }[]
): Map<string, string> {
  const sorted = [...accounts].sort((a, b) => b.amount - a.amount);
  const tones =
    sorted.length <= poolPalette.tones.length
      ? poolPalette.tones.slice(0, sorted.length)
      : generatePoolTones(sorted.length);
  const result = new Map<string, string>();
  sorted.forEach((account, i) => result.set(account.id, tones[i]));
  return result;
}

// ─── ユーティリティ: 作成順で使いみちに色を割り当て ─────────────────
export function assignUseColors(
  purposes: { id: string; isSurplus?: boolean }[]
): Map<string, string> {
  const result = new Map<string, string>();
  let jewelIndex = 0;
  for (const p of purposes) {
    if (p.isSurplus) {
      result.set(p.id, usePalette.neutral);
    } else {
      result.set(p.id, usePalette.jewels[jewelIndex % usePalette.jewels.length]);
      jewelIndex++;
    }
  }
  return result;
}

// ─── ユーティリティ: IDハッシュで使いみちに色を割り当て（並び順不変）
export function assignUseColorsByHash(
  purposes: { id: string; isSurplus?: boolean }[]
): Map<string, string> {
  const result = new Map<string, string>();
  for (const p of purposes) {
    if (p.isSurplus) {
      result.set(p.id, usePalette.neutral);
      continue;
    }
    result.set(p.id, usePalette.jewels[simpleHash(p.id) % usePalette.jewels.length]);
  }
  return result;
}
