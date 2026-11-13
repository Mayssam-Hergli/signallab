/**
 * Q9–Q10 "spectrum analyser": the FFT bins (yellow, like CH1) over the true
 * spectrum of the record (DTFT, phosphor green), zoomed on 105 Hz. The bin
 * spacing Δf = Fe/N plays the role of the instrument's resolution bandwidth;
 * when 105 Hz falls exactly on a bin the LOCK lamp lights up.
 */
import { FIG_FONT, C } from '../../../components/theme'
import { fmt } from '../../../lib/format'
import { F4, bandMax, niceTop, type Resolution } from './model'

export type Scale = 'lin' | 'db'

const W = 820
const H = 330
const PAD = { l: 58, r: 16, t: 14, b: 40 }
const F_MIN = 40
const F_MAX = 170
const DB_TOP = 0
const DB_FLOOR = -80

/** graticule step: 0.1 up to 0.6, 0.2 above */
const linStep = (top: number) => (top > 0.6 + 1e-9 ? 0.2 : 0.1)

const X = (f: number) => PAD.l + ((f - F_MIN) / (F_MAX - F_MIN)) * (W - PAD.l - PAD.r)

function yOf(v: number, scale: Scale, linTop: number): number {
  const top = PAD.t
  const bottom = H - PAD.b
  if (scale === 'lin') return bottom - (Math.min(v, linTop * 1.04) / linTop) * (bottom - top)
  const db = Math.max(DB_FLOOR, Math.min(DB_TOP, 20 * Math.log10(Math.max(v, 1e-12))))
  return bottom - ((db - DB_FLOOR) / (DB_TOP - DB_FLOOR)) * (bottom - top)
}

const KEY = 'h-8 border px-3 font-mono text-[0.85rem] transition-colors'
const OFF = 'border-rule-strong text-ink-soft hover:border-ink-soft hover:text-ink'
const ON = 'border-trace/70 bg-trace/[0.08] text-trace'

