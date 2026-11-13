import { OBJECTIF } from './enonce'

/** 2.1 Objectifs — quoted from the handout. */
export default function Objectifs() {
  return (
    <blockquote className="max-w-4xl border border-rule-strong border-l-4 border-l-trace/70 bg-sheet px-5 py-3">
      <p className="font-mono text-[0.82rem] text-trace">Objectifs</p>
      <p className="mt-1 text-[1.05rem] leading-relaxed">{OBJECTIF}</p>
      <p className="mt-2 font-mono text-[0.85rem] text-ink-soft">
        Fe = 1000 Hz · n = 0 : tmax·Fe − 1 (N = tmax·Fe échantillons) · f = (−N/2 : N/2−1)·Fe/N après fftshift
      </p>
      <p className="mt-1 text-[0.85rem] text-ink-faint">— Énoncé du TP 3, Traitement numérique du signal, INSAT</p>
    </blockquote>
  )
}
