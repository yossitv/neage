"use client"

import { useState } from "react"
import { useTypingEngine } from "@/hooks/useTypingEngine"
import { TypingDisplay } from "@/app/components/TypingDisplay"
import { ScoreDisplay } from "@/app/components/ScoreDisplay"
import { MOCK_LYRICS } from "@/app/mock"

export default function Home() {
  const [hype] = useState(1.0)
  const { currentIndex, charIndex, score, correctCount, totalCount } =
    useTypingEngine(MOCK_LYRICS, hype)

  const lastLyric = MOCK_LYRICS[MOCK_LYRICS.length - 1]
  const isFinished =
    currentIndex >= MOCK_LYRICS.length - 1 &&
    charIndex >= (lastLyric?.romaji.length ?? 0)

  return (
    <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-3xl font-bold">音上げ - Typing Engine Demo</h1>

      <ScoreDisplay
        score={score}
        correctCount={correctCount}
        totalCount={totalCount}
        hype={hype}
      />

      {isFinished ? (
        <div className="text-center">
          <p className="text-4xl text-green-400 mb-4">Complete!</p>
          <p className="text-xl">Final Score: {score}</p>
          <p className="text-gray-400">
            Accuracy:{" "}
            {totalCount > 0
              ? Math.round((correctCount / totalCount) * 100)
              : 100}
            %
          </p>
        </div>
      ) : (
        <TypingDisplay
          lyrics={MOCK_LYRICS}
          currentIndex={currentIndex}
          charIndex={charIndex}
        />
      )}

      <p className="text-gray-500 text-sm mt-8">
        Type the romaji to match the lyrics above
      </p>
    </main>
  )
}
