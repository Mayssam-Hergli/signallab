/**
 * TP3 — II. Stabilité d'un système échantillonné par un contrôleur numérique.
 * G1(s) = 1/(s + 1), C = K, ZOH, unity feedback.
 * MATLAB reference: tp3_stabilite_precision.m, cells II.3-4 … II.7.
 */
import type { Data, Layout } from 'plotly.js'
import { useMemo, useState } from 'react'
import { cabs, gainSweep, order, rlocus, stepDiscrete, stepSampledHybrid, zeros as tfZeros } from '../../../control'
import LoopDiagram from '../../../components/control/LoopDiagram'
import StatusStrip from '../../../components/control/StatusStrip'
import ZPlane from '../../../components/control/ZPlane'
import { Conclusion, H, M, MBlock } from '../../../components/Explanation'
import HandoutFigure from '../../../components/HandoutFigure'
import Plot from '../../../components/Plot'
import Section from '../../../components/Section'
import Slider from '../../../components/Slider'
import { lineTrace, stairsTrace, stemTraces } from '../../../components/StemPlot'
import { C, FIG_FONT } from '../../../components/theme'
import { fmt } from '../../../lib/format'
import { FIG_3_1, II } from './enonce'
import { closedPole, Fz, Gz, kmax, PLANT_II, plantTF, pole0, staticError, TP } from './model'
import { tn, zMinus } from './tex'

const FILE = 'automatique/tp3_stabilite_precision.m'
const K_MAX_SLIDER = 30
const T_CURVE = Array.from({ length: 200 }, (_, i) => 0.01 * (i + 1)) // MATLAB: T_vec = 0.01:0.01:2

/** Simulated duration: 5 s as in the .m file (step(Fz, 5)), at least 15 samples. */
const horizon = (T: number) => Math.max(TP.II.tEnd, 15 * T)

