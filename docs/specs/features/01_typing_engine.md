# Typing Engine

## 更新履歴
- 2026-02-21: 初回作成

## 概要
YouTube動画の歌詞（ローマ字変換済み）に対して、プレイヤーのキー入力をリアルタイムに照合し、正誤判定・スコア加算を行うタイピング判定エンジン。

## 要件

### 機能要件
- [ ] ローマ字変換済み歌詞データに対するキー入力照合
- [ ] 1文字ごとのリアルタイム正誤判定（正: 緑、誤: 赤）
- [ ] スペース圧縮（連続スペースを無視）
- [ ] スコア加算（単語完了時: スコア += 単語文字数 × Hype倍率）
- [ ] 現在の歌詞行ハイライト表示
- [ ] 次の歌詞行のプレビュー表示

### 非機能要件
- [ ] キー入力遅延: 16ms以下（60fps相当）
- [ ] モックデータで単体動作可能

## 技術仕様

### 共通型定義（types.ts）

他のStory（gesture-and-hype, game-screen-integration）との共通インターフェース。

YouTube字幕APIの実データ構造（`youtube-captions-scraper`）:
```typescript
// youtube-captions-scraper の返却値
{ start: string, dur: string, text: string }
// start: "1.23" (開始秒, string)
// dur: "2.45" (表示時間, string)
// text: "歌詞テキスト"
```

アプリ内で使う型:
```typescript
/** YouTube字幕APIから取得した生データ */
export type RawCaption = {
  start: string
  dur: string
  text: string
}

/** Gemini APIでローマ字変換後の1行歌詞 */
export type Lyric = {
  /** 元テキスト（日本語） */
  text: string
  /** ローマ字変換済み（タイピング対象） */
  romaji: string
  /** 開始時間（秒） */
  startTime: number
  /** 終了時間（秒） = startTime + dur */
  endTime: number
}

/** ゲーム全体の状態 */
export type GameState = {
  lyrics: Lyric[]
  currentIndex: number
  charIndex: number
  score: number
  hype: number
  correctCount: number
  totalCount: number
  phase: "ready" | "playing" | "finished"
}
```

### UI コンポーネント

**TypingDisplay**: 歌詞表示 + タイピング入力フィードバック
- 現在行: ローマ字表示、入力済み文字を緑/赤でハイライト
- 次の行: 薄く表示（プレビュー）
- 元テキスト（日本語）も小さく表示

**ScoreDisplay**: スコア + 精度表示
- 現在スコア
- タイピング精度（correctCount / totalCount）

### ロジック（hooks）

**useTypingEngine(lyrics, hype)**: タイピング判定のメインhook
- keydownイベントリスナー
- 現在の文字と入力キーを照合
- 正解: charIndex++, correctCount++
- 単語完了時（スペースor行末到達）: score += 単語文字数 × hype倍率
- 不正解: totalCount++のみ（進まない）
- 行末到達: currentIndex++, charIndex = 0
- スペース圧縮: romaji内の連続スペースをスキップ

### ファイル構成
```
app/
├── types.ts                          ← 共通型定義
├── play/
│   └── [videoId]/
│       └── page.tsx                  ← [TODO: game-screen-integrationで作成]
└── components/
    ├── TypingDisplay.tsx             ← 歌詞表示 + 入力フィードバック
    └── ScoreDisplay.tsx              ← スコア表示

hooks/
└── useTypingEngine.ts                ← タイピング判定ロジック
```

## 実装ステップ
1. Next.jsプロジェクト初期化（`npx create-next-app`）+ Tailwind設定
2. `app/types.ts` に共通型定義
3. `hooks/useTypingEngine.ts` にタイピング判定ロジック実装
4. `app/components/TypingDisplay.tsx` 歌詞表示コンポーネント
5. `app/components/ScoreDisplay.tsx` スコア表示コンポーネント
6. モックデータでの動作確認用ページ作成

## テスト計画
- [ ] モック歌詞データで正しい文字入力 → スコア加算確認
- [ ] 不正解入力 → 進まない確認
- [ ] 行末到達 → 次の行に進む確認
- [ ] スペース圧縮が正しく動作する確認

## モックデータ
```typescript
const MOCK_LYRICS: Lyric[] = [
  { text: "きらきらひかる", romaji: "kirakira hikaru", startTime: 0, endTime: 3 },
  { text: "おそらのほしよ", romaji: "osora no hoshi yo", startTime: 3, endTime: 6 },
  { text: "まばたきしては", romaji: "mabataki shite wa", startTime: 6, endTime: 9 },
  { text: "みんなをみてる", romaji: "minna wo miteru", startTime: 9, endTime: 12 },
]
```
