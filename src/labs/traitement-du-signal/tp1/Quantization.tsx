import type { Data, Shape } from 'plotly.js'
import { useMemo, useState } from 'react'
import { bitsToLevels, quantizationReport, sample, sampleWithStep, scale, snrSweep } from '../../../dsp'
import { Conclusion, H, M, MBlock } from '../../../components/Explanation'
import Insight, { Readout } from '../../../components/Insight'
import Plot from '../../../components/Plot'
import Section from '../../../components/Section'
import Select from '../../../components/Select'
import Slider from '../../../components/Slider'
import { lineTrace, stairsTrace, stemTraces } from '../../../components/StemPlot'
import { C } from '../../../components/theme'
import { fmt } from '../../../lib/format'
import { ENONCE_1_3 } from './enonce'

// TP values (cell "%% 1.3" of tp1_signaux_discrets.m)
const f0 = 1e3 // MATLAB: f0 = 1e3; tmax = 20e-3; dt = 20e-6;
const tmax = 20e-3
const dt = 20e-6
const fc = 2 * f0 // MATLAB: fc = 2*f0      % Q2 : fréquence de Nyquist = 2 fmax = 2 kHz
const fe = 2 * fc // MATLAB: fe = 2*fc;     % Q3 : fe = 2 fc = 4 kHz
const N_LIST = [64, 256] // MATLAB: N_list = [64 256];
const BITS = Array.from({ length: 12 }, (_, i) => i + 1)

type SignalKind = 'tp' | 'dense'

const SIGNALS: Record<SignalKind, { t: number[]; x: number[] }> = {
  tp: sample(f0, fe, tmax), // MATLAB: n = 0:1/fe:tmax; xn = sin(2*pi*f0*n);
  dense: sampleWithStep(f0, dt, tmax), // MATLAB: tc = 0:dt:tmax; xc = sin(2*pi*f0*tc);
}
const TIME_MS: Record<SignalKind, number[]> = {
  tp: scale(SIGNALS.tp.t, 1e3),
  dense: scale(SIGNALS.dense.t, 1e3),
}

/** q/2 written compactly (exponent when tiny). */
const half = (q: number) => (q / 2 < 0.001 ? (q / 2).toExponential(1) : fmt(q / 2, 4))

