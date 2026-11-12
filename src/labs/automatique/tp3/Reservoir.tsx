/**
 * TP3 — III. Réservoir d'eau: G1(s) = H(s)/Qe(s) = 12.5/(50s + 1), C = K, ZOH.
 * MATLAB reference: tp3_stabilite_precision.m, cells III.1-2 … III.6.
 */
import type { Data, Layout, Shape } from 'plotly.js'
import { memo, useMemo, useState } from 'react'
import { gainSweep, rlocus, stepDiscrete, stepSampledHybrid, type HybridResponse } from '../../../control'
import LoopDiagram from '../../../components/control/LoopDiagram'
import PlaybackBar from '../../../components/control/PlaybackBar'
import StatusStrip from '../../../components/control/StatusStrip'
import Tank, { tankWarning } from '../../../components/control/Tank'
import ZPlane from '../../../components/control/ZPlane'
import { Conclusion, H, M, MBlock } from '../../../components/Explanation'
import HandoutFigure from '../../../components/HandoutFigure'
import Plot from '../../../components/Plot'
import Section from '../../../components/Section'
import Select from '../../../components/Select'
import Slider from '../../../components/Slider'
import { lineTrace, stairsTrace, stemTraces } from '../../../components/StemPlot'
import { C } from '../../../components/theme'
import { fmt } from '../../../lib/format'
import { heldAt, sampleAt, usePlayback } from '../../../lib/usePlayback'
import { FIG_3_2, III } from './enonce'
import { closedPole, finalValue, Fz, Gz, kForError, kmax, PLANT_III, plantTF, pole0, staticError, TP } from './model'
import { tn, zMinus } from './tex'

const FILE = 'automatique/tp3_stabilite_precision.m'
const K_MAX_SLIDER = 20
const T_END = TP.III.tEnd // MATLAB: step(consigne*Fi, 300)
const HEIGHT = TP.tankHeight

/**
 * Duration of the animated response: about 8 time constants of the
 * closed-loop pole (|p|^k = e^{−kT/τ}), between 30 s and the .m file's 300 s,
 * so the transient fills the plot instead of its first few percent.
 * Unstable loop: stop one sample after |H| passes twice the tank height.
 */
function horizonIII(K: number, T: number, r: number): number {
  const p = Math.abs(closedPole(PLANT_III, K, T))
  if (p >= 1) {
    const d = stepDiscrete(Fz(PLANT_III, K, T), Math.floor(T_END / T) + 1, r)
    const k = d.y.findIndex((v) => Math.abs(v) > 2 * HEIGHT)
    return k < 0 ? T_END : Math.min(T_END, Math.max(2 * T, k * T))
  }
  const tau = -T / Math.log(p) // 0 when p = 0 (dead-beat)
  return Math.min(T_END, Math.max(30, Math.ceil((8 * tau + T) / 10) * 10))
}
const K_2PC = kForError(PLANT_III, 0.02) // 3.92
const T_COLORS = [C.blue, C.orange, C.yellow, C.purple]

