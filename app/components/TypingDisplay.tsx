"use client"

import type { Lyric } from "@/app/types"

type Props = {
  lyrics: Lyric[]
  currentIndex: number
  charIndex: number
  active: boolean
  currentTime: number
}

export function TypingDisplay({ lyrics, currentIndex, charIndex, active, currentTime }: Props) {
  const current = lyrics[currentIndex]
  const next = lyrics[currentIndex + 1]
  const next2 = lyrics[currentIndex + 2]

  if (!current) return null

  const typed = current.romaji.slice(0, charIndex)
  const remaining = current.romaji.slice(charIndex)

  // 経過割合: 0(開始) → 1(終了)
  const duration = current.endTime - current.startTime
  const progress = active && duration > 0
    ? Math.min(1, Math.max(0, (currentTime - current.startTime) / duration))
    : 0
  const pct = Math.round(progress * 100)

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

      <div className="text-center">
        <p className={`text-2xl text-gray-300 mb-1 transition-opacity duration-300 ${active ? "opacity-100" : "opacity-[0.3]"}`}>{current.text}</p>
        <p className="text-4xl font-mono tracking-wider relative text-left">
          {/* waiting時の薄い文字（下レイヤー） */}
          <span className={`transition-opacity duration-300 ${active ? "opacity-0" : "opacity-30"}`}>{current.romaji}</span>
          {/* 入力済み（緑）: マスクなし、常に100% */}
          <span
            className="absolute inset-0 transition-[clip-path] duration-500 ease-out"
            style={{ clipPath: active ? "inset(0 0 0 0)" : "inset(0 100% 0 0)" }}
          >
            <span className="text-green-400">{typed}</span>
          </span>
          {/* 未入力（白）: 時間経過で左→右へ薄くなる */}
          <span
            className="absolute inset-0 transition-[clip-path] duration-500 ease-out"
            style={{
              clipPath: active ? "inset(0 0 0 0)" : "inset(0 100% 0 0)",
              maskImage: active
                ? `linear-gradient(to right, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.3) ${pct}%, rgba(0,0,0,1) ${pct}%, rgba(0,0,0,1) 100%)`
                : undefined,
              WebkitMaskImage: active
                ? `linear-gradient(to right, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.3) ${pct}%, rgba(0,0,0,1) ${pct}%, rgba(0,0,0,1) 100%)`
                : undefined,
            }}
          >
            <span className="invisible">{typed}</span>
            <span className="text-white">{remaining}</span>
          </span>
        </p>
      </div>
    </div>
  )
}
