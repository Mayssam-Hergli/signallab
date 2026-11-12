import { useId } from 'react'

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  /** formats the value readout, e.g. v => `${v} s` */
  format?: (v: number) => string
  /** small text under the slider */
  hint?: string
}

/** Thin, plain slider: label on the left, value (monospace) on the right. */
export default function Slider({ label, value, min, max, step = 1, onChange, format, hint }: SliderProps) {
  const id = useId()
  return (
    <div className="w-60">
      <div className="flex items-baseline justify-between gap-3 text-[0.9rem]">
        <label htmlFor={id} className="text-ink-soft">
          {label}
        </label>
        <output htmlFor={id} className="font-mono text-ink">
          {format ? format(value) : value}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="thin-range mt-2 w-full"
      />
      {hint && <p className="mt-1 text-[0.82rem] text-ink-soft italic">{hint}</p>}
    </div>
  )
}
