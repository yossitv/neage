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

  const currentTimeRef = useRef(currentTime)
  currentTimeRef.current = currentTime

  /** 次の有効な（romaji非空の）歌詞インデックスを返す */
  const findNextValid = useCallback(
    (fromIndex: number): number => {
      for (let i = fromIndex + 1; i < lyrics.length; i++) {
        if (lyrics[i].romaji.trim().length > 0) return i
      }
      return fromIndex // no more valid lines
    },
    [lyrics]
  )

  // 再生時間に連動して currentIndex を自動更新
  // ただし、入力完了で先に進んでいる場合はそれを尊重する
  useEffect(() => {
    if (currentTime === undefined || lyrics.length === 0) return

    const timeIndex = lyrics.findIndex(
      (l) => currentTime >= l.startTime && currentTime < l.endTime && l.romaji.trim().length > 0
    )
    if (timeIndex === -1) return

    setState((s) => {
      // 入力完了で既に先の行にいる場合（待機中）、時間がその行に追いついたらcharIndexをリセット
      if (s.currentIndex === timeIndex && s.charIndex === 0) return s
      if (s.currentIndex === timeIndex) return s
      // 時間が現在行より先に進んだ場合のみ更新
      if (timeIndex <= s.currentIndex) return s
      const scored =
        s.wordChars > 0
          ? { ...s, score: s.score + Math.round(s.wordChars * hypeRef.current), wordChars: 0 }
          : s
      return { ...scored, currentIndex: timeIndex, charIndex: 0 }
    })
  }, [currentTime, lyrics])

  const completeWord = useCallback((s: TypingState): TypingState => {
    if (s.wordChars === 0) return s
    return {
      ...s,
      score: s.score + Math.round(s.wordChars * hypeRef.current),
      wordChars: 0,
    }
  }, [])

  const advanceLine = useCallback(
    (s: TypingState): TypingState => {
      const scored = completeWord(s)
      const nextIdx = findNextValid(scored.currentIndex)
      if (nextIdx === scored.currentIndex) return scored // no more lines
      return { ...scored, currentIndex: nextIdx, charIndex: 0 }
    },
    [completeWord, findNextValid]
  )

  const skipSpaces = useCallback(
    (s: TypingState): TypingState => {
      const romaji = lyrics[s.currentIndex]?.romaji ?? ""
      let ci = s.charIndex
      while (ci < romaji.length && romaji[ci] === " ") ci++
      if (ci >= romaji.length) {
        // Line complete → advance immediately to next line
        return advanceLine({ ...s, charIndex: ci })
      }
      return { ...s, charIndex: ci }
    },
    [lyrics, advanceLine]
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

  // Current line is "active" (typeable) 0.1s before startTime
  const currentLyric = lyrics[state.currentIndex]
  const ACTIVE_OFFSET = 0.2
  const active =
    currentTime !== undefined && currentLyric
      ? currentTime >= currentLyric.startTime - ACTIVE_OFFSET
      : true

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.length !== 1 || e.metaKey || e.ctrlKey || e.altKey) return

      // Block input if current line hasn't started yet (with 0.1s offset)
      const ct = currentTimeRef.current
      const s = stateRef.current
      const lyric = lyrics[s.currentIndex]
      if (ct !== undefined && lyric && ct < lyric.startTime - ACTIVE_OFFSET) return

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
          if (isEnd) {
            // Line complete → advance to next line immediately
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
  }, [lyrics, completeWord, advanceLine, skipSpaces])

  return { ...state, active, passCurrentWord }
}
