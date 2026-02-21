"use client"

import { useCallback, useState } from "react"
import { useHype } from "@/hooks/useHype"
import { useGesture } from "@/hooks/useGesture"
import { HypeGauge } from "@/app/components/HypeGauge"
import { CameraPreview } from "@/app/components/CameraPreview"

export default function Home() {
  const { hype, recover } = useHype()
  const [passCount, setPassCount] = useState(0)

  const handlePass = useCallback(() => {
    recover()
    setPassCount((c) => c + 1)
  }, [recover])

  const { gesture, debug, status, resetRaise, setVideoElement, setCanvasElement } =
    useGesture(handlePass)

  return (
    <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-3xl font-bold">音上げ - Gesture & Hype Demo</h1>

      <HypeGauge hype={hype} isRaised={gesture.isRaised} />

      <CameraPreview
        status={status}
        isRaised={gesture.isRaised}
        setVideoElement={setVideoElement}
        setCanvasElement={setCanvasElement}
      />

      <div className="flex flex-col items-center gap-2 text-sm text-gray-400">
        <p>Status: <span className="text-white">{status}</span></p>
        <p>
          Hand detected:{" "}
          <span className={gesture.handDetected ? "text-green-400" : "text-red-400"}>
            {gesture.handDetected ? "Yes" : "No"}
          </span>
        </p>
        <p>
          Raised:{" "}
          <span className={gesture.isRaised ? "text-green-400" : "text-gray-500"}>
            {gesture.isRaised ? "Yes" : "No"}
          </span>
        </p>
        <p>Pass count: {passCount}</p>

        {debug && (
          <div className="mt-2 font-mono text-xs text-gray-500 space-y-0.5">
            <p>wrist.y: {debug.wristY.toFixed(3)}</p>
            <p>middleTip.y: {debug.middleTipY.toFixed(3)}</p>
            <p>diff: {debug.diff.toFixed(3)}</p>
          </div>
        )}
      </div>

      <button
        onClick={resetRaise}
        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
      >
        Reset raise (simulate next lyric)
      </button>
    </main>
  )
}
