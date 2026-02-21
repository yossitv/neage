"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { GestureState } from "@/app/types"

/** 手上げ判定の閾値: 中指先端のy座標が画面上部1/3以内 */
const RAISE_THRESHOLD_Y = 0.33

export function useGesture(onPass: () => void) {
  const [gesture, setGesture] = useState<GestureState>({
    cameraAvailable: false,
    handDetected: false,
    isRaised: false,
    hasRaisedForCurrent: false,
  })

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

  /** videoRefとcanvasRefを外から紐づけるsetter */
  const setVideoElement = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el
  }, [])

  const setCanvasElement = useCallback((el: HTMLCanvasElement | null) => {
    canvasRef.current = el
  }, [])

  useEffect(() => {
    let stopped = false

    async function init() {
      // MediaPipe初期化
      const vision = await import("@mediapipe/tasks-vision")
      const { FilesetResolver, HandLandmarker, DrawingUtils } = vision

      const wasm = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      )

      const landmarker = await HandLandmarker.createFromOptions(wasm, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 1,
      })
      landmarkerRef.current = landmarker

      // カメラ取得
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 320, height: 240 },
        })
      } catch {
        setGesture((g) => ({ ...g, cameraAvailable: false }))
        return
      }

      if (stopped) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }

      setGesture((g) => ({ ...g, cameraAvailable: true }))

      const video = videoRef.current
      if (!video) return
      video.srcObject = stream
      await video.play()

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
        const landmarks = result?.landmarks?.[0]

        // Canvas描画
        if (ctx && canvas) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
        }

        if (landmarks) {
          // ランドマーク描画
          if (drawingUtils && landmarks) {
            drawingUtils.drawLandmarks(landmarks, {
              color: "#00FF00",
              lineWidth: 1,
            })
            drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, {
              color: "#00CC00",
              lineWidth: 1,
            })
          }

          // 手上げ判定: 中指先端(12)のy座標が閾値未満
          const middleTip = landmarks[12]
          const wrist = landmarks[0]
          const isRaised = middleTip.y < RAISE_THRESHOLD_Y && middleTip.y < wrist.y

          if (isRaised && !hasRaisedRef.current) {
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
              isRaised,
            }))
          }
        } else {
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

    init()

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

  return { gesture, resetRaise, setVideoElement, setCanvasElement }
}
