import type { Data, Layout, Shape } from 'plotly.js'
import { useMemo, useState } from 'react'
import {
  aliasFrequency,
  aliasOrder,
  aliasSign,
  freqz,
  nyquistStatus,
  peakFrequency,
  peakMagnitude,
  sample,
  sampleWithStep,
  scale,
  sincReconstruct,
} from '../../../dsp'
import { Conclusion, H, M, MBlock } from '../../../components/Explanation'
import { Readout } from '../../../components/Insight'
import Plot, { axisRefs, mergeAxes, stackedLayout } from '../../../components/Plot'
import Section from '../../../components/Section'
import Select from '../../../components/Select'
import Slider from '../../../components/Slider'
import { lineTrace, stemTraces } from '../../../components/StemPlot'
import { C } from '../../../components/theme'
import Toggle from '../../../components/Toggle'
import { fmt, kHz } from '../../../lib/format'
import { ENONCE_1_2 } from './enonce'

// TP values (cell "%% 1.2" of tp1_signaux_discrets.m)
const f0 = 1e3 // MATLAB: f0   = 1e3;      % T0 = 1 ms  ->  f0 = 1 kHz
const tmax = 20e-3 // MATLAB: tmax = 20e-3;    % durée 20 ms
const dt = 20e-6 // MATLAB: dt   = 20e-6;    % pas de 20 µs
const FE_LIST = [4e3, 2e3, 1.1e3, 0.9e3] // MATLAB: fe_list = [4e3 2e3 1.1e3 0.9e3];
const NFFT = 4096 // MATLAB: freqz(xn, 1, 4096, fe)

// The "continuous" signal never changes: computed once.
const cont = sampleWithStep(f0, dt, tmax) // MATLAB: tc = 0:dt:tmax; xc = sin(2*pi*f0*tc);
const contMs = scale(cont.t, 1e3) // MATLAB: tc*1e3

/** Below this, a spectrum is numerically zero (fe = 2 kHz gives ~1e-13). */
const ZERO_SPECTRUM = 1e-6

type View = 'interactive' | 'tp'

/** MATLAB's sprintf('%.1f', fe/1e3), used in the TP's subplot titles. */
const tpKHz = (fe: number) => (fe / 1e3).toFixed(1)

function analyse(fe: number) {
  const s = sample(f0, fe, tmax) // MATLAB: n = 0:1/fe:tmax; xn = sin(2*pi*f0*n);
  const spec = freqz(s.x, NFFT, fe) // MATLAB: [H, f] = freqz(xn, 1, 4096, fe);
  const peakMag = peakMagnitude(spec)
  return {
    s,
    nMs: scale(s.t, 1e3),
    spec,
    peakMag,
    peakF: peakMag > ZERO_SPECTRUM ? peakFrequency(spec) : null,
    status: nyquistStatus(f0, fe),
    fa: aliasFrequency(f0, fe),
    k: aliasOrder(f0, fe),
    sign: aliasSign(f0, fe),
  }
}

function StatusLine({ fe, a }: { fe: number; a: ReturnType<typeof analyse> }) {
  let text: string
  if (a.status === 'ok') text = 'fe > 2f₀ ✓ OK'
  else if (a.status === 'limit') text = 'fe = 2f₀ ⚠ cas limite'
  else text = `fe < 2f₀ ✗ repliement → fréquence apparente = |f₀ − k·fe| = |${f0} − ${a.k}·${fe}| = ${a.fa} Hz`
  const warn = a.status !== 'ok'
  return (
    <p role="status" className={`border px-4 py-2 font-mono text-[0.95rem] ${warn ? 'border-pen text-pen' : 'border-rule-strong'}`}>
      {text}
      {warn && a.peakF === null && (
        <span className="block font-serif text-[0.92rem] italic">
          Tous les échantillons sont nuls : sin(2π·f₀·n/fe) = sin({f0 / fe === 0.5 ? 'π' : `${a.k}·2π`}·n) = 0.
        </span>
      )}
    </p>
  )
}

