"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { GestureState } from "@/app/types"

/**
 * 手上げ判定の閾値: 中指先端のy座標がこの値未満なら「上げている」
 * MediaPipe座標は 0(上端) ~ 1(下端) なので 0.5 = 画面上半分
 */
const RAISE_THRESHOLD_Y = 0.5

/** 手首と中指先端のy差分の最低値（手首より十分上にあること） */
const RAISE_MIN_DIFF = 0.1

/** デバッグ用のランドマーク座標 */
export type DebugInfo = {
  wristY: number
  middleTipY: number
  diff: number
}

export type GestureStatus = "loading" | "ready" | "unavailable"

export function useGesture(onPass: () => void) {
  const [gesture, setGesture] = useState<GestureState>({
    cameraAvailable: false,
    handDetected: false,
    isRaised: false,
    hasRaisedForCurrent: false,
  })
  const [debug, setDebug] = useState<DebugInfo | null>(null)
  const [status, setStatus] = useState<GestureStatus>("loading")

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const landmarkerRef = useRef<import("@mediapipe/tasks-vision").HandLandmarker | null>(null)
  const rafRef = useRef<number>(0)
  const hasRaisedRef = useRef(false)
  const onPassRef = useRef(onPass)
  onPassRef.current = onPass

  /** 手上げ判定リセット（次の歌詞行に進む時に呼ぶ） */
  const resetRaise = useCallback(() => {
    hasRaisedRef.current = false
    setGesture((g) => ({ ...g, hasRaisedForCurrent: false }))
  }, [])

  const setVideoElement = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el
  }, [])

  const setCanvasElement = useCallback((el: HTMLCanvasElement | null) => {
    canvasRef.current = el
  }, [])

  useEffect(() => {
    let stopped = false

    async function init() {
      const vision = await import("@mediapipe/tasks-vision")
      const { FilesetResolver, HandLandmarker, DrawingUtils } = vision

      // WASM読み込み
      const wasm = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      )

      // GPU → CPU フォールバック
      let landmarker: import("@mediapipe/tasks-vision").HandLandmarker
      try {
        landmarker = await HandLandmarker.createFromOptions(wasm, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 2,
        })
      } catch {
        console.warn("GPU delegate failed, falling back to CPU")
        landmarker = await HandLandmarker.createFromOptions(wasm, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          numHands: 2,
        })
      }

      if (stopped) {
        landmarker.close()
        return
      }
      landmarkerRef.current = landmarker

      // カメラ取得
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 320, height: 240 },
        })
      } catch {
        setStatus("unavailable")
        setGesture((g) => ({ ...g, cameraAvailable: false }))
        return
      }

      if (stopped) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }

      // video要素にストリームを紐付け
      const video = videoRef.current
      if (!video) {
        console.error("video element not found in DOM")
        stream.getTracks().forEach((t) => t.stop())
        setStatus("unavailable")
        return
      }
      video.srcObject = stream
      await video.play()

      setStatus("ready")
      setGesture((g) => ({ ...g, cameraAvailable: true }))

      // 検出ループ
      const canvas = canvasRef.current
      const ctx = canvas?.getContext("2d") ?? null
      const drawingUtils = ctx ? new DrawingUtils(ctx) : null

      let lastTimestamp = -1

      function detect() {
        if (stopped) return

        const v = videoRef.current
        if (!v || v.readyState < 2) {
          rafRef.current = requestAnimationFrame(detect)
          return
        }

        const now = performance.now()
        if (now === lastTimestamp) {
          rafRef.current = requestAnimationFrame(detect)
          return
        }
        lastTimestamp = now

        const result = landmarkerRef.current?.detectForVideo(v, now)
        const allLandmarks = result?.landmarks ?? []

        if (ctx && canvas) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
        }

        if (allLandmarks.length > 0) {
          // 全手のランドマークを描画
          for (const landmarks of allLandmarks) {
            if (drawingUtils) {
              drawingUtils.drawLandmarks(landmarks, {
                color: "#00FF00",
                lineWidth: 1,
              })
              drawingUtils.drawConnectors(
                landmarks,
                HandLandmarker.HAND_CONNECTIONS,
                { color: "#00CC00", lineWidth: 1 }
              )
            }
          }

          // いずれかの手で手上げ判定
          let anyRaised = false
          let bestDebug: DebugInfo | null = null

          for (const landmarks of allLandmarks) {
            const middleTip = landmarks[12]
            const wrist = landmarks[0]
            const diff = wrist.y - middleTip.y
            const raised =
              middleTip.y < RAISE_THRESHOLD_Y && diff > RAISE_MIN_DIFF

            if (raised) anyRaised = true
            if (!bestDebug || diff > bestDebug.diff) {
              bestDebug = { wristY: wrist.y, middleTipY: middleTip.y, diff }
            }
          }

          setDebug(bestDebug)

          if (anyRaised && !hasRaisedRef.current) {
            hasRaisedRef.current = true
            onPassRef.current()
            setGesture((g) => ({
              ...g,
              handDetected: true,
              isRaised: true,
              hasRaisedForCurrent: true,
            }))
          } else {
            setGesture((g) => ({
              ...g,
              handDetected: true,
              isRaised: anyRaised,
            }))
          }
        } else {
          setDebug(null)
          setGesture((g) => ({
            ...g,
            handDetected: false,
            isRaised: false,
          }))
        }

        rafRef.current = requestAnimationFrame(detect)
      }

      rafRef.current = requestAnimationFrame(detect)
    }

    init().catch((err) => {
      console.error("useGesture init failed:", err)
      setStatus("unavailable")
    })

    return () => {
      stopped = true
      cancelAnimationFrame(rafRef.current)
      const video = videoRef.current
      if (video?.srcObject) {
        const stream = video.srcObject as MediaStream
        stream.getTracks().forEach((t) => t.stop())
        video.srcObject = null
      }
      landmarkerRef.current?.close()
    }
  }, [])

  return { gesture, debug, status, resetRaise, setVideoElement, setCanvasElement }
}
