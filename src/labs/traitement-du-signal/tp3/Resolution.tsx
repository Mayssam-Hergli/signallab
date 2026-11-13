import { useEffect, useMemo, useRef, useState } from 'react'
import { Conclusion, H, M, MBlock } from '../../../components/Explanation'
import Insight, { Readout } from '../../../components/Insight'
import Plot from '../../../components/Plot'
import Section from '../../../components/Section'
import Select from '../../../components/Select'
import Slider from '../../../components/Slider'
import { lineTrace, stemTraces } from '../../../components/StemPlot'
import { C } from '../../../components/theme'
import { isOnBin, sampleCount } from '../../../dsp'
import { fmt } from '../../../lib/format'
import { ENONCE_Q9_Q10 } from './enonce'
import { F4, FE, FILE, RANGES, TMAX, TMAX_LIST, bandMax, clean, niceTop, resolution, valueAt } from './model'
import SpectrumAnalyzer, { type Scale } from './SpectrumAnalyzer'

/** sweep: one slider step every STEP_MS, a pause on each lock */
const STEP_MS = 70
const LOCK_HOLD_MS = 1100

/** tmax on the slider's grid (0.005 s), without floating-point drift */
const snap = (t: number) => Math.round(t / RANGES.tmax.step) * RANGES.tmax.step

