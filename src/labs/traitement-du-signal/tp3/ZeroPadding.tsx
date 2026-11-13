import type { Data, Layout, Shape } from 'plotly.js'
import { useMemo, useState } from 'react'
import Console from '../../../components/Console'
import { Conclusion, H, M, MBlock } from '../../../components/Explanation'
import Insight, { Readout } from '../../../components/Insight'
import Plot, { axisRefs, mergeAxes, stackedLayout } from '../../../components/Plot'
import Section from '../../../components/Section'
import Slider from '../../../components/Slider'
import { lineTrace, stemTraces } from '../../../components/StemPlot'
import { C } from '../../../components/theme'
import { argmaxWhere } from '../../../dsp'
import { fmt } from '../../../lib/format'
import { ENONCE_Q11_Q12 } from './enonce'
import { F4, FE, FILE, RANGES, bandMax, niceTop, padding } from './model'

const X_RANGE = [-260, 260]

/** Q11–Q12: x5 = x4 followed by zeros up to 2^p — a smoother curve, the same resolution. */
export default function ZeroPadding() {
  const [exp, setExp] = useState<number>(RANGES.padExp.min)
  const L = 2 ** exp
  const pd = useMemo(() => padding(L), [L])
  const { N, p } = pd
  const isTP = L === 2 ** p
  const res = FE / N // real resolution: 1/tmax
  const step = FE / L // spacing of the computed points
  const lobe = 2 * res // main lobe, zero to zero

  const i5 = argmaxWhere(pd.f5, pd.mag5, (f) => f > F4 / 2)
  const i4 = argmaxWhere(pd.X4.f, pd.X4.mag, (f) => f > F4 / 2)
  // top of the true spectrum near 105 Hz: what the padded FFT converges to
  const iD = argmaxWhere(pd.fDense, pd.dense, (f) => f > F4 / 2)
  const Y_TOP = niceTop(bandMax(pd.fDense, pd.dense, 60))

  // main lobe of the ±105 Hz line, shaded on both rows: its width does not depend on L
  const band = (k: number, sign: 1 | -1): Partial<Shape> => {
    const { xaxis, yaxis } = axisRefs(k)
    return {
      type: 'rect',
      xref: xaxis as Shape['xref'],
      yref: `${yaxis} domain` as Shape['yref'],
      x0: sign * F4 - res,
      x1: sign * F4 + res,
      y0: 0,
      y1: 1,
      fillcolor: 'rgba(94,240,160,0.07)',
      line: { width: 0 },
    }
  }
  const dense = pd.dense.map((v) => Math.min(v, Y_TOP * 1.2))
  const base = stackedLayout([`|X4(f)|/N, N = ${N}`, `|X5(f)|/N, ${L} points (zéros ajoutés)`], 0.16)
  const fAxis = { range: X_RANGE, dtick: 50 }
  const layout = mergeAxes(base, {
    xaxis: fAxis,
    xaxis2: { ...fAxis, title: { text: 'f (Hz)' } },
    yaxis: { range: [0, Y_TOP] },
    yaxis2: { range: [0, Y_TOP] },
  }) as Partial<Layout>

  const small = L > 128
  const controls = (
    <Slider
      label="longueur après ajout de zéros L"
      value={exp}
      min={RANGES.padExp.min}
      max={RANGES.padExp.max}
      step={RANGES.padExp.step}
      onChange={setExp}
      format={(e) => `2^${e} = ${2 ** e}`}
      hint={isTP ? `TP : 2^p = ${2 ** p}` : `TP : 2^p = ${2 ** p} ; ici ${L - N} zéros`}
    />
  )

  return (
    <Section
      questions={ENONCE_Q11_Q12}
      controls={controls}
      explanation={<PaddingExplanation />}
      code={[
        { file: FILE, cell: 'Q11' },
        { file: FILE, fn: 'puissance2' },
        { file: FILE, cell: 'Q12' },
      ]}
    >
      <Console
        lines={[`N = ${N}  ->  p = ${p}, 2^p = ${2 ** p}`]}
        note={isTP ? undefined : `Sortie de Q11 (inchangée) ; le curseur remplace 2^p = ${2 ** p} par L = ${L} pour la figure de Q12.`}
      />

      <div className="grid gap-x-10 gap-y-1 sm:grid-cols-2">
        <Readout label="pas de calcul Fe/L" value={fmt(step, step < 10 ? 2 : 1)} unit="Hz" />
        <Readout label="résolution Fe/N = 1/tmax" value={fmt(res, 0)} unit="Hz (inchangée)" />
        <Readout label="lobe principal, zéro à zéro, 2Fe/N" value={fmt(lobe, 0)} unit="Hz (inchangé)" />
        <Readout label={`sommet sur ${N} points`} value={`${fmt(pd.X4.f[i4], 1)} Hz · ${fmt(pd.X4.mag[i4], 3)}`} />
        <Readout label={`sommet sur ${L} points`} value={`${fmt(pd.f5[i5], 1)} Hz · ${fmt(pd.mag5[i5], 3)}`} />
        <Readout label="sommet de la courbe grise" value={`${fmt(pd.fDense[iD], 1)} Hz · ${fmt(pd.dense[iD], 3)}`} />
      </div>

      <Insight title={<>Plus de points ({L} au lieu de {N}), même lobe : {fmt(lobe, 0)} Hz de large</>}>
        Les zéros ne contiennent aucune information nouvelle : la FFT sur {L} points échantillonne plus finement (tous les{' '}
        {fmt(step, 1)} Hz) le même spectre vrai, la courbe grise. Le sommet se rapproche de celui de cette courbe (
        {fmt(pd.fDense[iD], 1)} Hz, {fmt(pd.dense[iD], 2)}), pas de la vraie raie (105 Hz, 0,5) : sur 50 ms, les lobes de la
        composante continue débordent encore jusqu'à 105 Hz. Seul un tmax plus long sépare mieux les raies.
      </Insight>

      <Plot
        data={stemTraces(
          pd.x5.map((_, n) => n),
          pd.x5,
          { color: C.blue, size: small ? 2.5 : 4, showlegend: false, opacity: pd.x5.map((_, n) => (n < N ? 1 : 0.35)) },
        )}
        layout={{
          xaxis: { title: { text: 'n' }, range: [-2, L + 1] },
          yaxis: { title: { text: 'x5[n]' }, range: [-0.5, 6.8] },
          shapes: [
            { type: 'rect', x0: N - 0.5, x1: L - 0.5, y0: 0, y1: 1, yref: 'paper', fillcolor: 'rgba(152,164,178,0.08)', line: { width: 0 } },
          ],
          annotations: [
            { x: N / 2, y: 6.5, text: `x4 : ${N} échantillons`, showarrow: false, font: { size: 13, color: C.blue } },
            { x: (N + L) / 2, y: 6.5, text: `${L - N} zéros`, showarrow: false, font: { size: 13, color: C.inkSoft } },
          ],
          margin: { l: 64, r: 24, t: 20, b: 54 },
        }}
        height={230}
        caption={
          <>
            x5[n] = x4[n] pour n = 0 … {N - 1} (tmax = 0,05 s), puis {L - N} zéros jusqu'à n = {L - 1} : la durée d'observation
            reste 50 ms.
          </>
        }
      />

      <Plot
        data={[
          lineTrace(pd.fDense, dense, { color: C.continuous, width: 1.3, hover: false, ...axisRefs(0), name: 'TFTD' , showlegend: false }),
          ...stemTraces(pd.X4.f, pd.X4.mag, { color: C.blue, size: 5, ...axisRefs(0), name: '|X4|/N', showlegend: false }),
          lineTrace(pd.fDense, dense, { color: C.continuous, width: 1.3, hover: false, ...axisRefs(1), name: 'TFTD', showlegend: false }),
          // up to 128 points: stems (MATLAB stem) ; above, the stems merge into a block: points joined by a line
          ...(small
            ? [
                {
                  ...lineTrace(pd.f5, pd.mag5, { color: C.orange, width: 1.2, ...axisRefs(1), name: '|X5|/N', showlegend: false }),
                  mode: 'lines+markers',
                  marker: { color: C.orange, size: L > 512 ? 2.5 : 3.5 },
                } as Data,
              ]
            : stemTraces(pd.f5, pd.mag5, { color: C.orange, size: 5, ...axisRefs(1), name: '|X5|/N', showlegend: false })),
        ]}
        layout={{
          ...layout,
          shapes: [band(0, 1), band(0, -1), band(1, 1), band(1, -1)],
          showlegend: false,
          margin: { l: 64, r: 24, t: 30, b: 54 },
        }}
        height={480}
        caption={
          <>
            En haut, |X4|/N sur {N} points (bleu, pas 20 Hz) ; en bas, |X5|/N sur {L} points (orange, pas {fmt(step, 1)} Hz
            {small ? ', points reliés' : ''}). Les deux échantillonnent la même courbe grise. Bande verte : le lobe principal de ±105 Hz ({fmt(lobe, 0)} Hz), identique
            pour tout L. Zoom −260…260 Hz ; la raie à 0 (5) dépasse du cadre.
          </>
        }
      />
    </Section>
  )
}

