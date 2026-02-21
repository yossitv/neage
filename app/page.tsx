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
    <>
      {/* 全画面背景としてボーン表示 */}
      <CameraPreview
        status={status}
        isRaised={gesture.isRaised}
        setVideoElement={setVideoElement}
        setCanvasElement={setCanvasElement}
      />

      {/* UI オーバーレイ */}
      <main className="relative z-10 min-h-screen flex flex-col items-center justify-between p-8">
        {/* 上部: タイトル + Hype */}
        <div className="flex flex-col items-center gap-4 pt-4">
          <h1 className="text-3xl font-bold text-white drop-shadow-lg">
            音上げ - Gesture & Hype Demo
          </h1>
          <HypeGauge hype={hype} isRaised={gesture.isRaised} />
        </div>

        {/* 下部: ステータス情報 */}
        <div className="flex flex-col items-center gap-3 pb-8">
          <div className="flex gap-6 text-sm text-gray-300 bg-black/40 rounded-lg px-6 py-3 backdrop-blur-sm">
            <p>
              Left:{" "}
              <span className={
                debug?.left.raised ? "text-green-400" :
                debug?.left.detected ? "text-yellow-400" : "text-red-400"
              }>
                {debug?.left.raised ? "Raised" : debug?.left.detected ? "Detected" : "No"}
              </span>
            </p>
            <p>
              Right:{" "}
              <span className={
                debug?.right.raised ? "text-green-400" :
                debug?.right.detected ? "text-yellow-400" : "text-red-400"
              }>
                {debug?.right.raised ? "Raised" : debug?.right.detected ? "Detected" : "No"}
              </span>
            </p>
            <p>
              Both:{" "}
              <span className={
                debug?.left.raised && debug?.right.raised ? "text-green-400" : "text-gray-500"
              }>
                {debug?.left.raised && debug?.right.raised ? "Raised" : "No"}
              </span>
            </p>
            <p>Pass: {passCount}</p>
          </div>
        </div>
      </main>
    </>
  )
}
