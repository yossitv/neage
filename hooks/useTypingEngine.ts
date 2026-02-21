"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { Lyric } from "@/app/types"

type TypingState = {
  currentIndex: number
  charIndex: number
  score: number
  correctCount: number
  totalCount: number
  /** 現在の単語内で入力済みの文字数（スコア計算用） */
  wordChars: number
}

export function useTypingEngine(lyrics: Lyric[], hype: number) {
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

  /** 単語完了時のスコア加算: 単語文字数 × Hype倍率 */
  const completeWord = useCallback((s: TypingState): TypingState => {
    if (s.wordChars === 0) return s
    return {
      ...s,
      score: s.score + Math.round(s.wordChars * hypeRef.current),
      wordChars: 0,
    }
  }, [])

  /** 次の行に進む */
  const advanceLine = useCallback(
    (s: TypingState): TypingState => {
      const scored = completeWord(s)
      if (scored.currentIndex >= lyrics.length - 1) return scored
      return { ...scored, currentIndex: scored.currentIndex + 1, charIndex: 0 }
    },
    [lyrics.length, completeWord]
  )

  /** 現在位置からスペースをスキップ */
  const skipSpaces = useCallback(
    (s: TypingState): TypingState => {
      const romaji = lyrics[s.currentIndex]?.romaji ?? ""
      let ci = s.charIndex
      while (ci < romaji.length && romaji[ci] === " ") ci++
      if (ci >= romaji.length) return advanceLine({ ...s, charIndex: ci })
      return { ...s, charIndex: ci }
    },
    [lyrics, advanceLine]
  )

  /** 現在の行の単語passを外部から呼べるようにする */
  const passCurrentWord = useCallback(() => {
    setState((s) => {
      const romaji = lyrics[s.currentIndex]?.romaji ?? ""
      // 次のスペースか行末まで飛ばす
      let ci = s.charIndex
      while (ci < romaji.length && romaji[ci] !== " ") ci++
      const updated = { ...s, charIndex: ci, wordChars: 0 }
      return skipSpaces(updated)
    })
  }, [lyrics, skipSpaces])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // 単一文字キーのみ処理
      if (e.key.length !== 1 || e.metaKey || e.ctrlKey || e.altKey) return

      setState((s) => {
        const romaji = lyrics[s.currentIndex]?.romaji
        if (!romaji || s.charIndex >= romaji.length) return s

        const expected = romaji[s.charIndex]
        if (e.key.toLowerCase() === expected.toLowerCase()) {
          // 正解
          const newCharIndex = s.charIndex + 1
          const isSpace = newCharIndex < romaji.length && romaji[newCharIndex] === " "
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
          if (isEnd) {
            next = advanceLine(next)
          } else if (isSpace) {
            next = skipSpaces(next)
          }
          return next
        } else {
          // 不正解
          return { ...s, totalCount: s.totalCount + 1 }
        }
      })
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [lyrics, completeWord, advanceLine, skipSpaces])

  return { ...state, passCurrentWord }
}
