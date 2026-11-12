import { useCallback, useEffect, useRef, useState } from 'react'

export interface Playback {
  /** simulated time (s) */
  time: number
  playing: boolean
  /** simulated seconds per real second */
  speed: number
  toggle: () => void
  reset: () => void
  setSpeed: (v: number) => void
  seek: (t: number) => void
}

/**
 * Real-time playback of a simulated response of length `duration` (s):
 * time advances at `speed` simulated seconds per real second, driven by
 * requestAnimationFrame, and stops at the end. Pressing play at the end
 * starts again from 0.
 */
export function usePlayback(duration: number, initialSpeed = 10): Playback {
  const [time, setTimeState] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(initialSpeed)
  // the rAF loop reads and writes the time through this ref (no stale closure)
  const timeRef = useRef(0)
  const setTime = useCallback((t: number) => {
    timeRef.current = t
    setTimeState(t)
  }, [])

  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last: number | null = null
    const tick = (now: number) => {
      const dt = last === null ? 0 : Math.min(0.1, (now - last) / 1000) // no jump after a background tab
      last = now
      const next = Math.min(duration, timeRef.current + dt * speed)
      setTime(next)
      if (next >= duration) setPlaying(false)
      else raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, speed, duration, setTime])

  // a shorter response (new parameters) never leaves the time past its end
  useEffect(() => {
    if (timeRef.current > duration) setTime(duration)
  }, [duration, setTime])

  const toggle = useCallback(() => {
    if (!playing && timeRef.current >= duration) setTime(0) // replay from the start
    setPlaying(!playing)
  }, [playing, duration, setTime])
  const reset = useCallback(() => {
    setPlaying(false)
    setTime(0)
  }, [setTime])
  const seek = useCallback((t: number) => setTime(Math.max(0, Math.min(duration, t))), [duration, setTime])

  return { time, playing, speed, toggle, reset, setSpeed, seek }
}

/** Value of y at time t (sorted t), by linear interpolation. */
export function sampleAt(t: readonly number[], y: readonly number[], at: number): number {
  if (at <= t[0]) return y[0]
  if (at >= t[t.length - 1]) return y[y.length - 1]
  let lo = 0
  let hi = t.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (t[mid] <= at) lo = mid
    else hi = mid
  }
  const f = (at - t[lo]) / (t[hi] - t[lo])
  return y[lo] + f * (y[hi] - y[lo])
}

/** Value held at time `at` (staircase: last sample at or before `at`). */
export function heldAt(t: readonly number[], y: readonly number[], at: number): number {
  let lo = 0
  let hi = t.length - 1
  if (at >= t[hi]) return y[hi]
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (t[mid] <= at) lo = mid
    else hi = mid
  }
  return y[lo]
}