export default function Reservoir() {
  const [K, setK] = useState<number>(TP.III.K)
  const [T, setT] = useState<number>(TP.III.T)
  const [r, setR] = useState<number>(TP.III.consigne)

  const p = closedPole(PLANT_III, K, T)
  const km = kmax(PLANT_III, T)
  const stable = Math.abs(p) < 1
  const hInf = finalValue(PLANT_III, K, r)
  const tEnd = horizonIII(K, T, r)
  const h = useMemo(() => stepSampledHybrid(plantTF(PLANT_III), K, T, tEnd, { amplitude: r }), [K, T, r, tEnd])

  const controls = (
    <>
      <Slider label="Gain K" value={K} min={0} max={K_MAX_SLIDER} step={0.01} onChange={setK} format={(v) => v.toFixed(2)} hint={`K limite pour ce T : ${fmt(km, 3)}`} />
      <div className="space-y-3">
        <Select
          label="Période T"
          value={(TP.III.Tlist as readonly number[]).includes(T) ? T : null}
          options={TP.III.Tlist.map((v) => ({ value: v, label: `${v} s`, tp: v === TP.III.T }))}
          onChange={setT}
        />
        <Slider label="T (réglage fin)" value={T} min={0.5} max={60} step={0.5} onChange={setT} format={(v) => `${v} s`} />
      </div>
      <Slider label="Consigne" value={r} min={0.5} max={20} step={0.5} onChange={setR} format={(v) => `${v} m`} hint="fascicule : 2 m" />
    </>
  )

  return (
    <Section
      questions={{
        intro: (
          <>
            <p>{III.intro}</p>
            <p>
              {III.tfIntro} <M>{'G_1(s) = \\dfrac{H(s)}{Q_e(s)} = \\dfrac{12.5}{50s+1}'}</M>
            </p>
            <p>
              {III.controller} <M>{'\\dfrac{1-e^{-Ts}}{s}'}</M>. {III.figIntro}
            </p>
            <HandoutFigure {...FIG_3_2} />
          </>
        ),
        items: III.items,
      }}
      controls={controls}
      explanation={<ReservoirExplanation K={K} T={T} r={r} />}
      code={[
        { file: FILE, cell: 'III.1-2' },
        { file: FILE, cell: 'III.3' },
        { file: FILE, cell: 'III.4' },
        { file: FILE, cell: 'III.5' },
        { file: FILE, cell: 'III.6' },
      ]}
    >
      <StatusStrip
        lamp={{ on: stable, label: stable ? 'stable' : 'instable' }}
        cells={[
          { label: 'pôle de F(z)', value: fmt(p, 4), tone: stable ? 'ok' : 'bad' },
          { label: 'K limite (T)', value: fmt(km, 4) },
          { label: 'H(∞)', value: stable ? `${fmt(hInf, 4)} m` : '—', tone: stable && hInf > HEIGHT ? 'warn' : undefined },
          { label: 'erreur statique 2/(1+12.5K)', value: stable ? `${fmt(staticError(PLANT_III, K, r), 4)} m` : '— (instable)', tone: stable ? undefined : 'warn' },
          { label: 'erreur relative', value: stable ? `${fmt((100 * staticError(PLANT_III, K, r)) / r, 2)} %` : '—' },
        ]}
      />

      <LoopDiagram
        label={`Réservoir : C(s) = K = ${K.toFixed(2)}, T = ${T} s, G1(s) = 12.5/(50s+1)`}
        input="Qe(s)"
        error="ε"
        output="H(s)"
        items={[
          { kind: 'sampler', id: 's1', value: `${T} s` },
          { kind: 'block', id: 'C', title: 'C(s) = K', value: `K = ${K.toFixed(2)}` },
          { kind: 'sampler', id: 's2', value: `${T} s` },
          { kind: 'block', id: 'B0', title: 'B_0(s) = (1 − e⁻ᵀˢ)/s', value: `T = ${T} s` },
          { kind: 'block', id: 'G1', title: 'G_1(s)', value: '12.5/(50s + 1)' },
        ]}
      />

      <TankPlayer h={h} tEnd={tEnd} K={K} T={T} r={r} stable={stable} hInf={hInf} />

      <DerivationIII K={K} T={T} />

      <Q4Panel K={K} T={T} r={r} onApply={() => setK(Math.round(K_2PC * 100) / 100)} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <EffectOfT K={K} T={T} r={r} />
        <LocusIII K={K} T={T} />
      </div>
    </Section>
  )
}

const SPEEDS = [1, 10, 50]

