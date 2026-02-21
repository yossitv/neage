"use client"

import { useCallback } from "react"

type Props = {
  status: "loading" | "ready" | "unavailable"
  isRaised: boolean
  setVideoElement: (el: HTMLVideoElement | null) => void
  setCanvasElement: (el: HTMLCanvasElement | null) => void
}

const WIDTH = 320
const HEIGHT = 240

export function CameraPreview({
  status,
  isRaised,
  setVideoElement,
  setCanvasElement,
}: Props) {
  const videoRefCb = useCallback(
    (el: HTMLVideoElement | null) => setVideoElement(el),
    [setVideoElement]
  )
  const canvasRefCb = useCallback(
    (el: HTMLCanvasElement | null) => setCanvasElement(el),
    [setCanvasElement]
  )

  return (
    <div className="relative" style={{ width: WIDTH, height: HEIGHT }}>
      {/* video は常にDOMに存在させる（MediaPipeの入力元） */}
      <video
        ref={videoRefCb}
        className="absolute inset-0 w-full h-full rounded-lg object-cover scale-x-[-1] opacity-0"
        playsInline
        muted
      />
      <canvas
        ref={canvasRefCb}
        width={WIDTH}
        height={HEIGHT}
        className="absolute inset-0 w-full h-full rounded-lg scale-x-[-1] bg-gray-800"
      />

      {/* ステータス表示 */}
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
          Loading MediaPipe...
        </div>
      )}
      {status === "unavailable" && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
          Camera unavailable
        </div>
      )}
      {isRaised && (
        <div className="absolute top-2 right-2 px-2 py-1 bg-green-500 rounded text-xs text-white font-bold">
          RAISED
        </div>
      )}
    </div>
  )
}
