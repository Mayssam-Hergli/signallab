import type { ReactNode } from 'react'

/** 'note' = normal result, 'warn' = amber (something to watch). */
type Tone = 'note' | 'warn'

/** Thin-ruled box holding a key result of the current settings. */
export default function Insight({
  title,
  children,
  tone = 'note',
}: {
  title: ReactNode
  children?: ReactNode
  tone?: Tone
}) {
  return (
    <div className={`border bg-sheet px-4 py-2.5 ${tone === 'warn' ? 'border-pen text-pen' : 'border-rule-strong text-ink'}`}>
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-0.5 text-[0.95rem]">{children}</div>}
    </div>
  )
}

/** One measured value: "label : value unit" (value in monospace). */
export function Readout({ label, value, unit, tone = 'note' }: { label: string; value: string; unit?: string; tone?: Tone }) {
  return (
    <div className="flex items-baseline gap-2 text-[0.92rem]">
      <span className="text-ink-soft">{label} :</span>
      <span className={`font-mono ${tone === 'warn' ? 'text-pen' : 'text-ink'}`}>
        {value}
        {unit && ` ${unit}`}
      </span>
    </div>
  )
}