export default function Quantization() {
  const [bits, setBits] = useState(6)
  const [kind, setKind] = useState<SignalKind>('tp')

  const N = bitsToLevels(bits)
  const { x } = SIGNALS[kind]
  const tMs = TIME_MS[kind]
  const r = useMemo(() => quantizationReport(x, N), [x, N])
  const sweep = useMemo(() => snrSweep(x, BITS), [x])

  const isTP = kind === 'tp'
  const signalName = isTP ? 'xn (fe = 4 kHz)' : 'xc (pas 20 µs)'

  // --- plot 1: samples + quantized staircase
  // MATLAB: stem(n*1e3, xn); hold on; stairs(n*1e3, xq, 'r');
  const sigData: Data[] = [
    ...(isTP
      ? stemTraces(tMs, x, { name: signalName, color: C.blue, size: 6 })
      : [lineTrace(tMs, x, { name: signalName, color: C.blue, width: 1.5 })]),
    stairsTrace(tMs, r.xq, { name: `xq, N = ${N}`, color: C.red, width: 1.5 }),
  ]

  // --- plot 2: error (MATLAB: stem(n*1e3, e);) with the ±q/2 bounds
  const bound = (y: number): Partial<Shape> => ({
    type: 'line',
    xref: 'paper',
    yref: 'y',
    x0: 0,
    x1: 1,
    y0: y,
    y1: y,
    line: { color: C.axis, width: 1, dash: 'dot' },
  })
  const errData: Data[] = isTP
    ? stemTraces(tMs, r.e, { name: 'e = xn − xq', color: C.blue, size: 6, yformat: ':.5f', showlegend: false })
    : [lineTrace(tMs, r.e, { name: 'e = xc − xq', color: C.blue, width: 1, yformat: ':.5f', showlegend: false })]

  // --- plot 3: distribution of the error (MATLAB histogram: FaceAlpha 0.6, black edges)
  const histData: Data[] = [
    {
      type: 'histogram',
      x: r.e,
      xbins: { start: -0.55 * r.q, end: 0.55 * r.q, size: r.q / 20 },
      histnorm: 'probability',
      marker: { color: C.blue, opacity: 0.6, line: { color: C.axis, width: 0.5 } },
      name: 'répartition de e',
      hovertemplate: 'e ≈ %{x:.5f}<br>%{y:.1%}<extra></extra>',
    },
  ]

  // --- plot 4: practical vs theoretical SNR for every b (MATLAB: bar(b, [pratique theorique]))
  const opacity = sweep.map((p) => (p.bits === bits ? 1 : 0.35))
  const barData: Data[] = [
    {
      type: 'bar',
      x: sweep.map((p) => p.bits),
      y: sweep.map((p) => p.practical),
      name: 'RSB pratique',
      marker: { color: C.blue, opacity, line: { color: C.axis, width: 0.5 } },
      hovertemplate: 'b = %{x}<br>%{y:.2f} dB<extra>pratique</extra>',
    },
    {
      type: 'bar',
      x: sweep.map((p) => p.bits),
      y: sweep.map((p) => p.theoretical),
      name: 'RSB théorique 6.02b + 1.76',
      marker: { color: C.orange, opacity, line: { color: C.axis, width: 0.5 } },
      hovertemplate: 'b = %{x}<br>%{y:.2f} dB<extra>théorique</extra>',
    },
  ]

  const controls = (
    <>
      <Select<SignalKind>
        label="Signal quantifié"
        value={kind}
        onChange={setKind}
        options={[
          { value: 'tp', label: 'fe = 4 kHz', tp: true },
          { value: 'dense', label: 'signal dense (pas 20 µs)' },
        ]}
        hint={isTP ? '81 échantillons : seulement 0, 1, 0, −1…' : '1001 points : beaucoup de valeurs différentes.'}
      />
      <Select<number>
        label="Nombre de niveaux"
        value={N_LIST.includes(N) ? bits : null}
        onChange={setBits}
        options={N_LIST.map((n) => ({ value: Math.log2(n), label: `N = ${n}`, tp: true }))}
      />
      <Slider label="Bits b" value={bits} min={1} max={12} onChange={setBits} format={(v) => `${v} (N = ${bitsToLevels(v)})`} />
      <div className="space-y-0.5">
        <Readout label="pas q = 2A/N" value={r.q < 0.001 ? r.q.toExponential(2) : fmt(r.q, 5)} />
        <Readout label="mean(e²) / (q²/12)" value={fmt(r.noiseRatio, 2)} tone={isTP ? 'warn' : 'note'} />
      </div>
    </>
  )

  return (
    <Section
      questions={ENONCE_1_3}
      controls={controls}
      explanation={<QuantizationExplanation />}
      code={{ file: 'traitement-du-signal/tp1_signaux_discrets.m', cell: '1.3' }}
    >
      {/* same line as MATLAB's fprintf in the TP */}
      <pre className="overflow-x-auto border border-rule-strong bg-screen px-4 py-2.5 font-mono text-trace text-[0.95rem]">
        <span className="text-ink-soft">&gt;&gt; </span>N = {String(N).padStart(3, ' ')} ({bits} bits) : RSB pratique ={' '}
        {fmt(r.snr, 2)} dB | théorique = {fmt(r.snrTheory, 2)} dB
      </pre>

      <Insight
        tone={isTP ? 'warn' : 'note'}
        title={
          <>
            Écart théorique − pratique = <span className="font-mono">{fmt(r.gap, 2)}</span> dB
          </>
        }
      >
        {isTP ? (
          <>
            L'erreur vaut toujours ±q/2 : sa puissance est {fmt(r.noiseRatio, 2)} × q²/12, soit 10·log₁₀(3) ={' '}
            {fmt(r.noiseExcessDb, 2)} dB de bruit en trop. Les {fmt(r.signalDeficitDb, 2)} dB restants viennent de la
            puissance du signal : mean(x²) = {fmt(r.signalPower, 4)} au lieu de 1/2.
          </>
        ) : (
          <>
            Avec beaucoup de valeurs différentes, l'erreur se répartit dans [−q/2, q/2] : sa puissance n'est plus que{' '}
            {fmt(r.noiseRatio, 2)} × q²/12 ({fmt(r.noiseExcessDb, 2)} dB) et l'écart se réduit.
          </>
        )}
      </Insight>

      <Plot
        data={sigData}
        layout={{
          title: { text: `<b>Échantillons et signal quantifié, N = ${N}</b>`, font: { size: 14 } },
          margin: { l: 64, r: 24, t: 70, b: 54 },
          legend: { y: 1.0, yanchor: 'bottom', x: 1, xanchor: 'right' },
          xaxis: { range: [0, tmax * 1e3], title: { text: 't (ms)' } },
          yaxis: { range: [-1.2, 1.2] },
        }}
        height={360}
        caption={
          <>
            {isTP ? 'les 81 échantillons (tiges bleues)' : 'le signal dense (bleu)'} et le signal quantifié xq sur {N}{' '}
            niveaux (escalier rouge) ; l'écart, au plus q/2 = <span className="font-mono">{half(r.q)}</span>, est trop
            petit pour être vu à cette échelle : zoomez, ou regardez l'erreur ci-dessous.
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 min-[1700px]:grid-cols-[3fr_2fr]">
        <Plot
          data={errData}
          layout={{
            title: { text: `<b>Erreur de quantification, N = ${N}</b>`, font: { size: 14 } },
            margin: { l: 72, r: 24, t: 44, b: 54 },
            xaxis: { range: [0, tmax * 1e3], title: { text: 't (ms)' } },
            yaxis: { range: [-0.75 * r.q, 0.75 * r.q], exponentformat: 'e' },
            shapes: [bound(r.q / 2), bound(-r.q / 2)],
          }}
          height={320}
          caption={
            isTP ? (
              <>l'erreur e = xn − xq de chaque échantillon : toujours collée à +q/2 ou −q/2 (pointillés).</>
            ) : (
              <>l'erreur du signal dense : elle prend des valeurs variées entre −q/2 et +q/2 (pointillés).</>
            )
          }
        />
        <Plot
          data={histData}
          layout={{
            title: { text: '<b>Répartition de e</b>', font: { size: 14 } },
            margin: { l: 64, r: 24, t: 44, b: 54 },
            showlegend: false,
            bargap: 0.05,
            xaxis: { range: [-0.6 * r.q, 0.6 * r.q], title: { text: 'e' }, exponentformat: 'e', nticks: 5 },
            yaxis: { tickformat: '.0%' },
          }}
          height={320}
          caption={<>la proportion des valeurs de e ; la formule théorique suppose des barres toutes égales (erreur uniforme).</>}
        />
      </div>

      <Plot
        data={barData}
        layout={{
          barmode: 'group',
          bargap: 0.25,
          xaxis: { title: { text: 'nombre de bits b' }, dtick: 1 },
          yaxis: { title: { text: 'RSB (dB)' } },
        }}
        height={330}
        caption={
          <>
            le RSB mesuré (bleu) et le RSB théorique 6.02b + 1.76 dB (orange) pour b = 1 à 12 bits, sur le même signal ;
            les barres de b = {bits} sont en trait plein. Chaque bit ajoute environ 6 dB.
          </>
        }
      />
    </Section>
  )
}

function QuantizationExplanation() {
  const tp64 = useMemo(() => quantizationReport(SIGNALS.tp.x, 64), [])
  const tp256 = useMemo(() => quantizationReport(SIGNALS.tp.x, 256), [])
  const d64 = useMemo(() => quantizationReport(SIGNALS.dense.x, 64), [])
  const d256 = useMemo(() => quantizationReport(SIGNALS.dense.x, 256), [])

  return (
    <>
      <H>Q1 – Q3</H>
      <p>
        Sinus <M>{String.raw`f_0 = 1\ \text{kHz}`}</M> sur 20 ms. Fréquence de Nyquist{' '}
        <M>{String.raw`f_c = 2 f_{\max} = 2\ \text{kHz}`}</M> ; le TP échantillonne à{' '}
        <M>{String.raw`f_e = 2 f_c = 4\ \text{kHz}`}</M>, soit 4 échantillons par période.
      </p>

      <H>Q4 – Quantificateur linéaire</H>
      <p>
        <M>{String.raw`[-A, A]`}</M> est découpé en <M>N</M> intervalles de largeur <M>q</M> ; chaque échantillon est
        remplacé par le <strong>milieu</strong> de son intervalle :
      </p>
      <MBlock>{String.raw`\begin{aligned} q &= \tfrac{2A}{N}, \qquad i = \Big\lfloor \tfrac{x + A}{q} \Big\rfloor \\ x_q &= -A + \big(i + \tfrac12\big)\, q \end{aligned}`}</MBlock>
      <p>
        (<M>i</M> borné à <M>[0, N-1]</M>.) Donc <M>{String.raw`|e| = |x - x_q| \le q/2`}</M>. Zéro n'est pas un niveau de
        sortie : les niveaux sont <M>{String.raw`\pm q/2, \pm 3q/2, \dots`}</M>
      </p>

      <H>Q5 – RSB théorique</H>
      <p>
        Erreur uniforme sur <M>{String.raw`[-q/2, q/2]`}</M> : puissance <M>{String.raw`q^2/12`}</M>. Sinus d'amplitude{' '}
        <M>A</M> : puissance <M>{String.raw`A^2/2`}</M>. Avec <M>{String.raw`N = 2^b`}</M> :
      </p>
      <MBlock>{String.raw`\text{RSB} = 10 \log_{10} \frac{A^2/2}{q^2/12} \approx 6{,}02\, b + 1{,}76\ \text{dB}`}</MBlock>
      <p>
        Soit {fmt(tp64.snrTheory, 2)} dB (N = 64) et {fmt(tp256.snrTheory, 2)} dB (N = 256).
      </p>

      <H>Pourquoi 4,77 dB de moins ?</H>
      <p>
        À <M>{String.raw`f_e = 4 f_0`}</M> les échantillons valent seulement <strong>0, 1, 0, −1</strong> : 0 est une
        frontière entre deux niveaux et ±1 sont aux bords. L'erreur vaut donc <strong>toujours ±q/2</strong> :
      </p>
      <MBlock>{String.raw`\begin{aligned} \overline{e^2} &= \tfrac{q^2}{4} = 3 \times \tfrac{q^2}{12} \\ 10 \log_{10} 3 &= 4{,}77\ \text{dB} \end{aligned}`}</MBlock>
      <p>
        S'y ajoutent {fmt(tp64.signalDeficitDb, 2)} dB car <M>{String.raw`\overline{x^2} = 40/81`}</M> au lieu de 1/2.
      </p>

      <Conclusion>
        <table className="w-full border-collapse font-mono text-[0.85rem]">
          <thead>
            <tr className="border-b border-pen/40 text-left font-serif">
              <th className="py-1 pr-2 font-normal">signal</th>
              <th className="py-1 pr-2 font-normal">N</th>
              <th className="py-1 pr-2 font-normal">pratique</th>
              <th className="py-1 pr-2 font-normal">théorie</th>
              <th className="py-1 font-normal">écart</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: '4 kHz', rep: tp64 },
              { label: '4 kHz', rep: tp256 },
              { label: 'dense', rep: d64 },
              { label: 'dense', rep: d256 },
            ].map(({ label, rep }, i) => (
              <tr key={i}>
                <td className="py-0.5 pr-2 whitespace-nowrap">{label}</td>
                <td className="py-0.5 pr-2">{rep.N}</td>
                <td className="py-0.5 pr-2">{fmt(rep.snr, 2)}</td>
                <td className="py-0.5 pr-2">{fmt(rep.snrTheory, 2)}</td>
                <td className="py-0.5">{fmt(rep.gap, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          L'écart n'est pas un défaut du quantificateur : c'est l'hypothèse « erreur uniforme » qui est fausse pour un
          signal à trois valeurs. Sur le signal dense, l'écart tombe à {fmt(d64.gap, 2)} dB puis {fmt(d256.gap, 2)} dB.
        </p>
      </Conclusion>

      <p>
        À fe = 4 kHz l'écart est le même pour tous les nombres de bits (diagramme en barres) : chaque bit divise q par 2
        et gagne 6,02 dB, en pratique comme en théorie.
      </p>
    </>
  )
}
