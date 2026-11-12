import type { Shape } from 'plotly.js'
import { useCallback, useMemo, useState } from 'react'
import { circConvViaFFT, circStep, convCircular, convLinear, maxAbsDiff, sum } from '../../dsp'
import Console, { ValueTable } from '../../components/Console'
import { Conclusion, H, M, MBlock } from '../../components/Explanation'
import Insight from '../../components/Insight'
import Plot from '../../components/Plot'
import Section from '../../components/Section'
import Select from '../../components/Select'
import Slider from '../../components/Slider'
import { stemTraces } from '../../components/StemPlot'
import { C } from '../../components/theme'
import Transport from '../../components/Transport'
import { fmt, sci } from '../../lib/format'
import { ENONCE_B } from './enonce'
import Ring from './Ring'
import { A_TP, FILE, idx, N_TP } from './sequences'

/** x of part B: the TP's ones, or a delayed impulse to see the circular shift */
type XKind = 'ones' | 'delta'
const SHIFT = 2

function makeX(kind: XKind, N: number): number[] {
  // MATLAB: x = ones(1, N);
  if (kind === 'ones') return new Array<number>(N).fill(1)
  return Array.from({ length: N }, (_, n) => (n === SHIFT ? 1 : 0))
}

export default function CircularConvolution() {
  const [N, setN] = useState(N_TP)
  const [kind, setKind] = useState<XKind>('ones')
  const [m, setM] = useState(0)
  const setStep = useCallback((v: number) => setM(v), [])

  const r = useMemo(() => {
    const x = makeX(kind, N)
    const g = Array.from({ length: N }, (_, n) => A_TP ** n) // MATLAB: g = 0.7.^(0:N-1);
    const yc = convCircular(x, g) // MATLAB: yc = conv_circulaire(x, g);
    const yFft = circConvViaFFT(x, g) // MATLAB: yc_fft = real(ifft(fft(x) .* fft(g)));
    const lin = convLinear(x, g)
    return { x, g, yc, yFft, err: maxAbsDiff(yc, yFft), sumG: sum(g), lin }
  }, [kind, N])

  const mm = Math.min(m, N - 1)
  const step = useMemo(() => circStep(r.x, r.g, mm), [r, mm])
  const isTP = N === N_TP && kind === 'ones'

  const changeN = (v: number) => {
    setN(v)
    setM((k) => Math.min(k, v - 1))
  }

  const cursor: Partial<Shape> = {
    type: 'line',
    xref: 'x',
    yref: 'paper',
    x0: mm,
    x1: mm,
    y0: 0,
    y1: 1,
    line: { color: C.green, width: 1, dash: 'dot' },
  }
  const yTop = Math.max(...r.yc) * 1.2

  // MATLAB figure 'B - Convolution circulaire'
  const fig = {
    data: [
      ...stemTraces(idx(N), r.yc, { name: 'Formule directe', color: C.blue, size: 13 }),
      ...stemTraces(idx(N), r.yFft, { name: 'FFT', color: C.red, size: 6, symbol: 'square' }),
    ],
    layout: {
      xaxis: { range: [-0.7, N - 0.3], title: { text: 'm' }, dtick: 1 },
      yaxis: { range: [kind === 'ones' ? 0 : -0.05, yTop] },
      title: { text: `<b>y(m) = x(n) ⊛ g(n), N = ${N}</b>`, font: { size: 14 }, y: 0.97 },
      margin: { l: 56, r: 24, t: 70, b: 54 },
      shapes: [cursor],
    },
  }

  const rows = step.x.map((v, n) => [String(n), v, step.gTurned[n], step.products[n]])
  rows.push(['Σ', '', '', step.value.toFixed(4)])

  const controls = (
    <>
      <Transport value={mm} count={N} onChange={setStep} label="m" loop />
      <Slider label="N" value={N} min={3} max={16} onChange={changeN} />
      <Select<XKind>
        label="x(n)"
        value={kind}
        onChange={setKind}
        options={[
          { value: 'ones', label: 'x = 1', tp: true },
          { value: 'delta', label: `x = δ(n − ${SHIFT})` },
        ]}
        hint={kind === 'delta' ? 'pour voir le décalage circulaire' : undefined}
      />
    </>
  )

  return (
    <Section
      questions={ENONCE_B}
      controls={controls}
      explanation={<CircularExplanation N={N} sumG={r.sumG} lin={r.lin} kind={kind} />}
      code={[
        { file: FILE, cell: 'B.1-B.3' },
        { file: FILE, fn: 'conv_circulaire' },
      ]}
    >
      <Console
        lines={[
          `B.3 : longueur = ${r.yc.length} (N = ${N})`,
          `Écart max direct / FFT = ${sci(r.err)}`,
          ...(kind === 'ones' ? [`Toutes les valeurs = somme de g = ${r.sumG.toFixed(4)}`] : []),
        ]}
        note={isTP ? undefined : 'Valeurs modifiées par rapport au TP : la sortie ne correspond plus à celle du script.'}
      />

      <div className="grid gap-5 md:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <figure className="border border-rule-strong bg-screen p-3">
          <Ring x={step.x} g={r.g} m={mm} value={step.value} />
          <figcaption className="mt-2 border-t border-rule pt-2 text-[0.88rem] leading-snug text-ink-soft">
            <span className="text-ml-blue">Anneau extérieur : x(n)</span>, n = 0 en haut, sens horaire.{' '}
            <span className="text-ml-orange">Anneau intérieur : g retourné</span> (point plein : g(0)), tourné de m crans.
            Les valeurs face à face sont multipliées.
          </figcaption>
        </figure>
        <ValueTable
          columns={['n', 'x(n)', `g((${mm} − n) mod ${N})`, 'produit']}
          rows={rows}
          caption={<>Les N produits du pas m = {mm} ; leur somme est y({mm}).</>}
        />
      </div>

      {kind === 'ones' ? (
        <Insight title={<>y(m) = Σ g = {fmt(r.sumG, 4)} pour tout m</>}>
          x vaut 1 partout : quel que soit le cran, chaque valeur de g se trouve face à un 1, et la somme ne change pas.
        </Insight>
      ) : (
        <Insight title={<>y(m) = g((m − {SHIFT}) mod {N}) : g décalé circulairement de {SHIFT}</>}>
          Convoluer avec une impulsion en n = {SHIFT} décale g de {SHIFT} ; les deux dernières valeurs de g, qui
          sortiraient à droite, reviennent au début (m = 0 et 1).
        </Insight>
      )}

      <Plot
        data={fig.data}
        layout={fig.layout}
        height={380}
        caption={
          <>
            y(m) par la formule directe (cercles bleus) et par la FFT sans zéros ajoutés (carrés rouges), N = {N} points ; le
            pointillé vert marque le pas m = {mm} affiché sur les anneaux.
          </>
        }
      />
    </Section>
  )
}

