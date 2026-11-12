/**
 * TP4 — III. Asservissement de la hauteur d'eau d'un réservoir par un PID.
 * G(s) = 12.5/(50s + 1), consigne 2 m.
 * MATLAB reference: tp4_pid.m, cells III.1 … III.4.
 */
import type { Data, Layout, Shape } from 'plotly.js'
import { memo, useMemo, useState, type ReactNode } from 'react'
import { stepContinuous, tf, type Response } from '../../../control'
import LoopDiagram from '../../../components/control/LoopDiagram'
import PlaybackBar from '../../../components/control/PlaybackBar'
import Tank, { tankWarning } from '../../../components/control/Tank'
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
import { FIG_4_2, III } from './enonce'
import GainEffects from './GainEffects'
import {
  closedLoop,
  commandTF,
  controller,
  measure,
  TANK,
  TANK_HEIGHT,
  TANK_PRESETS,
  TANK_SETPOINT,
  TANK_SWEEPS,
  TANK_T_END,
  type Gains,
} from './model'
import StepInfoTable from './StepInfoTable'

const FILE = 'automatique/tp4_pid.m'
const ONE = tf([1], [1])
const R = TANK_SETPOINT
const N = 1501
type LeftMode = 'bo' | 'bf'

// constant parts: open loop and unity feedback without PID
const OPEN = stepContinuous(TANK, TANK_T_END, N, R) // MATLAB: step(consigne*G, …)
const OPEN_INFO = measure(TANK, R, 300)
const F0 = closedLoop(ONE, TANK) // MATLAB: F0 = feedback(G, 1)
const SANS = measure(F0, R, TANK_T_END, N)
const SANS_U = stepContinuous(commandTF(ONE, TANK), TANK_T_END, N, R)
const OPEN_U: Response = { t: OPEN.t, y: OPEN.t.map(() => R) }

const presetOf = (g: Gains) => TANK_PRESETS.find((p) => p.kp === g.kp && p.ki === g.ki && p.kd === g.kd)?.id ?? null

export default function ReservoirPid() {
  const [g, setG] = useState<Gains>({ kp: 2, ki: 0.1, kd: 0 })
  const [left, setLeft] = useState<LeftMode>('bo')
  const set = (k: keyof Gains) => (v: number) => setG((old) => ({ ...old, [k]: v }))

  const C_ = useMemo(() => controller(g), [g])
  const avec = useMemo(() => measure(closedLoop(C_, TANK), R, TANK_T_END, N), [C_])
  const avecU = useMemo(() => stepContinuous(commandTF(C_, TANK), TANK_T_END, N, R), [C_])

  const controls = (
    <>
      <Select
        label="Préréglages"
        value={presetOf(g)}
        options={TANK_PRESETS.map((p) => ({ value: p.id, label: p.label, tp: p.tp }))}
        onChange={(id) => {
          const p = TANK_PRESETS.find((x) => x.id === id)!
          setG({ kp: p.kp, ki: p.ki, kd: p.kd })
        }}
      />
      <Slider label="kp" value={g.kp} min={0} max={10} step={0.05} onChange={set('kp')} format={(v) => v.toFixed(2)} />
      <Slider label="ki" value={g.ki} min={0} max={1} step={0.005} onChange={set('ki')} format={(v) => v.toFixed(3)} />
      <Slider label="kd" value={g.kd} min={0} max={20} step={0.1} onChange={set('kd')} format={(v) => v.toFixed(1)} />
    </>
  )

  return (
    <Section
      questions={{
        intro: (
          <>
            <p>{III.intro}</p>
            <HandoutFigure {...FIG_4_2} />
            <p>{III.after}</p>
          </>
        ),
        items: III.items,
      }}
      controls={controls}
      explanation={<ReservoirExplanation g={g} />}
      code={[
        { file: FILE, cell: 'III.1' },
        { file: FILE, cell: 'III.1-2' },
        { file: FILE, cell: 'III.3' },
        { file: FILE, cell: 'III.4' },
      ]}
    >
      <LoopDiagram
        label={`Réservoir avec PID : kp = ${g.kp}, ki = ${g.ki}, kd = ${g.kd}`}
        input="Qe(s)"
        error="ε"
        output="H(s)"
        items={[
          { kind: 'block', id: 'pid', title: 'PID', value: `kp ${g.kp} · ki ${g.ki} · kd ${g.kd}` },
          { kind: 'block', id: 'G', title: 'G(s)', value: '12.5/(50s + 1)' },
        ]}
      />

      <TwinTanks g={g} left={left} setLeft={setLeft} avec={avec.response} avecU={avecU} avecStable={avec.stable} />

      <StepInfoTable
        unit="m"
        columns={[
          { label: 'Boucle ouverte', info: OPEN_INFO.info, stable: true },
          { label: 'Sans PID (retour unitaire)', info: SANS.info, stable: true },
          { label: `Avec PID (${g.kp}, ${g.ki}, ${g.kd})`, info: avec.info, stable: avec.stable, highlight: true, compareTo: 1 },
        ]}
        extraRows={[{ label: 'Valeur finale H(∞) (m)', values: [fmt(OPEN_INFO.final, 4), fmt(SANS.final, 4), avec.stable ? fmt(avec.final, 4) : '—'] }]}
        caption={
          <>
            les grandeurs de stepinfo (cellule III.4) pour une consigne de 2 m. La boucle ouverte monte vers 25 m : son « erreur »
            de −23 m signifie que le réservoir de 20 m déborde. En vert, ce que le PID améliore par rapport au retour unitaire.
          </>
        }
      />

      <div>
        <h3 className="mb-3 border-b border-rule pb-1.5 text-[1.15rem] font-semibold">Q3 — Effet de chaque gain</h3>
        <GainEffects plant={TANK} r={R} sweeps={TANK_SWEEPS} unit="m" yLabel="H (m)" />
      </div>
    </Section>
  )
}

