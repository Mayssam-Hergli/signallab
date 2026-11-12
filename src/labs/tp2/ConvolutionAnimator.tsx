import type { Shape } from 'plotly.js'
import { useCallback, useMemo, useState } from 'react'
import { convLinear, convStep } from '../../dsp'
import { Conclusion, H, M as Tex, MBlock } from '../../components/Explanation'
import { Readout } from '../../components/Insight'
import Plot, { axisRefs, mergeAxes, stackedLayout } from '../../components/Plot'
import Section from '../../components/Section'
import Slider from '../../components/Slider'
import { stemTraces } from '../../components/StemPlot'
import { C } from '../../components/theme'
import Transport from '../../components/Transport'
import { fmt } from '../../lib/format'
import { ENONCE_ANIMATOR } from './enonce'
import { A_TP, FILE, N_TP, tpSequences } from './sequences'

/** keeps the points whose mask is true */
function pick<T>(arr: readonly T[], mask: readonly boolean[]): T[] {
  return arr.filter((_, i) => mask[i])
}

export default function ConvolutionAnimator() {
  const [N, setN] = useState(N_TP)
  const [n, setN_] = useState(0)
  const M = 2 * N
  const L = N + M - 1

  const seq = useMemo(() => tpSequences(N, A_TP), [N])
  const y = useMemo(() => convLinear(seq.x, seq.g), [seq])
  const step = useMemo(() => convStep(seq.x, seq.g, Math.min(n, L - 1)), [seq, n, L])

  const changeN = (v: number) => {
    setN(v)
    setN_((k) => Math.min(k, v + 2 * v - 2))
  }
  const setStep = useCallback((v: number) => setN_(v), [])

  // overlap of x (0 … N−1) and g(n − m) (n − M + 1 … n)
  const lo = Math.max(0, n - M + 1)
  const hi = Math.min(n, N - 1)
  const inX = step.m.map((m) => m >= 0 && m < N)
  const inG = step.m.map((m) => n - m >= 0 && n - m < M)

  const yMax = Math.max(...y)
  const xr: [number, number] = [step.m[0] - 0.8, step.m.at(-1)! + 0.8]
  const ax = [0, 1, 2].map(axisRefs)
  const k = y.map((_, i) => i)

  const data = [
    ...stemTraces(pick(step.m, inX), pick(step.x, inX), { name: 'x(m)', color: C.blue, size: 7, ...ax[0] }),
    ...stemTraces(pick(step.m, inG), pick(step.gShifted, inG), {
      name: 'g(n − m)',
      color: C.orange,
      size: 6,
      symbol: 'square',
      ...ax[0],
    }),
    ...stemTraces(pick(step.m, step.overlap), pick(step.products, step.overlap), {
      name: 'x(m)·g(n − m)',
      color: C.purple,
      filled: true,
      size: 6,
      ...ax[1],
      showlegend: false,
    }),
    // y(k): already computed (k < n) in blue, current in red, still to come as a faint outline
    ...stemTraces(k.slice(0, n), y.slice(0, n), { name: 'y(k)', color: C.blue, size: 7, ...ax[2], showlegend: false }),
    ...stemTraces(k.slice(n + 1), y.slice(n + 1), {
      name: 'à venir',
      color: 'rgba(77, 166, 255, 0.2)',
      size: 7,
      ...ax[2],
      showlegend: false,
    }),
    ...stemTraces([n], [y[n]], { name: 'y(n)', color: C.red, filled: true, size: 10, ...ax[2], showlegend: false }),
  ]

  const overlapRect: Partial<Shape> = {
    type: 'rect',
    xref: 'x',
    yref: 'y domain',
    x0: lo - 0.45,
    x1: hi + 0.45,
    y0: 0,
    y1: 1,
    fillcolor: C.green,
    opacity: 0.08,
    line: { width: 0 },
    layer: 'below',
  }
  // the column of the current n, through the three plots
  const cursor = (xref: string, yref: string): Partial<Shape> => ({
    type: 'line',
    xref: xref as Shape['xref'],
    yref: yref as Shape['yref'],
    x0: n,
    x1: n,
    y0: 0,
    y1: 1,
    line: { color: C.red, width: 1, dash: 'dot' },
  })

  const layout = {
    ...mergeAxes(stackedLayout(['x(m) et g(n − m)', 'produit x(m)·g(n − m)', 'y(k) = Σ produits, k = 0 … n'], 0.12), {
      xaxis: { range: xr },
      xaxis2: { range: xr },
      xaxis3: { range: xr, title: { text: 'm  (et k pour y)' } },
      yaxis: { range: [-0.15, 1.25] },
      yaxis2: { range: [-0.1, 1.2] },
      yaxis3: { range: [-0.25, yMax * 1.18] },
    }),
    margin: { l: 56, r: 24, t: 44, b: 54 },
    legend: { orientation: 'h' as const, x: 1, xanchor: 'right' as const, y: 1.0, yanchor: 'bottom' as const, bgcolor: 'rgba(0,0,0,0)', borderwidth: 0 },
    shapes: [overlapRect, cursor('x', 'y domain'), cursor('x2', 'y2 domain'), cursor('x3', 'y3 domain')],
  }

  // y(n) = Σ x(m) g(n−m) written out with the current numbers
  const terms = []
  for (let m = lo; m <= hi; m++) terms.push(fmt(seq.x[m] * seq.g[n - m], 3))
  const shown = terms.length > 5 ? [...terms.slice(0, 3), '\\dots', terms.at(-1)!] : terms
  const formula = String.raw`y(${n}) = \sum_{m=${lo}}^{${hi}} x(m)\,g(${n}-m) = ${shown.join(' + ')} = ${fmt(step.value, 4)}`

  const controls = (
    <>
      <Transport value={n} count={L} onChange={setStep} label="n" />
      <Slider label="N (longueur de x)" value={N} min={2} max={12} onChange={changeN} hint={`M = 2N = ${M}, g(n) = 0,7ⁿ`} />
    </>
  )

  return (
    <Section
      questions={ENONCE_ANIMATOR}
      controls={controls}
      explanation={<AnimatorExplanation />}
      code={{ file: FILE, fn: 'conv_lineaire' }}
    >
      <div className="border border-rule-strong bg-sheet px-4 py-3">
        <div className="overflow-x-auto text-[1.05rem]">
          <Tex>{formula}</Tex>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-8 gap-y-1">
          <Readout label="recouvrement" value={`m = ${lo} … ${hi}`} unit={`(${hi - lo + 1} point${hi > lo ? 's' : ''})`} />
          <Readout label="MATLAB" value={`y(${n + 1}) = sum(xp(${n + 1}:${n + M}) .* gg)`} />
        </div>
      </div>
      <Plot
        data={data}
        layout={layout}
        height={760}
        caption={
          <>
            en haut, x (cercles bleus) et g retourné puis décalé de n = {n} (carrés orange) ; la bande verte est leur
            recouvrement. Au milieu, leurs produits ; en bas, y se construit point par point (rouge : la valeur calculée à ce
            pas, contour pâle : les valeurs à venir). Le pointillé rouge suit m = n.
          </>
        }
      />
    </Section>
  )
}

