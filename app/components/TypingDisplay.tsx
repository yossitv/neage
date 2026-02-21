"use client"

import type { Lyric } from "@/app/types"

type Props = {
  lyrics: Lyric[]
  currentIndex: number
  charIndex: number
  active: boolean
}

export function TypingDisplay({ lyrics, currentIndex, charIndex, active }: Props) {
  const current = lyrics[currentIndex]
  const next = lyrics[currentIndex + 1]
  const next2 = lyrics[currentIndex + 2]

  if (!current) return null

  const typed = current.romaji.slice(0, charIndex)
  const remaining = current.romaji.slice(charIndex)

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      {next2 && (
        <div className="text-center opacity-30">
          <p className="text-base text-gray-500">{next2.text}</p>
          <p className="text-xs font-mono text-gray-600">{next2.romaji}</p>
        </div>
      )}

      {next && (
        <div className="text-center opacity-50">
          <p className="text-lg text-gray-400">{next.text}</p>
          <p className="text-sm font-mono text-gray-500">{next.romaji}</p>
        </div>
      )}

      {/* 現在行: active=100%, waiting=80% */}
      <div className={`text-center transition-opacity duration-300 ${active ? "opacity-100" : "opacity-[0.3]"}`}>
        <p className="text-2xl text-gray-300 mb-1">{current.text}</p>
        <p className="text-4xl font-mono tracking-wider">
          <span className="text-green-400">{typed}</span>
          <span className="text-white">{remaining}</span>
        </p>
      </div>
    </div>
  )
}