export default function Sampling() {
  const [fe, setFe] = useState(4e3)
  const [reconstruct, setReconstruct] = useState(false)
  const [view, setView] = useState<View>('interactive')

  const a = useMemo(() => analyse(fe), [fe])
  const recon = useMemo(
    () => (reconstruct ? sincReconstruct(a.s.t, a.s.x, fe, cont.t) : null),
    [reconstruct, a, fe],
  )

  const controls = (
    <>
      <Select<View>
        label="Vue"
        value={view}
        onChange={setView}
        options={[
          { value: 'interactive', label: 'interactive' },
          { value: 'tp', label: 'figures du TP (MATLAB)', tp: true },
        ]}
      />
      {view === 'interactive' && (
        <>
          <Select<number>
            label="Fréquence d'échantillonnage"
            value={FE_LIST.includes(fe) ? fe : null}
            onChange={setFe}
            options={FE_LIST.map((v) => ({ value: v, label: `${kHz(v)} kHz`, tp: true }))}
          />
          <Slider label="fe libre" value={fe} min={500} max={10000} step={50} onChange={setFe} format={(v) => `${kHz(v)} kHz`} />
          <Toggle
            label="Reconstruire (Shannon)"
            checked={reconstruct}
            onChange={setReconstruct}
            hint="Hors TP : interpolation sinc à partir des seuls échantillons."
          />
          <div className="space-y-0.5">
            <Readout label="échantillons" value={String(a.s.x.length)} />
            <Readout label="Te = 1/fe" value={fmt(1e6 / fe, 1)} unit="µs" />
            <Readout label="f. apparente" value={String(a.fa)} unit="Hz" tone={a.status === 'ok' ? 'note' : 'warn'} />
            <Readout label="pic mesuré" value={a.peakF === null ? '—' : fmt(a.peakF, 1)} unit="Hz" />
          </div>
        </>
      )}
    </>
  )

  return (
    <Section
      questions={ENONCE_1_2}
      controls={controls}
      explanation={<SamplingExplanation />}
      code={{ file: 'traitement-du-signal/tp1_signaux_discrets.m', cell: '1.2' }}
    >
      {view === 'interactive' ? <InteractiveView fe={fe} a={a} recon={recon} /> : <TPView />}
    </Section>
  )
}

