"use client"

import { use, useState } from "react"
import { useYouTubePlayer } from "@/hooks/useYouTubePlayer"
import { useTypingEngine } from "@/hooks/useTypingEngine"
import { TypingDisplay } from "@/app/components/TypingDisplay"
import { ScoreDisplay } from "@/app/components/ScoreDisplay"
import { MOCK_LYRICS } from "@/app/mock"

type Props = {
  params: Promise<{ videoId: string }>
}

export default function PlayPage({ params }: Props) {
  const { videoId } = use(params)
  const [hype] = useState(1.0) // TODO: useHype() に差し替え

  const [speed, setSpeed] = useState(1.0)
  const { ready, playing, currentTime, ended, play, setPlaybackRate } =
    useYouTubePlayer(videoId, "yt-player")

  const changeSpeed = (rate: number) => {
    setSpeed(rate)
    setPlaybackRate(rate)
  }

  const { currentIndex, charIndex, score, correctCount, totalCount } =
    useTypingEngine(MOCK_LYRICS, hype, playing ? currentTime : undefined)

  // 現在時間に該当する歌詞がない場合（歌詞の隙間）
  const currentLyric = MOCK_LYRICS[currentIndex]
  const isInGap =
    currentLyric &&
    (currentTime < currentLyric.startTime || currentTime >= currentLyric.endTime)

  return (
    <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center gap-6 p-6">
      {/* YouTube Player */}
      <div className="w-full max-w-2xl aspect-video bg-black rounded-lg overflow-hidden">
        <div id="yt-player" className="w-full h-full" />
      </div>

      {/* Score */}
      <ScoreDisplay
        score={score}
        correctCount={correctCount}
        totalCount={totalCount}
        hype={hype}
      />

      {/* Typing Area */}
      <div className="w-full max-w-2xl min-h-[160px] flex items-center justify-center">
        {ended ? (
          <div className="text-center">
            <p className="text-4xl text-green-400 mb-4">Complete!</p>
            <p className="text-xl">Final Score: {score}</p>
            <p className="text-gray-400 mb-4">
              Accuracy:{" "}
              {totalCount > 0
                ? Math.round((correctCount / totalCount) * 100)
                : 100}
              %
            </p>
            <a
              href="/play"
              className="px-6 py-2 bg-pink-600 hover:bg-pink-500 rounded-lg"
            >
              Play another song
            </a>
          </div>
        ) : !ready ? (
          <p className="text-gray-500">Loading player...</p>
        ) : !playing ? (
          <button
            onClick={play}
            className="px-8 py-4 bg-pink-600 hover:bg-pink-500 rounded-lg text-xl font-bold"
          >
            Start
          </button>
        ) : isInGap ? (
          <p className="text-gray-500 text-2xl animate-pulse">...</p>
        ) : (
          <TypingDisplay
            lyrics={MOCK_LYRICS}
            currentIndex={currentIndex}
            charIndex={charIndex}
          />
        )}
      </div>

      {/* Speed Controls */}
      <div className="flex items-center gap-2">
        <span className="text-gray-400 text-sm">Speed:</span>
        {[0.25, 0.5, 0.75, 1.0].map((rate) => (
          <button
            key={rate}
            onClick={() => changeSpeed(rate)}
            className={`px-3 py-1 rounded text-sm ${
              speed === rate
                ? "bg-pink-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {rate === 1.0 ? "1x" : `${rate}x`}
          </button>
        ))}
      </div>

      {/* Current Time Debug */}
      <p className="text-gray-600 text-xs">
        {currentTime.toFixed(1)}s | Line {currentIndex + 1}/{MOCK_LYRICS.length}
      </p>
    </main>
  )
}
