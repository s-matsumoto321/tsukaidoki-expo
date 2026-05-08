# ツカイドキ タイポグラフィシステム実装指示書

## 0. 設計思想

ツカイドキのタイポグラフィは **2書体 × 役割分担** で設計する。

```
┌─────────────────────────────────────────────┐
│  数字・英字 → Manrope                       │
│  「お金の数字を、人生の物語の一節に」        │
├─────────────────────────────────────────────┤
│  日本語     → Noto Sans JP                  │
│  「読みやすく、温度のある本文」              │
└─────────────────────────────────────────────┘
```

**書体選定の理由（後から触る人向け）：**

- **Manrope** は数字に独特の品格を持つサンセリフ。`7` `4` `2` の幾何学的処理が美しく、お金の話としての説得力がある。Variable Font なので weight を細かく調整可能。日本のファイナンスアプリでまだ採用例が少なくオリジナリティを確保できる。
- **Noto Sans JP** は本文・UI に使う。可読性が高く、Manrope と並んでも違和感がない。
- セリフ書体（Fraunces, Newsreader 等）は当初検討したが、日本のファイナンスアプリの文脈で違和感が強いため不採用。

---

## 1. フォントのロード

### 1.1 React Native（Expo）の場合

`expo-font` を使い、Variable Font として Manrope を読み込む。

```ts
import * as Font from 'expo-font';

await Font.loadAsync({
  // Manrope Variable Font（推奨：weight 200〜800 を1ファイルで対応）
  'Manrope': require('./assets/fonts/Manrope-VariableFont_wght.ttf'),

  // Noto Sans JP は weight ごとに読み込む
  'NotoSansJP-Regular': require('./assets/fonts/NotoSansJP-Regular.ttf'),
  'NotoSansJP-Medium': require('./assets/fonts/NotoSansJP-Medium.ttf'),
  'NotoSansJP-Bold': require('./assets/fonts/NotoSansJP-Bold.ttf'),
});
```

フォントファイル取得元：
- Manrope: https://fonts.google.com/specimen/Manrope
- Noto Sans JP: https://fonts.google.com/noto/specimen/Noto+Sans+JP

**Variable Font が動かない環境向けフォールバック：**
React Native の一部バージョンで Variable Font の任意ウェイト（550 など）がサポートされない場合は、Static Font を複数ロードする：

```ts
'Manrope-Regular': require('./assets/fonts/Manrope-Regular.ttf'),    // 400
'Manrope-Medium': require('./assets/fonts/Manrope-Medium.ttf'),      // 500
'Manrope-SemiBold': require('./assets/fonts/Manrope-SemiBold.ttf'),  // 600
```

この場合、550 は使えないので 500 または 600 で代替する（推奨：500）。

### 1.2 起動時の待機

フォントロード完了までは Splash Screen を表示する：

```ts
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

useEffect(() => {
  async function prepare() {
    await Font.loadAsync({ ... });
    await SplashScreen.hideAsync();
  }
  prepare();
}, []);
```

これをやらないと、ロード前に Manrope の代替フォント（System Font）で一瞬レンダリングされて、ロード後に Manrope に切り替わる「フォントフラッシュ」が起きる。

---

## 2. タイポグラフィトークン

```ts
// src/theme/typography.ts

export const fonts = {
  // 数字・英字用
  number: 'Manrope',

  // 日本語・本文用
  body: {
    regular: 'NotoSansJP-Regular',
    medium: 'NotoSansJP-Medium',
    bold: 'NotoSansJP-Bold',
  },
};

export const fontSizes = {
  // ヒーロー（最大金額表示）
  amountHero: 38,

  // セカンダリ金額（円グラフ中央、カード内金額）
  amountMedium: 19,

  // 通常金額（リスト内、サブ表示）
  amountSmall: 14,

  // 通貨記号（¥）— 金額より一回り小さく
  currencyHero: 26,
  currencyMedium: 13,

  // ページタイトル（Large Title）
  pageTitle: 32,

  // 見出し
  heading: 16,

  // 本文
  body: 14,

  // 補助テキスト・ラベル
  caption: 12,

  // メタ情報・最小ラベル
  micro: 10,
};

export const fontWeights = {
  // 本文用（Noto Sans JP）
  regular: '400',
  medium: '500',
  bold: '700',

  // 数字用（Manrope）— Variable Font の場合は数値で細かく指定可能
  numberLight: 400,
  numberRegular: 500,
  numberSemi: 550,    // ★ ツカイドキの主役ウェイト
  numberMedium: 600,
  numberBold: 700,
};

export const lineHeights = {
  tight: 1,        // 金額表示（行間ゼロ感）
  snug: 1.2,       // 見出し
  normal: 1.5,     // 本文
  relaxed: 1.6,    // 長文・AIインサイト
};

export const letterSpacing = {
  tight: -0.02,    // 大きい金額（締まった印象）
  normal: 0,
  wide: 0.02,      // ラベル、セクションヘッダー
  wider: 0.05,     // 大文字風セクションヘッダー
};
```

