"use client"

import { useCallback } from "react"

type Props = {
  status: "loading" | "ready" | "unavailable"
  isRaised: boolean
  setVideoElement: (el: HTMLVideoElement | null) => void
  setCanvasElement: (el: HTMLCanvasElement | null) => void
}

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
    <div className="fixed inset-0 -z-10">
      <video
        ref={videoRefCb}
        className="absolute inset-0 w-full h-full object-cover scale-x-[-1] opacity-0"
        playsInline
        muted
      />
      <canvas
        ref={canvasRefCb}
        width={1280}
        height={720}
        className="absolute inset-0 w-full h-full object-cover scale-x-[-1] bg-gray-900"
      />
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-lg">
          Loading MediaPipe...
        </div>
      )}
      {status === "unavailable" && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-lg">
          Camera unavailable
        </div>
      )}
      {isRaised && (
        <div className="absolute top-4 right-4 px-3 py-1.5 bg-green-500 rounded text-sm text-white font-bold">
          RAISED
        </div>
      )}
    </div>
  )
}
