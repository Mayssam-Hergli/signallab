import { useMemo, useState } from 'react'
import { Conclusion, H, M, MBlock } from '../../../components/Explanation'
import Insight, { Readout } from '../../../components/Insight'
import Plot from '../../../components/Plot'
import Section from '../../../components/Section'
import Slider from '../../../components/Slider'
import { lineTrace } from '../../../components/StemPlot'
import { C } from '../../../components/theme'
import { filter } from '../../../dsp'
import { fmt } from '../../../lib/format'
import { A_IIR, analyseIir, B_IIR, FILE, gainAt, TEST_DEFAULT, TEST_N, TEST_RANGES, testSignal } from './model'

const db = (g: number) => 20 * Math.log10(g)

/** Bonus: a two-tone signal through the low-pass IIR — you see the high tone disappear. */
export default function TestSignal() {
  const [w1, setW1] = useState(TEST_DEFAULT.w1)
  const [w2, setW2] = useState(TEST_DEFAULT.w2)
  const [a2, setA2] = useState(TEST_DEFAULT.a2)

  const iir = useMemo(() => analyseIir(), [])
  const x = useMemo(() => testSignal(w1, w2, a2), [w1, w2, a2])
  const y = useMemo(() => filter(B_IIR, A_IIR, x), [x]) // MATLAB: y = filter(b, a, x);
  const low = useMemo(() => testSignal(w1, w2, 0), [w1, w2]) // the low tone alone, for reference
  const g1 = gainAt(B_IIR, A_IIR, w1)
  const g2 = gainAt(B_IIR, A_IIR, w2)
  const n = x.map((_, i) => i)
  const wpi = iir.freq.w.map((w) => w / Math.PI)

  const controls = (
    <>
      <Slider label="ω1 / π (basse)" value={w1} {...TEST_RANGES.w1} onChange={setW1} format={(v) => v.toFixed(2)} hint={`période ${fmt(2 / w1, 1)} échantillons`} />
      <Slider label="ω2 / π (haute)" value={w2} {...TEST_RANGES.w2} onChange={setW2} format={(v) => v.toFixed(2)} hint={`période ${fmt(2 / w2, 1)} échantillons`} />
      <Slider label="amplitude A2" value={a2} {...TEST_RANGES.a2} onChange={setA2} format={(v) => v.toFixed(1)} />
    </>
  )

  const top = Math.max(1.2, 1 + a2) * 1.1

  return (
    <Section
      questions={{
        items: [
          {
            id: 'Bonus',
            text: 'Filtrer x[n] = cos(ω1·n) + A2·cos(ω2·n) par le filtre RII de la partie II (filter(b, a, x)) et comparer l’entrée et la sortie.',
          },
        ],
      }}
      controls={controls}
      explanation={<TestExplanation />}
      code={{ file: FILE, cell: 'II' }}
    >
      <div className="grid gap-x-10 gap-y-1 sm:grid-cols-2">
        <Readout label={`|H(${w1.toFixed(2)}π)|`} value={`${fmt(g1, 3)} (${fmt(db(g1), 1)} dB)`} />
        <Readout label={`|H(${w2.toFixed(2)}π)|`} value={`${fmt(g2, 4)} (${fmt(db(g2), 1)} dB)`} tone={g2 < 0.5 ? 'note' : 'warn'} />
      </div>

      <Insight
        tone={w2 < iir.cutoff / Math.PI ? 'warn' : 'note'}
        title={
          w2 < iir.cutoff / Math.PI ? (
            <>ω2 = {w2.toFixed(2)}π est sous la coupure ({fmt(iir.cutoff / Math.PI, 3)}π) : les deux composantes passent</>
          ) : (
            <>
              La composante haute est multipliée par {fmt(g2, 3)} ({fmt(db(g2), 1)} dB) : en sortie il reste surtout cos(ω1·n)
            </>
          )
        }
      >
        La composante basse passe avec un gain {fmt(g1, 3)}. Les premiers échantillons de la sortie forment le régime transitoire
        (≈ 15 échantillons, le temps que 0,7183ⁿ s'éteigne).
      </Insight>

      <Plot
        data={[
          lineTrace(wpi, iir.freq.mag, { color: C.blue, name: '|H(ω)|', hover: false }),
          {
            type: 'scatter',
            mode: 'markers',
            x: [w1, w2],
            y: [g1, g2],
            marker: { size: 12, color: [C.green, C.orange], line: { color: C.screen, width: 1.5 } },
            name: 'composantes de x',
            hovertemplate: 'ω = %{x:.2f}π<br>|H| = %{y:.4f}<extra></extra>',
          },
        ]}
        layout={{
          xaxis: { title: { text: 'ω / π' }, range: [0, 1], dtick: 0.1 },
          yaxis: { title: { text: '|H|' }, range: [0, 1.25] },
          shapes: [w1, w2].map((w, i) => ({
            type: 'line' as const,
            x0: w,
            x1: w,
            y0: 0,
            y1: 1,
            yref: 'paper' as const,
            line: { color: i === 0 ? C.green : C.orange, width: 1, dash: 'dash' as const },
          })),
          margin: { l: 64, r: 24, t: 40, b: 54 },
        }}
        height={300}
        caption={<>|H| linéaire du filtre RII ; points : les gains appliqués à la composante basse (vert) et haute (orange).</>}
      />

      <Plot
        data={[
          lineTrace(n, x, { color: C.continuous, width: 1.3, name: 'entrée x[n]' }),
          lineTrace(n, low, { color: C.green, width: 1, dash: 'dot', name: 'cos(ω1·n) seul' }),
          lineTrace(n, y, { color: C.blue, width: 2.2, name: 'sortie y[n] = filter(b, a, x)' }),
        ]}
        layout={{
          xaxis: { title: { text: 'n' }, range: [0, TEST_N - 1] },
          yaxis: { title: { text: 'amplitude' }, range: [-top, top] },
          margin: { l: 64, r: 24, t: 40, b: 54 },
        }}
        height={340}
        caption={
          <>
            entrée (gris) et sortie du filtre (bleu) : la composante rapide est {g2 < 0.1 ? 'presque entièrement' : g2 < 0.5 ? 'fortement' : 'peu'}{' '}
            atténuée ; la sortie suit la composante lente (pointillé vert), avec un léger retard (déphasage du filtre).
          </>
        }
      />
    </Section>
  )
}

function TestExplanation() {
  return (
    <>
      <H>Le principe</H>
      <p>Un filtre linéaire agit sur chaque sinusoïde séparément. En régime permanent :</p>
      <MBlock>{String.raw`\cos(\omega n) \;\longrightarrow\; |H(e^{j\omega})|\,\cos\!\big(\omega n + \arg H(e^{j\omega})\big)`}</MBlock>
      <p>
        La sortie est donc <M>{String.raw`|H(\omega_1)|\cos(\omega_1 n + \varphi_1) + A_2|H(\omega_2)|\cos(\omega_2 n + \varphi_2)`}</M> :
        chaque composante est pondérée par le gain du filtre à sa fréquence.
      </p>
      <H>Ce que l'on voit</H>
      <ul>
        <li>Sous la coupure (≈ 0,26π), |H| ≈ 1 : la composante passe.</li>
        <li>Au-dessus, |H| décroît vers 0 (zéro double en ω = π) : la composante est éliminée.</li>
        <li>Le déphasage arg H décale légèrement la sortie par rapport à cos(ω1·n).</li>
        <li>Au début, un régime transitoire : les pôles (|p| = 0,72) s'éteignent en une quinzaine d'échantillons.</li>
      </ul>
      <Conclusion>
        <p>Le filtre RII de la partie II laisse passer les basses fréquences et élimine les hautes : c'est un passe-bas.</p>
      </Conclusion>
    </>
  )
}
