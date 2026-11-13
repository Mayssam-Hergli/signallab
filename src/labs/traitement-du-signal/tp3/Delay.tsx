import type { Annotations, Layout } from 'plotly.js'
import { useMemo, useState, type ReactNode } from 'react'
import { Conclusion, H, M, MBlock } from '../../../components/Explanation'
import Insight, { Readout } from '../../../components/Insight'
import Plot, { axisRefs, mergeAxes, stackedLayout } from '../../../components/Plot'
import Section from '../../../components/Section'
import Select from '../../../components/Select'
import Slider from '../../../components/Slider'
import { stemTraces } from '../../../components/StemPlot'
import { C } from '../../../components/theme'
import { fmt } from '../../../lib/format'
import { ENONCE_Q7_Q8 } from './enonce'
import { DC, F1, FILE, PHI_TP, RANGES, clean, dftView, piLabel, valueAt, x3, type DftView } from './model'
import PhasorCircle from './PhasorCircle'

const X_RANGE = [-260, 260]
const Y_ZOOM = 0.62

/**
 * Re/N, Im/N and |X|/N stacked (MATLAB subplot(3,1,k)), zoomed on ±0.6 so the
 * 0.5 lines read next to the DC line (5, drawn clipped and labelled).
 */
function TripleFigure({ v, name, color, caption }: { v: DftView; name: string; color: string; caption: ReactNode }) {
  const rows = [
    { key: 're' as const, title: `Re{${name}(f)}/N` },
    { key: 'im' as const, title: `Im{${name}(f)}/N` },
    { key: 'mag' as const, title: `|${name}(f)|/N` },
  ]
  const fAxis = { range: X_RANGE, dtick: 100, title: { text: '' } }
  const base = stackedLayout(
    rows.map((r) => r.title),
    0.13,
  )
  const extra: Record<string, object> = {}
  rows.forEach((r, k) => {
    const s = k === 0 ? '' : String(k + 1)
    extra[`xaxis${s}`] = k === 2 ? { ...fAxis, title: { text: 'f (Hz)' } } : fAxis
    extra[`yaxis${s}`] = { range: r.key === 'mag' ? [0, Y_ZOOM] : [-Y_ZOOM, Y_ZOOM], dtick: 0.25 }
  })
  const layout = mergeAxes(base, extra) as Partial<Layout>
  // the DC line (5) is off-scale: label it at the top of each row
  const dcLabels = rows.map((r, k): Partial<Annotations> => {
    const value = clean(valueAt(v, r.key, 0))
    const { xaxis, yaxis } = axisRefs(k)
    return {
      x: 0,
      y: Y_ZOOM,
      xref: xaxis as Annotations['xref'],
      yref: yaxis as Annotations['yref'],
      text: Math.abs(value) > Y_ZOOM ? `↑ ${fmt(value, 0)}` : '',
      showarrow: false,
      xanchor: 'left',
      xshift: 4,
      yanchor: 'top',
      font: { size: 13, color: C.inkSoft },
    }
  })
  return (
    <Plot
      data={rows.flatMap((r, k) =>
        stemTraces(
          v.f,
          v[r.key].map((y) => Math.max(-Y_ZOOM * 1.2, Math.min(Y_ZOOM * 1.2, y))),
          { color, size: 5, ...axisRefs(k), name: r.title, showlegend: false },
        ),
      )}
      layout={{ ...layout, annotations: [...(layout.annotations ?? []), ...dcLabels], margin: { l: 56, r: 16, t: 30, b: 54 } }}
      height={540}
      caption={caption}
    />
  )
}