export default function SpectrumAnalyzer({
  r,
  scale,
  onScale,
  sweeping,
  onSweep,
}: {
  r: Resolution
  scale: Scale
  onScale: (s: Scale) => void
  sweeping: boolean
  onSweep: () => void
}) {
  const { view } = r
  // reference level (top of the screen): 0.6, raised when the DC line's lobes reach the span (short records)
  const ref = niceTop(bandMax(r.fDense, r.dense, F_MIN, F_MAX))
  const yv = (v: number) => yOf(v, scale, ref)
  // DTFT trace inside the span
  let path = ''
  r.fDense.forEach((f, i) => {
    if (f < F_MIN - 1 || f > F_MAX + 1) return
    path += `${path ? 'L' : 'M'}${X(f).toFixed(1)} ${yv(r.dense[i]).toFixed(1)}`
  })
  const bins = view.f.map((f, i) => ({ f, v: view.mag[i] })).filter((b) => b.f >= F_MIN && b.f <= F_MAX)
  const base = H - PAD.b
  const ticksY =
    scale === 'lin'
      ? Array.from({ length: Math.floor(ref / linStep(ref) + 1e-9) + 1 }, (_, i) => i * linStep(ref)).map((v) => ({ y: yOf(v, 'lin', ref), label: v.toFixed(1) }))
      : [0, -10, -20, -30, -40, -50, -60, -70, -80].map((d) => ({ y: yOf(10 ** (d / 20), 'db', ref), label: String(d) }))
  const ticksX = [40, 60, 80, 100, 120, 140, 160]
  const text = { fontFamily: FIG_FONT, fontSize: 13 }
  const mx = X(r.peakF)
  const my = yv(r.peakMag)

  return (
    <div className="border border-rule-strong bg-sheet">
      {/* instrument header */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-rule px-4 py-2 font-mono text-[0.85rem]">
        <span className="text-ink-soft">
          CENTRE <span className="text-ink">105 Hz</span>
        </span>
        <span className="text-ink-soft">
          SPAN <span className="text-ink">{F_MAX - F_MIN} Hz</span>
        </span>
        <span className="text-ink-soft">
          RBW = Δf <span className="text-ink">{fmt(view.df, view.df < 10 ? 2 : 1)} Hz</span>
        </span>
        <span className="text-ink-soft">
          T = tmax <span className="text-ink">{r.tmax.toFixed(3)} s</span>
        </span>
        <span className="text-ink-soft">
          N <span className="text-ink">{view.N}</span>
        </span>
        <span className="text-ink-soft">
          REF <span className="text-ink">{scale === 'lin' ? ref.toFixed(1) : '0 dB'}</span>
        </span>
        <span className="ml-auto flex items-center gap-2" aria-live="polite">
          <span
            className={`inline-block h-3 w-3 rounded-full ${r.onBin ? 'bg-trace shadow-[0_0_8px_#5ef0a0]' : 'bg-pen/70'}`}
            aria-hidden
          />
          <span className={r.onBin ? 'text-trace' : 'text-pen'}>{r.onBin ? 'LOCK 105 Hz' : 'FUITE'}</span>
        </span>
      </div>

      <div className="bg-screen p-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Analyseur de spectre autour de 105 Hz">
          {/* graticule */}
          {Array.from({ length: 11 }, (_, i) => PAD.l + (i * (W - PAD.l - PAD.r)) / 10).map((x) => (
            <line key={`v${x}`} x1={x} y1={PAD.t} x2={x} y2={base} stroke={C.grid} strokeDasharray="1 4" />
          ))}
          {ticksY.map((t) => (
            <g key={`h${t.label}`}>
              <line x1={PAD.l} y1={t.y} x2={W - PAD.r} y2={t.y} stroke={C.grid} strokeDasharray="1 4" />
              <text x={PAD.l - 8} y={t.y + 4} textAnchor="end" fill={C.axis} style={text}>
                {t.label}
              </text>
            </g>
          ))}
          <rect x={PAD.l} y={PAD.t} width={W - PAD.l - PAD.r} height={base - PAD.t} fill="none" stroke={C.frame} />
          {ticksX.map((f) => (
            <text key={f} x={X(f)} y={base + 20} textAnchor="middle" fill={C.axis} style={text}>
              {f}
            </text>
          ))}
          <text x={W - PAD.r} y={base + 36} textAnchor="end" fill={C.inkSoft} style={text}>
            f (Hz)
          </text>
          <text x={14} y={PAD.t + 4} fill={C.inkSoft} style={{ ...text, writingMode: 'vertical-rl' }}>
            {scale === 'lin' ? '|X4|/N' : '20 log₁₀ |X4|/N (dB)'}
          </text>

          {/* 105 Hz target */}
          <line x1={X(F4)} y1={PAD.t} x2={X(F4)} y2={base} stroke={C.red} strokeWidth={1} strokeDasharray="5 4" opacity={0.8} />
          <text x={X(F4) - 6} y={PAD.t + 14} textAnchor="end" fill={C.red} style={text}>
            105 Hz
          </text>

          {/* true spectrum of the record */}
          <path d={path} fill="none" stroke="#5ef0a0" strokeWidth={1.6} opacity={0.75} style={{ filter: 'drop-shadow(0 0 3px rgba(94,240,160,0.5))' }} />

          {/* FFT bins */}
          {bins.map((b) => {
            const y = yv(b.v)
            const on = Math.abs(b.f - F4) < 1e-9
            const color = on ? '#5ef0a0' : C.yellow
            return (
              <g key={b.f}>
                <line x1={X(b.f)} y1={base} x2={X(b.f)} y2={y} stroke={color} strokeWidth={on ? 2.4 : 1.6} />
                <circle cx={X(b.f)} cy={y} r={3.2} fill={color} />
              </g>
            )
          })}

          {/* marker on the highest bin */}
          <path d={`M ${mx} ${my - 8} l 6 -9 h -12 z`} fill={C.ink} />
          <text x={Math.min(mx + 10, W - 190)} y={Math.max(my - 12, PAD.t + 30)} fill={C.ink} style={text}>
            MKR {fmt(r.peakF, r.peakF % 1 ? 2 : 1)} Hz · {scale === 'lin' ? fmt(r.peakMag, 3) : `${fmt(20 * Math.log10(r.peakMag), 1)} dB`}
          </text>
        </svg>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-rule px-4 py-2">
        <button type="button" onClick={onSweep} aria-pressed={sweeping} className={`${KEY} min-w-44 ${sweeping ? ON : OFF}`}>
          {sweeping ? '❚❚ Arrêter le balayage' : '▶ Balayer tmax'}
        </button>
        <span className="flex gap-1" role="group" aria-label="Échelle verticale">
          {(['lin', 'db'] as const).map((s) => (
            <button key={s} type="button" onClick={() => onScale(s)} aria-pressed={scale === s} className={`${KEY} px-2 ${scale === s ? ON : OFF}`}>
              {s === 'lin' ? 'LIN' : 'dB'}
            </button>
          ))}
        </span>
        <span className="text-[0.85rem] text-ink-soft">
          <span className="text-ml-yellow">tiges jaunes : raies de la FFT</span> · <span className="text-trace">courbe verte : spectre vrai (TFTD)</span>
        </span>
      </div>
    </div>
  )
}
