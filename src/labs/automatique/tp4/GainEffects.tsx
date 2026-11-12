/**
 * Q3 / Q7 — effect of each gain: three small plots (one gain swept, the
 * others fixed, values of tp4_pid.m), the stepinfo of every curve, and a
 * summary table where the classic theory is checked against those numbers.
 */
import type { Data, Layout } from 'plotly.js'
import { useMemo } from 'react'
import type { TF } from '../../../control'
import Plot from '../../../components/Plot'
import { lineTrace } from '../../../components/StemPlot'
import { C } from '../../../components/theme'
import { fmt } from '../../../lib/format'
import { closedLoop, controller, measure, measuredTrend, THEORY, type Criterion, type Gain, type Gains, type SweepPoint } from './model'

type Sweeps = Record<Gain, { values: readonly number[]; fixed: Partial<Gains>; tEnd: number }>

const COLORS = [C.blue, C.orange, C.yellow, C.purple]
const GAINS: Gain[] = ['kp', 'ki', 'kd']
const CRITERIA: { id: Criterion; label: string; measure: string }[] = [
  { id: 'stabilite', label: 'Stabilité', measure: 'dépassement' },
  { id: 'rapidite', label: 'Rapidité', measure: 'temps de réponse' },
  { id: 'precision', label: 'Précision', measure: '|erreur statique|' },
]

function fixedLabel(g: Gain, fixed: Partial<Gains>): string {
  const others = GAINS.filter((x) => x !== g)
  if (others.every((x) => (fixed[x] ?? 0) === 0)) return `${others.join(' = ')} = 0`
  return others.map((x) => `${x} = ${fixed[x] ?? 0}`).join(', ')
}

