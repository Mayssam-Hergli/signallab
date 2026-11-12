import { useId } from 'react'

interface ToggleProps {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  hint?: string
}

/** Plain checkbox. */
export default function Toggle({ label, checked, onChange, hint }: ToggleProps) {
  const id = useId()
  return (
    <div className="max-w-64">
      <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-[0.9rem] text-ink-soft">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="h-3.5 w-3.5 accent-[#5ef0a0]"
        />
        {label}
      </label>
      {hint && <p className="mt-1 text-[0.82rem] text-ink-soft italic">{hint}</p>}
    </div>
  )
}
