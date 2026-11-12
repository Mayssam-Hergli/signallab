/**
 * Left rail of the lab pages.
 *
 * - TP keys (like a scope's channel buttons) to switch TP.
 * - The current TP's sections drawn as a stem plot turned on its side: one
 *   node per section on a vertical line. The section being read is lit
 *   (scroll-spy), the line is "charged" in green up to it.
 * - The .m file of the TP at the bottom.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { COURSE } from '../labs/course'
import { labs, type LabDef } from '../labs/registry'
import { matlabUrl } from '../lib/useMatlabFile'

/** Id of the section currently under the reading line (≈ 25 % from the top). */
function useActiveSection(lab: LabDef): string | null {
  const [active, setActive] = useState<string | null>(lab.sections[0]?.id ?? null)

  useEffect(() => {
    const ids = lab.sections.map((s) => s.id)
    setActive(ids[0] ?? null)
    const pick = () => {
      const line = window.innerHeight * 0.25
      let current = ids[0] ?? null
      for (const id of ids) {
        const el = document.getElementById(`section-${id}`)
        if (el && el.getBoundingClientRect().top <= line) current = id
      }
      // at the very bottom, the last section is the one being read
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = ids.at(-1) ?? current
      setActive(current)
    }
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(pick)
    }
    pick()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [lab])

  return active
}

function goTo(id: string) {
  const el = document.getElementById(`section-${id}`)
  if (!el) return
  const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' })
}

/** TP1 / TP2 / TP3 keys. */
export function LabKeys({ current }: { current: LabDef }) {
  return (
    <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Choisir le TP">
      {labs.map((lab) => {
        const on = lab.id === current.id
        const label = `TP ${lab.number}`
        if (lab.status === 'locked') {
          return (
            <span
              key={lab.id}
              title="à venir"
              className="border border-rule py-1 text-center font-mono text-[0.85rem] text-ink-faint"
            >
              {label}
            </span>
          )
        }
        return (
          <Link
            key={lab.id}
            to={`/tp/${lab.id}`}
            aria-current={on ? 'page' : undefined}
            className={`border py-1 text-center font-mono text-[0.85rem] transition-colors ${
              on ? 'border-trace/70 bg-trace/[0.08] text-trace' : 'border-rule-strong text-ink-soft hover:border-ink-soft hover:text-ink'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </div>
  )
}

export default function LabNav({ lab }: { lab: LabDef }) {
  const active = useActiveSection(lab)
  const activeIndex = lab.sections.findIndex((s) => s.id === active)
  const n = lab.sections.length

  return (
    <nav aria-label={`Sections du TP ${lab.number}`} className="flex h-full flex-col">
      <Link to="/" className="font-mono text-[0.82rem] text-ink-soft hover:text-trace">
        ← Sommaire
      </Link>
      <p className="mt-1 text-[0.85rem] text-ink-faint">
        {COURSE.subject} · {COURSE.group}
      </p>

      <div className="mt-6">
        <LabKeys current={lab} />
      </div>

      <p className="mt-7 font-mono text-[0.82rem] text-trace">TP {lab.number}</p>
      <p className="text-[1.15rem] leading-snug font-bold">{lab.title || 'À venir'}</p>

      {lab.status === 'ready' && (
        <ol className="mt-5">
          {lab.sections.map((s, i) => {
            const isActive = i === activeIndex
            const passed = i < activeIndex
            const ready = Boolean(s.component)
            // rail above / below the node: green once the reader is past it
            const above = i > 0 && (i <= activeIndex ? 'bg-trace/60' : 'bg-rule-strong')
            const below = i < n - 1 && (i < activeIndex ? 'bg-trace/60' : 'bg-rule-strong')
            const node = isActive
              ? 'border-trace bg-trace shadow-[0_0_8px_#5ef0a0]'
              : passed
                ? 'border-trace/70 bg-trace/40'
                : ready
                  ? 'border-ink-soft bg-paper'
                  : 'border-dashed border-ink-faint bg-paper'
            return (
              <li key={s.id} className="relative pl-7">
                {above && <span aria-hidden className={`absolute top-0 left-[5px] h-[0.95rem] w-px ${above}`} />}
                {below && <span aria-hidden className={`absolute top-[0.95rem] bottom-0 left-[5px] w-px ${below}`} />}
                <span aria-hidden className={`absolute top-[0.62rem] left-0 h-[11px] w-[11px] rounded-full border-[1.5px] ${node}`} />
                <button
                  type="button"
                  onClick={() => goTo(s.id)}
                  aria-current={isActive ? 'location' : undefined}
                  className={`block w-full py-1.5 pb-3 text-left leading-snug transition-colors ${
                    isActive ? 'text-ink' : ready ? 'text-ink-soft hover:text-ink' : 'text-ink-faint hover:text-ink-soft'
                  }`}
                >
                  <span className={`block font-mono text-[0.78rem] ${isActive ? 'text-trace' : ''}`}>{s.number}</span>
                  <span className={`text-[0.95rem] ${isActive ? 'font-semibold' : ''}`}>{s.title}</span>
                  {!ready && <span className="block text-[0.78rem] italic">en préparation</span>}
                </button>
              </li>
            )
          })}
        </ol>
      )}

      {lab.matlabFile && lab.status === 'ready' && (
        <a
          href={matlabUrl(lab.matlabFile)}
          download
          className="mt-auto block border-t border-rule pt-4 font-mono text-[0.8rem] break-all text-ink-soft hover:text-trace"
        >
          ↓ {lab.matlabFile}
        </a>
      )}
    </nav>
  )
}