/** The tank, its playback controls, and H(t) with a cursor that follows the playback. */
function TankPlayer({ h, tEnd, K, T, r, stable, hInf }: { h: HybridResponse; tEnd: number; K: number; T: number; r: number; stable: boolean; hInf: number }) {
  const play = usePlayback(tEnd, 10)
  const level = sampleAt(h.t, h.y, play.time)
  const u = heldAt(h.tk, h.uk, play.time)
  const uRef = Math.max(1e-9, ...h.uk.map(Math.abs))
  const k = Math.min(h.tk.length - 1, Math.floor(play.time / T + 1e-9))
  const warning = tankWarning(level, HEIGHT)

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[19rem_minmax(0,1fr)]">
      <div className="flex flex-col border border-rule-strong bg-sheet">
        <div className="flex items-baseline justify-between border-b border-rule px-3 py-1.5 font-mono text-[0.8rem] text-ink-soft">
          <span>réservoir · 20 m</span>
          <span>×{play.speed}</span>
        </div>
        <div className="px-2 pt-2">
          <Tank
            level={level}
            setpoint={r}
            height={HEIGHT}
            inflow={u / uRef}
            time={play.time}
            playing={play.playing}
            label={`Réservoir : hauteur ${fmt(level, 2)} m sur 20 m, consigne ${r} m`}
          />
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 border-t border-rule px-3 py-2 font-mono text-[0.85rem]">
          <span className="text-ink-soft">t</span>
          <span className="text-right">{fmt(play.time, 1)} s</span>
          <span className="text-ink-soft">H(t)</span>
          <span className="text-right text-ch2">{fmt(level, 3)} m</span>
          <span className="text-ink-soft">Qe = K·ε(kT)</span>
          <span className="text-right">{fmt(u, 3)}</span>
          <span className="text-ink-soft">échantillon k</span>
          <span className="text-right">{k}</span>
        </div>
        {warning && (
          <p className="border-t border-[#ff5252]/60 bg-[#ff5252]/10 px-3 py-2 text-[0.9rem] text-[#ff7b7b]">
            {warning === 'overflow' ? '⚠ Débordement : H dépasse 20 m.' : '⚠ H < 0 : non physique (le modèle linéaire d\'une boucle instable).'}
          </p>
        )}
        <div className="mt-auto border-t border-rule px-3 py-2.5">
          <PlaybackBar play={play} duration={tEnd} speeds={SPEEDS} />
        </div>
      </div>

      <HPlot h={h} tEnd={tEnd} K={K} T={T} r={r} stable={stable} hInf={hInf} tq={Math.round(play.time / (tEnd / 120)) * (tEnd / 120)} />
    </div>
  )
}

/** H(t): continuous level, samples, setpoint, tank rim, playback cursor. */
/**
 * memo: the parent re-renders at every animation frame, but the cursor time
 * `tq` moves in 120 steps over the response, so Plotly redraws only then.
 */
