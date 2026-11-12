import type { ReactNode } from 'react'

/**
 * What MATLAB prints in the Command Window (fprintf / disp), computed live.
 * `note` is shown under the output, outside the console.
 */
export default function Console({ lines, note }: { lines: ReactNode[]; note?: ReactNode }) {
  return (
    <div>
      <pre className="overflow-x-auto border border-rule-strong bg-screen px-4 py-2.5 font-mono text-[0.95rem] leading-relaxed text-trace">
        {lines.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </pre>
      {note && <p className="mt-1 text-[0.85rem] text-ink-soft italic">{note}</p>}
    </div>
  )
}

/**
 * MATLAB disp(table(...)): column names, then one row per index. Numbers in
 * monospace with 4 decimals. `highlight` marks one row (e.g. the current step).
 */
export function ValueTable({
  columns,
  rows,
  highlight,
  caption,
}: {
  columns: string[]
  rows: (number | string)[][]
  highlight?: number
  caption?: ReactNode
}) {
  return (
    <div className="overflow-x-auto border border-rule-strong bg-screen">
      <table className="w-full border-collapse font-mono text-[0.92rem]">
        {caption && <caption className="border-b border-rule px-3 py-1.5 text-left font-serif text-[0.88rem] text-ink-soft">{caption}</caption>}
        <thead>
          <tr className="border-b border-rule text-ink-soft">
            {columns.map((c) => (
              <th key={c} scope="col" className="px-3 py-1.5 text-right font-normal first:text-center">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={i === highlight ? 'bg-trace/[0.09] text-ink' : 'text-ink/90'}>
              {r.map((v, j) => (
                <td key={j} className={`px-3 py-0.5 text-right tabular-nums first:text-center ${j === 0 ? 'text-ink-soft' : ''}`}>
                  {typeof v === 'number' ? v.toFixed(4) : v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