/** "Sans PID" and "Avec PID" tanks side by side, one shared playback, and H(t). */
function TwinTanks({
  g,
  left,
  setLeft,
  avec,
  avecU,
  avecStable,
}: {
  g: Gains
  left: LeftMode
  setLeft: (m: LeftMode) => void
  avec: Response
  avecU: Response
  avecStable: boolean
}) {
  const play = usePlayback(TANK_T_END, 10)
  const L = left === 'bo' ? OPEN : SANS.response
  const LU = left === 'bo' ? OPEN_U : SANS_U
  const uRef = Math.max(1e-9, ...LU.y.map(Math.abs), ...avecU.y.map(Math.abs))
  // the plot cursor moves in 120 steps: the plots redraw only then, not at every animation frame
  const tq = Math.round(play.time / (TANK_T_END / 120)) * (TANK_T_END / 120)
  const tracesIII1 = useMemo(
    () => [
      { r: OPEN, name: 'boucle ouverte', color: C.red },
      { r: SANS.response, name: 'retour unitaire sans PID', color: C.blue },
    ],
    [],
  )
  const tracesIII2 = useMemo(
    () => [
      { r: SANS.response, name: 'sans PID', color: C.blue },
      { r: avec, name: 'avec PID', color: C.orange },
    ],
    [avec],
  )

  return (
    <div className="space-y-5">
      <div className="border border-rule-strong bg-sheet">
        <div className="grid grid-cols-1 sm:grid-cols-2">
          <TankCard
            title="Sans PID"
            header={
              <Select
                label=""
                value={left}
                options={[
                  { value: 'bo', label: 'boucle ouverte' },
                  { value: 'bf', label: 'retour unitaire' },
                ]}
                onChange={setLeft}
              />
            }
            r={L}
            u={LU}
            uRef={uRef}
            play={play}
          />
          <TankCard title={`Avec PID — kp ${g.kp} · ki ${g.ki} · kd ${g.kd}`} r={avec} u={avecU} uRef={uRef} play={play} unstable={!avecStable} />
        </div>
        <div className="border-t border-rule px-3 py-2.5">
          <PlaybackBar play={play} duration={TANK_T_END} speeds={[1, 10, 50]} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <HPlot
          title="III.1 — sans régulateur"
          traces={tracesIII1}
          yMax={26}
          tq={tq}
          caption={<>la cellule III.1 : en boucle ouverte (débit constant), H tend vers 2 × 12,5 = 25 m et passe le bord du réservoir vers t ≈ 80 s ; avec le retour unitaire, H se stabilise à 1,852 m, sous la consigne.</>}
        />
        <HPlot
          title="III.2 — sans / avec PID"
          traces={tracesIII2}
          yMax={avecStable ? Math.max(2.6, Math.min(TANK_HEIGHT * 1.1, Math.max(...avec.y) * 1.08)) : 6}
          yMin={avecStable ? 0 : -2}
          tq={tq}
          caption={
            <>
              la cellule III.1-2 : réponse du réservoir sans PID (bleu) et avec le PID réglé par les curseurs (orange). Avec une
              action intégrale (ki &gt; 0), la hauteur rejoint exactement les 2 m.
            </>
          }
        />
      </div>
    </div>
  )
}

