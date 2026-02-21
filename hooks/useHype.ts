"use client"

import { useCallback, useEffect, useRef, useState } from "react"

const INITIAL_HYPE = 1.0
const DECAY_PER_SEC = 0.05
const RECOVER_AMOUNT = 0.5
const MAX_HYPE = 3.0
const MIN_HYPE = 0.1
const TICK_MS = 100

export function useHype(active: boolean) {
  const [hype, setHype] = useState(INITIAL_HYPE)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!active) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }
    // Reset to initial when activating
    setHype(INITIAL_HYPE)
    intervalRef.current = setInterval(() => {
      setHype((h) => Math.max(MIN_HYPE, h - DECAY_PER_SEC * (TICK_MS / 1000)))
    }, TICK_MS)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [active])

  const recover = useCallback(() => {
    setHype((h) => Math.min(MAX_HYPE, h + RECOVER_AMOUNT))
  }, [])

  return { hype, recover }
}