/** Q9–Q10: x4 = 5 + cos(2π·105·nTe) — frequency resolution Δf = Fe/N and spectral leakage. */
export default function Resolution() {
  const [tmax, setTmax] = useState(TMAX)
  const [scale, setScale] = useState<Scale>('lin')
  const [sweeping, setSweeping] = useState(false)
  const r = useMemo(() => resolution(tmax), [tmax])

  // sweep tmax from its minimum to its maximum; pause a moment whenever 105 Hz locks onto a bin
  const sweepFrom = useRef<number>(RANGES.tmax.min)
  useEffect(() => {
    if (!sweeping) return
    let t: number = sweepFrom.current
    let timer = 0
    const tick = () => {
      t = snap(t + RANGES.tmax.step)
      if (t > RANGES.tmax.max + 1e-9) {
        setSweeping(false)
        return
      }
      setTmax(t)
      timer = window.setTimeout(tick, isOnBin(F4, FE / sampleCount(t, FE)) ? LOCK_HOLD_MS : STEP_MS)
    }
    timer = window.setTimeout(tick, STEP_MS)
    return () => window.clearTimeout(timer)
  }, [sweeping])

  const toggleSweep = () => {
    if (!sweeping) {
      // always sweep the whole range, from the shortest record
      sweepFrom.current = RANGES.tmax.min
      setTmax(RANGES.tmax.min)
    }
    setSweeping((s) => !s)
  }
  const setT = (t: number) => {
    setSweeping(false)
    setTmax(snap(t))
  }

  const { view } = r
  const dc = clean(valueAt(view, 'mag', 0))
  const preset = TMAX_LIST.find((t) => Math.abs(t - tmax) < 1e-9) ?? null
  const dfStr = fmt(view.df, Number.isInteger(view.df) ? 0 : 2)
  // keep the ±105 Hz lobes in frame; only the DC line itself (5) is clipped
  const yTop = niceTop(bandMax(r.fDense, r.dense, Math.max(60, view.df + 10)))

  const controls = (
    <>
      <Slider
        label="tmax"
        value={tmax}
        min={RANGES.tmax.min}
        max={RANGES.tmax.max}
        step={RANGES.tmax.step}
        onChange={setT}
        format={(t) => `${t.toFixed(3)} s`}
        hint={`N = tmax·Fe = ${view.N} échantillons`}
      />
      <Select<number>
        label="tmax du TP"
        value={preset}
        onChange={setT}
        options={TMAX_LIST.map((t) => ({ value: t, label: `${t} s`, tp: true }))}
      />
    </>
  )

  return (
    <Section questions={ENONCE_Q9_Q10} controls={controls} explanation={<ResolutionExplanation />} code={{ file: FILE, cell: 'Q9-10' }}>
      <div className="grid gap-x-10 gap-y-1 sm:grid-cols-3">
        <Readout label="N" value={String(view.N)} />
        <Readout label="Δf = Fe/N = 1/tmax" value={dfStr} unit="Hz" />
        <Readout label="105 / Δf" value={fmt(r.ratio, r.onBin ? 0 : 2)} tone={r.onBin ? 'note' : 'warn'} />
        <Readout label="raie la plus haute (f > 0)" value={fmt(r.peakF, r.peakF % 1 ? 2 : 0)} unit="Hz" tone={r.onBin ? 'note' : 'warn'} />
        <Readout label="sa hauteur |X4|/N" value={fmt(r.peakMag, 3)} unit="(0.5 attendu)" tone={r.onBin ? 'note' : 'warn'} />
      </div>

      <Insight
        tone={r.onBin ? 'note' : 'warn'}
        title={
          r.onBin ? (
            <>Δf = {dfStr} Hz : 105 Hz est un multiple de Δf (105 = {fmt(r.ratio, 0)} × {dfStr}) — une seule raie nette</>
          ) : (
            <>Δf = {dfStr} Hz : 105 Hz n'est pas un multiple de Δf (105/Δf = {fmt(r.ratio, 2)}) — fuite spectrale</>
          )
        }
      >
        {r.onBin ? (
          <>
            Le point de calcul tombe sur le sommet de la courbe verte (0,5), et toutes les autres raies tombent sur ses zéros.
          </>
        ) : (
          <>
            105 Hz tombe entre deux points de calcul : on lit le spectre vrai sur les flancs du lobe, à {fmt(r.peakF, r.peakF % 1 ? 2 : 0)}{' '}
            Hz et {fmt(r.peakMag, 3)} au lieu de 105 Hz et 0,5, et les lobes secondaires apparaissent sur les raies voisines.
          </>
        )}
      </Insight>

      <SpectrumAnalyzer r={r} scale={scale} onScale={setScale} sweeping={sweeping} onSweep={toggleSweep} />

      <Plot
        data={[
          lineTrace(r.fDense, r.dense, { name: 'spectre vrai |X4(f)|/N (TFTD)', color: C.continuous, width: 1.5, hover: false }),
          ...stemTraces(view.f, view.mag, { name: `raies de la FFT (N = ${view.N})`, color: C.blue, size: view.N > 200 ? 3.5 : 5 }),
        ]}
        layout={{
          xaxis: { title: { text: 'f (Hz)' }, range: [-FE / 2 - 10, FE / 2 + 10], dtick: 100 },
          yaxis: { title: { text: '|X4(f)|/N' }, range: [0, yTop] },
          shapes: [
            { type: 'line', x0: F4, x1: F4, y0: 0, y1: 1, yref: 'paper', line: { color: C.red, width: 1, dash: 'dash' } },
            { type: 'line', x0: -F4, x1: -F4, y0: 0, y1: 1, yref: 'paper', line: { color: C.red, width: 1, dash: 'dash' } },
          ],
          annotations: [
            { x: 0, y: yTop, text: `↑ ${fmt(dc, 0)}`, showarrow: false, xanchor: 'left', xshift: 5, yanchor: 'top', font: { size: 13, color: C.inkSoft } },
          ],
        }}
        height={360}
        caption={
          <>
            |X4|/N pour tmax = {tmax.toFixed(3)} s : les tiges bleues (FFT, pas Δf = {dfStr} Hz) sont des échantillons de la courbe
            grise (TFTD de l'enregistrement). Pointillés rouges : ±105 Hz. La raie à f = 0 (composante continue, 5) dépasse du
            cadre.
          </>
        }
      />
    </Section>
  )
}

function ResolutionExplanation() {
  return (
    <>
      <H>Q9. Ce que l'on constate (tmax = 0,1 s)</H>
      <p>
        Δf = Fe/N = 10 Hz. Les points de calcul sont à …, 100, 110, … Hz : <strong>105 Hz n'y figure pas</strong>. Au lieu d'une
        raie de 0,5 à ±105 Hz, on voit deux raies de 0,32 à 100 et 110 Hz, et des raies plus petites autour : c'est la{' '}
        <strong>fuite spectrale</strong>.
      </p>

      <H>Pourquoi : la TFD échantillonne le spectre vrai</H>
      <p>Observer x pendant tmax revient à le multiplier par une fenêtre rectangulaire. Le spectre de l'enregistrement est la TFTD</p>
      <MBlock>{String.raw`X(f) = \sum_{n=0}^{N-1} x[n]\, e^{-j2\pi f n/F_e}`}</MBlock>
      <p>
        une raie élargie en lobe (noyau de Dirichlet) de largeur <M>{String.raw`2F_e/N = 2/t_{\max}`}</M> entre zéros. La FFT
        donne exactement cette courbe aux points <M>{String.raw`f_k = kF_e/N`}</M> (courbe grise et tiges bleues).
      </p>
      <p>
        La composante continue (5, dix fois la raie à 105 Hz) a elle aussi ses lobes secondaires, de hauteur ≈{' '}
        <M>{String.raw`5/(N\sin(\pi f/F_e))`}</M> : ce sont eux qui dominent à gauche de l'analyseur, et qui font que le sommet de
        la courbe verte n'est pas exactement 0,5 à 105 Hz. Plus N est grand, plus ils sont faibles.
      </p>
      <ul>
        <li>
          Si 105 Hz est un multiple de Δf, un point tombe sur le sommet et tous les autres sur les zéros : une seule raie nette,
          d'amplitude 0,5.
        </li>
        <li>Sinon, les points tombent sur les flancs du lobe et sur les lobes secondaires : raie mal placée, trop basse, et étalée.</li>
      </ul>

      <H>Q10. tmax = 0,05 s et 0,2 s</H>
      <ul>
        <li>0,05 s : N = 50, Δf = 20 Hz, 105/20 = 5,25 → raie la plus haute à 100 Hz (0,457), fuite.</li>
        <li>0,1 s : N = 100, Δf = 10 Hz, 105/10 = 10,5 → 100 et 110 Hz (0,325), fuite maximale (pile entre deux points).</li>
        <li>0,2 s : N = 200, Δf = 5 Hz, 105/5 = 21 → une seule raie à 105 Hz, d'amplitude exacte 0,5.</li>
      </ul>
      <p>
        Plus tmax est long, plus Δf = 1/tmax est petit : la <strong>résolution fréquentielle</strong> s'améliore et le lobe
        s'affine. Sur ce curseur (pas de 5 ms), 105 Hz n'est sur la grille que pour tmax = 0,2 s et 0,4 s : il faut{' '}
        <M>{String.raw`105\,N/1000 \in \mathbb{N}`}</M>, soit N multiple de 200.
      </p>

      <Conclusion>
        <ul>
          <li>La TFD calcule le spectre aux seules fréquences kFe/N : la résolution est Δf = Fe/N = 1/tmax.</li>
          <li>Une fréquence qui n'est pas un multiple de Δf « fuit » sur les raies voisines (amplitude et fréquence fausses).</li>
          <li>Allonger la durée d'observation améliore la résolution ; augmenter Fe à tmax fixé ne la change pas (Δf = 1/tmax).</li>
        </ul>
      </Conclusion>
    </>
  )
}