function TankCard({
  title,
  header,
  r,
  u,
  uRef,
  play,
  unstable = false,
}: {
  title: string
  header?: ReactNode
  r: Response
  u: Response
  uRef: number
  play: Playback
  unstable?: boolean
}) {
  const level = sampleAt(r.t, r.y, play.time)
  const q = sampleAt(u.t, u.y, play.time)
  const warning = tankWarning(level, TANK_HEIGHT)
  return (
    <div className="flex flex-col border-rule sm:border-r sm:last:border-r-0">
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-rule px-3 py-1.5">
        <span className="font-mono text-[0.85rem] text-ink">{title}</span>
        {header}
      </div>
      <div className="mx-auto w-full max-w-[19rem] px-2 pt-2">
        <Tank
          level={level}
          setpoint={TANK_SETPOINT}
          height={TANK_HEIGHT}
          inflow={q / uRef}
          time={play.time}
          playing={play.playing}
          label={`${title} : hauteur ${fmt(level, 2)} m`}
        />
      </div>
      <div className="grid grid-cols-2 gap-x-3 border-t border-rule px-3 py-2 font-mono text-[0.85rem]">
        <span className="text-ink-soft">t</span>
        <span className="text-right">{fmt(play.time, 1)} s</span>
        <span className="text-ink-soft">H(t)</span>
        <span className="text-right text-ch2">{fmt(level, 3)} m</span>
        <span className="text-ink-soft">Qe (commande)</span>
        <span className="text-right">{fmt(q, 3)}</span>
        {u.impulse ? (
          <>
            <span className="text-ink-soft" title="La dérivée idéale kd·s d'un échelon de consigne est une impulsion de Dirac : débit infini pendant un instant nul.">
              impulsion à t = 0
            </span>
            <span className="text-right text-pen">aire {fmt(u.impulse, 3)}</span>
          </>
        ) : null}
      </div>
      <div className="mt-auto min-h-11 border-t border-rule px-3 py-2 text-[0.9rem]">
        {warning === 'overflow' ? (
          <p className="text-[#ff7b7b]">⚠ Débordement : H dépasse 20 m (H(∞) = 25 m en boucle ouverte).</p>
        ) : warning === 'negative' || unstable ? (
          <p className="text-[#ff7b7b]">⚠ Boucle instable : le modèle linéaire n'a plus de sens physique.</p>
        ) : (
          <p className="text-ink-faint">consigne 2 m · écart {fmt(TANK_SETPOINT - level, 3)} m</p>
        )}
      </div>
    </div>
  )
}

interface HPlotProps {
  title: string
  traces: { r: Response; name: string; color: string }[]
  yMax: number
  yMin?: number
  /** cursor time, already quantized */
  tq: number
  caption: ReactNode
}

// the caption is new JSX at every render: compare everything else
const HPlot = memo(HPlotImpl, (a, b) => a.tq === b.tq && a.traces === b.traces && a.yMax === b.yMax && a.yMin === b.yMin && a.title === b.title)

