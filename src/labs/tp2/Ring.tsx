import { useState } from 'react'
import { C } from '../../components/theme'
import { fmt } from '../../lib/format'

interface RingProps {
  /** x(n), n = 0 … N−1, on the outer ring */
  x: readonly number[]
  /** g(k), k = 0 … N−1, flipped onto the inner ring */
  g: readonly number[]
  /** current output index */
  m: number
  /** y(m) */
  value: number
}

const CX = 200
const CY = 200
const R_X = 150 // outer ring (x)
const R_G = 84 // inner ring (g)
const LEN_X = 36
const LEN_G = 44

/** angle θ measured clockwise from the top; returns SVG coordinates */
function polar(r: number, theta: number): [number, number] {
  return [CX + r * Math.sin(theta), CY - r * Math.cos(theta)]
}

function Stem({ r, theta, v, scale, color, filled }: { r: number; theta: number; v: number; scale: number; color: string; filled?: boolean }) {
  const [x0, y0] = polar(r, theta)
  const [x1, y1] = polar(r + v * scale, theta)
  return (
    <g>
      <line x1={x0} y1={y0} x2={x1} y2={y1} stroke={color} strokeWidth={1.6} />
      <circle cx={x1} cy={y1} r={4.2} fill={filled ? color : 'var(--color-screen)'} stroke={color} strokeWidth={1.5} />
    </g>
  )
}

/**
 * Circular convolution drawn on two concentric rings.
 *
 * Outer ring: x(n) at angle 2πn/N (n = 0 at the top, clockwise).
 * Inner ring: g(k) at angle −2πk/N (g flipped), the whole ring turned by
 * 2πm/N. At angle n the inner ring then shows g((m − n) mod N): the values that
 * face each other are multiplied, and their sum is y(m). Going from m to m + 1
 * turns the inner ring by one notch; after N notches it is back where it was —
 * that is the "mod N".
 */
export default function Ring({ x, g, m, value }: RingProps) {
  const N = x.length
  const step = (2 * Math.PI) / N
  const maxX = Math.max(...x.map(Math.abs), 1e-12)
  const maxG = Math.max(...g.map(Math.abs), 1e-12)

  // accumulated rotation, so that m: N−1 → 0 turns one notch forward instead of a full turn back
  const [rot, setRot] = useState({ m, N, deg: (m * 360) / N })
  let deg = rot.deg
  if (rot.m !== m || rot.N !== N) {
    if (rot.N !== N) deg = (m * 360) / N
    else {
      let d = (((m - rot.m) % N) + N) % N
      if (d > N / 2) d -= N
      deg = rot.deg + (d * 360) / N
    }
    setRot({ m, N, deg })
  }

  return (
    <svg viewBox="-34 -34 468 468" className="mx-auto block w-full max-w-[26rem]" role="img" aria-label={`Anneaux de la convolution circulaire, m = ${m}, y(m) = ${fmt(value, 4)}`}>
      {/* spokes: the pairs that are multiplied */}
      {x.map((_, n) => {
        const [a, b] = polar(R_G, n * step)
        const [c, d] = polar(R_X, n * step)
        return <line key={n} x1={a} y1={b} x2={c} y2={d} stroke={C.green} strokeOpacity={0.16} strokeDasharray="2 4" />
      })}

      {/* outer ring: x(n) */}
      <circle cx={CX} cy={CY} r={R_X} fill="none" stroke={C.blue} strokeOpacity={0.35} />
      {x.map((v, n) => (
        <Stem key={n} r={R_X} theta={n * step} v={v} scale={LEN_X / maxX} color={C.blue} />
      ))}
      {x.map((_, n) => {
        const [lx, ly] = polar(R_X + LEN_X + 22, n * step)
        return (
          <text key={n} x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fontSize={13} fill={C.inkSoft} fontFamily="Consolas, monospace">
            {n}
          </text>
        )
      })}

      {/* inner ring: g flipped, turned by m notches */}
      <g
        className="motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out"
        style={{ transform: `rotate(${deg}deg)`, transformOrigin: `${CX}px ${CY}px`, transformBox: 'view-box' }}
      >
        <circle cx={CX} cy={CY} r={R_G} fill="none" stroke={C.orange} strokeOpacity={0.35} />
        {g.map((v, k) => (
          <Stem key={k} r={R_G} theta={-k * step} v={v} scale={LEN_G / maxG} color={C.orange} filled={k === 0} />
        ))}
      </g>

      {/* centre readout */}
      <text x={CX} y={CY - 10} textAnchor="middle" fontSize={20} fill="#5ef0a0" fontFamily="Consolas, monospace">
        m = {m}
      </text>
      <text x={CX} y={CY + 16} textAnchor="middle" fontSize={15} fill={C.ink} fontFamily="Consolas, monospace">
        y({m}) = {fmt(value, 4)}
      </text>
    </svg>
  )
}
