/**
 * TP4 — IV. Asservissement de la vitesse d'un MCC par un PID.
 * Ω = kc/D · V − (Ls + R)/D · Cr,  D = (Ls + R)(Js + f) + kc·ke  (Figure 4.3).
 * MATLAB reference: tp4_pid.m, cells IV, IV.7, IV.8.
 */
import type { Data, Layout, Shape } from 'plotly.js'
import { memo, useMemo, useState } from 'react'
import { dcgain, poles, sortCplx, tf, type Response } from '../../../control'
import MccDiagram from '../../../components/control/MccDiagram'
import MotorDisc from '../../../components/control/MotorDisc'
import PlaybackBar from '../../../components/control/PlaybackBar'
import { Conclusion, H, M, MBlock } from '../../../components/Explanation'
import HandoutFigure from '../../../components/HandoutFigure'
import Plot from '../../../components/Plot'
import Section from '../../../components/Section'
import Select from '../../../components/Select'
import Slider from '../../../components/Slider'
import { lineTrace } from '../../../components/StemPlot'
import { C } from '../../../components/theme'
import { fmt } from '../../../lib/format'
import { sampleAt, usePlayback, type Playback } from '../../../lib/usePlayback'
import { FIG_4_3, IV } from './enonce'
import GainEffects from './GainEffects'
import {
  closedLoop,
  controller,
  CR_TIME,
  L_VALUES,
  loadClosedLoopTF,
  MCC,
  MCC_PRESETS,
  MCC_SWEEPS,
  MCC_T_END,
  measure,
  motorLoadTF,
  motorTF,
  speedWithLoad,
  type Gains,
  type LChoice,
} from './model'
import StepInfoTable from './StepInfoTable'

const FILE = 'automatique/tp4_pid.m'
const ONE = tf([1], [1])
const U = MCC.U
const L_LABEL: Record<LChoice, string> = { mH: '0.011 mH', H: '0.011 H' }

const presetOf = (g: Gains) => MCC_PRESETS.find((p) => p.kp === g.kp && p.ki === g.ki && p.kd === g.kd)?.id ?? null

/** θ(t) = ∫Ω dt (trapezoids), for the turning disc */
function integrate(r: Response): number[] {
  const out = [0]
  for (let i = 1; i < r.t.length; i++) out.push(out[i - 1] + 0.5 * (r.y[i] + r.y[i - 1]) * (r.t[i] - r.t[i - 1]))
  return out
}