function AnimatorExplanation() {
  return (
    <>
      <H>Quatre opérations par valeur de n</H>
      <MBlock>{String.raw`y(n) = \sum_{m} x(m)\, g(n - m)`}</MBlock>
      <ol className="list-decimal space-y-1.5 pl-5">
        <li>
          <strong>Retourner</strong> g : <Tex>{String.raw`g(m) \to g(-m)`}</Tex> — <code className="font-mono">gg = fliplr(g)</code>.
        </li>
        <li>
          <strong>Décaler</strong> de n : <Tex>{String.raw`g(-m) \to g(n-m)`}</Tex>. Le point g(0) se trouve en m = n : c'est le
          pointillé rouge.
        </li>
        <li>
          <strong>Multiplier</strong> terme à terme avec x(m) — <code className="font-mono">xp(n:n+M-1) .* gg</code>.
        </li>
        <li>
          <strong>Sommer</strong> : la somme des produits est y(n) — <code className="font-mono">sum(…)</code>.
        </li>
      </ol>

      <H>Pourquoi retourner ?</H>
      <p>
        Dans <Tex>{String.raw`g(n-m)`}</Tex>, l'indice de g diminue quand m augmente : la plus récente valeur de x (m = n) est
        pondérée par g(0), la précédente par g(1), etc. Pour un système linéaire invariant de réponse impulsionnelle g,
        y(n) est la somme des réponses aux impulsions x(m) passées, chacune vieillie de n − m pas.
      </p>

      <H>Les trois régimes</H>
      <ul>
        <li>n &lt; N − 1 : g n'a pas encore recouvert tout x, le recouvrement grandit, y monte ;</li>
        <li>N − 1 ≤ n ≤ M − 1 : x est entièrement sous g, y suit la décroissance de g ;</li>
        <li>n &gt; M − 1 : g quitte x par la gauche, le recouvrement rétrécit jusqu'à un seul point en n = N + M − 2.</li>
      </ul>

      <H>Indices MATLAB</H>
      <p>
        MATLAB compte à partir de 1 : la valeur notée y(n) ici est <code className="font-mono">y(n+1)</code> dans le code, et
        x est précédé de M − 1 zéros dans <code className="font-mono">xp</code>, d'où la fenêtre{' '}
        <code className="font-mono">xp(n+1 : n+M)</code> affichée au-dessus du graphe.
      </p>

      <Conclusion>
        <ul>
          <li>Chaque y(n) est un produit scalaire entre x et g retourné et décalé de n.</li>
          <li>Le nombre de pas, N + M − 1, est le nombre de décalages pour lesquels les supports se recouvrent.</li>
        </ul>
      </Conclusion>
    </>
  )
}