function CircularExplanation({ N, sumG, lin, kind }: { N: number; sumG: number; lin: number[]; kind: XKind }) {
  // y_c(m) = y_lin(m) + y_lin(m + N): the tail of the linear result folds back
  const m0 = 0
  return (
    <>
      <H>Définition</H>
      <MBlock>{String.raw`y(m) = \sum_{n=0}^{N-1} x(n)\, g\big((m-n) \bmod N\big)`}</MBlock>
      <p>
        Pour m = 0 … N − 1. C'est la convolution « retourner et glisser », mais sur un cercle : ce qui sort par un bout rentre par l'autre (
        <code className="font-mono">mod(m-n, N)</code>). Le résultat a N points, comme x et g (B.3), et non 2N − 1.
      </p>

      <H>Lecture des anneaux</H>
      <p>
        g retourné est enroulé sur l'anneau intérieur. Passer de m à m + 1 le fait tourner d'un cran ; après N crans il est
        revenu à sa place. À chaque cran, on multiplie les valeurs face à face et on somme.
      </p>

      <H>Par la FFT sans zéros (B.2)</H>
      <p>
        La TFD sur N points voit x et g comme <strong>périodiques</strong> de période N. Le produit{' '}
        <M>{String.raw`X(k)\,G(k)`}</M> correspond donc exactement à la convolution circulaire :
      </p>
      <MBlock>{String.raw`\operatorname{TFD}_N(x \circledast g) = X \cdot G`}</MBlock>
      <p>
        C'est pour cela que <code className="font-mono">real(ifft(fft(x) .* fft(g)))</code>, sans zéros ajoutés, retombe sur
        la formule directe à 10⁻¹⁶ près, alors qu'en A il fallait compléter jusqu'à N + M − 1 pour obtenir la convolution
        linéaire.
      </p>

      <H>Lien avec la convolution linéaire</H>
      <p>
        La convolution linéaire de ces deux séquences de {N} points a {2 * N - 1} points. Sur le cercle, la queue (indices N
        à 2N − 2) se replie sur le début :
      </p>
      <MBlock>{String.raw`y_{\text{circ}}(m) = y_{\text{lin}}(m) + y_{\text{lin}}(m + N)`}</MBlock>
      <p>
        Par exemple m = {m0} : <M>{`${fmt(lin[m0], 4)} + ${fmt(lin[m0 + N] ?? 0, 4)} = ${fmt(lin[m0] + (lin[m0 + N] ?? 0), 4)}`}</M>
        . {kind === 'ones' && <>Avec x = 1, chaque m reçoit ainsi toutes les valeurs de g une fois : y(m) = Σ g = {fmt(sumG, 4)}.</>}
      </p>

      <Conclusion>
        <ul>
          <li>La convolution circulaire de deux séquences de N points a N points.</li>
          <li>La FFT sans ajout de zéros calcule la convolution circulaire, pas la linéaire.</li>
          <li>
            Circulaire = linéaire repliée modulo N ; les deux coïncident seulement si on ajoute assez de zéros (N + M − 1
            points).
          </li>
        </ul>
      </Conclusion>
    </>
  )
}