export default function MccSpeed() {
  const [g, setG] = useState<Gains>({ kp: 2, ki: 20, kd: 0 })
  const [Lc, setLc] = useState<LChoice>('mH')
  const [cr, setCr] = useState(0)
  const set = (k: keyof Gains) => (v: number) => setG((old) => ({ ...old, [k]: v }))
  const L = L_VALUES[Lc]

  const Gm = useMemo(() => motorTF(L), [L])
  const C_ = useMemo(() => controller(g), [g])

  // speeds with the load torque (plots, discs)
  const sim = useMemo(() => {
    const open = speedWithLoad(Gm, motorLoadTF(L), U, cr)
    const sans = speedWithLoad(closedLoop(ONE, Gm), loadClosedLoopTF(ONE, L), U, cr)
    const avec = speedWithLoad(closedLoop(C_, Gm), loadClosedLoopTF(C_, L), U, cr)
    return { open, sans, avec, thetaSans: integrate(sans), thetaAvec: integrate(avec) }
  }, [Gm, C_, L, cr])

  // stepinfo without load, as stepinfo(U*Fm) in the .m file
  const info = useMemo(
    () => ({ open: measure(Gm, U, MCC_T_END), sans: measure(closedLoop(ONE, Gm), U, MCC_T_END), avec: measure(closedLoop(C_, Gm), U, MCC_T_END) }),
    [Gm, C_],
  )
  const withLoad = (Fr: number, Fd: number) => U * Fr + cr * Fd
  const finals = [
    withLoad(dcgain(Gm), dcgain(motorLoadTF(L))),
    withLoad(dcgain(closedLoop(ONE, Gm)), dcgain(loadClosedLoopTF(ONE, L))),
    info.avec.stable ? withLoad(dcgain(closedLoop(C_, Gm)), dcgain(loadClosedLoopTF(C_, L))) : NaN,
  ]

  const controls = (
    <>
      <Select
        label="Préréglages"
        value={presetOf(g)}
        options={MCC_PRESETS.map((p) => ({ value: p.id, label: p.label, tp: p.tp }))}
        onChange={(id) => {
          const p = MCC_PRESETS.find((x) => x.id === id)!
          setG({ kp: p.kp, ki: p.ki, kd: p.kd })
        }}
      />
      <Slider label="kp" value={g.kp} min={0} max={20} step={0.1} onChange={set('kp')} format={(v) => v.toFixed(1)} />
      <Slider label="ki" value={g.ki} min={0} max={200} step={1} onChange={set('ki')} format={(v) => v.toFixed(0)} />
      <Slider label="kd" value={g.kd} min={0} max={1} step={0.01} onChange={set('kd')} format={(v) => v.toFixed(2)} />
      <Slider label="Couple résistant cr" value={cr} min={0} max={5} step={0.1} onChange={setCr} format={(v) => `${v.toFixed(1)} N·m`} hint={`appliqué en échelon à t = ${CR_TIME} s`} />
      <Select
        label="Inductance L"
        value={Lc}
        options={[
          { value: 'mH', label: '0.011 mH (fascicule)', tp: true },
          { value: 'H', label: '0.011 H' },
        ]}
        onChange={setLc}
      />
    </>
  )

  return (
    <Section
      questions={{
        intro: (
          <>
            <p>{IV.intro}</p>
            <HandoutFigure {...FIG_4_3} />
            <p>{IV.after}</p>
          </>
        ),
        items: IV.items,
      }}
      controls={controls}
      explanation={<MccExplanation g={g} Lc={Lc} />}
      code={[
        { file: FILE, cell: 'IV' },
        { file: FILE, cell: 'IV.7' },
        { file: FILE, cell: 'IV.8' },
      ]}
    >
      <ParamTable />
      <LNote Lc={Lc} />

      <MccDiagram kp={g.kp} ki={g.ki} kd={g.kd} L={L_LABEL[Lc]} cr={cr} />

      <Motors sim={sim} cr={cr} g={g} avecStable={info.avec.stable} />

      <StepInfoTable
        unit="rad/s"
        timeDigits={3}
        columns={[
          { label: 'Boucle ouverte (U = 10 V)', info: info.open.info, stable: true },
          { label: 'Sans PID (retour unitaire)', info: info.sans.info, stable: true },
          { label: `Avec PID (${g.kp}, ${g.ki}, ${g.kd})`, info: info.avec.info, stable: info.avec.stable, highlight: true, compareTo: 1 },
        ]}
        extraRows={[
          { label: 'Ω(∞) sans couple (rad/s)', values: [fmt(info.open.final, 4), fmt(info.sans.final, 4), info.avec.stable ? fmt(info.avec.final, 4) : '—'] },
          { label: `Ω(∞) avec cr = ${cr} N·m (rad/s)`, values: finals.map((v) => (Number.isFinite(v) ? fmt(v, 4) : '—')) },
        ]}
        caption={
          <>
            stepinfo (cellule IV.8) mesuré sans couple résistant, comme stepinfo(U*Fm) dans le .m. La dernière ligne donne la
            vitesse finale quand le couple cr agit : seule l'action intégrale ramène Ω à 10 rad/s.
          </>
        }
      />

      <div>
        <h3 className="mb-3 border-b border-rule pb-1.5 text-[1.15rem] font-semibold">Q7 — Effet de chaque gain (L = {L_LABEL[Lc]})</h3>
        <GainEffects plant={Gm} r={U} sweeps={MCC_SWEEPS} unit="rad/s" yLabel="Ω (rad/s)" timeDigits={3} />
      </div>
    </Section>
  )
}

