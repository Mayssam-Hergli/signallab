import type { Data } from 'plotly.js'
import { useMemo, useState } from 'react'
import {
  circConvViaFFT,
  convCircular,
  convLinear,
  convViaFFT,
  expConvCircularAnalytic,
  expConvLinearAnalytic,
  expSequence,
  maxAbsDiff,
} from '../../dsp'
import Console, { ValueTable } from '../../components/Console'
import { Conclusion, H, M, MBlock } from '../../components/Explanation'
import Plot from '../../components/Plot'
import Section from '../../components/Section'
import Slider from '../../components/Slider'
import { stemTraces } from '../../components/StemPlot'
import { C } from '../../components/theme'
import { sci } from '../../lib/format'
import { ENONCE_ANALYTIC } from './enonce'
import { FILE, idx } from './sequences'

const NF_TP = 3 // MATLAB: Nf = 3;  Mh = 2*Nf;
const NC_TP = 3 // MATLAB: Nc = 3;

/** MATLAB plot(…, 'g*'): green asterisks, no line */
function stars(x: number[], y: number[], name: string): Data {
  return {
    type: 'scatter',
    mode: 'markers',
    x,
    y,
    name,
    marker: { symbol: 'asterisk-open', size: 12, color: C.green, line: { color: C.green, width: 1.6 } },
    hovertemplate: `%{x}<br>%{y:.4f}<extra>${name}</extra>`,
  }
}

function threeWay(n: number[], a: number[], b: number[], c: number[], names: [string, string, string]): Data[] {
  return [
    ...stemTraces(n, a, { name: names[0], color: C.blue, size: 14 }),
    ...stemTraces(n, b, { name: names[1], color: C.red, size: 6, symbol: 'square' }),
    stars(n, c, names[2]),
  ]
}

export default function AnalyticSequences() {
  const [Nf, setNf] = useState(NF_TP)
  const [Nc, setNc] = useState(NC_TP)
  const Mh = 2 * Nf
  const L = Nf + Mh - 1

  const lin = useMemo(() => {
    const f = expSequence(0.1, Nf) // MATLAB: f = exp( 0.1*(0:Nf-1));
    const h = expSequence(-0.1, Mh) // MATLAB: h = exp(-0.1*(0:Mh-1));
    const y = convLinear(f, h) // yfh
    const yFft = convViaFFT(f, h) // yfh_fft
    const yAna = expConvLinearAnalytic(Nf, Mh) // y_ana
    return { y, yFft, yAna, err: Math.max(maxAbsDiff(y, yFft), maxAbsDiff(y, yAna)) }
  }, [Nf, Mh])

  const circ = useMemo(() => {
    const f = expSequence(0.1, Nc)
    const h = expSequence(-0.1, Nc)
    const y = convCircular(f, h) // yfh_c
    const yFft = circConvViaFFT(f, h) // yfh_c_fft
    const yAna = expConvCircularAnalytic(Nc) // y_ana_c
    return { y, yFft, yAna, err: Math.max(maxAbsDiff(y, yFft), maxAbsDiff(y, yAna)) }
  }, [Nc])

  const nL = idx(L)
  const nC = idx(Nc)

  const controls = (
    <>
      <Slider label="Nf (longueur de f)" value={Nf} min={1} max={8} onChange={setNf} hint={`Mh = 2Nf = ${Mh}`} />
      <Slider label="N (circulaire)" value={Nc} min={2} max={10} onChange={setNc} hint={Nc === NC_TP ? 'valeur du TP' : 'le TP donne le calcul pour N = 3'} />
    </>
  )

  return (
    <Section
      questions={ENONCE_ANALYTIC}
      controls={controls}
      explanation={<AnalyticExplanation />}
      code={[
        { file: FILE, cell: 'A.5-A.6' },
        { file: FILE, cell: 'B.4-B.6' },
      ]}
    >
      <h3 className="text-[1.15rem] font-semibold">
        <span className="mr-2 font-mono text-[0.95rem] font-normal text-trace">A.5–A.6</span>Convolution linéaire f * h
      </h3>
      <Console lines={[`A.6 : longueur = ${lin.y.length} (N+M-1 = ${L})`]} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <ValueTable
          columns={['n', 'fliplr', 'FFT', 'analytique']}
          rows={nL.map((n) => [String(n), lin.y[n], lin.yFft[n], lin.yAna[n]])}
          caption={<>disp(table(…)) — écart max entre colonnes : {sci(lin.err)}</>}
        />
        <Plot
          data={threeWay(nL, lin.y, lin.yFft, lin.yAna, ['fliplr', 'FFT', 'analytique'])}
          layout={{
            xaxis: { range: [-0.6, L - 0.4], title: { text: 'n' }, dtick: 1 },
            yaxis: { rangemode: 'tozero' },
            title: { text: '<b>y(n) = f(n) * h(n)</b>', font: { size: 14 }, y: 0.97 },
            margin: { l: 56, r: 24, t: 70, b: 54 },
          }}
          height={360}
          caption={
            <>
              les {L} valeurs de f * h par les trois méthodes : cercle bleu (fliplr), carré rouge (FFT) et astérisque verte
              (formule analytique) se superposent.
            </>
          }
        />
      </div>

      <h3 className="pt-4 text-[1.15rem] font-semibold">
        <span className="mr-2 font-mono text-[0.95rem] font-normal text-trace">B.4–B.6</span>Convolution circulaire f ⊛ h
      </h3>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <ValueTable
          columns={['m', 'direct', 'FFT', 'analytique']}
          rows={nC.map((m) => [String(m), circ.y[m], circ.yFft[m], circ.yAna[m]])}
          caption={<>disp(table(…)) — écart max entre colonnes : {sci(circ.err)}</>}
        />
        <Plot
          data={threeWay(nC, circ.y, circ.yFft, circ.yAna, ['direct', 'FFT', 'analytique'])}
          layout={{
            xaxis: { range: [-0.6, Nc - 0.4], title: { text: 'm' }, dtick: 1 },
            yaxis: { rangemode: 'tozero' },
            title: { text: `<b>Convolution circulaire f ⊛ h, N = ${Nc}</b>`, font: { size: 14 }, y: 0.97 },
            margin: { l: 56, r: 24, t: 70, b: 54 },
          }}
          height={360}
          caption={<>les {Nc} valeurs de la convolution circulaire par les trois méthodes, superposées.</>}
        />
      </div>
    </Section>
  )
}