function PaddingExplanation() {
  return (
    <>
      <H>Q11. Puissance de 2</H>
      <p>
        tmax = 0,05 s donne N = 50. La fonction <code className="font-mono">puissance2</code> incrémente p tant que{' '}
        <M>{String.raw`2^p \le N`}</M> : elle s'arrête à la première puissance qui <em>dépasse</em> N, p = 6, 2⁶ = 64. (Pour N
        déjà puissance de 2, elle donne la suivante, comme le demande l'énoncé ; nextpow2 de MATLAB rendrait N lui-même.)
      </p>

      <H>Q12. Ajout de zéros</H>
      <p>
        <M>{String.raw`x_5[n] = x_4[n]`}</M> pour <M>{String.raw`0 \le n \le N-1`}</M>, 0 pour{' '}
        <M>{String.raw`N \le n \le 2^p - 1`}</M> : 64 points. (L'énoncé écrit n ≤ N et N ≤ n ≤ 2^p, ce qui compterait n = N deux
        fois et donnerait 2^p + 1 points ; le .m suit la forme ci-dessus.) Les zéros n'ajoutent rien à la somme :
      </p>
      <MBlock>{String.raw`X_5[k] = \sum_{n=0}^{N-1} x_4[n]\, e^{-j2\pi kn/L} = X_4(f)\big|_{f = kF_e/L}`}</MBlock>
      <p>
        C'est la même TFTD, calculée tous les Fe/L au lieu de Fe/N : <strong>une interpolation</strong> du spectre. On divise
        toujours par N (et non par L) pour garder les amplitudes de x4.
      </p>

      <H>Ce que l'on constate</H>
      <ul>
        <li>
          La courbe est plus lisse et le sommet mieux localisé… sur la courbe grise, la TFTD de l'enregistrement de 50 ms. Son
          maximum est vers 108 Hz et 0,76, pas 105 Hz et 0,5 : à cette durée, les lobes secondaires de la composante continue
          (5, dix fois plus haute) s'ajoutent encore autour de 105 Hz. L'ajout de zéros converge vers cette courbe, il ne la
          corrige pas.
        </li>
        <li>
          Le lobe principal garde sa largeur <M>{String.raw`2F_e/N = 2/t_{\max} = 40\ \text{Hz}`}</M> : la résolution réelle reste{' '}
          <M>{String.raw`1/t_{\max} = 20\ \text{Hz}`}</M>. Seule une observation plus longue l'améliore (Q10).
        </li>
      </ul>

      <H>Utilité de l'ajout de zéros</H>
      <ul>
        <li>
          Atteindre une longueur 2^p : la FFT radix-2 (Cooley–Tukey) coûte <M>{String.raw`\tfrac{L}{2}\log_2 L`}</M> multiplications
          au lieu de <M>{String.raw`N^2`}</M> pour la TFD directe.
        </li>
        <li>Mieux visualiser le spectre (plus de points sur la même courbe).</li>
        <li>Calculer une convolution linéaire par FFT (TP 2, partie A).</li>
      </ul>

      <Conclusion>
        <ul>
          <li>Le zero-padding interpole le spectre ; il n'améliore pas la résolution, qui reste 1/tmax.</li>
          <li>Il sert à obtenir une longueur 2^p (FFT rapide) et une courbe plus lisible.</li>
        </ul>
      </Conclusion>
    </>
  )
}
