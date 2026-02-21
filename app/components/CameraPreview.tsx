"use client"

import { useCallback } from "react"

type Props = {
  cameraAvailable: boolean
  isRaised: boolean
  setVideoElement: (el: HTMLVideoElement | null) => void
  setCanvasElement: (el: HTMLCanvasElement | null) => void
}

const WIDTH = 320
const HEIGHT = 240

export function CameraPreview({
  cameraAvailable,
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

  if (!cameraAvailable) {
    return (
      <div
        className="flex items-center justify-center bg-gray-800 rounded-lg text-gray-500 text-sm"
        style={{ width: WIDTH, height: HEIGHT }}
      >
        Camera unavailable
      </div>
    )
  }

  return (
    <div className="relative" style={{ width: WIDTH, height: HEIGHT }}>
      <video
        ref={videoRefCb}
        className="absolute inset-0 w-full h-full rounded-lg object-cover scale-x-[-1]"
        playsInline
        muted
      />
      <canvas
        ref={canvasRefCb}
        width={WIDTH}
        height={HEIGHT}
        className="absolute inset-0 w-full h-full rounded-lg scale-x-[-1]"
      />
      {isRaised && (
        <div className="absolute top-2 right-2 px-2 py-1 bg-green-500 rounded text-xs text-white font-bold">
          RAISED
        </div>
      )}
    </div>
  )
}
