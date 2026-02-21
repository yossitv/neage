"use client"

import { use, useCallback, useState } from "react"
import { useYouTubePlayer } from "@/hooks/useYouTubePlayer"
import { useTypingEngine } from "@/hooks/useTypingEngine"
import { useHype } from "@/hooks/useHype"
import { useGesture } from "@/hooks/useGesture"
import { TypingDisplay } from "@/app/components/TypingDisplay"
import { ScoreDisplay } from "@/app/components/ScoreDisplay"
import { HypeGauge } from "@/app/components/HypeGauge"
import { CameraPreview } from "@/app/components/CameraPreview"
import { MOCK_LYRICS } from "@/app/mock"

type Props = {
  params: Promise<{ videoId: string }>
}

export default function PlayPage({ params }: Props) {
  const { videoId } = use(params)
  const [speed, setSpeed] = useState(1.0)

  // Hype
  const { hype, recover } = useHype()

  // YouTube Player
  const { ready, playing, currentTime, ended, play, setPlaybackRate } =
    useYouTubePlayer(videoId, "yt-player")

  // Typing Engine（再生時間連動 + Hype倍率）
  const { currentIndex, charIndex, score, correctCount, totalCount, passCurrentWord } =
    useTypingEngine(MOCK_LYRICS, hype, playing ? currentTime : undefined)

  // Gesture → 手上げで Hype回復 + 単語pass
  const handlePass = useCallback(() => {
    recover()
    passCurrentWord()
  }, [recover, passCurrentWord])

  const { gesture, status, setVideoElement, setCanvasElement } =
    useGesture(handlePass)

  // 現在時間に該当する歌詞がない場合
  const currentLyric = MOCK_LYRICS[currentIndex]
  const isInGap =
    currentLyric &&
    (currentTime < currentLyric.startTime || currentTime >= currentLyric.endTime)

  const changeSpeed = (rate: number) => {
    setSpeed(rate)
    setPlaybackRate(rate)
  }

  return (
    <>
      {/* 背景: カメラボーンモーション */}
      <CameraPreview
        status={status}
        isRaised={gesture.isRaised}
        setVideoElement={setVideoElement}
        setCanvasElement={setCanvasElement}
      />

      {/* UI オーバーレイ */}
      <main className="relative z-10 min-h-screen flex flex-col items-center gap-6 p-6">
        {/* YouTube Player */}
        <div className="w-full max-w-2xl aspect-video bg-black/80 rounded-lg overflow-hidden backdrop-blur-sm">
          <div id="yt-player" className="w-full h-full" />
        </div>

        {/* Score + Hype */}
        <div className="flex items-center gap-8 bg-black/50 rounded-lg px-6 py-3 backdrop-blur-sm">
          <ScoreDisplay
            score={score}
            correctCount={correctCount}
            totalCount={totalCount}
            hype={hype}
          />
          <HypeGauge hype={hype} isRaised={gesture.isRaised} />
        </div>

        {/* Typing Area */}
        <div className="w-full max-w-2xl min-h-[160px] flex items-center justify-center bg-black/50 rounded-lg backdrop-blur-sm p-6">
          {ended ? (
            <div className="text-center">
              <p className="text-4xl text-green-400 mb-4">Complete!</p>
              <p className="text-xl text-white">Final Score: {score}</p>
              <p className="text-gray-400 mb-4">
                Accuracy:{" "}
                {totalCount > 0
                  ? Math.round((correctCount / totalCount) * 100)
                  : 100}
                %
              </p>
              <a
                href="/play"
                className="px-6 py-2 bg-pink-600 hover:bg-pink-500 rounded-lg text-white"
              >
                Play another song
              </a>
            </div>
          ) : !ready ? (
            <p className="text-gray-500">Loading player...</p>
          ) : !playing ? (
            <button
              onClick={play}
              className="px-8 py-4 bg-pink-600 hover:bg-pink-500 rounded-lg text-xl font-bold text-white"
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
        <div className="flex items-center gap-2 bg-black/40 rounded-lg px-4 py-2 backdrop-blur-sm">
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

        {/* Debug */}
        <p className="text-gray-500 text-xs">
          {currentTime.toFixed(1)}s | Line {currentIndex + 1}/
          {MOCK_LYRICS.length}
        </p>
      </main>
    </>
  )
}
