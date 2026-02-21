/** YouTube字幕APIから取得した生データ */
export type RawCaption = {
  start: string
  dur: string
  text: string
}

/** Gemini APIでローマ字変換後の1行歌詞 */
export type Lyric = {
  text: string
  romaji: string
  startTime: number
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

/** ジェスチャー検出の状態 */
export type GestureState = {
  cameraAvailable: boolean
  handDetected: boolean
  isRaised: boolean
  hasRaisedForCurrent: boolean
}