function InteractiveView({ fe, a, recon }: { fe: number; a: ReturnType<typeof analyse>; recon: number[] | null }) {
  const signalData: Data[] = [
    // MATLAB: plot(tc*1e3, xc, 'Color', [0.8 0.8 0.8]);
    lineTrace(contMs, cont.x, { name: 'x(t) « continu »', color: C.continuous, width: 1.5 }),
    ...(recon ? [lineTrace(contMs, recon, { name: 'reconstruction (Shannon)', color: C.orange, width: 2 })] : []),
    // MATLAB: stem(n*1e3, xn, 'filled');
    ...stemTraces(a.nMs, a.s.x, { name: `x[n], fe = ${kHz(fe)} kHz`, color: C.blue, filled: true, size: 6 }),
  ]

  const expectedLine: Partial<Shape> = {
    type: 'line',
    xref: 'x',
    yref: 'paper',
    x0: a.fa,
    x1: a.fa,
    y0: 0,
    y1: 1,
    line: { color: C.red, width: 1.3, dash: 'dash' },
  }

  // MATLAB: plot(f, abs(H));
  const specData: Data[] = [lineTrace(a.spec.f, a.spec.mag, { name: '|H(f)|', color: C.blue, width: 1.5, yformat: ':.3f' })]
  if (a.peakF !== null) {
    specData.push({
      type: 'scatter',
      mode: 'markers',
      x: [a.peakF],
      y: [a.peakMag],
      name: `maximum : ${fmt(a.peakF, 1)} Hz`,
      marker: { color: 'rgba(0,0,0,0)', size: 10, symbol: 'diamond', line: { color: C.orange, width: 2 } },
    })
  }

  const specLayout: Partial<Layout> = {
    xaxis: { range: [0, fe / 2], title: { text: 'f (Hz)' } },
    // fixed minimum height: for fe = 2 kHz the spectrum is ~1e-13 and must look flat, not like noise
    yaxis: { range: [0, Math.max(a.peakMag * 1.15, 1)], title: { text: '|H(f)|' } },
    shapes: [expectedLine],
    annotations: [
      {
        x: a.fa,
        y: 1,
        xref: 'x',
        yref: 'paper',
        text: `attendu : ${a.fa} Hz`,
        showarrow: false,
        xanchor: a.fa > fe / 4 ? 'right' : 'left',
        xshift: a.fa > fe / 4 ? -6 : 6,
        yanchor: 'top',
        font: { color: C.red, size: 13 },
      },
    ],
  }

  return (
    <>
      <StatusLine fe={fe} a={a} />
      <Plot
        data={signalData}
        layout={{
          xaxis: { range: [0, tmax * 1e3], title: { text: 't (ms)' } },
          yaxis: { range: [-1.35, 1.35], title: { text: 'Amplitude' } },
        }}
        height={380}
        caption={
          <>
            le sinus de 1 kHz « continu » (gris, pas de 20 µs) et ses {a.s.x.length} échantillons x[n] = x(nTe) prélevés
            tous les {fmt(1e6 / fe, 1)} µs (tiges bleues)
            {recon ? ' ; en orange, le seul signal de fréquence < fe/2 qui passe par ces échantillons.' : '.'}
          </>
        }
      />
      <Plot
        data={specData}
        layout={specLayout}
        height={340}
        caption={
          a.peakF === null ? (
            <>le spectre de x[n] est nul (≈ 10⁻¹³, simple bruit de calcul) : il n'y a plus rien à analyser.</>
          ) : (
            <>
              le module de la transformée de Fourier de x[n], calculé par freqz sur 4096 points entre 0 et fe/2 ={' '}
              {fe / 2} Hz ; le pointillé rouge marque la fréquence attendue ({a.fa} Hz), le losange le maximum mesuré.
            </>
          )
        }
      />
    </>
  )
}