export default function GainEffects({
  plant,
  r,
  sweeps,
  unit,
  yLabel,
  timeDigits = 2,
}: {
  plant: TF
  r: number
  sweeps: Sweeps
  unit: string
  yLabel: string
  timeDigits?: number
}) {
  const results = useMemo(() => {
    const out = {} as Record<Gain, { points: SweepPoint[]; baseline?: ReturnType<typeof measure> }>
    for (const g of GAINS) {
      const sw = sweeps[g]
      const at = (v: number) => measure(closedLoop(controller({ kp: 0, ki: 0, kd: 0, ...sw.fixed, [g]: v }), plant), r, sw.tEnd, 800)
      out[g] = {
        points: sw.values.map((v) => ({ value: v, m: at(v) })),
        // every ki > 0 cancels the error: precision is judged against ki = 0
        baseline: g === 'ki' ? at(0) : undefined,
      }
    }
    return out
  }, [plant, r, sweeps])

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {GAINS.map((g) => {
          const sw = sweeps[g]
          const pts = results[g].points
          const data: Data[] = [
            lineTrace([0, sw.tEnd], [r, r], { color: C.continuous, dash: 'dash', width: 1.2, hover: false, showlegend: false }),
            ...pts.map((p, i) => lineTrace(p.m.response.t, p.m.response.y, { name: `${g}=${p.value}`, color: COLORS[i], width: 2 })),
          ]
          const layout: Partial<Layout> = {
            xaxis: { title: { text: 't (s)' }, range: [0, sw.tEnd] },
            yaxis: { title: { text: yLabel } },
            margin: { l: 54, r: 14, t: 56, b: 50 },
            legend: { orientation: 'h', x: 0.5, xanchor: 'center', y: 1.0, yanchor: 'bottom', bgcolor: 'rgba(0,0,0,0)', borderwidth: 0, font: { size: 13 } },
          }
          return (
            <div key={g} className="min-w-0 space-y-2">
              <p className="font-mono text-[0.9rem]">
                <span className="font-semibold text-ink">Effet de {g}</span> <span className="text-ink-soft">({fixedLabel(g, sw.fixed)})</span>
              </p>
              <Plot data={data} layout={layout} height={310} caption={<>{g} balayé, les autres gains fixés, valeurs du .m.</>} />
              <table className="w-full border border-rule-strong bg-sheet font-mono text-[0.84rem]">
                <thead>
                  <tr className="border-b border-rule text-ink-soft">
                    <th className="px-2 py-1 text-left font-normal">{g}</th>
                    <th className="px-2 py-1 text-right font-normal">D (%)</th>
                    <th className="px-2 py-1 text-right font-normal">tᵣ (s)</th>
                    <th className="px-2 py-1 text-right font-normal">ε ({unit})</th>
                  </tr>
                </thead>
                <tbody>
                  {pts.map((p, i) => (
                    <tr key={p.value}>
                      <td className="px-2 py-0.5" style={{ color: COLORS[i] }}>
                        {p.value}
                      </td>
                      <td className="px-2 py-0.5 text-right">{p.m.stable ? fmt(p.m.info.overshoot, 2) : 'instable'}</td>
                      <td className="px-2 py-0.5 text-right">{p.m.stable ? fmt(p.m.info.settlingTime, timeDigits) : '—'}</td>
                      <td className="px-2 py-0.5 text-right">{p.m.stable ? fmt(p.m.info.staticError, 4) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>

      <figure className="overflow-x-auto border border-rule-strong bg-sheet">
        <table className="w-full min-w-[40rem] border-collapse text-[0.95rem]">
          <thead>
            <tr className="border-b border-rule-strong">
              <th className="px-4 py-2 text-left font-mono text-[0.82rem] font-normal text-trace">gain ↑</th>
              {CRITERIA.map((c) => (
                <th key={c.id} className="px-4 py-2 text-left font-semibold">
                  {c.label} <span className="font-normal text-ink-faint">({c.measure})</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GAINS.map((g) => (
              <tr key={g} className="border-b border-rule last:border-b-0 align-top">
                <td className="px-4 py-2 font-mono text-[1.05rem]">{g} ↑</td>
                {CRITERIA.map((c) => {
                  const theory = THEORY[g][c.id]
                  const m = measuredTrend(results[g].points, c.id, results[g].baseline)
                  const agree = m.arrow === theory
                  const digits = c.id === 'rapidite' ? timeDigits : c.id === 'stabilite' ? 2 : 4
                  const u = c.id === 'rapidite' ? 's' : c.id === 'stabilite' ? '%' : unit
                  const fromLabel = c.id === 'precision' && g === 'ki' ? 'ki = 0' : `${g} = ${sweeps[g].values[0]}`
                  return (
                    <td key={c.id} className="px-4 py-2">
                      <div className="flex items-baseline gap-3">
                        <span className="text-[0.85rem] text-ink-soft">théorie</span>
                        <span className="font-mono text-[1.2rem]">{theory}</span>
                        <span className="text-[0.85rem] text-ink-soft">mesuré</span>
                        <span className={`font-mono text-[1.2rem] ${agree ? 'text-trace' : 'text-pen'}`}>{m.arrow}</span>
                        <span className={`font-mono text-[0.9rem] ${agree ? 'text-trace' : 'text-pen'}`}>{agree ? '✓' : '≠'}</span>
                      </div>
                      <div className="font-mono text-[0.8rem] text-ink-faint">
                        {fromLabel} : {Number.isFinite(m.from) ? fmt(m.from, digits) : '—'} → {g} = {sweeps[g].values.at(-1)} :{' '}
                        {Number.isFinite(m.to) ? fmt(m.to, digits) : 'instable'} {u}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <figcaption className="border-t border-rule px-4 py-2 text-[0.92rem] leading-snug text-ink-soft">
          <em className="text-ink">Ce que vous voyez :</em> le tableau classique de l'effet des gains (« théorie ») confronté aux
          courbes ci-dessus (« mesuré », du premier au dernier gain balayé). ✓ : la simulation confirme la règle ; ≠ : elle ne la
          retrouve pas sur ce système — voir l'explication.
        </figcaption>
      </figure>
    </div>
  )
}