/** Q7–Q8: x3 = 5 + cos(2π·100·nTe − π/3) — a delay turns the lines, it does not change their length. */
export default function Delay() {
  const [phi, setPhi] = useState(PHI_TP)
  const ref = useMemo(() => dftView(x3(0), true), [])
  const v = useMemo(() => dftView(x3(phi), true), [phi])
  const re = clean(valueAt(v, 're', F1))
  const im = clean(valueAt(v, 'im', F1))
  const mag = valueAt(v, 'mag', F1)
  const isTP = Math.abs(phi - PHI_TP) < 1e-9
  // delay of the cosine: φ = −2π·f0·τ  →  τ = −φ / (2π·100)
  const tauMs = (-phi / (2 * Math.PI * F1)) * 1e3

  const controls = (
    <>
      <Slider
        label="phase φ"
        value={phi}
        min={RANGES.phi.min}
        max={RANGES.phi.max}
        step={RANGES.phi.step}
        onChange={setPhi}
        format={piLabel}
        hint={`retard τ = −φ/(2π·100) = ${fmt(tauMs, 2)} ms`}
      />
      <Select<number>
        label="valeurs remarquables"
        value={[PHI_TP, 0, -Math.PI / 2, Math.PI].find((p) => Math.abs(p - phi) < 1e-9) ?? null}
        onChange={setPhi}
        options={[
          { value: PHI_TP, label: '−π/3', tp: true },
          { value: 0, label: '0' },
          { value: -Math.PI / 2, label: '−π/2' },
          { value: Math.PI, label: 'π' },
        ]}
      />
    </>
  )

  return (
    <Section questions={ENONCE_Q7_Q8} controls={controls} explanation={<DelayExplanation />} code={{ file: FILE, cell: 'Q7-8' }}>
      <div className="grid items-start gap-5 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <figure className="border border-rule-strong bg-screen p-3">
          <PhasorCircle phi={phi} />
          <figcaption className="mt-2 border-t border-rule pt-2 text-[0.88rem] leading-snug text-ink-soft">
            Raie à +100 Hz dans le plan complexe. <span className="text-ml-blue">Bleu : X2/N (φ = 0), 0,5 sur l'axe réel.</span>{' '}
            <span className="text-ml-orange">Orange : X3/N = 0,5·e^(jφ)</span> ; pointillé : la raie à −100 Hz, conjuguée.
          </figcaption>
        </figure>
        <div className="space-y-3">
          <Readout label="X3(+100 Hz)/N" value={`${fmt(re, 3)} ${im < 0 ? '−' : '+'} ${fmt(Math.abs(im), 3)}j`} />
          <Readout label="X3(−100 Hz)/N" value={`${fmt(re, 3)} ${im < 0 ? '+' : '−'} ${fmt(Math.abs(im), 3)}j`} />
          <Readout label="|X3(±100 Hz)|/N" value={fmt(mag, 3)} />
          <Readout label="arg X3(+100 Hz)" value={`${piLabel(phi)} = ${fmt((phi * 180) / Math.PI, 0)}°`} />
          <Insight title={<>Re et Im changent, |X| reste {fmt(mag, 2)}</>}>
            {isTP ? (
              <>
                Pour φ = −π/3 : 0,5·e^(−jπ/3) = 0,5·(cos 60° − j sin 60°) = 0,25 − 0,433j. Le retard fait tourner la raie
                sans changer sa longueur.
              </>
            ) : (
              <>La raie tourne de φ = {piLabel(phi)} sur le cercle de rayon 0,5 ; seule sa phase dépend du retard.</>
            )}{' '}
            La raie à f = 0 (composante continue, 5) n'est pas affectée.
          </Insight>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <TripleFigure
          v={ref}
          name="X2"
          color={C.blue}
          caption={<>5 + cos(2π·100·nTe), φ = 0 (amplitude 1 pour comparer à x3) : raies réelles 0,5 à ±100 Hz, Im = 0.</>}
        />
        <TripleFigure
          v={v}
          name="X3"
          color={C.orange}
          caption={
            <>
              {DC} + cos(2π·100·nTe {phi < 0 ? '−' : '+'} {piLabel(Math.abs(phi))}) : Re = {fmt(re, 3)}, Im = ±{fmt(Math.abs(im), 3)}{' '}
              (signes opposés à ±100 Hz), mais |X3| identique à |X2|. Zoom −260…260 Hz, ±0,6 ; la raie à 0 (5) dépasse.
            </>
          }
        />
      </div>
    </Section>
  )
}

function DelayExplanation() {
  return (
    <>
      <H>Q7. Le signal retardé</H>
      <p>
        <M>{String.raw`x_3[n] = 5 + \cos(2\pi\cdot 100\,nT_e - \pi/3)`}</M>. Le déphasage <M>{String.raw`-\pi/3`}</M> correspond à
        un retard <M>{String.raw`\tau = \frac{\pi/3}{2\pi \cdot 100} = 1{,}67\ \text{ms}`}</M>.
      </p>
      <p>Par Euler :</p>
      <MBlock>{String.raw`\cos(\omega_0 n T_e + \varphi) = \tfrac12 e^{j\varphi} e^{j\omega_0 nT_e} + \tfrac12 e^{-j\varphi} e^{-j\omega_0 nT_e}`}</MBlock>
      <p>Les raies (÷N) deviennent donc :</p>
      <MBlock>{String.raw`\frac{X_3(+100)}{N} = \tfrac12 e^{-j\pi/3} = 0{,}25 - 0{,}433j, \qquad \frac{X_3(-100)}{N} = \tfrac12 e^{+j\pi/3} = 0{,}25 + 0{,}433j`}</MBlock>
      <p>(25 ∓ 43,301j avant division par N = 100.)</p>

      <H>Q8. Effet du retard</H>
      <ul>
        <li>
          <strong>Parties réelle et imaginaire</strong> : elles changent. Comparées à X2 (raies réelles 0,5, Im = 0), on a
          maintenant Re = 0,25 et Im = ∓0,433. Le signal n'est plus pair, son spectre n'est plus réel.
        </li>
        <li>
          <strong>Spectre d'amplitude</strong> : inchangé, <M>{String.raw`|e^{j\varphi}| = 1`}</M>, donc |X3| = |X2| = 0,5.
        </li>
        <li>C'est le théorème du retard : <M>{String.raw`x(t-\tau) \;\rightarrow\; X(f)\, e^{-j2\pi f\tau}`}</M>, une rotation de phase proportionnelle à f.</li>
      </ul>
      <p>
        La comparaison utilise X2 avec un cosinus d'amplitude 1 (comme x3) ; avec le x2 du TP (amplitude 3) les raies
        seraient de 1,5 au lieu de 0,5.
      </p>

      <Conclusion>
        <ul>
          <li>Un retard ne modifie que la phase : Re et Im changent, l'amplitude ne change pas.</li>
          <li>Les raies à +f et −f restent conjuguées (signal réel).</li>
        </ul>
      </Conclusion>
    </>
  )
}
