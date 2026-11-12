import { useEffect, useRef, useState } from 'react'

/**
 * true for ~0.9 s after `value` changes (not on first render): block
 * diagrams light up the block whose parameter a slider just moved.
 */
export function useFlash(value: unknown): boolean {
  const [on, setOn] = useState(false)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    setOn(true)
    const id = window.setTimeout(() => setOn(false), 900)
    return () => window.clearTimeout(id)
  }, [value])
  return on
}
