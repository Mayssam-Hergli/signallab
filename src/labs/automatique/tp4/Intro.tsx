import { BUT } from './enonce'

/** I. But — quoted from the fascicule. */
export default function Intro() {
  return (
    <blockquote className="max-w-4xl border border-rule-strong border-l-4 border-l-trace/70 bg-sheet px-5 py-3">
      <p className="font-mono text-[0.82rem] text-trace">But</p>
      <p className="mt-1 text-[1.05rem] leading-relaxed">{BUT}</p>
      <p className="mt-2 text-[0.85rem] text-ink-faint">— Fascicule de TP, Automatique échantillonnée, INSAT</p>
    </blockquote>
  )
}
