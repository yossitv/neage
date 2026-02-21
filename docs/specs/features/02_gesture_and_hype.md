# Gesture and Hype

## 更新履歴
- 2026-02-21: 初回作成

## 概要
MediaPipe Handsでプレイヤーの手上げジェスチャーを検出し、Hypeゲージ（スコア倍率）の管理と単語pass機能を実現する。

## 要件

### 機能要件
- [ ] Webカメラで手のランドマーク検出（MediaPipe Hands）
- [ ] 手を上げるジェスチャー判定（手首より上に指先がある＋一定高さ以上）
- [ ] 手上げ時: Hypeゲージ回復 + 単語passコールバック発火
- [ ] Hypeゲージの時間経過による自然減少
- [ ] 次の歌詞が来たら手上げ判定リセット（再度手を上げる必要あり）
- [ ] カメラアクセス拒否時のフォールバック（タイピングのみモード）

### 非機能要件
- [ ] ジェスチャー検出: 30fps以上
- [ ] モックモードで単体動作可能（カメラなしでもテスト可）

## 技術仕様

### 共通型（types.ts で定義済み）
GameState の `hype` フィールドを使用。

```typescript
/** ジェスチャー検出の状態 */
export type GestureState = {
  /** カメラが利用可能か */
  cameraAvailable: boolean
  /** 手が検出されているか */
  handDetected: boolean
  /** 手上げ判定中か */
  isRaised: boolean
  /** 現在の歌詞で手上げ済みか（リセットまでtrue） */
  hasRaisedForCurrent: boolean
}
```

### UI コンポーネント

**HypeGauge**: Hypeゲージ表示
- バー表示（0% ~ 300%）
- 色変化: 低(赤) → 中(黄) → 高(緑)
- 手上げ時にフラッシュエフェクト

**CameraPreview**: カメラプレビュー（小さく表示）
- 手のランドマークをオーバーレイ描画
- 手上げ検出時にインジケーター表示

### ロジック（hooks）

**useGesture(onPass)**: ジェスチャー検出のメインhook
- MediaPipe HandLandmarker初期化
- カメラストリーム取得
- フレームごとに手のランドマーク検出
- 手首(landmark[0])と中指先端(landmark[12])のy座標比較
- 手上げ判定: 中指先端が画面上部1/3以上
- 手上げ時: onPassコールバック呼び出し + hasRaisedForCurrent = true
- リセット: currentIndex変更時にhasRaisedForCurrent = false

**useHype()**: Hypeゲージ管理hook
- 初期値: 1.0
- 自然減少: 毎秒 -0.05
- 手上げ回復: +0.5（上限3.0）
- 最小値: 0.1（完全に0にはしない）

### ファイル構成
```
app/
├── components/
│   ├── HypeGauge.tsx                 ← Hypeゲージバー
│   └── CameraPreview.tsx            ← カメラプレビュー + ランドマーク描画

hooks/
├── useGesture.ts                    ← MediaPipe手上げ検出
└── useHype.ts                       ← Hypeゲージ管理
```

## 実装ステップ
1. `@mediapipe/tasks-vision` インストール
2. `hooks/useHype.ts` Hypeゲージ管理（純ロジック、先に実装可能）
3. `hooks/useGesture.ts` MediaPipe初期化 + 手上げ検出
4. `app/components/HypeGauge.tsx` ゲージUI
5. `app/components/CameraPreview.tsx` カメラプレビュー
6. モックデータでの動作確認

## テスト計画
- [ ] Hypeゲージが時間経過で減少する
- [ ] 手上げでHypeが+0.5回復する（上限3.0）
- [ ] 同じ歌詞行で2回手上げしても1回しかpass発動しない
- [ ] 次の行に進むとリセットされる
- [ ] カメラ拒否時にフォールバックモードになる