/** The exact MATLAB layout: figure "1.2 - Signaux" and figure "1.2 - Spectres", 5 subplots each. */
function TPView() {
  const figs = useMemo(() => {
    const rows = FE_LIST.map(analyse)
    // MATLAB: [H, f] = freqz(xc, 1, 4096, 1/dt);
    const contSpec = freqz(cont.x, NFFT, 1 / dt)

    // --- signals ---
    const sigTitles = ['x(t) : sinus 1 kHz ("continu", pas 20 µs)', ...FE_LIST.map((fe) => `x[n], fe = ${tpKHz(fe)} kHz`)]
    const sigData: Data[] = [lineTrace(contMs, cont.x, { color: C.blue, width: 1.2, ...axisRefs(0), showlegend: false })]
    rows.forEach((r, k) => {
      const ax = axisRefs(k + 1)
      sigData.push(lineTrace(contMs, cont.x, { color: C.continuous, width: 1.2, ...ax, showlegend: false, hover: false }))
      sigData.push(...stemTraces(r.nMs, r.s.x, { color: C.blue, filled: true, size: 5, ...ax, showlegend: false }))
    })
    const sigAxes: Record<string, object> = {}
    for (let k = 0; k < 5; k++) {
      const s = k === 0 ? '' : String(k + 1)
      sigAxes[`xaxis${s}`] = { range: [0, 20], title: { text: 't (ms)' } } // MATLAB: xlabel('t (ms)') on each subplot
      sigAxes[`yaxis${s}`] = { range: [-1.2, 1.2] }
    }

    // --- spectra ---
    const specTitles = ['Spectre de x(t)', ...FE_LIST.map((fe) => `Spectre de x[n], fe = ${tpKHz(fe)} kHz`)]
    const specData: Data[] = [
      lineTrace(contSpec.f, contSpec.mag, { color: C.blue, width: 1.2, ...axisRefs(0), showlegend: false, yformat: ':.2f' }),
    ]
    const specAxes: Record<string, object> = {
      xaxis: { range: [0, 5e3], title: { text: 'f (Hz)' } }, // MATLAB: xlim([0 5e3]);
    }
    rows.forEach((r, k) => {
      specData.push(
        lineTrace(r.spec.f, r.spec.mag, { color: C.blue, width: 1.2, ...axisRefs(k + 1), showlegend: false, yformat: ':.3f' }),
      )
      const s = String(k + 2)
      specAxes[`xaxis${s}`] = { range: [0, FE_LIST[k] / 2], title: { text: 'f (Hz)' } }
      // fe = 2 kHz: keep the axis at a readable scale so 1e-13 does not look like a signal
      specAxes[`yaxis${s}`] = { range: [0, Math.max(r.peakMag * 1.15, 1)] }
    })

    return {
      sig: { data: sigData, layout: mergeAxes(stackedLayout(sigTitles, 0.1), sigAxes) },
      spec: { data: specData, layout: mergeAxes(stackedLayout(specTitles, 0.1), specAxes) },
    }
  }, [])

  const common = { showlegend: false, margin: { l: 52, r: 18, t: 30, b: 50 } }

  return (
    <div className="grid grid-cols-1 gap-5 min-[1800px]:grid-cols-2">
      <Plot
        data={figs.sig.data}
        layout={{ ...figs.sig.layout, ...common }}
        height={1000}
        caption={
          <>
            la figure « 1.2 - Signaux » du TP : le signal continu, puis les échantillons pour fe = 4, 2, 1,1 et 0,9 kHz
            sur le signal continu en gris.
          </>
        }
      />
      <Plot
        data={figs.spec.data}
        layout={{ ...figs.spec.layout, ...common }}
        height={1000}
        caption={
          <>
            la figure « 1.2 - Spectres » du TP : |H(f)| donné par freqz pour le signal continu (0–5 kHz), puis pour
            chaque x[n] (0–fe/2).
          </>
        }
      />
    </div>
  )
}