export default function SampledLoop() {
  const [K, setK] = useState<number>(TP.II.K)
  const [T, setT] = useState<number>(TP.II.T)
  const [matlab, setMatlab] = useState(false)

  const a = pole0(PLANT_II, T)
  const p = closedPole(PLANT_II, K, T)
  const km = kmax(PLANT_II, T)
  const stable = Math.abs(p) < 1
  const F = useMemo(() => Fz(PLANT_II, K, T), [K, T])

  const controls = (
    <>
      <Slider label="Gain K du contrôleur" value={K} min={0} max={K_MAX_SLIDER} step={0.1} onChange={setK} format={(v) => v.toFixed(1)} hint={`K limite pour ce T : ${fmt(km, 3)}`} />
      <Slider
        label="Période d'échantillonnage T"
        value={T}
        min={0.01}
        max={2}
        step={0.01}
        onChange={setT}
        format={(v) => `${v.toFixed(2)} s`}
        hint={`a = e^(−T) = ${fmt(a, 4)} ; la valeur du .m est T = 0.1 s`}
      />
    </>
  )

  return (
    <Section
      questions={{
        intro: (
          <>
            <p>
              {II.intro} <M>{'G_1(s) = \\dfrac{1}{s+1}'}</M> {II.introAfter}
            </p>
            <HandoutFigure {...FIG_3_1} />
            <p>
              {II.given[0]} <M>{'C(s) = K'}</M> {II.given[1]} <M>{'B_0(s)'}</M> {II.given[2]} <M>{'\\dfrac{1-e^{-Ts}}{s}'}</M>
            </p>
          </>
        ),
        items: II.items,
      }}
      controls={controls}
      explanation={<SampledLoopExplanation K={K} T={T} />}
      code={[
        { file: FILE, cell: 'II.3-4' },
        { file: FILE, cell: 'II.5' },
        { file: FILE, cell: 'II.6' },
        { file: FILE, cell: 'II.7' },
      ]}
    >
      <div className="flex flex-wrap items-stretch gap-3">
        <StatusStrip
          lamp={{ on: stable, label: stable ? 'stable' : Math.abs(Math.abs(p) - 1) < 1e-9 ? 'limite' : 'instable' }}
          cells={[
            { label: 'ordre', value: order(F) },
            { label: 'pôle', value: fmt(p, 4), tone: stable ? 'ok' : 'bad' },
            { label: '|pôle|', value: fmt(Math.abs(p), 4) },
            { label: 'zéros', value: tfZeros(F).length === 0 ? 'aucun' : tfZeros(F).length },
            { label: 'K limite', value: fmt(km, 4) },
            { label: 'erreur statique 1/(1+K)', value: stable ? fmt(staticError(PLANT_II, K), 4) : '— (instable)', tone: stable ? undefined : 'warn' },
          ]}
        />
        <button
          type="button"
          onClick={() => setMatlab((v) => !v)}
          aria-pressed={matlab}
          title="Les quatre réponses de la cellule II.7 du fichier .m"
          className={`border px-4 font-mono text-[0.88rem] transition-colors ${matlab ? 'border-trace/70 bg-trace/[0.08] text-trace' : 'border-rule-strong text-ink-soft hover:border-ink-soft hover:text-ink'}`}
        >
          {matlab ? '✕ Fermer la vue MATLAB' : '▦ Vue MATLAB (II.7)'}
        </button>
      </div>

      {matlab && <MatlabGrid T={T} />}

      <LoopDiagram
        label={`Boucle échantillonnée : C(s) = K = ${K.toFixed(1)}, T = ${T.toFixed(2)} s, G1(s) = 1/(s+1)`}
        input="e(t)"
        output="S(t)"
        items={[
          { kind: 'sampler', id: 's1', value: `${T.toFixed(2)} s` },
          { kind: 'block', id: 'C', title: 'C(s) = K', value: `K = ${K.toFixed(1)}` },
          { kind: 'sampler', id: 's2', value: `${T.toFixed(2)} s` },
          { kind: 'block', id: 'B0', title: 'B_0(s) = (1 − e⁻ᵀˢ)/s', value: `T = ${T.toFixed(2)} s` },
          { kind: 'block', id: 'G1', title: 'G_1(s)', value: '1/(s + 1)' },
        ]}
      />

      <Derivation K={K} T={T} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <LocusII K={K} T={T} />
        <KmaxCurve K={K} T={T} />
      </div>

      <StepII K={K} T={T} stable={stable} />
    </Section>
  )
}

/** Q3: the calculation, step by step, with the current numbers. */
function Derivation({ K, T }: { K: number; T: number }) {
  const a = pole0(PLANT_II, T)
  const g = 1 - a
  const p = closedPole(PLANT_II, K, T)
  const km = kmax(PLANT_II, T)
  const stable = Math.abs(p) < 1
  return (
    <div className="border border-rule-strong bg-sheet px-5 py-3">
      <p className="font-mono text-[0.82rem] text-trace">Q3 — calcul de G(z) et de la boucle fermée F(z), avec les valeurs actuelles</p>
      <div className="overflow-x-auto text-[1.02rem] [&_.katex-display]:my-2.5">
        <MBlock>{String.raw`\mathcal{Z}\{B_0(s)\,G_1(s)\} = (1-z^{-1})\,\mathcal{Z}\left\{\frac{G_1(s)}{s}\right\} = (1-z^{-1})\,\mathcal{Z}\left\{\frac{1}{s(s+1)}\right\}`}</MBlock>
        <MBlock>{String.raw`\frac{1}{s(s+1)} = \frac{1}{s} - \frac{1}{s+1} \;\xrightarrow{\;\mathcal{Z}\;}\; \frac{z}{z-1} - \frac{z}{z-a}, \qquad a = e^{-T} = e^{-${tn(T, 2)}} = ${tn(a)}`}</MBlock>
        <MBlock>{String.raw`G(z) = \frac{z-1}{z}\left(\frac{z}{z-1} - \frac{z}{z-a}\right) = \frac{1-a}{z-a} = \frac{${tn(g)}}{${zMinus(a)}}`}</MBlock>
        <MBlock>{String.raw`F(z) = \frac{K\,G(z)}{1+K\,G(z)} = \frac{K(1-a)}{z-a+K(1-a)} = \frac{${tn(K, 1)} \times ${tn(g)}}{z - ${tn(a)} + ${tn(K * g)}} = \frac{${tn(K * g)}}{${zMinus(p)}}`}</MBlock>
        <MBlock>{String.raw`p = a - K(1-a) = ${tn(p)}, \quad |p| ${stable ? '<' : '\\geq'} 1 \;\Rightarrow\; \text{${stable ? 'stable' : 'instable'}}, \qquad -1 < p < 1 \iff 0 < K < \frac{1+a}{1-a} = ${tn(km)}`}</MBlock>
      </div>
    </div>
  )
}

