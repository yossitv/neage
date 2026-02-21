"use client"

import { useEffect, useRef, useState } from "react"

type Props = {
  hype: number
  isRaised: boolean
}

function hypeToPercent(hype: number): number {
  return Math.min(100, (hype / 3.0) * 100)
}

function hypeColor(hype: number): string {
  if (hype >= 2.0) return "bg-green-500"
  if (hype >= 1.0) return "bg-yellow-400"
  return "bg-red-500"
}

export function HypeGauge({ hype, isRaised }: Props) {
  const [flash, setFlash] = useState(false)
  const prevRaisedRef = useRef(false)

  useEffect(() => {
    if (isRaised && !prevRaisedRef.current) {
      setFlash(true)
      const t = setTimeout(() => setFlash(false), 300)
      return () => clearTimeout(t)
    }
    prevRaisedRef.current = isRaised
  }, [isRaised])

  const pct = hypeToPercent(hype)

  return (
    <div className="w-64">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-400">HYPE</span>
        <span className="text-pink-400">x{hype.toFixed(1)}</span>
      </div>
      <div
        className={`h-4 rounded-full bg-gray-700 overflow-hidden transition-shadow ${
          flash ? "shadow-[0_0_16px_rgba(236,72,153,0.8)]" : ""
        }`}
      >
        <div
          className={`h-full rounded-full transition-all duration-150 ${hypeColor(hype)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