const HPlot = memo(function HPlot({ h, tEnd, K, T, r, stable, hInf, tq }: { h: HybridResponse; tEnd: number; K: number; T: number; r: number; stable: boolean; hInf: number; tq: number }) {
  const level = sampleAt(h.t, h.y, tq)
  const base = useMemo<Data[]>(() => {
    const out: Data[] = [
      lineTrace([0, tEnd], [r, r], { name: `consigne ${r} m`, color: C.yellow, dash: 'dash', width: 1.5, hover: false }),
      lineTrace(h.t, h.y, { name: 'H(t) continue', color: '#4fd6e6', width: 2.2 }),
    ]
    if (h.tk.length <= 80) out.push(...stemTraces(h.tk, h.yk, { name: 'H(kT)', color: C.orange, size: 6 }))
    else
      out.push({ type: 'scatter', mode: 'markers', x: h.tk, y: h.yk, name: 'H(kT)', marker: { size: 4, color: C.orange }, hovertemplate: 't = %{x:.1f} s<br>H = %{y:.4f} m<extra></extra>' })
    if (stable) out.push(lineTrace([0, tEnd], [hInf, hInf], { name: `H(∞) = ${fmt(hInf, 3)} m`, color: C.continuous, dash: 'dot', width: 1.5, hover: false }))
    return out
  }, [h, r, stable, hInf, tEnd])

  const yMax = Math.max(...h.y)
  const range: [number, number] = stable ? [0, Math.max(r * 1.25, Math.min(HEIGHT * 1.1, yMax * 1.08))] : [-5, 25]
  const shapes: Partial<Shape>[] = [
    { type: 'line', xref: 'x', yref: 'y', x0: 0, x1: tEnd, y0: HEIGHT, y1: HEIGHT, line: { color: C.red, width: 1, dash: 'dot' } },
    { type: 'line', xref: 'x', yref: 'y domain', x0: tq, x1: tq, y0: 0, y1: 1, line: { color: '#5ef0a0', width: 1.2 } },
  ]
  const data: Data[] = [
    ...base,
    { type: 'scatter', mode: 'markers', x: [tq], y: [Math.max(range[0], Math.min(range[1], level))], marker: { size: 11, color: '#5ef0a0' }, showlegend: false, hoverinfo: 'skip' },
  ]
  const layout: Partial<Layout> = {
    xaxis: { title: { text: 't (s)' }, range: [0, tEnd] },
    yaxis: { title: { text: 'H (m)' }, range },
    shapes,
    annotations: [
      ...(range[1] > HEIGHT ? [{ x: tEnd, y: HEIGHT, xanchor: 'right' as const, yanchor: 'bottom' as const, text: 'bord du réservoir (20 m)', showarrow: false, font: { size: 13, color: C.red } }] : []),
      ...(!stable ? [{ xref: 'paper' as const, yref: 'paper' as const, x: 0.02, y: 0.95, xanchor: 'left' as const, text: 'instable : H diverge (axe limité)', showarrow: false, font: { size: 14, color: C.red } }] : []),
    ],
  }
  return (
    <Plot
      data={data}
      layout={layout}
      height={470}
      caption={
        <>
          hauteur d'eau H(t) pour K = {fmt(K, 2)} et T = {T} s, simulée comme dans Simulink : niveau continu (cyan) et
          valeurs lues par le contrôleur toutes les T secondes (orange). Le trait vert suit le réservoir animé.
          {stable
            ? ` Le niveau se stabilise à ${fmt(hInf, 3)} m, sous la consigne de ${r} m.`
            : ' Le pôle est hors du cercle unité : le niveau oscille et diverge.'}
        </>
      }
    />
  )
})

/** Q1: G(z) and F(z) for the tank, with the current numbers. */
function DerivationIII({ K, T }: { K: number; T: number }) {
  const b = pole0(PLANT_III, T)
  const g = 12.5 * (1 - b)
  const p = closedPole(PLANT_III, K, T)
  return (
    <div className="border border-rule-strong bg-sheet px-5 py-3">
      <p className="font-mono text-[0.82rem] text-trace">Q1 — G(z) et boucle fermée, avec les valeurs actuelles</p>
      <div className="overflow-x-auto text-[1.02rem] [&_.katex-display]:my-2.5">
        <MBlock>{String.raw`G(z) = (1-z^{-1})\,\mathcal{Z}\left\{\frac{12.5}{s(50s+1)}\right\} = \frac{12.5\,(1-b)}{z-b}, \quad b = e^{-T/50} = e^{-${tn(T / 50, 3)}} = ${tn(b, 5)}`}</MBlock>
        <MBlock>{String.raw`G(z) = \frac{${tn(g, 5)}}{${zMinus(b, 5)}}, \qquad F(z) = \frac{K\,G(z)}{1+K\,G(z)} = \frac{${tn(K * g, 5)}}{${zMinus(p, 5)}}`}</MBlock>
        <MBlock>{String.raw`p = b - 12.5K(1-b) = ${tn(p, 4)}, \qquad K_{max} = \frac{1+b}{12.5\,(1-b)} = ${tn(kmax(PLANT_III, T), 4)}`}</MBlock>
      </div>
    </div>
  )
}