---

## 3. 使い分けルール

### 3.1 数字 = Manrope

以下の場合は **常に Manrope** を使う：

- 金額（¥9,250,000、¥925万、¥3,000,000 など）
- パーセンテージ（56%、100%）
- 統計数値（5口座、37の夢、4プロジェクト）
- 期間表示（2026年、3ヶ月）

```tsx
<Text style={{
  fontFamily: 'Manrope',
  fontSize: fontSizes.amountHero,
  fontWeight: 550,
  letterSpacing: letterSpacing.tight,
}}>
  ¥9,250,000
</Text>
```

### 3.2 日本語 = Noto Sans JP

以下の場合は **常に Noto Sans JP** を使う：

- 見出し（「総資産」「プール金」「使いみち」）
- 本文（AIインサイトのメッセージなど）
- ボタンラベル（「タップで修正」「保存」）
- タブラベル（「ホーム」「シナリオ」）
- 補助テキスト（「どこにある」「何のために」）

### 3.3 混在テキストの扱い

「¥9,250,000」のように、**通貨記号と数字が連続する場合は両方 Manrope** で OK。
「5口座」のように、**数字と日本語が連続する場合は分割**して個別フォント指定：

```tsx
<View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
  <Text style={{ fontFamily: 'Manrope', fontSize: 14 }}>5</Text>
  <Text style={{ fontFamily: 'NotoSansJP-Regular', fontSize: 11 }}>口座</Text>
</View>
```

これにより、数字の品格を保ちつつ、日本語の可読性も確保できる。

---

## 4. 主要シーン別の組版指針

### 4.1 総資産ヒーロー金額

**最も重要な数字。アプリの主役。**

```tsx
// 例：¥9,250,000
<View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
  <Text style={{
    fontFamily: 'Manrope',
    fontSize: 26,             // 通貨記号は小さめ
    fontWeight: 500,           // 本体より細め
    color: textMid,            // 控えめな色
    marginRight: 2,
  }}>¥</Text>
  <Text style={{
    fontFamily: 'Manrope',
    fontSize: 38,              // ヒーローサイズ
    fontWeight: 550,           // ★ Manrope のスイートスポット
    letterSpacing: -0.02,      // 締まった印象
    lineHeight: 38,            // ぴったり（行間なし）
    color: text,
  }}>9,250,000</Text>
</View>
```

**ポイント：**
- `¥` は数字より一回り小さく、色も薄く（数字を主役にする）
- `letterSpacing: -0.02` で密に見せる
- `fontWeight: 550` がツカイドキの「**重すぎず、軽すぎず**」のスイートスポット
- 行間ゼロ（`lineHeight === fontSize`）で塊として見せる

### 4.2 円グラフ中央の金額

```tsx
// 例：¥925万
<Text style={{
  fontFamily: 'Manrope',
  fontSize: 19,
  fontWeight: 550,
  lineHeight: 19,
  color: text,
}}>
  ¥925
  <Text style={{
    fontSize: 11,
    fontWeight: 500,
    color: textMid,
  }}>万</Text>
</Text>
```

「万」だけ小さく、`textMid` 色で控えめに。数字を主役にする原則を維持。

### 4.3 ページタイトル（Large Title）

```tsx
<Text style={{
  fontFamily: 'NotoSansJP-Bold',
  fontSize: 32,
  fontWeight: '700',
  lineHeight: 32 * 1.1,
  letterSpacing: -0.01,
  color: text,
}}>
  使いみち
</Text>
```

**注意：** 当初の指示書では Large Title に Fraunces（セリフ）を使う案だったが、最終的にサンセリフ統一に変更。日本語の見出しも Noto Sans JP の Bold で十分な存在感が出る。

### 4.4 ボタン・タブラベル

```tsx
// 例：「ホーム」タブ
<Text style={{
  fontFamily: 'NotoSansJP-Medium',
  fontSize: 10,
  fontWeight: '600',
  letterSpacing: 0.02,
  color: tabActive ? sage : textLight,
}}>
  ホーム
</Text>
```

### 4.5 AIインサイト本文

```tsx
<Text style={{
  fontFamily: 'NotoSansJP-Regular',
  fontSize: 13,
  fontWeight: '400',
  lineHeight: 13 * 1.6,        // 長文は行間広め
  color: text,
}}>
  プール金が60万円多い状態です。新しい夢を追加できるかもしれません。
</Text>
```

**ポイント：** 長文は `lineHeight: 1.6` でゆったりと。読みやすさ最優先。

---

## 5. ウェイト（太さ）使い分け

### 5.1 Manrope（数字）

