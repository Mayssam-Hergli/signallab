import { useId, useState, type ReactNode } from 'react'
import CodeBlock, { type CodeRef } from './CodeBlock'
import Explanation from './Explanation'

type Tab = 'visu' | 'explication' | 'code'

const TABS: { id: Tab; label: string }[] = [
  { id: 'visu', label: 'Visualisation' },
  { id: 'explication', label: 'Explication' },
  { id: 'code', label: 'Code MATLAB' },
]

export interface Question {
  /** "Q1", "Q2"… */
  id: string
  text: ReactNode
}

interface SectionProps {
  /** statement of the exercise, quoted in a thin box as on the TP sheet */
  questions?: { intro?: ReactNode; items: Question[] }
  /** sliders, toggles… shown in a plain row above the plots */
  controls?: ReactNode
  /** the plots */
  children: ReactNode
  /** explanation (margin notes on wide screens, Explication tab, collapsible panel) */
  explanation: ReactNode
  /** which part(s) of which .m file to show in the Code tab: cells and/or local functions */
  code: CodeRef | CodeRef[]
}

function Questions({ intro, items }: { intro?: ReactNode; items: Question[] }) {
  return (
    <blockquote className="mb-5 max-w-4xl border border-rule-strong bg-sheet px-5 py-3">
      {/* div, not p: an intro may hold a figure (TP3: the handout's block diagram) */}
      {intro && <div className="mb-1.5 space-y-3">{intro}</div>}
      <ol className="space-y-1">
        {items.map((q) => (
          <li key={q.id} className="flex gap-3">
            <span className="min-w-8 shrink-0 font-semibold whitespace-nowrap">{q.id}.</span>
            <span>{q.text}</span>
          </li>
        ))}
      </ol>
    </blockquote>
  )
}

/**
 * One exercise: the questions, then three tabs (Visualisation / Explication /
 * Code MATLAB). Tabs only switch what is displayed; each section keeps its own
 * state, so changing tab does not reset the sliders.
 *
 * On wide screens (≥ 1536 px) the explanation sits in the right margin of the
 * plots, like a teacher's annotation; below that it is a collapsible panel.
 */
export default function Section({ questions, controls, children, explanation, code }: SectionProps) {
  const [tab, setTab] = useState<Tab>('visu')
  const id = useId()

  return (
    <div>
      {questions && <Questions {...questions} />}

      <div role="tablist" className="mb-5 flex gap-6 border-b border-rule">
        {TABS.map((t) => {
          const active = t.id === tab
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`${id}-tab-${t.id}`}
              aria-selected={active}
              aria-controls={`${id}-panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`-mb-px border-b-2 pb-1.5 ${
                active ? 'border-trace font-semibold text-ink' : 'border-transparent text-ink-soft hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* hidden (not unmounted) so the Plotly figures keep their state and zoom */}
      <div role="tabpanel" id={`${id}-panel-visu`} aria-labelledby={`${id}-tab-visu`} hidden={tab !== 'visu'}>
        <div className="grid grid-cols-1 gap-x-10 2xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="min-w-0 space-y-5">
            {controls && (
              <div className="flex flex-wrap items-start gap-x-10 gap-y-4 border-b border-rule pb-4">{controls}</div>
            )}
            {children}
          </div>
          {/* margin notes */}
          <aside className="hidden 2xl:block" aria-label="Explication">
            <Explanation>{explanation}</Explanation>
          </aside>
        </div>

        <details className="group mt-6 2xl:hidden">
          <summary className="cursor-pointer text-pen select-none">
            <span className="inline-block transition-transform group-open:rotate-90">▸</span> Explication
          </summary>
          <div className="mt-3">
            <Explanation>{explanation}</Explanation>
          </div>
        </details>
      </div>

      <div
        role="tabpanel"
        id={`${id}-panel-explication`}
        aria-labelledby={`${id}-tab-explication`}
        hidden={tab !== 'explication'}
        className="max-w-4xl"
      >
        <Explanation>{explanation}</Explanation>
      </div>

      <div role="tabpanel" id={`${id}-panel-code`} aria-labelledby={`${id}-tab-code`} hidden={tab !== 'code'}>
        {tab === 'code' && (
          <div className="space-y-4">
            {(Array.isArray(code) ? code : [code]).map((c) => (
              <CodeBlock key={`${c.file}:${c.cell ?? ''}:${c.fn ?? ''}`} {...c} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