/** Q4 and Q6: why 2 m is never reached with a P controller, and which K gives 2 %. */
function Q4Panel({ K, T, r, onApply }: { K: number; T: number; r: number; onApply: () => void }) {
  const km = kmax(PLANT_III, T)
  const ok = K_2PC < km
  return (
    <aside className="border-[1.5px] border-pen/80 bg-pen/[0.04] px-5 py-3 text-pen/95">
      <p className="font-semibold text-ink">Q4 — Quelle valeur de K pour remplir 2 m ?</p>
      <div className="mt-1 space-y-2 leading-relaxed">
        <p>
          Avec un correcteur proportionnel, le gain statique de la boucle fermée est <M>{'F(1) = \\frac{12.5K}{1+12.5K} < 1'}</M>,
          donc
        </p>
        <MBlock>{String.raw`H(\infty) = ${tn(r, 1)} \cdot \frac{12.5K}{1+12.5K} < ${tn(r, 1)}\ \text{m}, \qquad \varepsilon_\infty = \frac{${tn(r, 1)}}{1+12.5K}`}</MBlock>
        <p>
          On n'atteint jamais exactement la consigne : il reste une erreur statique (Q6), aujourd'hui{' '}
          <span className="font-mono text-ink">{fmt(staticError(PLANT_III, K, r), 4)} m</span> pour K = {fmt(K, 2)}. Pour une erreur d'au plus 2 % :
        </p>
        <MBlock>{String.raw`\frac{1}{1+12.5K} \le 0.02 \iff 12.5K \ge 49 \iff K \ge ${tn(K_2PC, 2)}`}</MBlock>
        <p className={ok ? 'text-trace' : 'text-[#ff7b7b]'}>
          {ok
            ? `T = ${T} s : K limite = ${fmt(km, 3)} > ${fmt(K_2PC, 2)} → possible, H(∞) = ${fmt(finalValue(PLANT_III, K_2PC, r), 3)} m.`
            : `T = ${T} s : K limite = ${fmt(km, 3)} < ${fmt(K_2PC, 2)} → impossible : la boucle devient instable avant d'atteindre 2 % d'erreur. Il faut échantillonner plus vite.`}
        </p>
        <button type="button" onClick={onApply} className="border border-pen/70 px-3 py-1 font-mono text-[0.85rem] text-pen hover:bg-pen/10">
          Appliquer K = {fmt(K_2PC, 2)}
        </button>
      </div>
    </aside>
  )
}

/** Q3: the response for several T, as in cell III.3 (discrete step, stairs). */
function EffectOfT({ K, T, r }: { K: number; T: number; r: number }) {
  const list = (TP.III.Tlist as readonly number[]).includes(T) ? [...TP.III.Tlist] : [...TP.III.Tlist, T]
  let anyUnstable = false
  const data: Data[] = list.map((Ti, i) => {
    let res = stepDiscrete(Fz(PLANT_III, K, Ti), Math.floor(T_END / Ti) + 1, r)
    const unstable = Math.abs(closedPole(PLANT_III, K, Ti)) >= 1
    anyUnstable ||= unstable
    if (unstable) {
      // a diverging staircase would fill the plot with vertical lines: stop it
      // one sample after it leaves the visible range
      const out = res.y.findIndex((v) => v > 2.5 * r || v < -r)
      if (out >= 0) res = { ...res, t: res.t.slice(0, out + 1), y: res.y.slice(0, out + 1) }
    }
    const extra = i >= TP.III.Tlist.length
    return stairsTrace(res.t, res.y, {
      name: `T = ${Ti} s${unstable ? ' (instable)' : ''}${extra ? ' (actuel)' : ''}`,
      color: extra ? '#5ef0a0' : T_COLORS[i],
      width: Ti === T ? 2.6 : 1.6,
    })
  })
  data.push(lineTrace([0, T_END], [r, r], { name: 'consigne', color: C.continuous, dash: 'dash', width: 1.2, hover: false }))
  const layout: Partial<Layout> = {
    xaxis: { title: { text: 't (s)' }, range: [0, T_END] },
    yaxis: { title: { text: 'H (m)' }, ...(anyUnstable ? { range: [-r, 2.5 * r] } : {}) },
  }
  return (
    <Plot
      data={data}
      layout={layout}
      height={420}
      caption={
        <>
          la cellule III.3 : step(consigne·F) pour T = 1, 5, 10 et 50 s avec K = {fmt(K, 2)} (escaliers : valeurs aux instants
          kT). Tant que T ≪ τ = 50 s, les réponses restent proches ; quand T grandit, le pôle s'éloigne vers −1 et la réponse
          oscille, puis diverge
          {anyUnstable ? ' (les courbes instables sont coupées à la sortie du cadre)' : ''}.
        </>
      }
    />
  )
}

