import type { Data, Layout, Shape } from 'plotly.js'
import { useMemo, useState } from 'react'
import { add, cosPeriod, gcd, lcm, range, squarePeriod } from '../../../dsp'
import { Conclusion, H, M, MBlock } from '../../../components/Explanation'
import Insight, { Readout } from '../../../components/Insight'
import Plot, { axisRefs, mergeAxes, stackedLayout } from '../../../components/Plot'
import Section from '../../../components/Section'
import Select from '../../../components/Select'
import Slider from '../../../components/Slider'
import { lineTrace } from '../../../components/StemPlot'
import { C } from '../../../components/theme'
import { ENONCE_1_1 } from './enonce'

// TP values (cell "%% 1.1" of tp1_signaux_discrets.m)
const T1_TP = 5
const T2_TP = 3
const T_END = 30
// MATLAB: t  = 0:0.01:30;
const t = range(0, 0.01, T_END)

type Mode = 'subplot' | 'overlay'

/** Vertical dashed lines at 0, T, 2T… (MATLAB: xline(0:T_som:30, 'r--')) and one shaded period. */
function periodShapes(markers: number[], Tsom: number, xref: string, yref: string): Partial<Shape>[] {
  const shapes: Partial<Shape>[] = markers.map((x) => ({
    type: 'line',
    xref: xref as Shape['xref'],
    yref: yref as Shape['yref'],
    x0: x,
    x1: x,
    y0: 0,
    y1: 1,
    line: { color: C.red, width: 1.5, dash: 'dash' },
  }))
  if (Tsom <= T_END) {
    shapes.unshift({
      type: 'rect',
      xref: xref as Shape['xref'],
      yref: yref as Shape['yref'],
      x0: 0,
      x1: Tsom,
      y0: 0,
      y1: 1,
      fillcolor: C.blue,
      opacity: 0.07,
      line: { width: 0 },
      layer: 'below',
    })
  }
  return shapes
}

export default function Operations() {
  const [T1, setT1] = useState(T1_TP)
  const [T2, setT2] = useState(T2_TP)
  const [mode, setMode] = useState<Mode>('subplot')

  const sig = useMemo(() => {
    const xCos = cosPeriod(t, T1) // MATLAB: x_cos = cos(2*pi*t/5);
    const xCar = squarePeriod(t, T2) // MATLAB: x_car = sign(sin(2*pi*t/3));
    const xSom = add(xCos, xCar) // MATLAB: x_som = x_cos + x_car;
    const Tsom = lcm(T1, T2) // MATLAB: T_som = lcm(5,3)
    const markers = range(0, Tsom, T_END) // MATLAB: xline(0:T_som:30, 'r--');
    return { xCos, xCar, xSom, Tsom, markers, pgcd: gcd(T1, T2) }
  }, [T1, T2])

  const isTP = T1 === T1_TP && T2 === T2_TP
  const visible = sig.Tsom <= T_END

  const figure = useMemo((): { data: Data[]; layout: Partial<Layout>; height: number } => {
    if (mode === 'subplot') {
      // MATLAB Q4: subplot(3,1,k) — one plot() per axes, so all in the first colour
      const titles = [`Cosinus, T = ${T1} s`, `Carré, T = ${T2} s`, `Somme, T = ${sig.Tsom} s`]
      const r = [0, 1, 2].map(axisRefs)
      return {
        height: 760,
        data: [
          lineTrace(t, sig.xCos, { name: 'x_cos', color: C.blue, width: 1.5, ...r[0], showlegend: false }),
          lineTrace(t, sig.xCar, { name: 'x_car', color: C.blue, width: 1.5, ...r[1], showlegend: false }),
          lineTrace(t, sig.xSom, { name: 'x_som', color: C.blue, width: 1.5, ...r[2], showlegend: false }),
        ],
        layout: {
          ...mergeAxes(stackedLayout(titles, 0.15), {
            xaxis: { range: [0, T_END], title: { text: 't (s)' } },
            xaxis2: { range: [0, T_END], title: { text: 't (s)' } },
            xaxis3: { range: [0, T_END], title: { text: 't (s)' } },
            yaxis2: { range: [-1.5, 1.5] }, // MATLAB: axis([0 30 -1.5 1.5]);
          }),
          showlegend: false,
          margin: { l: 56, r: 24, t: 30, b: 54 },
          shapes: periodShapes(sig.markers, sig.Tsom, 'x3', 'y3 domain'),
        },
      }
    }

    return {
      height: 460,
      data: [
        lineTrace(t, sig.xCos, { name: `cosinus, T₁ = ${T1} s`, color: C.blue, width: 1.5 }),
        lineTrace(t, sig.xCar, { name: `carré, T₂ = ${T2} s`, color: C.orange, width: 1.5 }),
        lineTrace(t, sig.xSom, { name: `somme, T = ${sig.Tsom} s`, color: C.purple, width: 2.2 }),
      ],
      layout: {
        xaxis: { range: [0, T_END], title: { text: 't (s)' } },
        yaxis: { range: [-2.3, 2.3], title: { text: 'Amplitude' } },
        shapes: periodShapes(sig.markers, sig.Tsom, 'x', 'paper'),
      },
    }
  }, [mode, sig, T1, T2])

  const controls = (
    <>
      <Slider label="Période du cosinus T₁" value={T1} min={1} max={10} onChange={setT1} format={(v) => `${v} s`} />
      <Slider label="Période du carré T₂" value={T2} min={1} max={10} onChange={setT2} format={(v) => `${v} s`} />
      <Select<Mode>
        label="Affichage"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'subplot', label: '3 graphes (subplot)', tp: true },
          { value: 'overlay', label: 'superposés' },
        ]}
      />
      <div className="space-y-0.5">
        <Readout label="PPCM(T₁, T₂)" value={String(sig.Tsom)} unit="s" />
        <Readout label="PGCD(T₁, T₂)" value={String(sig.pgcd)} />
        {!isTP && (
          <button
            type="button"
            onClick={() => {
              setT1(T1_TP)
              setT2(T2_TP)
            }}
            className="mt-1 text-[0.9rem] underline decoration-rule hover:decoration-ink"
          >
            Revenir aux valeurs du TP (5 s et 3 s)
          </button>
        )}
      </div>
    </>
  )

  const caption =
    mode === 'subplot' ? (
      <>
        les trois signaux de la question Q4 sur 0–30 s ; dans la somme, les traits pointillés rouges sont placés tous
        les PPCM(T₁, T₂) = <span className="font-mono">{sig.Tsom}</span> s
        {visible ? ' et la zone teintée couvre une période complète.' : ' (seul t = 0 tombe dans la fenêtre).'}
      </>
    ) : (
      <>
        le cosinus (bleu), le carré (orange) et leur somme (violet) sur les mêmes axes ; les traits rouges marquent les
        multiples de la période de la somme, <span className="font-mono">{sig.Tsom}</span> s.
      </>
    )

  return (
    <Section
      questions={ENONCE_1_1}
      controls={controls}
      explanation={<OperationsExplanation />}
      code={{ file: 'traitement-du-signal/tp1_signaux_discrets.m', cell: '1.1' }}
    >
      <Insight
        tone={visible ? 'note' : 'warn'}
        title={
          <>
            Période de la somme : T = PPCM({T1}, {T2}) = <span className="font-mono">{sig.Tsom}</span> s
          </>
        }
      >
        {visible ? (
          <>
            Sur une période, le cosinus fait {sig.Tsom / T1} cycle{sig.Tsom / T1 > 1 ? 's' : ''} et le carré{' '}
            {sig.Tsom / T2} cycle{sig.Tsom / T2 > 1 ? 's' : ''}.
          </>
        ) : (
          <>Cette période dépasse la fenêtre d'observation de 30 s : la répétition n'est pas visible.</>
        )}
      </Insight>
      <Plot data={figure.data} layout={figure.layout} height={figure.height} caption={caption} />
    </Section>
  )
}