/** Tableau 4.1, as printed. */
function ParamTable() {
  return (
    <figure className="w-fit border border-rule-strong bg-sheet">
      <p className="px-4 pt-2 text-[0.92rem] text-ink-soft">{IV.tableIntro}</p>
      <table className="mx-4 my-2 border-collapse text-[0.95rem]">
        <thead>
          <tr className="border-b border-rule-strong">
            <th className="py-1 pr-10 text-left font-semibold">Paramètres</th>
            <th className="py-1 text-left font-semibold">Valeur</th>
          </tr>
        </thead>
        <tbody>
          {IV.table.map((r) => (
            <tr key={r.name} className="border-b border-rule last:border-b-0">
              <td className="py-1 pr-10">
                <M>{r.name}</M>
              </td>
              <td className={`py-1 font-mono ${r.name === 'L' ? 'text-pen' : ''}`}>{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <figcaption className="border-t border-rule px-4 py-1.5 text-[0.9rem] text-ink-soft italic">{IV.tableCaption}</figcaption>
    </figure>
  )
}

/** Why 0.011 mH is probably a typo for 0.011 H. */
function LNote({ Lc }: { Lc: LChoice }) {
  const p = (L: number) => sortCplx(poles(motorTF(L)))
  const fmtP = (L: number) =>
    p(L)
      .map((z) => (Math.abs(z.im) > 1e-9 ? `${fmt(z.re, 2)} ${z.im < 0 ? '−' : '+'} ${fmt(Math.abs(z.im), 2)}j` : fmt(z.re, z.re < -1000 ? 0 : 3)))
      .join(' ; ')
  return (
    <aside className="max-w-5xl border-[1.5px] border-pen/80 bg-pen/[0.04] px-5 py-3 leading-relaxed text-pen/95">
      <p className="font-semibold text-ink">Inductance : 0.011 mH ou 0.011 H ?</p>
      <p className="mt-1">
        Le tableau 4.1 donne L = 0,011 mH. Avec cette valeur, le pôle électrique est en ≈ −R/L = −72 700 rad/s : le courant
        s'établit en 14 µs et le moteur se comporte comme un simple premier ordre. Le tableau 2.1 du même fascicule (TP2, même
        moteur, mêmes R, J, f, kc, ke) donne <strong>L = 0,011 H</strong> : c'est très probablement la valeur voulue, l'unité
        « mH » étant une coquille. Le .m garde la valeur du tableau ; le sélecteur « Inductance L » permet de comparer.
      </p>
      <p className="mt-1.5 font-mono text-[0.88rem]">
        <span className={Lc === 'mH' ? 'text-ink' : ''}>pôles de Gm, L = 0.011 mH : {fmtP(L_VALUES.mH)} rad/s</span>
        <br />
        <span className={Lc === 'H' ? 'text-ink' : ''}>pôles de Gm, L = 0.011 H : {fmtP(L_VALUES.H)} rad/s</span>
      </p>
    </aside>
  )
}

const SPEEDS = [0.1, 0.25, 1]

function Motors({ sim, cr, g, avecStable }: { sim: { open: Response; sans: Response; avec: Response; thetaSans: number[]; thetaAvec: number[] }; cr: number; g: Gains; avecStable: boolean }) {
  const play = usePlayback(MCC_T_END, 0.25)
  const tq = Math.round(play.time / (MCC_T_END / 150)) * (MCC_T_END / 150)
  const load = cr > 0 && play.time >= CR_TIME ? cr : 0
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,32rem)_minmax(0,1fr)]">
      <div className="flex flex-col self-start border border-rule-strong bg-sheet">
        <div className="grid grid-cols-2">
          <MotorCard title="Sans PID" r={sim.sans} theta={sim.thetaSans} play={play} load={load} />
          <MotorCard title={`Avec PID (${g.kp}, ${g.ki}, ${g.kd})`} r={sim.avec} theta={sim.thetaAvec} play={play} load={load} unstable={!avecStable} />
        </div>
        <div className="flex items-baseline justify-between border-t border-rule px-3 py-1.5 font-mono text-[0.85rem]">
          <span className="text-ink-soft">t = {fmt(play.time, 3)} s</span>
          <span className={load ? 'text-pen' : 'text-ink-faint'}>{cr > 0 ? (load ? `cr = ${cr} N·m appliqué` : `cr à t = ${CR_TIME} s`) : 'cr = 0'}</span>
        </div>
        <div className="border-t border-rule px-3 py-2.5">
          <PlaybackBar play={play} duration={MCC_T_END} speeds={SPEEDS} />
          <p className="mt-1.5 text-[0.82rem] text-ink-faint italic">Ralenti : ×0.25 = 1,5 s de simulation en 6 s.</p>
        </div>
      </div>
      <OmegaPlot sim={sim} cr={cr} tq={tq} avecStable={avecStable} />
    </div>
  )
}