function AnalyticExplanation() {
  return (
    <>
      <H>A.6 — calcul analytique de f * h</H>
      <MBlock>{String.raw`\begin{aligned} y(n) &= \sum_{m=a}^{b} e^{0.1m}\, e^{-0.1(n-m)} \\ &= e^{-0.1n} \sum_{m=a}^{b} \left(e^{0.2}\right)^{m} \end{aligned}`}</MBlock>
      <p>
        Les bornes viennent des supports : <M>{String.raw`0 \le m \le N_f - 1`}</M> pour f et{' '}
        <M>{String.raw`0 \le n - m \le M_h - 1`}</M> pour h, soit <M>{String.raw`a = \max(0,\, n - M_h + 1)`}</M> et{' '}
        <M>{String.raw`b = \min(n,\, N_f - 1)`}</M>. C'est une somme géométrique de raison <M>{String.raw`e^{0.2}`}</M> :
      </p>
      <MBlock>{String.raw`y(n) = e^{-0.1n}\, \frac{e^{0.2(b+1)} - e^{0.2a}}{e^{0.2} - 1}`}</MBlock>
      <p>
        Exemples : <M>{String.raw`y(0) = 1`}</M>, <M>{String.raw`y(1) = e^{-0.1} + e^{0.1} \approx 2.0100`}</M>.
      </p>

      <H>B.6 — calcul analytique de f ⊛ h, N = 3</H>
      <MBlock>{String.raw`y(m) = \sum_{n=0}^{2} e^{0.1n}\, e^{-0.1\,((m-n) \bmod 3)}`}</MBlock>
      <MBlock>{String.raw`\begin{aligned} y(0) &= 1 + e^{-0.1} + e^{0.1} \\ y(1) &= 1 + e^{-0.1} + e^{0.1} \\ y(2) &= 1 + e^{-0.2} + e^{0.2} \end{aligned}`}</MBlock>
      <p>
        y(0) = y(1) ≈ 3.0100 et y(2) ≈ 3.0401. Pour d'autres N (curseur), le site utilise la même somme coupée en deux, selon
        que <M>{String.raw`m - n`}</M> est positif ou replié par le modulo (généralisation, hors TP) :
      </p>
      <MBlock>{String.raw`\begin{aligned} y(m) = \tfrac{1}{e^{0.2}-1}\Big[\, & e^{-0.1m}\big(e^{0.2(m+1)} - 1\big) \\ +\, & e^{-0.1(m+N)}\big(e^{0.2N} - e^{0.2(m+1)}\big)\Big] \end{aligned}`}</MBlock>

      <H>Linéaire et circulaire</H>
      <p>
        Avec f et h de 3 points, la convolution linéaire vaut <M>{String.raw`1,\ e^{-0.1}+e^{0.1},\ 1+e^{-0.2}+e^{0.2},\ e^{-0.1}+e^{0.1},\ 1`}</M>
        . Repliée modulo 3 (indices 3 et 4 ajoutés à 0 et 1), elle redonne exactement les trois valeurs circulaires.
      </p>

      <Conclusion>
        <ul>
          <li>Les trois méthodes coïncident à l'arrondi machine près (≈ 10⁻¹⁶).</li>
          <li>Le calcul analytique repose sur une somme géométrique dont les bornes sont celles du recouvrement.</li>
          <li>La convolution circulaire est la linéaire repliée modulo N.</li>
        </ul>
      </Conclusion>
    </>
  )
}
