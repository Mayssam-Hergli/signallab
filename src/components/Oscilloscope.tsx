/**
 * A working two-channel oscilloscope, drawn on <canvas>.
 *
 * - Screen: 10 × 8 divisions, dotted graticule, centre axes with 5 minor
 *   ticks per division (like a real scope).
 * - Everything is driven by a virtual clock `sim` (seconds). The speed slider
 *   scales how fast it advances; Stop freezes it, so the screen holds its
 *   last picture, like the Run/Stop key of a real scope.
 * - Each frame is redrawn from scratch from `sim`: the current sweep up to
 *   the beam, plus the previous sweep ahead of it, both dimmed with their age
 *   (phosphor persistence). Nothing accumulates on the canvas, so no trace
 *   can "burn in".
 * - Three demonstrations, all computed from the formulas shown next to the
 *   screen: sampling with a zero-order hold (TP1 §1.2), beats, Lissajous (XY).
 * - With prefers-reduced-motion the scope starts stopped. It never animates
 *   off screen or in a hidden tab.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { M } from './Explanation'
import Select from './Select'
import Slider from './Slider'

const DIV_X = 10
const DIV_Y = 8
/** amplitude on screen, in divisions (1.5 V at 500 mV/div) */
const A = 3
const F0 = 1000

const COL = {
  ch1: '#f2d24b',
  ch2: '#4fd6e6',
  xy: '#5ef0a0',
  grid: 'rgba(120, 200, 160, 0.22)',
  axis: 'rgba(150, 215, 185, 0.45)',
}

/** one sweep across the screen at speed ×1, in seconds of the virtual clock */
const SWEEP_S = 2
const HOLDOFF_S = 0.1
const PERIOD_S = SWEEP_S + HOLDOFF_S
/** persistence: brightness = exp(−age / TAU), age in virtual seconds */
const TAU_S = 1.4 * SWEEP_S
/** one full Lissajous figure at speed ×1 */
const XY_LOOP_S = 2
/** slow phase drift of the Lissajous figure (rad per virtual second) */
const XY_DRIFT = 0.08
const TWO_PI = 2 * Math.PI

const DEFAULT_SPEED = 0.5
/** virtual time shown when the scope starts: end of the first sweep, so the trace is complete */
const T_START = SWEEP_S * 0.999

type Mode = 'sampling' | 'beats' | 'xy'

interface Params {
  mode: Mode
  /** sampling frequency, Hz */
  fe: number
  /** beat: f₂ − f₁, Hz */
  df: number
  /** Lissajous: f_x : f_y */
  ratio: [number, number]
}

interface Trace {
  fn: (t: number) => number
  color: string
  width: number
}

interface YT {
  /** signal time across the 10 divisions, s */
  window: number
  /** signal time at the left edge, s */
  t0: number
  traces: Trace[]
  /** sampling period: draw a dot on CH2 at every sample */
  Te?: number
  sample?: (t: number) => number
}

function ytSetup(p: Params, sweep: number): YT {
  if (p.mode === 'sampling') {
    const Te = 1 / p.fe
    const x = (t: number) => A * Math.sin(TWO_PI * F0 * t)
    return {
      window: 5e-3,
      t0: 0, // triggered on CH1, rising edge at 0 V: every sweep is identical
      traces: [
        { fn: x, color: COL.ch1, width: 1.6 },
        // zero-order hold: x(nTe) held until the next sample
        { fn: (t) => x(Math.floor(t / Te + 1e-9) * Te), color: COL.ch2, width: 1.4 },
      ],
      Te,
      sample: x,
    }
  }
  // beats: triggered on the 1 kHz component, so the carrier stays put while
  // the envelope slides by Δf·T₁ of a beat period at every sweep
  const f2 = F0 + p.df
  const env = (t: number) => A * Math.abs(Math.cos(Math.PI * p.df * t))
  return {
    window: 20e-3,
    t0: sweep / F0,
    traces: [
      { fn: (t) => (A / 2) * (Math.sin(TWO_PI * F0 * t) + Math.sin(TWO_PI * f2 * t)), color: COL.ch1, width: 1.3 },
      { fn: env, color: COL.ch2, width: 1.1 },
      { fn: (t) => -env(t), color: COL.ch2, width: 1.1 },
    ],
  }
}