function MotorCard({ title, r, theta, play, load, unstable = false }: { title: string; r: Response; theta: number[]; play: Playback; load: number; unstable?: boolean }) {
  const w = sampleAt(r.t, r.y, play.time)
  const angle = sampleAt(r.t, theta, play.time)
  return (
    <div className="border-r border-rule px-2 pt-2 last:border-r-0">
      <p className="truncate px-1 font-mono text-[0.82rem] text-ink">{title}</p>
      <MotorDisc angle={angle} speed={w} load={load} label={`${title} : Ω = ${fmt(w, 2)} rad/s`} />
      <p className={`px-1 pb-2 text-center font-mono text-[0.8rem] ${unstable ? 'text-[#ff7b7b]' : 'text-ink-faint'}`}>
        {unstable ? '⚠ boucle instable' : `écart ${fmt(U - w, 3)} rad/s`}
      </p>
    </div>
  )
}

const OmegaPlot = memo(function OmegaPlot({ sim, cr, tq, avecStable }: { sim: { open: Response; sans: Response; avec: Response }; cr: number; tq: number; avecStable: boolean }) {
  const data: Data[] = [
    lineTrace([0, MCC_T_END], [U, U], { name: 'consigne 10 rad/s', color: C.yellow, dash: 'dash', width: 1.4, hover: false }),
    lineTrace(sim.open.t, sim.open.y, { name: 'boucle ouverte', color: C.continuous, width: 2 }),
    lineTrace(sim.sans.t, sim.sans.y, { name: 'sans PID', color: C.blue, width: 2.2 }),
    lineTrace(sim.avec.t, sim.avec.y, { name: 'avec PID', color: C.orange, width: 2.2 }),
  ]
  const shapes: Partial<Shape>[] = [{ type: 'line', xref: 'x', yref: 'y domain', x0: tq, x1: tq, y0: 0, y1: 1, line: { color: '#5ef0a0', width: 1.2 } }]
  const annotations: Partial<Layout>['annotations'] = []
  if (cr > 0) {
    shapes.push({ type: 'line', xref: 'x', yref: 'y domain', x0: CR_TIME, x1: CR_TIME, y0: 0, y1: 1, line: { color: C.yellow, width: 1, dash: 'dot' } })
    annotations.push({ x: CR_TIME, y: 1, yref: 'paper', xanchor: 'left', yanchor: 'top', text: ` cr = ${cr} N·m`, showarrow: false, font: { size: 13, color: C.yellow } })
  }
  const layout: Partial<Layout> = {
    xaxis: { title: { text: 't (s)' }, range: [0, MCC_T_END] },
    yaxis: { title: { text: 'Ω (rad/s)' }, ...(avecStable ? { rangemode: 'tozero' as const } : { range: [-5, 25] }) },
    shapes,
    annotations,
  }
  return (
    <Plot
      data={data}
      layout={layout}
      height={430}
      caption={
        <>
          vitesse Ω(t) pour une consigne de 10 rad/s : boucle ouverte avec U = 10 V (gris), retour unitaire sans PID (bleu),
          avec le PID des curseurs (orange){cr > 0 ? `, et le couple résistant ${cr} N·m appliqué à t = ${CR_TIME} s` : ''}. Le
          trait vert suit les moteurs animés.
        </>
      }
    />
  )
})