function OperationsExplanation() {
  return (
    <>
      <H>Les signaux</H>
      <p>
        L'axe des temps <code className="font-mono">t = 0:0.01:30</code> contient 3001 instants espacés de 0,01 s : le
        signal est <strong>discret</strong>, mais assez dense pour que <code className="font-mono">plot</code>, qui relie
        les points, le fasse paraître continu.
      </p>
      <MBlock>{String.raw`x_{\cos}(t) = \cos\!\left(\frac{2\pi t}{T_1}\right),\quad T_1 = 5\ \text{s}`}</MBlock>
      <MBlock>{String.raw`x_{\text{car}}(t) = \operatorname{sign}\!\left(\sin\frac{2\pi t}{T_2}\right),\quad T_2 = 3\ \text{s}`}</MBlock>
      <p>
        Le carré ne garde que le <strong>signe</strong> d'un sinus de même période : +1 pendant la demi-période où le
        sinus est positif, −1 pendant l'autre. L'axe vertical est fixé à [−1,5 ; 1,5] (
        <code className="font-mono">axis([0 30 -1.5 1.5])</code>) pour que les paliers ±1 ne se confondent pas avec le
        cadre.
      </p>

      <H>Période de la somme</H>
      <p>
        La somme est périodique de période <M>T</M> si <M>T</M> est à la fois un multiple de <M>T_1</M> et de{' '}
        <M>T_2</M> : <M>{String.raw`T = k_1 T_1 = k_2 T_2`}</M>. La plus petite valeur possible est le PPCM :
      </p>
      <MBlock>{String.raw`\begin{aligned} T &= \operatorname{PPCM}(T_1, T_2) = \frac{T_1\,T_2}{\operatorname{PGCD}(T_1, T_2)} \\ &=\frac{5 \times 3}{1} = 15\ \text{s} \end{aligned}`}</MBlock>
      <p>
        En 15 s, le cosinus fait exactement 3 périodes et le carré 5 : les deux reviennent ensemble à leur état initial.
        Les repères <code className="font-mono">xline(0:T_som:30, 'r--')</code> tombent à 0, 15 et 30 s, et la somme
        entre 0 et 15 s se retrouve à l'identique entre 15 et 30 s.
      </p>

      <Conclusion>
        <ul>
          <li>La période de la somme est le PPCM des périodes : 15 s pour T₁ = 5 s et T₂ = 3 s.</li>
          <li>Si une période divise l'autre (T₁ = 6, T₂ = 3), c'est simplement la plus grande des deux.</li>
          <li>Avec un diviseur commun (T₁ = 4, T₂ = 6), elle est plus petite que le produit : 12 s et non 24 s.</li>
          <li>
            Pour T₁ = 7 et T₂ = 9, elle vaut 63 s : plus que la fenêtre de 30 s, donc aucune répétition visible bien que
            le signal soit périodique.
          </li>
        </ul>
      </Conclusion>
      <p className="text-[0.95rem]">
        Détail : à t = 0, <M>{String.raw`\sin(0) = 0`}</M> exactement, donc <code className="font-mono">sign</code>{' '}
        renvoie 0 et la somme vaut 1. Aux autres multiples de 1,5 s, le sinus calculé en virgule flottante vaut environ
        10⁻¹⁶ au lieu de 0, et <code className="font-mono">sign</code> renvoie ±1.
      </p>
    </>
  )
}