function drawGraticule(ctx: CanvasRenderingContext2D, W: number, H: number, dpr: number) {
  ctx.clearRect(0, 0, W, H)
  const dx = W / DIV_X
  const dy = H / DIV_Y
  const o = 0.5 * dpr
  ctx.lineWidth = dpr
  ctx.strokeStyle = COL.grid
  ctx.setLineDash([dpr, 3 * dpr])
  ctx.beginPath()
  for (let i = 1; i < DIV_X; i++) ctx.moveTo(Math.round(i * dx) + o, 0), ctx.lineTo(Math.round(i * dx) + o, H)
  for (let j = 1; j < DIV_Y; j++) ctx.moveTo(0, Math.round(j * dy) + o), ctx.lineTo(W, Math.round(j * dy) + o)
  ctx.stroke()
  ctx.setLineDash([])

  // centre axes: minor ticks every 1/5 division
  ctx.strokeStyle = COL.axis
  ctx.beginPath()
  const cx = Math.round(W / 2) + o
  const cy = Math.round(H / 2) + o
  const tick = 3 * dpr
  for (let k = 1; k < DIV_X * 5; k++) {
    const x = Math.round((k * dx) / 5) + o
    const len = k % 5 === 0 ? tick * 1.8 : tick
    ctx.moveTo(x, cy - len), ctx.lineTo(x, cy + len)
  }
  for (let k = 1; k < DIV_Y * 5; k++) {
    const y = Math.round((k * dy) / 5) + o
    const len = k % 5 === 0 ? tick * 1.8 : tick
    ctx.moveTo(cx - len, y), ctx.lineTo(cx + len, y)
  }
  ctx.stroke()
  ctx.strokeRect(o, o, W - dpr, H - dpr)
}

const brightness = (age: number) => Math.exp(-Math.max(age, 0) / TAU_S)

/** Strokes a polyline with a soft halo (wide faint pass + thin bright pass). */
function strokeBeam(ctx: CanvasRenderingContext2D, pts: number[], color: string, width: number, alpha: number, dpr: number) {
  if (pts.length < 4 || alpha < 0.01) return
  ctx.beginPath()
  ctx.moveTo(pts[0], pts[1])
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1])
  ctx.strokeStyle = color
  ctx.globalAlpha = alpha * 0.16
  ctx.lineWidth = (width + 3) * dpr
  ctx.stroke()
  ctx.globalAlpha = alpha
  ctx.lineWidth = width * dpr
  ctx.stroke()
  ctx.globalAlpha = 1
}

/** Number of pieces a sweep is cut into, each drawn at its own brightness. */
const CHUNKS = 40

/**
 * One sweep, from screen fraction f0 to f1. `ageAt(f)` = virtual time since
 * the beam was at fraction f.
 */
