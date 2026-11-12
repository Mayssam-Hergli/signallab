import { useId } from 'react'

export interface SelectOption<T> {
  value: T
  label: string
  /** marks the TP's own values */
  tp?: boolean
}

interface SelectProps<T> {
  label: string
  value: T | null
  options: SelectOption<T>[]
  onChange: (v: T) => void
  hint?: string
}

/**
 * Choice among a few options, shown as plain radio buttons so every option
 * stays visible at a glance on a projector. `value = null` means none is
 * checked (e.g. a slider moved to a value that is not a preset).
 * Values used by the TP are marked with a small "TP".
 */
export default function Select<T extends string | number>({ label, value, options, onChange, hint }: SelectProps<T>) {
  const name = useId()
  return (
    <fieldset>
      <legend className="text-[0.9rem] text-ink-soft">{label}</legend>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
        {options.map((o) => (
          <label key={String(o.value)} className="flex cursor-pointer items-center gap-1.5 text-[0.95rem]">
            <input
              type="radio"
              name={name}
              checked={o.value === value}
              onChange={() => onChange(o.value)}
              className="h-3.5 w-3.5 accent-[#5ef0a0]"
            />
            <span className={o.value === value ? 'text-ink' : 'text-ink-soft'}>{o.label}</span>
            {o.tp && <sup className="text-[0.65rem] text-ink-soft">TP</sup>}
          </label>
        ))}
      </div>
      {hint && <p className="mt-1 text-[0.82rem] text-ink-soft italic">{hint}</p>}
    </fieldset>
  )
}
