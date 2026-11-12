import type { ReactNode } from 'react'
import type { StepInfo } from '../../../control'
import { fmt } from '../../../lib/format'

export interface InfoColumn {
  label: ReactNode
  info: StepInfo
  stable: boolean
  /** the "après" column: its improvements over `compareTo` are shown in green */
  highlight?: boolean
  compareTo?: number
}

interface Row {
  label: string
  unit: string
  get: (i: StepInfo) => number
  digits: number
  /** lower is better (|value|) */
  better: 'lower'
}

/**
 * Q4 / Q8: MATLAB's stepinfo, before / after the PID. One column per
 * configuration; the PID column is green where it beats the reference.
 */
export default function StepInfoTable({
  columns,
  unit,
  timeDigits = 2,
  extraRows = [],
  caption,
}: {
  columns: InfoColumn[]
  unit: string
  timeDigits?: number
  extraRows?: { label: string; values: ReactNode[] }[]
  caption: ReactNode
}) {
  const rows: Row[] = [
    { label: 'Erreur statique', unit, get: (i) => i.staticError, digits: 4, better: 'lower' },
    { label: 'Temps de réponse (2 %)', unit: 's', get: (i) => i.settlingTime, digits: timeDigits, better: 'lower' },
    { label: 'Dépassement', unit: '%', get: (i) => i.overshoot, digits: 2, better: 'lower' },
    { label: 'Temps de montée (10 → 90 %)', unit: 's', get: (i) => i.riseTime, digits: timeDigits, better: 'lower' },
  ]
  return (
    <figure className="overflow-x-auto border border-rule-strong bg-sheet">
      <table className="w-full min-w-[34rem] border-collapse text-[0.95rem]">
        <thead>
          <tr className="border-b border-rule-strong text-left">
            <th className="px-4 py-2 font-mono text-[0.82rem] font-normal text-trace">stepinfo</th>
            {columns.map((c, k) => (
              <th key={k} className={`px-4 py-2 text-right font-semibold ${c.highlight ? 'text-trace' : ''}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="font-mono">
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-rule last:border-b-0">
              <td className="px-4 py-1.5 font-serif text-ink-soft">
                {r.label} <span className="text-ink-faint">({r.unit})</span>
              </td>
              {columns.map((c, k) => {
                const v = r.get(c.info)
                const ref = c.compareTo !== undefined ? r.get(columns[c.compareTo].info) : NaN
                const better = c.highlight && Number.isFinite(v) && Number.isFinite(ref) && Math.abs(v) < Math.abs(ref) - 1e-9
                return (
                  <td key={k} className={`px-4 py-1.5 text-right ${!c.stable ? 'text-pen' : better ? 'text-trace' : 'text-ink'}`}>
                    {!c.stable ? 'instable' : Number.isFinite(v) ? fmt(v, r.digits) : '—'}
                  </td>
                )
              })}
            </tr>
          ))}
          {extraRows.map((r) => (
            <tr key={r.label} className="border-t border-rule-strong">
              <td className="px-4 py-1.5 font-serif text-ink-soft">{r.label}</td>
              {r.values.map((v, k) => (
                <td key={k} className="px-4 py-1.5 text-right text-ink">
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <figcaption className="border-t border-rule px-4 py-2 font-serif text-[0.92rem] leading-snug text-ink-soft">
        <em className="text-ink">Ce que vous voyez :</em> {caption}
      </figcaption>
    </figure>
  )
}