function drawSweep(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  dpr: number,
  s: YT,
  f0: number,
  f1: number,
  ageAt: (f: number) => number,
) {
  if (f1 <= f0) return
  const ppd = H / DIV_Y
  const yPx = (v: number) => H / 2 - v * ppd
  const step = (1.25 * dpr) / W // fraction per point
  const tAt = (f: number) => s.t0 + f * s.window

  for (const tr of s.traces) {
    for (let c = 0; c < CHUNKS; c++) {
      const a = Math.max(f0, c / CHUNKS)
      const b = Math.min(f1, (c + 1) / CHUNKS)
      if (b <= a) continue
      const pts: number[] = []
      for (let f = a; f < b; f += step) pts.push(f * W, yPx(tr.fn(tAt(f))))
      pts.push(b * W, yPx(tr.fn(tAt(b))))
      strokeBeam(ctx, pts, tr.color, tr.width, brightness(ageAt((a + b) / 2)), dpr)
    }
  }

  // sample markers x[n] = x(nTe) on the CH2 staircase
  if (s.Te && s.sample) {
    ctx.fillStyle = COL.ch2
    for (let n = Math.ceil((f0 * s.window) / s.Te - 1e-9); n * s.Te < f1 * s.window; n++) {
      const f = (n * s.Te) / s.window
      ctx.globalAlpha = brightness(ageAt(f))
      ctx.beginPath()
      ctx.arc(f * W, yPx(s.sample(s.t0 + n * s.Te)), 2.6 * dpr, 0, TWO_PI)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }
}

/** Beam spot: brightest point, where the beam is now. */
function drawSpot(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, dpr: number) {
  ctx.fillStyle = color
  ctx.globalAlpha = 0.25
  ctx.beginPath()
  ctx.arc(x, y, 5 * dpr, 0, TWO_PI)
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(x, y, 1.6 * dpr, 0, TWO_PI)
  ctx.fill()
}

function drawYT(ctx: CanvasRenderingContext2D, W: number, H: number, dpr: number, p: Params, sim: number) {
  const sweep = Math.floor(sim / PERIOD_S)
  const local = sim - sweep * PERIOD_S
  const frac = Math.min(local / SWEEP_S, 1)
  // previous sweep, still glowing ahead of the beam
  drawSweep(ctx, W, H, dpr, ytSetup(p, sweep - 1), frac, 1, (f) => local + PERIOD_S - f * SWEEP_S)
  // current sweep, up to the beam
  const cur = ytSetup(p, sweep)
  drawSweep(ctx, W, H, dpr, cur, 0, frac, (f) => local - f * SWEEP_S)
  if (frac < 1) {
    const t = cur.t0 + frac * cur.window
    for (const tr of cur.traces.slice(0, 2)) drawSpot(ctx, frac * W, H / 2 - tr.fn(t) * (H / DIV_Y), tr.color, dpr)
  }
}

function drawXY(ctx: CanvasRenderingContext2D, W: number, H: number, dpr: number, p: Params, sim: number) {
  const [a, b] = p.ratio
  const ppd = H / DIV_Y
  const omega = TWO_PI / XY_LOOP_S
  // the point the beam was at, `age` virtual seconds ago
  const at = (age: number): [number, number] => {
    const t = sim - age
    const s = omega * t
    return [W / 2 + A * Math.sin(a * s + XY_DRIFT * t) * ppd, H / 2 - A * Math.sin(b * s) * ppd]
  }
  // the last full figure, drawn from oldest to newest
  const span = XY_LOOP_S
  const pieces = 60
  const per = 12
  for (let c = pieces - 1; c >= 0; c--) {
    const a0 = (span * (c + 1)) / pieces
    const a1 = (span * c) / pieces
    const pts: number[] = []
    for (let i = 0; i <= per; i++) pts.push(...at(a0 + ((a1 - a0) * i) / per))
    strokeBeam(ctx, pts, COL.xy, 1.5, Math.exp(-((a0 + a1) / 2) / (0.6 * span)) * 0.85 + 0.15, dpr)
  }
  drawSpot(ctx, ...at(0), COL.xy, dpr)
}

function render(c: HTMLCanvasElement, p: Params, sim: number) {
  const ctx = c.getContext('2d')!
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  ctx.clearRect(0, 0, c.width, c.height)
  if (p.mode === 'xy') drawXY(ctx, c.width, c.height, dpr, p, sim)
  else drawYT(ctx, c.width, c.height, dpr, p, sim)
}

/** Frequency the samples actually show: f₀ folded into [0, fe/2]. */
function apparent(f0: number, fe: number): number {
  return Math.abs(f0 - fe * Math.round(f0 / fe))
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

interface Labels {
  aria: string
  topLeft: ReactNode
  topRight: ReactNode
  bottomLeft: string
  bottomRight: string
}

/** The screen: graticule canvas + trace canvas + on-screen readouts. */
function Screen({ params, speed, labels }: { params: Params; speed: number; labels: Labels }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLCanvasElement>(null)
  const traceRef = useRef<HTMLCanvasElement>(null)
  const paramsRef = useRef(params)
  const speedRef = useRef(speed)
  const simRef = useRef(T_START)
  paramsRef.current = params
  speedRef.current = speed

  // canvas sizing + graticule
  useEffect(() => {
    const box = boxRef.current!
    const ro = new ResizeObserver(() => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const W = Math.round(box.clientWidth * dpr)
      const H = Math.round(box.clientHeight * dpr)
      for (const c of [gridRef.current!, traceRef.current!]) {
        c.width = W
        c.height = H
      }
      drawGraticule(gridRef.current!.getContext('2d')!, W, H, dpr)
      render(traceRef.current!, paramsRef.current, simRef.current)
    })
    ro.observe(box)
    return () => ro.disconnect()
  }, [])

  // stopped: redraw the frozen picture whenever a setting changes
  useEffect(() => {
    if (speed === 0) render(traceRef.current!, params, simRef.current)
  }, [speed, params])

  // running: animation loop (only while visible)
  useEffect(() => {
    if (speed === 0) return
    const c = traceRef.current!
    let raf = 0
    let running = false
    let last = 0
    let inView = true

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      simRef.current += dt * speedRef.current
      render(c, paramsRef.current, simRef.current)
      raf = requestAnimationFrame(frame)
    }
    const start = () => {
      if (running || !inView || document.hidden) return
      running = true
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }
    const stop = () => {
      running = false
      cancelAnimationFrame(raf)
    }
    const onVis = () => (document.hidden ? stop() : start())
    const io = new IntersectionObserver(([e]) => {
      inView = e.isIntersecting
      if (inView) start()
      else stop()
    })
    io.observe(c)
    document.addEventListener('visibilitychange', onVis)
    start()
    return () => {
      stop()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [speed === 0]) // restart only on run ⇄ stop; speed changes are read from speedRef

  return (
    <div
      ref={boxRef}
      className="relative aspect-[10/8] w-full overflow-hidden bg-screen shadow-[inset_0_0_40px_rgba(0,0,0,0.9)]"
      role="img"
      aria-label={labels.aria}
    >
      <canvas ref={gridRef} className="absolute inset-0 h-full w-full" />
      <canvas ref={traceRef} className="absolute inset-0 h-full w-full" />
      {/* faint glass reflection */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_30%_10%,rgba(94,240,160,0.06),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between gap-2 px-2 py-1 font-mono text-[13px]">
        <span>{labels.topLeft}</span>
        <span className="text-ink-soft">{labels.topRight}</span>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between gap-2 px-2 py-1 font-mono text-[13px] text-ink-soft">
        <span>{labels.bottomLeft}</span>
        <span>{labels.bottomRight}</span>
      </div>
    </div>
  )
}

function labelsFor(p: Params): Labels {
  const ch1 = <span style={{ color: COL.ch1 }}>CH1 500mV/div</span>
  const ch2 = <span style={{ color: COL.ch2 }}>CH2 500mV/div</span>
  if (p.mode === 'xy') {
    return {
      aria: `Figure de Lissajous, rapport de fréquences ${p.ratio[0]}:${p.ratio[1]}`,
      topLeft: <span style={{ color: COL.xy }}>XY  CH1→X  CH2→Y</span>,
      topRight: `fx:fy = ${p.ratio[0]}:${p.ratio[1]}`,
      bottomLeft: '500mV/div',
      bottomRight: 'mode XY',
    }
  }
  const both = (
    <span className="flex gap-4">
      {ch1}
      {ch2}
    </span>
  )
  if (p.mode === 'sampling') {
    return {
      aria: `Sinus de 1 kHz (CH1) et sa version échantillonnée-bloquée à ${p.fe} Hz (CH2)`,
      topLeft: both,
      topRight: `fe = ${(p.fe / 1000).toFixed(1)} kHz`,
      bottomLeft: 'M 500µs/div',
      bottomRight: 'Trig CH1 ↑ 0V',
    }
  }
  return {
    aria: `Battements entre 1 kHz et ${F0 + p.df} Hz (CH1) et leur enveloppe (CH2)`,
    topLeft: both,
    topRight: `Δf = ${p.df} Hz`,
    bottomLeft: 'M 2ms/div',
    bottomRight: 'Trig CH1 ↑ 0V',
  }
}

const MODES: { id: Mode; label: string }[] = [
  { id: 'sampling', label: 'Échantillonnage' },
  { id: 'beats', label: 'Battements' },
  { id: 'xy', label: 'Lissajous (XY)' },
]

const RATIOS: [number, number][] = [
  [1, 1],
  [1, 2],
  [2, 3],
  [3, 4],
]

/** Full instrument: screen + front panel (mode keys, sweep speed, one control, measurements, formula). */
export default function Oscilloscope() {
  const [params, setParams] = useState<Params>({ mode: 'sampling', fe: 8000, df: 100, ratio: [2, 3] })
  const set = (patch: Partial<Params>) => setParams((p) => ({ ...p, ...patch }))
  // speed 0 = stopped. With reduced motion the scope starts stopped.
  const [speed, setSpeed] = useState(() => (prefersReducedMotion() ? 0 : DEFAULT_SPEED))
  // last non-zero speed, restored by the Run key
  const [lastSpeed, setLastSpeed] = useState(DEFAULT_SPEED)
  const running = speed > 0
  const changeSpeed = (v: number) => {
    setSpeed(v)
    if (v > 0) setLastSpeed(v)
  }
  const fa = apparent(F0, params.fe)

  return (
    <div className="border border-rule-strong bg-sheet">
      <div className="flex items-center justify-between gap-4 border-b border-rule px-4 py-1.5 font-mono text-[0.8rem] text-ink-soft">
        <span>Oscilloscope 2 voies</span>
        <button
          type="button"
          onClick={() => (running ? setSpeed(0) : setSpeed(lastSpeed))}
          aria-pressed={!running}
          title={running ? 'Figer l’affichage' : 'Relancer le balayage'}
          className={`flex items-center gap-2 border px-2.5 py-0.5 transition-colors ${
            running ? 'border-trace/60 text-trace hover:bg-trace/[0.08]' : 'border-[#ff5252]/70 text-[#ff7070] hover:bg-[#ff5252]/[0.08]'
          }`}
        >
          <span
            className={`inline-block h-2 w-2 rounded-full ${running ? 'bg-trace shadow-[0_0_6px_#5ef0a0]' : 'bg-[#ff5252] shadow-[0_0_6px_#ff5252]'}`}
          />
          {running ? 'Run' : 'Stop'}
        </button>
      </div>

      <div className="grid gap-5 p-4 md:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="border-[6px] border-[#1a222c] shadow-[0_0_0_1px_#2c3846]">
          <Screen params={params} speed={speed} labels={labelsFor(params)} />
        </div>

        <div className="flex flex-col gap-5 text-[0.95rem]">
          <div role="group" aria-label="Mode" className="grid grid-cols-1 gap-1.5">
            {MODES.map((m) => {
              const on = m.id === params.mode
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set({ mode: m.id })}
                  className={`flex items-center gap-2.5 border px-3 py-1.5 text-left transition-colors ${
                    on ? 'border-trace/70 bg-trace/[0.07] text-ink' : 'border-rule-strong text-ink-soft hover:text-ink'
                  }`}
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${on ? 'bg-trace shadow-[0_0_6px_#5ef0a0]' : 'bg-ink-faint/50'}`}
                  />
                  {m.label}
                </button>
              )
            })}
          </div>

          <Slider
            label="Vitesse du balayage"
            value={speed}
            min={0}
            max={2}
            step={0.05}
            onChange={changeSpeed}
            format={(v) => (v === 0 ? 'arrêt' : `×${v.toFixed(2)}`)}
            hint={
              running
                ? params.mode === 'xy'
                  ? `une figure complète en ${(XY_LOOP_S / speed).toFixed(1)} s`
                  : `un balayage de l’écran dure ${(SWEEP_S / speed).toFixed(1)} s`
                : 'affichage figé : 0 = arrêt'
            }
          />

          {params.mode === 'sampling' && (
            <Slider
              label="fe"
              value={params.fe}
              min={1000}
              max={20000}
              step={100}
              onChange={(fe) => set({ fe })}
              format={(v) => `${(v / 1000).toFixed(1)} kHz`}
            />
          )}
          {params.mode === 'beats' && (
            <Slider label="Δf = f₂ − f₁" value={params.df} min={20} max={300} step={10} onChange={(df) => set({ df })} format={(v) => `${v} Hz`} />
          )}
          {params.mode === 'xy' && (
            <Select
              label="fx : fy"
              value={params.ratio.join(':')}
              options={RATIOS.map((r) => ({ value: r.join(':'), label: r.join(':') }))}
              onChange={(v) => set({ ratio: v.split(':').map(Number) as [number, number] })}
            />
          )}

          <div className="space-y-1.5 border-t border-rule pt-4">
            {params.mode === 'sampling' && (
              <>
                <p>
                  <M>{'x(t) = \\sin(2\\pi f_0 t),\\ f_0 = 1\\,\\text{kHz}'}</M>
                </p>
                <p>
                  <M>{'x[n] = x(nT_e),\\ T_e = 1/f_e'}</M>
                </p>
                <p className={`pt-1 font-mono text-[0.88rem] ${params.fe < 2 * F0 ? 'text-pen' : 'text-ink-soft'}`}>
                  {params.fe > 2 * F0 ? 'fe > 2f₀ : pas de repliement' : params.fe === 2 * F0 ? 'fe = 2f₀ : cas limite' : 'fe < 2f₀ : repliement'}
                  <br />f apparente = {fa.toFixed(0)} Hz
                </p>
              </>
            )}
            {params.mode === 'beats' && (
              <>
                <p>
                  <M>{'\\sin\\omega_1 t + \\sin\\omega_2 t'}</M>
                </p>
                <p>
                  <M>{'= 2\\cos\\!\\big(\\tfrac{\\omega_2-\\omega_1}{2}t\\big)\\sin\\!\\big(\\tfrac{\\omega_1+\\omega_2}{2}t\\big)'}</M>
                </p>
                <p className="pt-1 font-mono text-[0.88rem] text-ink-soft">
                  période des battements = 1/Δf = {(1000 / params.df).toFixed(1)} ms
                </p>
              </>
            )}
            {params.mode === 'xy' && (
              <>
                <p>
                  <M>{`x = \\sin(${params.ratio[0] === 1 ? '' : params.ratio[0]}\\omega t + \\varphi)`}</M>
                </p>
                <p>
                  <M>{`y = \\sin(${params.ratio[1] === 1 ? '' : params.ratio[1]}\\omega t)`}</M>
                </p>
                <p className="pt-1 font-mono text-[0.88rem] text-ink-soft">
                  bord droit touché {params.ratio[0]} fois, bord haut {params.ratio[1]} fois → fx/fy = {params.ratio[0]}/
                  {params.ratio[1]}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
