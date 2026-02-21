"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { Lyric } from "@/app/types"

type TypingState = {
  currentIndex: number
  charIndex: number
  score: number
  correctCount: number
  totalCount: number
  wordChars: number
}

/**
 * @param lyrics - 歌詞配列
 * @param hype - 現在のHype倍率
 * @param currentTime - YouTube動画の再生時間（秒）。渡すと再生時間に連動して行が自動切替される
 */
export function useTypingEngine(
  lyrics: Lyric[],
  hype: number,
  currentTime?: number
) {
  const [state, setState] = useState<TypingState>({
    currentIndex: 0,
    charIndex: 0,
    score: 0,
    correctCount: 0,
    totalCount: 0,
    wordChars: 0,
  })
  const stateRef = useRef(state)
  stateRef.current = state

  const hypeRef = useRef(hype)
  hypeRef.current = hype

  // 再生時間に連動して currentIndex を自動更新
  useEffect(() => {
    if (currentTime === undefined || lyrics.length === 0) return

    // 現在時刻に該当する歌詞行を探す
    const timeIndex = lyrics.findIndex(
      (l) => currentTime >= l.startTime && currentTime < l.endTime
    )
    if (timeIndex === -1) return

    setState((s) => {
      // 同じ行なら何もしない
      if (s.currentIndex === timeIndex) return s
      // 時間で行が進んだ場合、未完了の単語をスコア計算してリセット
      const scored =
        s.wordChars > 0
          ? {
              ...s,
              score: s.score + Math.round(s.wordChars * hypeRef.current),
              wordChars: 0,
            }
          : s
      return { ...scored, currentIndex: timeIndex, charIndex: 0 }
    })
  }, [currentTime, lyrics])

  /** 単語完了時のスコア加算: 単語文字数 × Hype倍率 */
  const completeWord = useCallback((s: TypingState): TypingState => {
    if (s.wordChars === 0) return s
    return {
      ...s,
      score: s.score + Math.round(s.wordChars * hypeRef.current),
      wordChars: 0,
    }
  }, [])

  /** 次の行に進む（手動モード用。時間連動時は自動で切り替わる） */
  const advanceLine = useCallback(
    (s: TypingState): TypingState => {
      const scored = completeWord(s)
      if (scored.currentIndex >= lyrics.length - 1) return scored
      return { ...scored, currentIndex: scored.currentIndex + 1, charIndex: 0 }
    },
    [lyrics.length, completeWord]
  )

  const skipSpaces = useCallback(
    (s: TypingState): TypingState => {
      const romaji = lyrics[s.currentIndex]?.romaji ?? ""
      let ci = s.charIndex
      while (ci < romaji.length && romaji[ci] === " ") ci++
      // 時間連動モードでは行末でも自動進行しない（時間で進む）
      if (ci >= romaji.length && currentTime === undefined) {
        return advanceLine({ ...s, charIndex: ci })
      }
      return { ...s, charIndex: ci }
    },
    [lyrics, advanceLine, currentTime]
  )

  const passCurrentWord = useCallback(() => {
    setState((s) => {
      const romaji = lyrics[s.currentIndex]?.romaji ?? ""
      let ci = s.charIndex
      while (ci < romaji.length && romaji[ci] !== " ") ci++
      const updated = { ...s, charIndex: ci, wordChars: 0 }
      return skipSpaces(updated)
    })
  }, [lyrics, skipSpaces])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.length !== 1 || e.metaKey || e.ctrlKey || e.altKey) return

      setState((s) => {
        const romaji = lyrics[s.currentIndex]?.romaji
        if (!romaji || s.charIndex >= romaji.length) return s

        const expected = romaji[s.charIndex]
        if (e.key.toLowerCase() === expected.toLowerCase()) {
          const newCharIndex = s.charIndex + 1
          const isSpace =
            newCharIndex < romaji.length && romaji[newCharIndex] === " "
          const isEnd = newCharIndex >= romaji.length

          let next: TypingState = {
            ...s,
            charIndex: newCharIndex,
            correctCount: s.correctCount + 1,
            totalCount: s.totalCount + 1,
            wordChars: s.wordChars + 1,
          }

          if (isSpace || isEnd) {
            next = completeWord(next)
          }
          // 時間連動モードでは行末で自動進行しない
          if (isEnd && currentTime === undefined) {
            next = advanceLine(next)
          } else if (isSpace) {
            next = skipSpaces(next)
          }
          return next
        } else {
          return { ...s, totalCount: s.totalCount + 1 }
        }
      })
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [lyrics, completeWord, advanceLine, skipSpaces, currentTime])

  return { ...state, passCurrentWord }
}
