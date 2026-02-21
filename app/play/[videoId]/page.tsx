"use client"

import { use, useCallback, useEffect, useRef, useState } from "react"
import { useYouTubePlayer } from "@/hooks/useYouTubePlayer"
import { useTypingEngine } from "@/hooks/useTypingEngine"
import { useHype } from "@/hooks/useHype"
import { useGesture } from "@/hooks/useGesture"
import { TypingDisplay } from "@/app/components/TypingDisplay"
import { ScoreDisplay } from "@/app/components/ScoreDisplay"
import { HypeGauge } from "@/app/components/HypeGauge"
import { CameraPreview } from "@/app/components/CameraPreview"
import type { Lyric } from "@/app/types"

type LangOption = { code: string; name: string }

type Props = {
  params: Promise<{ videoId: string }>
}

export default function PlayPage({ params }: Props) {
  const { videoId } = use(params)
  const [speed, setSpeed] = useState(1.0)
  const [slowest, setSlowest] = useState(1.0)
  const [langs, setLangs] = useState<LangOption[]>([])
  const [lyrics, setLyrics] = useState<Lyric[]>([])
  const [phase, setPhase] = useState<"loading-langs" | "select-lang" | "loading-captions" | "ready" | "error">("loading-langs")
  const [error, setError] = useState("")
  const [practiceMode, setPracticeMode] = useState(false)
  const startedRef = useRef(false)

  // Fetch available languages
  useEffect(() => {
    fetch(`/api/captions?v=${videoId}`)
      .then((r) => {
        if (!r.ok) return r.json().then((d) => { throw new Error(d.error) })
        return r.json()
      })
      .then((data: LangOption[]) => { setLangs(data); setPhase("select-lang") })
      .catch((e: Error) => { setError(e.message); setPhase("error") })
  }, [videoId])

  const selectLang = (code: string) => {
    setPhase("loading-captions")
    fetch(`/api/captions?v=${videoId}&lang=${code}`)
      .then((r) => {
        if (!r.ok) return r.json().then((d) => { throw new Error(d.error) })
        return r.json()
      })
      .then((data: Lyric[]) => { setLyrics(data); setPhase("ready") })
      .catch((e: Error) => { setError(e.message); setPhase("error") })
  }

  // YouTube Player
  const { ready, playing, currentTime, duration, ended, play, pause, seekTo, setPlaybackRate } =
    useYouTubePlayer(videoId, "yt-player")

  // Track "has ever started" to prevent Start button flashing on pause/buffer
  if (playing && !startedRef.current) startedRef.current = true
  const started = startedRef.current

  // Gesture: bothRaised is continuous state for hype charging
  const handlePassRef = useRef<() => void>(() => {})
  const { gesture, bothRaised, status, setVideoElement, setCanvasElement } =
    useGesture(useCallback(() => handlePassRef.current(), []))

  // Hype: decay when playing, charge when both hands raised (stop on ended)
  const { hype } = useHype(playing && !ended, bothRaised && !ended)

  // Typing Engine: practice mode passes hype=0 to disable scoring
  const effectiveHype = practiceMode ? 0 : hype
  const { currentIndex, charIndex, score, correctCount, totalCount, active, passCurrentWord } =
    useTypingEngine(lyrics, effectiveHype, started && !ended ? currentTime : undefined)

  // Wire up pass callback (needs active + passCurrentWord from typing engine)
  handlePassRef.current = () => {
    if (!active) return
    passCurrentWord()
  }

  const changeSpeed = (rate: number) => {
    setSpeed(rate)
    setPlaybackRate(rate)
    if (rate < slowest) setSlowest(rate)
  }

  const handleSeek = (seconds: number) => {
    if (!practiceMode) setPracticeMode(true)
    seekTo(seconds)
  }

  // Determine what to show in the typing area
  const renderTypingArea = () => {
    if (phase === "loading-langs") return <p className="text-gray-500">Loading available languages...</p>
    if (phase === "error") return (
      <div className="text-center">
        <p className="text-red-400 mb-2">{error}</p>
        <a href="/" className="px-4 py-2 bg-pink-600 hover:bg-pink-500 rounded-lg text-white text-sm">Try another video</a>
      </div>
    )
    if (phase === "select-lang") return (
      <div className="text-center">
        <p className="text-gray-400 mb-4">Select subtitle language</p>
        <div className="flex flex-wrap justify-center gap-3">
          {langs.map((l) => (
            <button key={l.code} onClick={() => selectLang(l.code)} className="px-5 py-3 bg-pink-600 hover:bg-pink-500 rounded-lg text-white font-bold">
              {l.name}
            </button>
          ))}
        </div>
      </div>
    )
    if (phase === "loading-captions") return <p className="text-gray-500">Loading captions...</p>
    if (ended) return (
      <div className="text-center">
        <p className="text-4xl text-green-400 mb-4">Complete!</p>
        <p className="text-xl text-white">Final Score: {score}</p>
        <p className="text-gray-400 mb-4">
          Accuracy: {totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 100}%
        </p>
        <a href="/" className="px-6 py-2 bg-pink-600 hover:bg-pink-500 rounded-lg text-white">Play another song</a>
      </div>
    )
    if (!ready) return <p className="text-gray-500">Loading player...</p>
    if (!started) return (
      <button onClick={play} className="px-8 py-4 bg-pink-600 hover:bg-pink-500 rounded-lg text-xl font-bold text-white">
        Start
      </button>
    )
    return <TypingDisplay lyrics={lyrics} currentIndex={currentIndex} charIndex={charIndex} active={active} currentTime={currentTime} />
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  return (
    <>
      <CameraPreview status={status} isRaised={gesture.isRaised} setVideoElement={setVideoElement} setCanvasElement={setCanvasElement} />

      <main className="relative z-10 min-h-screen flex flex-col items-center gap-6 p-6">
        <div className="w-full max-w-2xl aspect-video bg-black/80 rounded-lg overflow-hidden backdrop-blur-sm">
          <div id="yt-player" className="w-full h-full" />
        </div>

        <div className="w-full max-w-2xl bg-black/50 rounded-lg px-6 py-3 backdrop-blur-sm flex flex-col gap-2">
          <div className="flex items-center gap-4">
            {!practiceMode && started && !ended && (
              <span className="px-2 py-0.5 bg-red-600 rounded text-white text-xs font-bold animate-pulse">REC</span>
            )}
            {practiceMode && started && !ended && (
              <span className="px-2 py-0.5 bg-gray-600 rounded text-gray-300 text-xs font-bold">PRACTICE</span>
            )}
            <ScoreDisplay score={score} correctCount={correctCount} totalCount={totalCount} hype={hype} />
            <HypeGauge hype={hype} visible={playing && !ended} />
          </div>
          {started && duration > 0 && (
            <div className="flex items-center gap-3">
              <button onClick={() => { if (playing) { pause(); setPracticeMode(true) } else { play() } }} className="text-white text-lg w-6 h-6 flex items-center justify-center shrink-0">
                {playing ? "⏸" : "▶"}
              </button>
              <span className="text-gray-400 text-xs w-10 text-right">{formatTime(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={duration}
                step={0.1}
                value={currentTime}
                onChange={(e) => handleSeek(parseFloat(e.target.value))}
                className="flex-1 h-1.5 accent-pink-500 cursor-pointer"
              />
              <span className="text-gray-400 text-xs w-10">{formatTime(duration)}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Speed:</span>
            {[0.25, 0.5, 0.75, 1.0].map((rate) => (
              <button key={rate} onClick={() => changeSpeed(rate)} className={`px-3 py-1 rounded text-sm ${speed === rate ? "bg-pink-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>
                {rate === 1.0 ? "1x" : `${rate}x`}
              </button>
            ))}
            <span className="text-pink-400 text-sm font-bold ml-2">{slowest === 1.0 ? "1x" : `${slowest}x`}</span>
          </div>
        </div>

        <div className="w-full max-w-2xl min-h-[160px] flex items-center justify-center bg-black/50 rounded-lg backdrop-blur-sm p-6">
          {renderTypingArea()}
        </div>

        <p className="text-gray-500 text-xs">
          Line {currentIndex + 1}/{lyrics.length}
        </p>
      </main>
    </>
  )
}
