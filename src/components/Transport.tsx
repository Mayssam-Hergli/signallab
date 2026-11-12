import { useEffect, useRef, useState } from 'react'
import { isTyping } from '../lib/presentation'
import Slider from './Slider'

/**
 * Every mounted Transport. The ←/→ keys drive only the one whose section
 * shows the most on screen, so two animations on one page never both move.
 */
const mounted = new Set<HTMLElement>()

function visibleHeight(el: HTMLElement): number {
  const r = (el.closest('section') ?? el).getBoundingClientRect()
  if (r.width === 0) return 0 // inside a hidden tab
  return Math.max(0, Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0))
}

function isMostVisible(el: HTMLElement): boolean {
  let best: HTMLElement | null = null
  let bestH = 0
  for (const e of mounted) {
    const h = visibleHeight(e)
    if (h > bestH) {
      bestH = h
      best = e
    }
  }
  return best === el
}

interface TransportProps {
  /** current step, 0 … count−1 */
  value: number
  count: number
  onChange: (v: number) => void
  /** name of the step variable, e.g. "n" or "m" */
  label: string
  /** wrap to 0 after the last step while playing (circular convolution) */
  loop?: boolean
}

const KEY =
  'flex h-8 min-w-9 items-center justify-center border border-rule-strong px-2 font-mono text-[0.9rem] text-ink-soft transition-colors hover:border-ink-soft hover:text-ink disabled:opacity-35 disabled:hover:border-rule-strong disabled:hover:text-ink-soft'

/**
 * Step-by-step controls for the animations: first / previous / play-pause /
 * next / last, a step slider and a speed slider. Plays at `speed` steps per
 * second; stops on the last step unless `loop`. Keyboard: ← and → step back
 * and forth (on the animation most visible on screen).
 */
export default function Transport({ value, count, onChange, label, loop = false }: TransportProps) {
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(2)
  const last = count - 1
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = boxRef.current!
    mounted.add(el)
    return () => {
      mounted.delete(el)
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || isTyping(e)) return
      if (!isMostVisible(boxRef.current!)) return
      e.preventDefault()
      setPlaying(false)
      const next = e.key === 'ArrowRight' ? value + 1 : value - 1
      if (loop) onChange(((next % count) + count) % count)
      else onChange(Math.max(0, Math.min(last, next)))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [value, count, last, loop, onChange])

  useEffect(() => {
    if (!playing) return
    if (!loop && value >= last) {
      setPlaying(false)
      return
    }
    const id = window.setTimeout(() => onChange(value >= last ? 0 : value + 1), 1000 / speed)
    return () => window.clearTimeout(id)
  }, [playing, value, last, loop, speed, onChange])

  const play = () => {
    if (!playing && !loop && value >= last) onChange(0) // replay from the start
    setPlaying((p) => !p)
  }
  const go = (v: number) => {
    setPlaying(false)
    onChange(Math.max(0, Math.min(last, v)))
  }

  return (
    <div ref={boxRef} className="flex flex-wrap items-end gap-x-8 gap-y-4">
      <div role="group" aria-label="Pas à pas" className="flex gap-1.5">
        <button type="button" className={KEY} onClick={() => go(0)} disabled={value === 0} title="Premier pas" aria-label="Premier pas">
          |◀
        </button>
        <button type="button" className={KEY} onClick={() => go(value - 1)} disabled={value === 0} title="Pas précédent" aria-label="Pas précédent">
          ◀
        </button>
        <button
          type="button"
          onClick={play}
          aria-pressed={playing}
          className={`${KEY} min-w-24 ${playing ? 'border-trace/70 text-trace' : ''}`}
        >
          {playing ? '❚❚ pause' : '▶ lecture'}
        </button>
        <button type="button" className={KEY} onClick={() => go(value + 1)} disabled={value === last} title="Pas suivant" aria-label="Pas suivant">
          ▶
        </button>
        <button type="button" className={KEY} onClick={() => go(last)} disabled={value === last} title="Dernier pas" aria-label="Dernier pas">
          ▶|
        </button>
      </div>
      <Slider label={label} value={value} min={0} max={last} onChange={go} format={(v) => `${v} / ${last}`} />
      <Slider
        label="Vitesse"
        value={speed}
        min={0.5}
        max={8}
        step={0.5}
        onChange={setSpeed}
        format={(v) => `${v} pas/s`}
        hint="Clavier : ← → pas à pas"
      />
    </div>
  )
}