| ウェイト | 用途 |
|---|---|
| 400 (Regular) | 通常使わない。極細にしたい場合のみ |
| 500 (Medium) | 通貨記号 `¥`、補助的な数字 |
| **550** | **メイン。総資産・カード金額・円グラフ中央** |
| 600 (SemiBold) | 強調したい数字（達成率の100%など） |
| 700 (Bold) | 通常使わない。装飾的すぎる |

**550 を主役に据える理由：**
- 500 だと細くて軽く見え、「お金の重み」が出ない
- 600 だと太くて重い印象になり、ツカイドキの「静謐」「温度感」と合わない
- **550 が両者の中間で、品格と軽やかさのバランスが取れる**
- Variable Font だからこそ実現できる微調整

### 5.2 Noto Sans JP（日本語）

| ウェイト | 用途 |
|---|---|
| 400 (Regular) | 本文、長文、AIインサイト |
| 500 (Medium) | ボタンラベル、タブ、補助見出し |
| 700 (Bold) | ページタイトル、強調見出し、カードのタイトル |

**注意：** Noto Sans JP は 550 のような中間値が使えない（Variable Font 版もあるが、Web Font としては Static の方が安定）。素直に 400/500/700 で運用。

---

## 6. システム書体への安全なフォールバック

`fontFamily` 指定が失敗した場合のフォールバックを設定：

```ts
// React Native の場合
fontFamily: 'Manrope',  // → 失敗時はシステム書体（San Francisco / Roboto）

// Web の場合
fontFamily: "'Manrope', -apple-system, BlinkMacSystemFont, sans-serif",
```

**フォールバック書体の選定理由：**
- iOS の San Francisco（SF Pro）は Manrope と類似の品格を持つ
- Android の Roboto は若干違うが、可読性は確保される
- 純粋なシステムサンセリフへ落とすことで、見た目の崩れを最小化

---

## 7. アクセシビリティ

- 最小フォントサイズは `10px`（micro）まで。これより小さくしない
- ユーザーがシステム設定で文字サイズを大きくしている場合に対応するため、`allowFontScaling` を有効化（React Native の `<Text>` のデフォルト挙動）
- ただし、デザインが崩れやすい箇所（数字を中央配置している円グラフ中など）は `allowFontScaling={false}` で固定する選択肢もあり
- コントラスト比は最低 `4.5:1`（WCAG AA）を保つ。`textLight` (#A0A6A9) を本文に使わない

---

## 8. 実装チェックリスト

- [ ] Manrope (Variable) と Noto Sans JP (Regular/Medium/Bold) をプロジェクトに追加
- [ ] `expo-font` でフォントを起動時にロード
- [ ] Splash Screen をフォントロード完了まで表示
- [ ] `typography.ts` でトークンを定義
- [ ] ハードコードされた `fontFamily` を全て廃止
- [ ] 数字には Manrope、日本語には Noto Sans JP の使い分けを徹底
- [ ] 総資産ヒーローは Manrope 550 / 38px で実装
- [ ] 通貨記号 `¥` は数字本体より小さく、`textMid` 色で
- [ ] フォントフォールバックを設定
- [ ] アクセシビリティ：最小フォントサイズ 10px、コントラスト比 4.5:1 以上

---

## 9. なぜこの設計なのか（開発者向けメモ）

**なぜ数字と日本語で書体を分ける？**
日本語フォントに含まれる数字（半角・全角とも）は、本来「日本語のための数字」として設計されており、欧文書体の数字に比べて品格やリズムが弱い。Manrope のような専用書体を数字に使うことで、**「お金」「人生」というテーマにふさわしい数字の質感**を実現できる。

**なぜ Manrope なのか？**
他の候補（Plus Jakarta Sans, Outfit, Inter など）と比較した結果、Manrope は：
1. 数字が幾何学的で品格がある（特に `7` `4` `2`）
2. 温度感を完全には捨てていない（純粋な幾何学とは違う）
3. 日本のファイナンスアプリでまだ採用例が少なく、オリジナリティ確保
4. Variable Font で 550 のような微調整が可能

これらが揃った唯一の選択肢だった。

**なぜ 550 という中途半端なウェイト？**
これはツカイドキのトーン＆マナー「**静謐 × 温度感**」「**軽やか × 説得力**」を体現するウェイト。500 は軽すぎ、600 は重すぎ、550 が「ちょうどいい」というデザイン判断。Variable Font 時代だからこそ実現できる繊細な選択。

**なぜページタイトルを最終的にサンセリフに？**
当初は Fraunces（セリフ）でページタイトルを「物語的」にする案だったが、日本のファイナンスアプリの文脈ではセリフは違和感が強く、ユーザーの信頼を損なう懸念があった。Noto Sans JP Bold でも十分な存在感が出るため、**サンセリフで統一する方針に変更**。