/** Q5: the closed-loop pole on the root locus, inside / outside the unit circle. */
function LocusII({ K, T }: { K: number; T: number }) {
  const G = useMemo(() => Gz(PLANT_II, T), [T])
  const branches = useMemo(() => [rlocus(G, gainSweep(K_MAX_SLIDER, 200)).map((pt) => pt.poles[0])], [G])
  const p = closedPole(PLANT_II, K, T)
  const km = kmax(PLANT_II, T)
  const lo = Math.max(-4.5, Math.min(-1.6, p - 0.3))
  return (
    <ZPlane
      branches={branches}
      openLoop={[{ re: pole0(PLANT_II, T), im: 0 }]}
      current={[{ re: p, im: 0 }]}
      K={K}
      crossing={km <= K_MAX_SLIDER ? { z: { re: -1, im: 0 }, K: km } : undefined}
      xRange={[lo, 1.4]}
      height={400}
      caption={
        <>
          le pôle de F(z) part de z = a = {fmt(pole0(PLANT_II, T), 3)} (×, K = 0) et glisse vers la gauche sur l'axe réel
          quand K augmente (trait bleu, K de 0 à {K_MAX_SLIDER}). Il sort du cercle unité en z = −1 pour K = {fmt(km, 3)} (losange).
          Point vert : stable ; rouge : instable.
        </>
      }
    />
  )
}

/** Q7: the limit gain as a function of T, with the current (T, K). */
function KmaxCurve({ K, T }: { K: number; T: number }) {
  const km = kmax(PLANT_II, T)
  const stable = K < km
  const data: Data[] = [
    {
      type: 'scatter',
      mode: 'lines',
      x: T_CURVE,
      y: T_CURVE.map((t) => kmax(PLANT_II, t)),
      fill: 'tozeroy',
      fillcolor: 'rgba(143, 209, 79, 0.07)',
      line: { color: C.blue, width: 2.5 },
      name: 'K limite (1 + e^−T)/(1 − e^−T)',
      hovertemplate: 'T = %{x:.2f} s<br>K limite = %{y:.3f}<extra></extra>',
    },
    {
      type: 'scatter',
      mode: 'markers',
      x: [T],
      y: [K],
      marker: { size: 14, color: stable ? C.green : C.red, line: { color: C.screen, width: 1.5 } },
      name: `(T, K) actuel : ${stable ? 'stable' : 'instable'}`,
      hovertemplate: 'T = %{x:.2f} s<br>K = %{y:.2f}<extra></extra>',
    },
  ]
  const layout: Partial<Layout> = {
    xaxis: { title: { text: 'T (s)' }, range: [0, 2] },
    yaxis: { title: { text: 'K limite' }, range: [0, 50] }, // MATLAB: ylim([0 50])
    annotations: [
      { x: 0.32, y: 2.5, text: 'stable', showarrow: false, font: { size: 14, color: C.green } },
      { x: 1.3, y: 30, text: 'instable', showarrow: false, font: { size: 14, color: C.red } },
    ],
  }
  return (
    <Plot
      data={data}
      layout={layout}
      height={400}
      caption={
        <>
          la courbe bleue est le gain limite de stabilité en fonction de T (cellule II.7). Sous la courbe (zone verte), la
          boucle est stable. Plus on échantillonne lentement, plus le gain admissible est petit : K = {fmt(K, 1)} est
          {stable ? ' sous' : ' au-dessus de'} la limite {fmt(km, 2)} pour T = {fmt(T, 2)} s.
        </>
      }
    />
  )
}

