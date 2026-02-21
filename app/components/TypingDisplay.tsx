"use client"

import type { Lyric } from "@/app/types"

type Props = {
  lyrics: Lyric[]
  currentIndex: number
  charIndex: number
}

export function TypingDisplay({ lyrics, currentIndex, charIndex }: Props) {
  const current = lyrics[currentIndex]
  const next = lyrics[currentIndex + 1]

  if (!current) return null

  const romaji = current.romaji
  const typed = romaji.slice(0, charIndex)
  const remaining = romaji.slice(charIndex)

  return (
    <div className="flex flex-col items-center gap-4">
      {/* 元テキスト（日本語） */}
      <p className="text-2xl text-gray-300">{current.text}</p>

      {/* ローマ字 タイピングエリア */}
      <p className="text-4xl font-mono tracking-wider">
        <span className="text-green-400">{typed}</span>
        <span className="text-white">{remaining}</span>
      </p>

      {/* 次の行プレビュー */}
      {next && (
        <p className="text-lg text-gray-500 mt-2">{next.text}</p>
      )}
    </div>
  )
}
