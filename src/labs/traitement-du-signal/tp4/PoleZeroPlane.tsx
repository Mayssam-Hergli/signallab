/**
 * z-plane like MATLAB's zplane / pzmap: unit circle, zeros ○, poles ×.
 * Hovering a root shows its value and modulus. When `onChange` is given the
 * roots can be dragged (mouse, touch, or arrow keys once focused): a
 * conjugate pair moves together, a real root stays on the real axis. A pole
 * on or outside the circle turns red.
 */
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { C, FIG_FONT } from '../../../components/theme'
import { cplxStr, type Handle } from './model'

export type RootKind = 'zero' | 'pole'

interface Props {
  zeros: Handle[]
  poles: Handle[]
  /** half-width of the view: axes from −R to R */
  R: number
  onChange?: (kind: RootKind, index: number, h: Handle) => void
  label?: string
}

const S = 420
const M = 34 // margin for tick labels
const CX = S / 2
const CY = S / 2
const SNAP_AXIS = 0.03 // a pair closer than this to the real axis lands on it (double real root)
const KEY_STEP = 0.02

interface Marker {
  kind: RootKind
  index: number
  /** lower member of a pair */
  mirror: boolean
  re: number
  im: number
}

export default function PoleZeroPlane({ zeros, poles, R, onChange, label }: Props) {
  const svg = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<Marker | null>(null)
  const [hover, setHover] = useState<Marker | null>(null)
  const scale = (S / 2 - M) / R
  const px = (re: number) => CX + re * scale
  const py = (im: number) => CY - im * scale
  const editable = Boolean(onChange)

  const markers: Marker[] = []
  const add = (kind: RootKind, hs: Handle[]) =>
    hs.forEach((h, index) => {
      markers.push({ kind, index, mirror: false, re: h.re, im: h.im })
      if (h.pair) markers.push({ kind, index, mirror: true, re: h.re, im: -h.im })
    })
  add('zero', zeros)
  add('pole', poles)

  // multiplicity of coincident roots of the same kind (e.g. the double zero at −1)
  const mult = (m: Marker) => markers.filter((o) => o.kind === m.kind && Math.hypot(o.re - m.re, o.im - m.im) < 1e-6).length
  const firstOfGroup = (m: Marker, i: number) =>
    markers.findIndex((o) => o.kind === m.kind && Math.hypot(o.re - m.re, o.im - m.im) < 1e-6) === i

  const move = (m: Marker, re: number, im: number) => {
    const list = m.kind === 'zero' ? zeros : poles
    const h = list[m.index]
    const lim = R - 0.02
    re = Math.max(-lim, Math.min(lim, re))
    let y = h.pair ? Math.abs(m.mirror ? -im : im) : 0
    if (y < SNAP_AXIS) y = 0
    y = Math.min(lim, y)
    onChange!(m.kind, m.index, { re, im: y, pair: h.pair })
  }

  const toZ = (e: PointerEvent) => {
    const ctm = svg.current!.getScreenCTM()
    if (!ctm) return null
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    return { re: (p.x - CX) / scale, im: (CY - p.y) / scale }
  }

  const onDown = (m: Marker) => (e: PointerEvent) => {
    if (!editable) return
    e.preventDefault()
    svg.current?.setPointerCapture(e.pointerId)
    setDrag(m)
  }
  const onMove = (e: PointerEvent) => {
    if (!drag) return
    const z = toZ(e)
    if (z) {
      move(drag, z.re, z.im)
      setDrag({ ...drag, re: z.re, im: z.im })
    }
  }
  const onUp = () => setDrag(null)
  const onKey = (m: Marker) => (e: KeyboardEvent) => {
    if (!editable) return
    const d = { ArrowLeft: [-KEY_STEP, 0], ArrowRight: [KEY_STEP, 0], ArrowUp: [0, KEY_STEP], ArrowDown: [0, -KEY_STEP] }[e.key]
    if (!d) return
    e.preventDefault()
    const h = (m.kind === 'zero' ? zeros : poles)[m.index]
    const im = m.mirror ? -h.im : h.im
    move(m, h.re + d[0], im + (h.pair ? d[1] : 0))
  }

  // live value of the hovered / dragged root
  const active = drag ?? hover
  const live = active
    ? (() => {
        const h = (active.kind === 'zero' ? zeros : poles)[active.index]
        if (!h) return null
        return { kind: active.kind, re: h.re, im: active.mirror ? -h.im : h.im }
      })()
    : null

  const grid: number[] = []
  for (let v = -Math.floor(R / 0.5) * 0.5; v <= R + 1e-9; v += 0.5) grid.push(Number(v.toFixed(2)))
  const text = { fontFamily: FIG_FONT, fontSize: 13 }

  return (
    <svg
      ref={svg}
      viewBox={`0 0 ${S} ${S}`}
      className="w-full select-none"
      style={{ touchAction: editable ? 'none' : undefined }}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      role="img"
      aria-label={label ?? 'Plan z : pôles et zéros'}
    >
      <rect x={M} y={M} width={S - 2 * M} height={S - 2 * M} fill={C.screen} stroke={C.frame} />
      {grid.map((v) => (
        <g key={v}>
          <line x1={px(v)} y1={M} x2={px(v)} y2={S - M} stroke={C.grid} strokeDasharray="1 4" />
          <line x1={M} y1={py(v)} x2={S - M} y2={py(v)} stroke={C.grid} strokeDasharray="1 4" />
          {Number.isInteger(v) && (
            <>
              <text x={px(v)} y={S - M + 17} textAnchor="middle" fill={C.axis} style={text}>
                {v}
              </text>
              <text x={M - 6} y={py(v) + 4} textAnchor="end" fill={C.axis} style={text}>
                {v}
              </text>
            </>
          )}
        </g>
      ))}
      <line x1={M} y1={CY} x2={S - M} y2={CY} stroke={C.frame} />
      <line x1={CX} y1={M} x2={CX} y2={S - M} stroke={C.frame} />
      <circle cx={CX} cy={CY} r={scale} fill="none" stroke={C.continuous} strokeWidth={1.4} strokeDasharray="6 4" />
      <text x={S - M} y={S - 6} textAnchor="end" fill={C.inkSoft} style={text}>
        Re(z)
      </text>
      <text x={8} y={M - 10} fill={C.inkSoft} style={text}>
        Im(z)
      </text>

      {markers.map((m, i) => {
        const x = px(m.re)
        const y = py(m.im)
        const outside = m.kind === 'pole' && Math.hypot(m.re, m.im) >= 1 - 1e-9
        const color = m.kind === 'zero' ? C.blue : outside ? C.red : C.orange
        const k = mult(m)
        const first = firstOfGroup(m, i)
        const isActive = active && active.kind === m.kind && active.index === m.index
        return (
          <g
            key={`${m.kind}${m.index}${m.mirror ? 'm' : ''}`}
            tabIndex={editable ? 0 : undefined}
            role={editable ? 'button' : undefined}
            aria-label={`${m.kind === 'zero' ? 'zéro' : 'pôle'} ${cplxStr(m, 3)}${editable ? ' (flèches pour déplacer)' : ''}`}
            onPointerDown={onDown(m)}
            onPointerEnter={() => setHover(m)}
            onPointerLeave={() => setHover((h) => (h && h.kind === m.kind && h.index === m.index && h.mirror === m.mirror ? null : h))}
            onFocus={() => setHover(m)}
            onBlur={() => setHover(null)}
            onKeyDown={onKey(m)}
            style={{ cursor: editable ? (drag ? 'grabbing' : 'grab') : 'default', outline: 'none' }}
          >
            {/* larger invisible hit area */}
            <circle cx={x} cy={y} r={14} fill="transparent" />
            {isActive && <circle cx={x} cy={y} r={13} fill="none" stroke={C.ink} strokeOpacity={0.5} strokeDasharray="2 3" />}
            {m.kind === 'zero' ? (
              <circle cx={x} cy={y} r={7} fill="none" stroke={color} strokeWidth={2.2} />
            ) : (
              <path d={`M ${x - 7} ${y - 7} L ${x + 7} ${y + 7} M ${x - 7} ${y + 7} L ${x + 7} ${y - 7}`} stroke={color} strokeWidth={2.6} />
            )}
            {k > 1 && first && (
              <text x={x + 9} y={y - 9} fill={color} style={text}>
                {k}
              </text>
            )}
          </g>
        )
      })}

      {live && (
        <g pointerEvents="none">
          {(() => {
            const mod = Math.hypot(live.re, live.im)
            const lines = [`${live.kind === 'zero' ? 'zéro' : 'pôle'} z = ${cplxStr(live, 3)}`, `|z| = ${mod.toFixed(4)}`]
            const w = 190
            const bx = Math.min(S - M - w - 4, Math.max(M + 4, px(live.re) + 14))
            const by = Math.max(M + 4, Math.min(S - M - 50, py(live.im) - 56))
            const bad = live.kind === 'pole' && mod >= 1
            return (
              <>
                <rect x={bx} y={by} width={w} height={46} fill={C.figure} stroke={bad ? C.red : C.frame} />
                {lines.map((l, j) => (
                  <text key={j} x={bx + 8} y={by + 19 + j * 18} fill={j === 1 && bad ? C.red : C.ink} style={text}>
                    {l}
                  </text>
                ))}
              </>
            )
          })()}
        </g>
      )}
    </svg>
  )
}