/** Q5: root locus of the tank loop. */
function LocusIII({ K, T }: { K: number; T: number }) {
  const G = useMemo(() => Gz(PLANT_III, T), [T])
  const branches = useMemo(() => [rlocus(G, gainSweep(K_MAX_SLIDER, 200)).map((pt) => pt.poles[0])], [G])
  const p = closedPole(PLANT_III, K, T)
  const km = kmax(PLANT_III, T)
  return (
    <ZPlane
      branches={branches}
      openLoop={[{ re: pole0(PLANT_III, T), im: 0 }]}
      current={[{ re: p, im: 0 }]}
      K={K}
      crossing={km <= K_MAX_SLIDER ? { z: { re: -1, im: 0 }, K: km } : undefined}
      xRange={[Math.max(-4.5, Math.min(-1.6, p - 0.3)), 1.4]}
      height={420}
      caption={
        <>
          lieu des racines de K·G(z) pour T = {T} s (K de 0 à {K_MAX_SLIDER}). Une seule branche sur l'axe réel, aucun zéro : le
          pôle part de b = e^(−T/50) = {fmt(pole0(PLANT_III, T), 4)} et sort du cercle unité pour K = {fmt(km, 3)}.
        </>
      }
    />
  )
}

function ReservoirExplanation({ K, T, r }: { K: number; T: number; r: number }) {
  const b = pole0(PLANT_III, T)
  return (
    <>
      <H>Le modèle</H>
      <p>
        <M>{'G_1(s) = \\frac{12.5}{50s+1}'}</M> : un premier ordre de gain 12,5 m par unité de débit et de constante de temps
        τ = 50 s (le réservoir se vide par sa sortie à un débit proportionnel à H). En boucle ouverte, un débit constant de 2
        donnerait 25 m : le réservoir de 20 m déborderait.
      </p>
      <p>
        La figure 3.2 nomme l'entrée de la boucle Qe(s) ; dans le fichier .m, c'est la consigne de hauteur (2 m) qui est
        appliquée à cet endroit, et Qe est en fait la commande, sortie du bloqueur.
      </p>

      <H>Même calcul qu'en II, avec k = 12,5 et τ = 50 s</H>
      <MBlock>{String.raw`G(z) = \frac{12.5(1-b)}{z-b},\ b = e^{-T/50},\qquad K_{max} = \frac{1+b}{12.5(1-b)}`}</MBlock>
      <p>
        Pour T = {T} s : b = {fmt(b, 4)}. Comme T/τ est petit, 1 − b ≈ T/50 et <M>{'K_{max} \\approx \\frac{8}{T}'}</M> : 8,0 pour
        T = 1 s, 0,80 pour T = 10 s. À T = 50 s, même K = 1 est instable.
      </p>

      <H>Précision (Q4, Q6)</H>
      <p>
        <M>{'\\varepsilon_\\infty = \\frac{r}{1+12.5K}'}</M> avec r = {r} m : {fmt(staticError(PLANT_III, K, r), 4)} m pour K =
        {' '}
        {fmt(K, 2)}. Elle diminue avec K mais ne s'annule pas : il faudrait un intégrateur dans la boucle (correcteur PI, TP4).
      </p>

      <Conclusion>
        <ul>
          <li>Le correcteur proportionnel laisse toujours une erreur statique sur le niveau.</li>
          <li>K ≥ 3,92 donne moins de 2 % d'erreur, ce qui n'est stable que si T &lt; ≈ 2 s.</li>
        </ul>
      </Conclusion>
    </>
  )
}