function HPlotImpl({ title, traces, yMax, yMin = 0, tq, caption }: HPlotProps) {
  const data = useMemo<Data[]>(
    () => [
      lineTrace([0, TANK_T_END], [R, R], { name: 'consigne 2 m', color: C.yellow, dash: 'dash', width: 1.4, hover: false }),
      ...traces.map((t) => lineTrace(t.r.t, t.r.y, { name: t.name, color: t.color, width: 2.2 })),
    ],
    [traces],
  )
  const shapes: Partial<Shape>[] = [
    { type: 'line', xref: 'x', yref: 'y domain', x0: tq, x1: tq, y0: 0, y1: 1, line: { color: '#5ef0a0', width: 1.2 } },
  ]
  if (yMax > TANK_HEIGHT) shapes.push({ type: 'line', xref: 'x', yref: 'y', x0: 0, x1: TANK_T_END, y0: TANK_HEIGHT, y1: TANK_HEIGHT, line: { color: C.red, width: 1, dash: 'dot' } })
  const layout: Partial<Layout> = {
    title: { text: `<b>${title}</b>`, font: { size: 14 } },
    xaxis: { title: { text: 't (s)' }, range: [0, TANK_T_END] },
    yaxis: { title: { text: 'H (m)' }, range: [yMin, yMax] },
    shapes,
    margin: { l: 56, r: 16, t: 80, b: 50 },
    annotations:
      yMax > TANK_HEIGHT
        ? [{ x: TANK_T_END, y: TANK_HEIGHT, xanchor: 'right', yanchor: 'top', text: 'bord du réservoir (20 m)', showarrow: false, font: { size: 13, color: C.red } }]
        : [],
  }
  return <Plot data={data} layout={layout} height={380} caption={caption} />
}

function ReservoirExplanation({ g }: { g: Gains }) {
  return (
    <>
      <H>Sans régulateur</H>
      <p>
        En boucle ouverte, un débit constant égal à la consigne donne <M>{'H(\\infty) = 2 \\times 12.5 = 25'}</M> m : le
        réservoir de 20 m déborde. Le retour unitaire seul (C = 1) donne{' '}
        <M>{'F_0(s) = \\frac{12.5}{50s + 13.5}'}</M> : plus rapide (τ = 3,7 s au lieu de 50 s), mais{' '}
        <M>{'H(\\infty) = 2 \\cdot \\frac{12.5}{13.5} = 1.852'}</M> m.
      </p>

      <H>Avec le PID</H>
      <MBlock>{String.raw`F(s) = \frac{C(s)G(s)}{1 + C(s)G(s)} = \frac{12.5\,(k_d s^2 + k_p s + k_i)}{(50 + 12.5k_d)\,s^2 + (1 + 12.5k_p)\,s + 12.5k_i}`}</MBlock>
      <p>
        Avec ki &gt; 0, F(0) = 1 : <strong>l'intégrateur annule l'erreur statique</strong>. Tant qu'il reste une erreur, son
        intégrale grandit et pousse la commande ; l'équilibre n'est possible qu'avec ε = 0.
      </p>
      <p>Réglage actuel : kp = {g.kp}, ki = {g.ki}, kd = {g.kd}.</p>

      <H>Effet de chaque gain sur ce réservoir</H>
      <ul>
        <li>
          <strong>kp</strong> : accélère la réponse (pôle en −(1 + 12,5kp)/50) et réduit l'erreur 2/(1 + 12,5kp), sans jamais
          l'annuler. Le système bouclé reste du premier ordre : <em>aucun dépassement</em>, quel que soit kp — la règle « kp ↑
          ⇒ stabilité ↓ » ne se voit pas ici.
        </li>
        <li>
          <strong>ki</strong> : annule l'erreur ; plus ki est grand, plus le dépassement augmente (deuxième ordre de moins en
          moins amorti).
        </li>
        <li>
          <strong>kd</strong> : il s'ajoute au coefficient de s² du dénominateur (50 + 12,5kd) : le dépassement diminue un peu
          mais la réponse devient plus lente. La dérivée idéale fait aussi sauter H à t = 0 d'une fraction
          12,5kd/(50 + 12,5kd) de la consigne : sur un réservoir réel, la pompe ne peut pas fournir ce débit infini — le
          bloc PID Controller de Simulink filtre la dérivée pour cette raison.
        </li>
      </ul>

      <Conclusion>
        <ul>
          <li>Seule l'action intégrale amène la hauteur exactement à 2 m.</li>
          <li>Le réglage du .m (kp = 2, ki = 0,1) : erreur nulle, dépassement ≈ 3,9 %.</li>
        </ul>
      </Conclusion>
    </>
  )
}