function MccExplanation({ g, Lc }: { g: Gains; Lc: LChoice }) {
  return (
    <>
      <H>Le modèle (figure 4.3)</H>
      <p>Équations électrique et mécanique du moteur (TP2 du fascicule) :</p>
      <MBlock>{String.raw`I(s) = \frac{V(s) - k_e\,\Omega(s)}{Ls + R}, \qquad \Omega(s) = \frac{k_c I(s) - C_r(s)}{Js + f}`}</MBlock>
      <MBlock>{String.raw`\Omega(s) = \frac{k_c}{D(s)}\,V(s) - \frac{Ls + R}{D(s)}\,C_r(s), \quad D(s) = (Ls+R)(Js+f) + k_c k_e`}</MBlock>
      <p>
        La boucle interne par ke (force contre-électromotrice) est physique : elle existe sans régulateur. En régime permanent,{' '}
        <M>{'\\Omega/V = k_c/(Rf + k_c k_e) = 0.522'}</M> rad/s par volt, d'où 5,22 rad/s pour U = 10 V en boucle ouverte.
      </p>

      <H>Sans / avec PID</H>
      <p>
        Le retour unitaire seul donne 3,43 rad/s (erreur 6,57 rad/s). Avec une action intégrale, Ω(∞) = 10 rad/s. Réglage
        actuel : kp = {g.kp}, ki = {g.ki}, kd = {g.kd}, L = {L_LABEL[Lc]}.
      </p>

      <H>Couple résistant : rejet de perturbation</H>
      <p>
        En boucle fermée, la vitesse due au couple est <M>{'\\Omega = \\frac{-(Ls+R)}{D + k_c C(s)}\\,C_r'}</M>. Sans intégrateur,
        ce transfert a un gain statique non nul : la vitesse reste plus basse tant que cr agit. Avec ki &gt; 0, C(s) a un pôle
        en 0, le gain statique devient nul : après un creux, la vitesse revient à 10 rad/s.
      </p>

      <H>Effet des gains (Q7)</H>
      <ul>
        <li>
          Avec L = 0,011 mH, le moteur est en pratique du premier ordre : kp seul ne crée aucun dépassement. Avec L = 0,011 H
          (deux pôles complexes), le dépassement augmente avec kp, comme dans la règle classique.
        </li>
        <li>
          ki annule l'erreur. Avec ki petit, le zéro du PI en −ki/kp est proche de 0 et laisse une lente « traîne » vers 10
          rad/s (≈ 2,4 s pour ki = 5) : augmenter ki accélère d'abord la réponse — contrairement à la règle « ki ↑ ⇒ rapidité
          ↓ » — puis, au-delà de quelques dizaines, crée un dépassement.
        </li>
        <li>
          La dérivée idéale n'apporte pas ici l'amortissement attendu : comparez les courbes et le tableau de synthèse.
        </li>
      </ul>

      <H>Système raide</H>
      <p>
        Avec L = 0,011 mH, les pôles sont à −22,9 et −72 700 rad/s : un schéma d'Euler explicite exigerait un pas inférieur à
        ~27 µs. Les réponses sont calculées par discrétisation exacte (exponentielle de matrice), stable quel que soit le pas.
      </p>

      <Conclusion>
        <ul>
          <li>L'action intégrale annule l'erreur statique et rejette le couple résistant.</li>
          <li>Le réglage du .m (kp = 2, ki = 20) : 10 rad/s, sans dépassement, ≈ 0,55 s.</li>
        </ul>
      </Conclusion>
    </>
  )
}