function SamplingExplanation() {
  // the numbers quoted below are computed, not typed in
  const rows = useMemo(() => FE_LIST.map((fe) => ({ fe, ...analyse(fe) })), [])

  return (
    <>
      <H>Le signal « continu »</H>
      <p>
        Pour représenter <M>{String.raw`x(t) = \sin(2\pi f_0 t)`}</M> avec <M>{String.raw`f_0 = 1\ \text{kHz}`}</M>, le TP
        prend un pas <M>{String.raw`dt = 20\ \mu\text{s}`}</M>, soit 50 points par période de 1 ms : la courbe paraît
        continue. C'est la référence grise.
      </p>

      <H>Échantillonnage</H>
      <p>
        Échantillonner à <M>f_e</M>, c'est ne garder que les valeurs aux instants <M>{String.raw`nT_e = n/f_e`}</M> :
      </p>
      <MBlock>{String.raw`x[n] = x(nT_e) = \sin\!\left(2\pi \frac{f_0}{f_e}\, n\right)`}</MBlock>
      <p>
        Sur 20 ms : {rows.map((r) => r.s.x.length).join(', ')} échantillons pour fe = {rows.map((r) => kHz(r.fe)).join(', ')}{' '}
        kHz.
      </p>

      <H>Shannon et repliement</H>
      <p>
        Le spectre d'un signal échantillonné est celui du signal continu <strong>répété tous les</strong> <M>f_e</M>.
        Pour que les copies ne se chevauchent pas il faut <M>{String.raw`f_e > 2 f_{\max}`}</M>, ici{' '}
        <M>{String.raw`f_e > 2\ \text{kHz}`}</M>. Sinon une copie décalée tombe dans <M>{String.raw`[0, f_e/2]`}</M> : c'est
        le <strong>repliement</strong>. Comme <M>{String.raw`2\pi k n`}</M> est un multiple de <M>{String.raw`2\pi`}</M> :
      </p>
      <MBlock>{String.raw`\sin\!\left(2\pi \tfrac{f_0}{f_e} n\right) = \sin\!\left(2\pi \tfrac{f_0 - k f_e}{f_e} n\right)`}</MBlock>
      <MBlock>{String.raw`f_{\text{app}} = |f_0 - k f_e|,\quad k = \operatorname{round}(f_0/f_e)`}</MBlock>

      <Conclusion title="Conclusion (Q4)">
        <table className="w-full border-collapse text-[0.92rem]">
          <tbody>
            {rows.map((r) => (
              <tr key={r.fe} className="border-b border-pen/30 align-top last:border-0">
                <td className="py-1.5 pr-3 font-mono whitespace-nowrap">{kHz(r.fe)} kHz</td>
                <td className="py-1.5">
                  {r.status === 'ok' && 'fe > 2f₀ : signal correctement représenté, pic à 1 kHz.'}
                  {r.status === 'limit' &&
                    'fe = 2f₀ exactement : les échantillons tombent sur les zéros du sinus, x[n] = sin(πn) = 0. Le signal disparaît (cas limite de Shannon).'}
                  {r.status === 'aliasing' &&
                    `fe < 2f₀ : repliement, pic à |${f0} − ${r.fe}| = ${r.fa} Hz (mesuré : ${fmt(r.peakF ?? 0, 1)} Hz). Les échantillons sont ceux de ${
                      r.sign < 0 ? '−' : '+'
                    }sin(2π·${r.fa}·t)${r.sign < 0 ? ', sinus inversé car f₀ − fe < 0' : ''}.`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Conclusion>

      <H>Le spectre avec freqz</H>
      <p>
        <code className="font-mono">freqz(x, 1, Nfft, fe)</code> traite x comme les coefficients d'un filtre RIF :{' '}
        <M>|H(f)|</M> est la transformée de Fourier de la séquence x[n],
      </p>
      <MBlock>{String.raw`|H(f)| = \Big| \sum_{n=0}^{L-1} x[n]\, e^{-j 2\pi f n / f_e} \Big|`}</MBlock>
      <p>
        évaluée sur 4096 fréquences entre 0 et <M>f_e/2</M>. Le pic vaut environ <M>L/2</M> et non 1 : {fmt(rows[0].peakMag, 1)} pour les{' '}
        {rows[0].s.x.length} échantillons à 4 kHz.
      </p>

      <H>À remarquer</H>
      <ul>
        <li>
          À 1,1 et 0,9 kHz le maximum est vers {fmt(rows[2].peakF ?? 0, 1)} Hz et non 100 Hz : en 20 ms on ne voit que 2
          périodes du sinus à 100 Hz. Sa raie miroir à −100 Hz a un lobe de largeur ≈ 1/t<sub>max</sub> = 50 Hz qui
          déborde et décale légèrement le maximum.
        </li>
        <li>
          Le repliement est irréversible : à partir des seuls échantillons, impossible de savoir si le signal était à
          100 Hz ou à 1 kHz. La case « Reconstruire » redonne le sinus de 100 Hz.
        </li>
        <li>
          Avec le curseur libre, fe = 1 kHz ou 500 Hz donnent aussi des échantillons tous nuls (
          <M>{String.raw`f_0 = k f_e`}</M>, fréquence apparente 0 Hz).
        </li>
      </ul>

      <H>Reconstruction (hors TP)</H>
      <p>
        Le passe-bas idéal de coupure <M>f_e/2</M> redonne l'unique signal de fréquence inférieure à <M>f_e/2</M> qui
        passe par les échantillons :
      </p>
      <MBlock>{String.raw`x_r(t) = \sum_{n} x[n]\, \operatorname{sinc}\!\big(f_e (t - nT_e)\big)`}</MBlock>
      <p>Avec un nombre fini d'échantillons, la reconstruction est moins bonne près de 0 et de 20 ms.</p>
    </>
  )
}
