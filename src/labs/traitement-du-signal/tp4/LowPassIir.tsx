import type { Layout } from 'plotly.js'
import { useMemo, useState } from 'react'
import Console from '../../../components/Console'
import { Conclusion, H, M, MBlock } from '../../../components/Explanation'
import Insight, { Readout } from '../../../components/Insight'
import Plot, { axisRefs, mergeAxes, stackedLayout } from '../../../components/Plot'
import Section from '../../../components/Section'
import Select from '../../../components/Select'
import { lineTrace, stemTraces } from '../../../components/StemPlot'
import { C } from '../../../components/theme'
import { fmt } from '../../../lib/format'
import { ENONCE_II } from './enonce'
import { A_BOOKLET, A_IIR, analyseIir, B_IIR, cplxStr, FILE, N_IIR, polyLatex, toHandles } from './model'
import PoleZeroPlane from './PoleZeroPlane'

type Den = 'program' | 'booklet'
const DB_FLOOR = -80
/** 20·log10, with rounding noise (|v| < 1e-9 dB) shown as 0 instead of −0.00 */
const dB = (g: number) => {
  const v = 20 * Math.log10(g)
  return Math.abs(v) < 1e-9 ? 0 : v
}

/** II.1–II.3: second-order low-pass IIR — h[n], |H| in dB with the −3 dB line, phase, z-plane. */
export default function LowPassIir() {
  const [den, setDen] = useState<Den>('program')
  const a = den === 'program' ? A_IIR : A_BOOKLET
  const r = useMemo(() => analyseIir(a), [a])
  const wpi = r.freq.w.map((w) => w / Math.PI)
  const db = r.db.map((v) => Math.max(DB_FLOOR, v))
  const cut = r.cutoff / Math.PI
  const isTP = den === 'program'
  const p = r.poles.find((z) => z.im > 0) ?? r.poles[0]

  const layout = mergeAxes(stackedLayout(['Réponse en amplitude (dB)', 'Réponse en phase (rad)'], 0.16), {
    xaxis: { range: [0, 1], dtick: 0.1, title: { text: '' } },
    xaxis2: { range: [0, 1], dtick: 0.1, title: { text: 'ω / π' } },
    yaxis: { title: { text: '20 log₁₀ |H|' } },
    yaxis2: { range: [-Math.PI - 0.3, Math.PI + 0.3], tickvals: [-Math.PI, -Math.PI / 2, 0, Math.PI / 2, Math.PI], ticktext: ['−π', '−π/2', '0', 'π/2', 'π'] },
  }) as Partial<Layout>
  const minusThree = dB(r.dc) - 3

  return (
    <Section
      questions={ENONCE_II}
      controls={
        <Select<Den>
          label="dénominateur"
          value={den}
          onChange={setDen}
          options={[
            { value: 'program', label: 'programme : a = [1 −1.2 0.516]', tp: true },
            { value: 'booklet', label: 'fascicule : 0.516z² − 1.2z + 1' },
          ]}
          hint={isTP ? undefined : 'tel qu’imprimé dans l’énoncé : instable'}
        />
      }
      explanation={<IirExplanation />}
      code={{ file: FILE, cell: 'II' }}
    >
      <div className="overflow-x-auto border border-rule-strong bg-sheet px-4 py-1 text-[1.1rem]">
        <MBlock>{String.raw`H(z) = \frac{${polyLatex(B_IIR)}}{${polyLatex(a)}}`}</MBlock>
      </div>

      <Console
        lines={[
          `Gain en continu : ${r.dc.toFixed(4)} (${dB(r.dc).toFixed(2)} dB) | coupure à -3 dB ≈ ${Number.isFinite(cut) ? cut.toFixed(3) : '—'} π rad/éch.`,
        ]}
        note={isTP ? undefined : 'Sortie avec le dénominateur du fascicule (le .m utilise celui du programme).'}
      />

      <Insight
        tone={r.stable ? 'note' : 'warn'}
        title={
          r.stable ? (
            <>Stable : pôles {cplxStr(p, 3)} et conjugué, |p| = {fmt(r.rho, 4)} &lt; 1</>
          ) : (
            <>Instable : |p| = {fmt(r.rho, 3)} &gt; 1 — le dénominateur imprimé dans le fascicule est inversé</>
          )
        }
      >
        {r.stable ? (
          <>Deux zéros en z = −1 (ils annulent ω = π, c'est-à-dire Fe/2) : passe-bas. Gain 1 en continu (0 dB).</>
        ) : (
          <>
            0.516z² − 1.2z + 1 a pour racines les inverses de celles de z² − 1.2z + 0.516 : |p| = 1/0.7183 = 1.392. Le programme
            fourni (a = [1 −1.2 0.516]) est la bonne version.
          </>
        )}
      </Insight>

      <div className="grid gap-x-10 gap-y-1 sm:grid-cols-2">
        <Readout label="|H(0)|" value={`${fmt(r.dc, 4)} (${fmt(dB(r.dc), 2)} dB)`} />
        <Readout label="gain max" value={`${fmt(r.peak, 4)} (${fmt(dB(r.peak), 2)} dB) à ω = ${fmt(r.peakW, 3)}π`} />
        <Readout label="coupure à −3 dB" value={Number.isFinite(cut) ? `ω ≈ ${fmt(cut, 3)}π, f ≈ ${fmt(cut / 2, 3)}·Fe` : '—'} />
        <Readout label="zéros" value={r.zeros.map((z) => cplxStr(z, 3)).join(' ; ')} />
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <Plot
          data={stemTraces(
            r.h.map((_, n) => n),
            r.h,
            { color: r.stable ? C.blue : C.red, size: 6, name: 'h[n]', showlegend: false },
          )}
          layout={{
            title: { text: '<b>Réponse impulsionnelle du filtre RII</b>', font: { size: 14 } },
            xaxis: { title: { text: 'n' }, range: [-0.8, N_IIR - 0.2] },
            yaxis: { title: { text: 'h[n]' } },
            margin: { l: 64, r: 24, t: 50, b: 54 },
          }}
          height={380}
          caption={
            r.stable ? (
              <>
                II.1 : h[n] sur N = 32 échantillons : 0.079, 0.2528, 0.3416, 0.2795, 0.1591… une oscillation amortie (|p|ⁿ = 0.7183ⁿ) ; sa
                somme vaut le gain en continu, 1.
              </>
            ) : (
              <>II.1 avec le dénominateur du fascicule : h[n] croît comme 1.392ⁿ, le filtre est instable.</>
            )
          }
        />
        <figure className="border border-rule-strong bg-[#0d131a] p-2">
          <PoleZeroPlane zeros={toHandles(r.zeros)} poles={toHandles(r.poles)} R={1.6} label="Plan z du filtre RII" />
          <figcaption className="mt-1 border-t border-rule px-2 pt-2 text-[0.88rem] leading-snug text-ink-soft">
            II.3 : zplane(b, a). Le « 2 » marque le zéro double en z = −1. Survolez les points pour leurs valeurs.
          </figcaption>
        </figure>
      </div>

      <Plot
        data={[
          lineTrace(wpi, db, { color: C.blue, ...axisRefs(0), name: '|H| (dB)', showlegend: false }),
          lineTrace(wpi, r.freq.phase, { color: C.orange, ...axisRefs(1), name: 'arg H', showlegend: false }),
        ]}
        layout={{
          ...layout,
          shapes: [
            { type: 'line', xref: 'x', yref: 'y', x0: 0, x1: 1, y0: minusThree, y1: minusThree, line: { color: C.red, width: 1.2, dash: 'dash' } },
            ...(Number.isFinite(cut)
              ? [{ type: 'line' as const, xref: 'x' as const, yref: 'y domain' as const, x0: cut, x1: cut, y0: 0, y1: 1, line: { color: C.red, width: 1, dash: 'dot' as const } }]
              : []),
          ],
          annotations: [
            ...(layout.annotations ?? []),
            { x: 0.98, y: minusThree, xref: 'x', yref: 'y', text: '−3 dB', showarrow: false, xanchor: 'right', yanchor: 'bottom', font: { size: 13, color: C.red } },
          ],
          margin: { l: 70, r: 24, t: 30, b: 54 },
        }}
        height={480}
        caption={
          <>
            II.2 : freqz(b, a, 256), ω/π de 0 à 1 (1 ↔ Fe/2). Module en dB (bleu) avec la droite à −3 dB du gain continu (rouge) :
            {Number.isFinite(cut) ? ` coupure vers ${fmt(cut, 3)}π` : ' pas de coupure'}, une légère bosse à{' '}
            {fmt(dB(r.peak), 2)} dB, puis une chute vers −∞ en ω = π (zéro double). Phase en orange.
          </>
        }
      />
    </Section>
  )
}

function IirExplanation() {
  return (
    <>
      <H>Quel dénominateur ?</H>
      <p>
        Le fascicule écrit <M>{String.raw`0{,}516z^2 - 1{,}2z + 1`}</M> : ses racines ont un module{' '}
        <M>{String.raw`\sqrt{1/0{,}516} = 1{,}392 > 1`}</M>, le filtre serait instable. Le programme fourni utilise{' '}
        <code className="font-mono">a = [1 -1.2 0.516]</code>, soit
      </p>
      <MBlock>{String.raw`H(z) = \frac{0{,}079z^2 + 0{,}158z + 0{,}079}{z^2 - 1{,}2z + 0{,}516}`}</MBlock>
      <p>
        C'est la bonne version (le fascicule a inversé l'ordre des coefficients). Num et Den ont le même degré : la lecture en z et
        en z⁻¹ coïncide, pas besoin de compléter.
      </p>

      <H>II.3. Pôles et zéros</H>
      <ul>
        <li>
          Zéros : <M>{String.raw`0{,}079(z+1)^2`}</M>, zéro double en z = −1, c'est-à-dire ω = π (Fe/2) : les hautes fréquences sont
          annulées.
        </li>
        <li>
          Pôles : <M>{String.raw`0{,}6 \pm 0{,}395j`}</M>, <M>{String.raw`|p| = \sqrt{0{,}516} = 0{,}7183 < 1`}</M> : stable. Leur
          argument (≈ 0,18π) place une légère surtension avant la coupure.
        </li>
      </ul>

      <H>II.1. Réponse impulsionnelle</H>
      <p>
        h[n] = 0,079 ; 0,2528 ; 0,3416 ; 0,2795 ; 0,1591… oscillation amortie en <M>{String.raw`0{,}7183^n`}</M> : RII (réponse
        impulsionnelle infinie), elle ne s'annule jamais exactement.
      </p>

      <H>II.2. Réponse en fréquence</H>
      <ul>
        <li>
          Gain continu : <M>{String.raw`H(1) = \frac{0{,}316}{1 - 1{,}2 + 0{,}516} = 1`}</M> (0 dB).
        </li>
        <li>Gain maximal ≈ 1,122 (+1 dB) : légère surtension due aux pôles complexes.</li>
        <li>Coupure à −3 dB vers ω ≈ 0,258π, soit f ≈ 0,129·Fe.</li>
        <li>|H| → 0 (−∞ dB) en ω = π. La phase décroît de 0 à −π (filtre du 2ᵉ ordre).</li>
      </ul>

      <Conclusion>
        <ul>
          <li>Filtre passe-bas RII du 2ᵉ ordre, stable, gain 1 en continu, coupure ≈ 0,26π.</li>
          <li>Le dénominateur du fascicule est inversé ; celui du programme est le bon.</li>
        </ul>
      </Conclusion>
    </>
  )
}
