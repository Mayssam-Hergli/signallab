import type { ReactNode } from 'react'

export interface StatusCell {
  label: string
  value: ReactNode
  /** 'ok' = green, 'bad' = red, 'warn' = amber, default = plain */
  tone?: 'ok' | 'bad' | 'warn'
}

const TONE = { ok: 'text-trace', bad: 'text-[#ff5252]', warn: 'text-pen' } as const

/**
 * Row of instrument readouts (label on top, value in monospace below), like
 * the measurement bar under a scope screen. The first cell can carry a
 * stability lamp.
 */
export default function StatusStrip({ cells, lamp }: { cells: StatusCell[]; lamp?: { on: boolean; label: string } }) {
  return (
    <div className="flex flex-wrap border border-rule-strong bg-sheet" role="status" aria-live="polite">
      {lamp && (
        <div className="flex items-center gap-2.5 border-r border-rule px-4 py-2">
          <span
            aria-hidden
            className={`h-3 w-3 rounded-full ${lamp.on ? 'bg-trace shadow-[0_0_8px_#5ef0a0]' : 'bg-[#ff5252] shadow-[0_0_8px_#ff5252]'}`}
          />
          <span className={`font-mono text-[0.95rem] font-semibold ${lamp.on ? 'text-trace' : 'text-[#ff5252]'}`}>{lamp.label}</span>
        </div>
      )}
      {cells.map((c) => (
        <div key={c.label} className="border-r border-rule px-4 py-1.5 last:border-r-0">
          <div className="text-[0.8rem] text-ink-soft">{c.label}</div>
          <div className={`font-mono text-[0.95rem] ${c.tone ? TONE[c.tone] : 'text-ink'}`}>{c.value}</div>
        </div>
      ))}
    </div>
  )
}