/** Q6: the loop as Simulink shows it — continuous output, samples, held control. */
function StepII({ K, T, stable }: { K: number; T: number; stable: boolean }) {
  const tEnd = horizon(T)
  const h = useMemo(() => stepSampledHybrid(plantTF(PLANT_II), K, T, tEnd), [K, T, tEnd])
  const yInf = 1 - staticError(PLANT_II, K)
  const many = h.tk.length > 40
  const data: Data[] = [
    lineTrace([0, tEnd], [1, 1], { name: 'consigne', color: C.continuous, dash: 'dash', width: 1.5, hover: false }),
    lineTrace(h.t, h.y, { name: 's(t) continue', color: C.blue, width: 2.2, yformat: ':.4f' }),
    ...(many
      ? [
          {
            type: 'scatter',
            mode: 'markers',
            x: h.tk,
            y: h.yk,
            name: 's(kT)',
            marker: { size: 4, color: C.orange },
            hovertemplate: 't = %{x:.2f} s<br>s(kT) = %{y:.4f}<extra></extra>',
          } as Data,
        ]
      : stemTraces(h.tk, h.yk, { name: 's(kT) échantillons', color: C.orange, size: 6, yformat: ':.4f' })),
  ]
  if (stable) data.push(lineTrace([0, tEnd], [yInf, yInf], { name: `s(∞) = K/(1+K) = ${fmt(yInf, 3)}`, color: C.yellow, dash: 'dot', width: 1.5, hover: false }))
  const layout: Partial<Layout> = {
    xaxis: { title: { text: 't (s)' }, range: [0, tEnd] },
    yaxis: { title: { text: 's(t)' }, ...(stable ? {} : { range: [-3, 4] }) },
    annotations: stable
      ? []
      : [{ xref: 'paper', yref: 'paper', x: 0.98, y: 0.95, xanchor: 'right', text: 'instable : la sortie diverge (axe limité)', showarrow: false, font: { size: 14, color: C.red } }],
  }
  return (
    <Plot
      data={data}
      layout={layout}
      height={380}
      caption={
        <>
          réponse indicielle de la boucle de la figure 3.1, simulée comme dans Simulink : la sortie continue s(t) du procédé
          (trait bleu) et ses valeurs aux instants d'échantillonnage kT (orange), là où le contrôleur la lit. Entre deux
          instants, la commande K·ε(kT) reste constante (bloqueur d'ordre 0). Aux instants kT, ces valeurs sont exactement
          celles de step(Fz) dans MATLAB.
        </>
      }
    />
  )
}

/** "Vue MATLAB": the 2×2 figure of cell II.7, K = 1, 0.5·Kmax, 0.95·Kmax, 1.05·Kmax. */
function MatlabGrid({ T }: { T: number }) {
  const km = kmax(PLANT_II, T)
  const Ks = [1, 0.5 * km, 0.95 * km, 1.05 * km]
  const n = Math.ceil(Math.max(3, 15 * T) / T) + 1 // MATLAB: step(Fi, 3)
  const colors = [C.blue, C.blue, C.blue, C.red]
  const data: Data[] = []
  const annotations: Partial<Layout>['annotations'] = []
  const layout: Record<string, unknown> = {
    grid: { rows: 2, columns: 2, pattern: 'independent', xgap: 0.12, ygap: 0.25 },
    showlegend: false,
    margin: { l: 56, r: 20, t: 40, b: 50 },
  }
  Ks.forEach((Ki, i) => {
    const s = i === 0 ? '' : String(i + 1)
    const r = stepDiscrete(Fz(PLANT_II, Ki, T), n)
    data.push(stairsTrace(r.t, r.y, { color: colors[i], xaxis: `x${s}`, yaxis: `y${s}`, width: 1.8, name: `K = ${Ki.toFixed(2)}` }))
    const pole = closedPole(PLANT_II, Ki, T)
    annotations.push({
      text: `<b>K = ${Ki.toFixed(2)}  (pôle = ${pole.toFixed(3)})</b>`,
      xref: `x${s} domain` as never,
      yref: `y${s} domain` as never,
      x: 0.5,
      y: 1,
      yanchor: 'bottom',
      showarrow: false,
      font: { family: FIG_FONT, size: 14, color: cabs({ re: pole, im: 0 }) < 1 ? C.axis : C.red },
    })
    layout[`xaxis${s}`] = { title: { text: i >= 2 ? 't (s)' : '' } }
    layout[`yaxis${s}`] = {}
  })
  layout.annotations = annotations
  return (
    <Plot
      data={data}
      layout={layout as Partial<Layout>}
      height={520}
      caption={
        <>
          la figure « II.7 - Effet de K » du fichier .m pour T = {fmt(T, 2)} s : réponses indicielles discrètes (escaliers,
          comme step() sur un système échantillonné) pour K = 1, 0,5·Kmax, 0,95·Kmax et 1,05·Kmax. Plus K approche Kmax,
          plus le pôle tend vers −1 et plus la réponse oscille d'un échantillon à l'autre ; au-delà, elle diverge (rouge).
        </>
      }
    />
  )
}

function SampledLoopExplanation({ K, T }: { K: number; T: number }) {
  const a = pole0(PLANT_II, T)
  const p = closedPole(PLANT_II, K, T)
  return (
    <>
      <H>Ce que voit le contrôleur</H>
      <p>
        Le contrôleur numérique ne lit l'erreur qu'aux instants kT ; le bloqueur d'ordre 0 maintient sa commande constante
        jusqu'à l'échantillon suivant. Vu des instants kT, le procédé continu précédé du bloqueur est le système discret
      </p>
      <MBlock>{String.raw`G(z) = (1-z^{-1})\,\mathcal{Z}\left\{\frac{G_1(s)}{s}\right\} = \frac{1-a}{z-a},\quad a = e^{-T}`}</MBlock>
      <p>
        Le pôle continu s = −1 devient le pôle discret <M>{'z = e^{-T}'}</M> : c'est la correspondance{' '}
        <M>{'z = e^{sT}'}</M>.
      </p>

      <H>Stabilité : le pôle dans le cercle unité</H>
      <p>
        La boucle fermée a un seul pôle (ordre 1, aucun zéro) : <M>{'p = a - K(1-a)'}</M>. Un système discret est stable si
        tous ses pôles vérifient <M>{'|p| < 1'}</M>. Ici p = {fmt(p, 4)}.
      </p>
      <ul>
        <li>0 &lt; p &lt; 1 : réponse monotone, comme un premier ordre ;</li>
        <li>−1 &lt; p &lt; 0 : la réponse change de côté à chaque échantillon (oscillation à la fréquence 1/(2T)) ;</li>
        <li>p ≤ −1 : l'oscillation grandit, la boucle est instable.</li>
      </ul>
      <MBlock>{String.raw`p > -1 \iff K < K_{max} = \frac{1+a}{1-a} = \frac{1+e^{-T}}{1-e^{-T}}`}</MBlock>
      <p>
        En continu, la boucle K/(s + 1) serait stable pour tout K &gt; 0. C'est l'échantillonnage (le retard d'information
        jusqu'à T secondes) qui limite le gain : plus T est grand, plus Kmax est petit (≈ 2/T pour T petit).
      </p>

      <H>Précision</H>
      <p>
        G(1) = 1, donc <M>{'F(1) = \\frac{K}{1+K}'}</M> et l'erreur statique vaut <M>{'\\varepsilon_\\infty = \\frac{1}{1+K}'}</M>
        : elle ne s'annule jamais avec un correcteur proportionnel (pas d'intégrateur dans la boucle). Augmenter K la réduit,
        mais rapproche le pôle de −1.
      </p>

      <Conclusion>
        <ul>
          <li>a = e^(−T) = {fmt(a, 4)} : le pôle en boucle ouverte se rapproche de 1 quand T diminue.</li>
          <li>Stabilité ⇔ K &lt; (1 + e^(−T))/(1 − e^(−T)) ; précision et stabilité sont en conflit.</li>
        </ul>
      </Conclusion>
    </>
  )
}
