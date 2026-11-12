/**
 * Figure 4.3 redrawn: speed loop of the DC motor with a PID, the inner
 * back-EMF loop (ke), the torque constant kc and the load torque cr.
 *
 *   U →(⊗)→ [PID] →(⊗)→ [1/(Ls+R)] → ▷kc →(⊗)→ [1/(Js+f)] →┬→ Ω
 *      ↑−          ↑−────────── ◁ke ────────── −↑cr          │
 *      └─────────────────────────────────────────────────────┘
 */
import { useFlash } from './flash'

interface MccDiagramProps {
  kp: number
  ki: number
  kd: number
  /** inductance label, e.g. "0.011 mH" */
  L: string
  cr: number
}

const Y = 70
const Y_IN = 150 // inner (ke) loop
const Y_OUT = 222 // outer loop
const RS = 12

function Sum({ cx }: { cx: number }) {
  return (
    <g>
      <circle cx={cx} cy={Y} r={RS} className="fill-sheet stroke-ink-soft" strokeWidth={1.4} />
      <path d={`M${cx - 8.5} ${Y - 8.5} L${cx + 8.5} ${Y + 8.5} M${cx - 8.5} ${Y + 8.5} L${cx + 8.5} ${Y - 8.5}`} className="stroke-ink-soft" strokeWidth={1.2} />
      <text x={cx - 22} y={Y - 12} className="fill-ink-soft font-mono text-[14px]">
        +
      </text>
      <text x={cx - 20} y={Y + 30} className="fill-ink-soft font-mono text-[15px]">
        −
      </text>
    </g>
  )
}

function Box({ x, w, title, value, lit }: { x: number; w: number; title: string; value?: string; lit: boolean }) {
  return (
    <g>
      <rect x={x} y={Y - 30} width={w} height={60} className={`transition-[fill,stroke] duration-300 ${lit ? 'fill-trace/15 stroke-trace' : 'fill-sheet stroke-rule-strong'}`} strokeWidth={1.5} />
      <text x={x + w / 2} y={value ? Y - 4 : Y + 5} textAnchor="middle" className="fill-ink font-serif text-[15px] italic">
        {title}
      </text>
      {value && (
        <text x={x + w / 2} y={Y + 17} textAnchor="middle" className={`font-mono text-[12px] ${lit ? 'fill-trace' : 'fill-ink-soft'}`}>
          {value}
        </text>
      )}
    </g>
  )
}

const wire = 'stroke-ink-soft'

export default function MccDiagram({ kp, ki, kd, L, cr }: MccDiagramProps) {
  const pidLit = useFlash(`${kp}|${ki}|${kd}`)
  const lLit = useFlash(L)
  const crLit = useFlash(cr)
  const W = 1000
  const s1 = 90
  const s2 = 340
  const s3 = 668
  const tap = 900
  const crCls = crLit ? 'stroke-trace' : 'stroke-pen'

  return (
    <figure className="border border-rule-strong bg-screen">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} 245`}
          role="img"
          aria-label={`Asservissement de vitesse du MCC : PID kp = ${kp}, ki = ${ki}, kd = ${kd}, L = ${L}, cr = ${cr} N·m`}
          className="block w-full min-w-[44rem]"
        >
          <defs>
            <marker id="mcc-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" className="fill-ink-soft" />
            </marker>
          </defs>

          {/* U → Σ1 */}
          <text x={10} y={Y - 12} className="fill-ink font-serif text-[15px] font-semibold italic">
            U
          </text>
          <path d={`M8 ${Y} H${s1 - RS}`} className={wire} strokeWidth={1.4} markerEnd="url(#mcc-arrow)" />
          <Sum cx={s1} />

          {/* PID */}
          <path d={`M${s1 + RS} ${Y} H128`} className={wire} strokeWidth={1.4} markerEnd="url(#mcc-arrow)" />
          <Box x={128} w={168} title="PID" value={`kp ${kp} · ki ${ki} · kd ${kd}`} lit={pidLit} />
          <path d={`M296 ${Y} H${s2 - RS}`} className={wire} strokeWidth={1.4} markerEnd="url(#mcc-arrow)" />
          <Sum cx={s2} />

          {/* 1/(Ls+R) */}
          <path d={`M${s2 + RS} ${Y} H380`} className={wire} strokeWidth={1.4} markerEnd="url(#mcc-arrow)" />
          <Box x={380} w={150} title="1/(Ls + R)" value={`L = ${L}`} lit={lLit} />

          {/* kc gain triangle */}
          <path d={`M530 ${Y} H560`} className={wire} strokeWidth={1.4} />
          <path d={`M560 ${Y - 18} L600 ${Y} L560 ${Y + 18} Z`} className="fill-sheet stroke-ink-soft" strokeWidth={1.4} />
          <text x={572} y={Y - 26} textAnchor="middle" className="fill-ink font-serif text-[14px] italic">
            kc
          </text>
          <path d={`M600 ${Y} H${s3 - RS}`} className={wire} strokeWidth={1.4} markerEnd="url(#mcc-arrow)" />
          <Sum cx={s3} />

          {/* load torque cr */}
          <path d={`M612 ${Y + 52} H${s3} V${Y + RS}`} fill="none" className={`${crCls} transition-[stroke] duration-300`} strokeWidth={1.6} markerEnd="url(#mcc-arrow)" />
          <text x={606} y={Y + 57} textAnchor="end" className={`font-mono text-[13px] ${crLit ? 'fill-trace' : 'fill-pen'}`}>
            <tspan className="font-serif text-[15px] italic">cr</tspan> = {cr} N·m
          </text>

          {/* 1/(Js+f) */}
          <path d={`M${s3 + RS} ${Y} H708`} className={wire} strokeWidth={1.4} markerEnd="url(#mcc-arrow)" />
          <Box x={708} w={150} title="1/(Js + f)" value="J = 0.2 · f = 0.01" lit={false} />

          {/* output Ω */}
          <path d={`M858 ${Y} H${W - 12}`} className={wire} strokeWidth={1.4} markerEnd="url(#mcc-arrow)" />
          <text x={W - 12} y={Y - 12} textAnchor="end" className="fill-ink font-serif text-[16px] font-semibold italic">
            Ω
          </text>
          <circle cx={tap} cy={Y} r={2.6} className="fill-ink-soft" />

          {/* inner loop through ke */}
          <path d={`M${tap} ${Y} V${Y_OUT}`} className={wire} strokeWidth={1.4} />
          <circle cx={tap} cy={Y_IN} r={2.6} className="fill-ink-soft" />
          <path d={`M${tap} ${Y_IN} H498`} className={wire} strokeWidth={1.4} />
          <path d={`M498 ${Y_IN - 16} L462 ${Y_IN} L498 ${Y_IN + 16} Z`} className="fill-sheet stroke-ink-soft" strokeWidth={1.4} />
          <text x={482} y={Y_IN + 34} textAnchor="middle" className="fill-ink font-serif text-[14px] italic">
            ke
          </text>
          <path d={`M462 ${Y_IN} H${s2} V${Y + RS}`} fill="none" className={wire} strokeWidth={1.4} markerEnd="url(#mcc-arrow)" />

          {/* outer loop */}
          <path d={`M${tap} ${Y_OUT} H${s1} V${Y + RS}`} fill="none" className={wire} strokeWidth={1.4} markerEnd="url(#mcc-arrow)" />
        </svg>
      </div>
    </figure>
  )
}
