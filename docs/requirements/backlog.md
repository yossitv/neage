# Implementation Backlog

> This file is managed by `/plan-tasks`.
> Tasks are ordered by priority and dependencies.

Last updated: 2026-02-21

---

## High Priority (Next Up)

### Epic: コアゲームプレイ
Related: docs/requirements/roadmap.md - Phase 1

#### 1. typing-engine
- [ ] **Status:** Ready to start
- **Goal:** プレイヤーがローマ字でタイピングし、リアルタイムに正誤判定・スコア加算される
- **Estimated:** 40min
- **Dependencies:** None
- **Scope:**
  - UI: タイピング入力エリア、歌詞表示（現在行ハイライト）、正誤フィードバック
  - Logic: ローマ字照合エンジン、スコア加算、スペース圧縮処理
  - Data: 共通型定義（Lyric, GameState）
- **Success Criteria:**
  - [ ] モック歌詞データに対してローマ字タイピングで正誤判定ができる
  - [ ] 正しい入力でスコアが加算される
  - [ ] 共通型（Lyric型）が定義されている
- **並列可:** gesture-and-hype と同時開発可能（独立したロジック）
- **Next Command:** `/new-feature` → Enter: "typing-engine"

#### 2. gesture-and-hype
- [ ] **Status:** Ready to start
- **Goal:** MediaPipeで手上げジェスチャーを検出し、Hypeゲージ管理と単語passを実現する
- **Estimated:** 40min
- **Dependencies:** None
- **Scope:**
  - UI: Hypeゲージバー、カメラプレビュー（小）、手上げインジケーター
  - Logic: MediaPipe Hands初期化、手の高さ判定、Hype自然減少/回復、単語passトリガー
  - External: @mediapipe/tasks-vision
- **Success Criteria:**
  - [ ] Webカメラで手のランドマークが検出される
  - [ ] 手を上げるとHypeゲージが回復する
  - [ ] Hypeゲージが時間経過で自然減少する
  - [ ] 手上げで単語pass関数が呼ばれる
  - [ ] カメラ拒否時にタイピングのみモードにフォールバックする
- **並列可:** typing-engine と同時開発可能（独立したロジック）
- **Next Command:** `/new-feature` → Enter: "gesture-and-hype"

#### 3. game-screen-integration
- [ ] **Status:** Blocked by #1, #2
- **Goal:** /play/[id]画面でYouTube再生・字幕表示・タイピング・ジェスチャーを統合し、遊べる状態にする
- **Estimated:** 40min
- **Dependencies:** Task #1 (typing-engine), Task #2 (gesture-and-hype)
- **Scope:**
  - UI: /play/[videoId]ページレイアウト（YouTube埋め込み + 歌詞 + タイピング + Hype + スコア）
  - Logic: YouTube IFrame Player APIとの再生時間同期、歌詞タイミング制御、全コンポーネント結合
  - External: YouTube IFrame Player API
- **Success Criteria:**
  - [ ] YouTube動画が再生される
  - [ ] 再生時間に連動して歌詞が表示される
  - [ ] タイピングとジェスチャーが同時に動作する
  - [ ] スコアがリアルタイムで更新される
- **Next Command:** `/new-feature` → Enter: "game-screen-integration"

---

## Medium Priority (After Core)

### Epic: ゲーム基盤
Related: docs/requirements/roadmap.md - Phase 1

#### 4. project-setup-and-url-input
- [ ] **Status:** Blocked by #3
- **Goal:** /playページでYouTube URLを入力し、ゲーム画面に遷移できる
- **Estimated:** 20min
- **Dependencies:** Task #3 (統合画面が存在すること)
- **Scope:**
  - UI: /playページ（URL入力フォーム、バリデーション、エラー表示）
  - Logic: URL→videoId抽出、/play/[id]へのルーティング
- **Success Criteria:**
  - [ ] YouTube URLを入力して/play/[videoId]に遷移できる
  - [ ] 無効なURLでエラーメッセージが表示される
- **Next Command:** `/new-feature` → Enter: "project-setup-and-url-input"

#### 5. caption-fetch-and-gemini-parse
- [ ] **Status:** Blocked by #3
- **Goal:** YouTube字幕を自動取得し、Gemini APIで解析・ローマ字変換してゲームで使えるデータにする
- **Estimated:** 30min
- **Dependencies:** Task #3 (統合画面でモックデータの代わりに実データを流す)
- **Scope:**
  - API: GET /api/captions?v={videoId}
  - Logic: YouTube字幕取得（youtube-captions-scraper等）、Gemini APIで字幕解析（クリーニング + 単語分割 + ローマ字変換）
  - External: YouTube字幕API, Google Gemini API
- **Success Criteria:**
  - [ ] videoIdから字幕データが取得できる
  - [ ] Gemini APIで字幕がローマ字変換される
  - [ ] 共通型（Lyric型）に沿ったデータが返却される
  - [ ] 字幕がない動画でエラーメッセージが返る
- **並列可:** project-setup-and-url-input と同時開発可能
- **Next Command:** `/new-feature` → Enter: "caption-fetch-and-gemini-parse"

---

## Low Priority (Polish)

### Epic: UI/画面
Related: docs/requirements/roadmap.md - Phase 1

#### 6. result-screen
- [ ] **Status:** Blocked by #3
- **Goal:** ゲーム終了後にスコアと成績を表示し、リプレイ/曲選択ができる
- **Estimated:** 10min
- **Dependencies:** Task #3 (ゲーム終了イベントが必要)
- **Scope:**
  - UI: 結果画面（最終スコア、タイピング精度、リプレイボタン、/playへ戻るボタン）
  - Logic: ゲーム終了検知、スコア集計
- **Success Criteria:**
  - [ ] 動画終了後に結果画面が表示される
  - [ ] スコアとタイピング精度が正しく表示される
  - [ ] リプレイ/曲選択ボタンが機能する
- **Next Command:** `/new-feature` → Enter: "result-screen"

---

## Completed

(none yet)

---

## Dependency Graph

```
#1 typing-engine ──────┐
  (並列可)              ├──→ #3 game-screen-integration ──→ #4 url-input
#2 gesture-and-hype ───┘          │                         #5 caption-gemini (並列可)
                                  └──→ #6 result-screen
```

## API Routes

```api
GET  /play                     → URL入力ページ
GET  /play/[videoId]           → ゲームプレイページ
GET  /api/captions?v={videoId} → 字幕データ取得API（Gemini解析付き）
```
