import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useHype } from "./useHype"

describe("useHype", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("starts at 1.0", () => {
    const { result } = renderHook(() => useHype())
    expect(result.current.hype).toBe(1.0)
  })

  it("decays over time", () => {
    const { result } = renderHook(() => useHype())

    // 1秒経過 → -0.05
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current.hype).toBeCloseTo(0.95, 2)
  })

  it("recovers +0.5 on raise", () => {
    const { result } = renderHook(() => useHype())

    act(() => {
      result.current.recover()
    })

    expect(result.current.hype).toBe(1.5)
  })

  it("does not exceed max 3.0", () => {
    const { result } = renderHook(() => useHype())

    act(() => {
      for (let i = 0; i < 10; i++) result.current.recover()
    })

    expect(result.current.hype).toBe(3.0)
  })

  it("does not go below min 0.1", () => {
    const { result } = renderHook(() => useHype())

    // 60秒経過 → 1.0 - 3.0 = 下限 0.1
    act(() => {
      vi.advanceTimersByTime(60_000)
    })

    expect(result.current.hype).toBeCloseTo(0.1, 2)
  })
})
