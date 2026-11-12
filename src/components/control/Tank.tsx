/**
 * Water tank drawn to scale (SVG): graduated wall, water level, dashed
 * setpoint line, inflow from the pump at the top (width ∝ Qe) and the
 * outflow at the bottom (∝ H: the leak that makes G1(s) a first order).
 * Overflow (H > height) spills over both walls; H < 0 (unphysical, linear
 * model of an unstable loop) empties the tank. Both raise a warning.
 */
import { useMemo } from 'react'

interface TankProps {
  /** water level H (m) — may be outside [0, height] */
  level: number
  /** consigne (m) */
  setpoint: number
  /** tank height (m) */
  height: number
  /** pump command, normalised to [−1, 1] (sign = direction) */
  inflow: number
  /** simulated time, drives the ripples */
  time: number
  playing: boolean
  label: string
}

const X0 = 74
const X1 = 196
const TOP = 34
const BOTTOM = 324
const NOZZLE_X = 150

export type TankWarning = 'overflow' | 'negative' | null

export function tankWarning(level: number, height: number): TankWarning {
  return level > height ? 'overflow' : level < 0 ? 'negative' : null
}

export default function Tank({ level, setpoint, height, inflow, time, playing, label }: TankProps) {
  const s = (BOTTOM - TOP) / height // px per metre
  const shown = Math.max(0, Math.min(height, level))
  const yWater = BOTTOM - shown * s
  const warning = tankWarning(level, height)
  const reduced = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])

  // water surface: a small travelling ripple while the simulation runs
  const amp = playing && !reduced ? 1.6 : 0.5
  const surface = useMemo(() => {
    const pts: string[] = []
    for (let x = X0; x <= X1; x += 4) {
      const y = yWater + amp * Math.sin((x - X0) / 9 + time * 1.7)
      pts.push(`${x},${Math.min(BOTTOM, y).toFixed(2)}`)
    }
    return pts
  }, [yWater, amp, time])
  const waterPath = shown > 0 ? `M${X0},${BOTTOM} L${surface.join(' L')} L${X1},${BOTTOM} Z` : ''

  const ticks = []
  for (let m = 0; m <= height; m++) {
    const y = BOTTOM - m * s
    const major = m % 5 === 0
    ticks.push(
      <g key={m}>
        <path d={`M${X0 - (major ? 10 : 5)} ${y} H${X0}`} className="stroke-ink-faint" strokeWidth={1} />
        {major && (
          <text x={X0 - 14} y={y + 4} textAnchor="end" className="fill-ink-soft font-mono text-[11px]">
            {m}
          </text>
        )}
      </g>,
    )
  }

  const pumping = inflow > 0.002
  const streamW = 1.2 + 4.5 * Math.min(1, Math.abs(inflow))
  const outW = 1 + 5 * Math.min(1, shown / Math.max(1, height / 2))
  const ySet = BOTTOM - Math.min(height, setpoint) * s
  const flow = playing && !reduced

  return (
    <svg viewBox="0 0 270 368" role="img" aria-label={label} className="block w-full">
      {/* scale */}
      <text x={X0 - 14} y={TOP - 14} textAnchor="end" className="fill-ink-faint font-mono text-[11px]">
        H (m)
      </text>
      {ticks}

      {/* pump pipe and inflow stream */}
      <path d={`M262 16 H${NOZZLE_X - 6} V${TOP - 8}`} fill="none" className="stroke-rule-strong" strokeWidth={7} strokeLinejoin="round" />
      <path d={`M262 16 H${NOZZLE_X - 6} V${TOP - 8}`} fill="none" className="stroke-sheet" strokeWidth={4} strokeLinejoin="round" />
      <text x={258} y={34} textAnchor="end" className="fill-ink-soft font-serif text-[13px] italic">
        Qe
      </text>
      {pumping && (
        <path
          d={`M${NOZZLE_X - 6} ${TOP - 6} V${yWater}`}
          stroke="#4fd6e6"
          strokeOpacity={0.8}
          strokeWidth={streamW}
          strokeDasharray={flow ? '7 5' : undefined}
          strokeLinecap="round"
        >
          {flow && <animate attributeName="stroke-dashoffset" from="0" to="-24" dur="0.45s" repeatCount="indefinite" />}
        </path>
      )}

      {/* water */}
      {waterPath && <path d={waterPath} fill="#4fd6e6" fillOpacity={0.24} />}
      {shown > 0 && <polyline points={surface.join(' ')} fill="none" stroke="#4fd6e6" strokeWidth={1.6} />}

      {/* overflow: spills over both walls */}
      {warning === 'overflow' && (
        <g stroke="#4fd6e6" strokeOpacity={0.75} strokeWidth={3} fill="none" strokeDasharray={flow ? '6 4' : undefined}>
          <path d={`M${X0} ${TOP} q-8 4 -10 18 V${BOTTOM + 30}`}>
            {flow && <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="0.4s" repeatCount="indefinite" />}
          </path>
          <path d={`M${X1} ${TOP} q8 4 10 18 V${BOTTOM + 8}`}>
            {flow && <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="0.4s" repeatCount="indefinite" />}
          </path>
        </g>
      )}

      {/* outlet and outflow ∝ H */}
      <path d={`M${X1} ${BOTTOM - 10} H${X1 + 34} V${BOTTOM + 4}`} fill="none" className="stroke-rule-strong" strokeWidth={6} />
      {shown > 0.05 && (
        <path d={`M${X1 + 34} ${BOTTOM + 6} V${BOTTOM + 40}`} stroke="#4fd6e6" strokeOpacity={0.6} strokeWidth={outW} strokeDasharray={flow ? '5 4' : undefined}>
          {flow && <animate attributeName="stroke-dashoffset" from="0" to="-18" dur="0.5s" repeatCount="indefinite" />}
        </path>
      )}

      {/* walls */}
      <path d={`M${X0} ${TOP} V${BOTTOM} H${X1} V${TOP}`} fill="none" className="stroke-ink-soft" strokeWidth={2.2} />

      {/* setpoint */}
      <path d={`M${X0 - 4} ${ySet} H${X1 + 4}`} className="stroke-pen" strokeWidth={1.4} strokeDasharray="6 4" />
      <text x={X1 + 8} y={ySet - 4} className="fill-pen font-mono text-[11px]">
        consigne
      </text>
      <text x={X1 + 8} y={ySet + 10} className="fill-pen font-mono text-[11px]">
        {setpoint} m
      </text>
    </svg>
  )
}
