"use client"

import { useCallback, useEffect, useRef, useState } from "react"

declare global {
  interface Window {
    YT: typeof YT
    onYouTubeIframeAPIReady: (() => void) | undefined
  }
}

type PlayerState = {
  ready: boolean
  playing: boolean
  currentTime: number
  ended: boolean
}

export function useYouTubePlayer(videoId: string, containerId: string) {
  const [state, setState] = useState<PlayerState>({
    ready: false,
    playing: false,
    currentTime: 0,
    ended: false,
  })
  const playerRef = useRef<YT.Player | null>(null)
  const rafRef = useRef<number>(0)

  // 再生時間をポーリングで取得（YT APIにはonTimeUpdateがない）
  const pollTime = useCallback(() => {
    const p = playerRef.current
    if (p?.getCurrentTime) {
      const t = p.getCurrentTime()
      setState((s) => ({ ...s, currentTime: t }))
    }
    rafRef.current = requestAnimationFrame(pollTime)
  }, [])

  useEffect(() => {
    // IFrame API scriptを読み込み
    if (!document.getElementById("yt-iframe-api")) {
      const tag = document.createElement("script")
      tag.id = "yt-iframe-api"
      tag.src = "https://www.youtube.com/iframe_api"
      document.head.appendChild(tag)
    }

    function createPlayer() {
      playerRef.current = new window.YT.Player(containerId, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: () => {
            setState((s) => ({ ...s, ready: true }))
          },
          onStateChange: (e: YT.OnStateChangeEvent) => {
            if (e.data === window.YT.PlayerState.PLAYING) {
              setState((s) => ({ ...s, playing: true, ended: false }))
              rafRef.current = requestAnimationFrame(pollTime)
            } else if (e.data === window.YT.PlayerState.PAUSED) {
              setState((s) => ({ ...s, playing: false }))
              cancelAnimationFrame(rafRef.current)
            } else if (e.data === window.YT.PlayerState.ENDED) {
              setState((s) => ({ ...s, playing: false, ended: true }))
              cancelAnimationFrame(rafRef.current)
            }
          },
        },
      })
    }

    if (window.YT?.Player) {
      createPlayer()
    } else {
      window.onYouTubeIframeAPIReady = createPlayer
    }

    return () => {
      cancelAnimationFrame(rafRef.current)
      playerRef.current?.destroy()
      playerRef.current = null
    }
  }, [videoId, containerId, pollTime])

  const play = useCallback(() => playerRef.current?.playVideo(), [])
  const pause = useCallback(() => playerRef.current?.pauseVideo(), [])
  const setPlaybackRate = useCallback((rate: number) => {
    playerRef.current?.setPlaybackRate(rate)
  }, [])

  return { ...state, play, pause, setPlaybackRate }
}
