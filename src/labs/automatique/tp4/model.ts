/**
 * TP4 systems, as in public/matlab/automatique/tp4_pid.m.
 *
 * Réservoir: G(s) = H(s)/Qe(s) = 12.5/(50s + 1), consigne 2 m.
 * MCC (fascicule, TP2 eq. 1–2 and Figure 4.3):
 *   I(s) = (V − ke·Ω)/(Ls + R),   Ω(s) = (kc·I − Cr)/(Js + f)
 *   ⇒ Ω = kc/D · V − (Ls + R)/D · Cr,   D(s) = (Ls + R)(Js + f) + kc·ke
 */
import {
  dcgain,
  feedback,
  isStable,
  pid,
  poles,
  polyAdd,
  polyMul,
  polyScale,
  series,
  stepContinuous,
  stepinfo,
  tf,
  type Response,
  type StepInfo,
  type TF,
} from '../../../control'

// ---------------------------------------------------------------- réservoir

/** MATLAB: G = tf(12.5, [50 1]) */
export const TANK = tf([12.5], [50, 1])
export const TANK_SETPOINT = 2 // m
export const TANK_HEIGHT = 20 // m
/** simulated duration shown for the tanks: long enough for the open loop to overflow (t ≈ 80 s) */
export const TANK_T_END = 150

export interface Gains {
  kp: number
  ki: number
  kd: number
}

export interface Preset extends Gains {
  id: string
  label: string
  /** values of tp4_pid.m */
  tp?: boolean
}

/**
 * "Sans PID" = C(s) = 1, i.e. the unity-feedback loop F0 of the .m file.
 * PI = the .m file's tuning (kp = 2, ki = 0.1). P and PID reuse kp = 2 and
 * values from the .m file's sweeps (III.3).
 */
export const TANK_PRESETS: Preset[] = [
  { id: 'sans', label: 'Sans PID', kp: 1, ki: 0, kd: 0 },
  { id: 'p', label: 'P (kp = 2)', kp: 2, ki: 0, kd: 0 },
  { id: 'pi', label: 'PI (kp = 2, ki = 0.1)', kp: 2, ki: 0.1, kd: 0, tp: true },
  { id: 'pid', label: 'PID (kp = 2, ki = 0.1, kd = 1)', kp: 2, ki: 0.1, kd: 1 },
]

/** Sweeps of cell III.3 (subplot 1, 2, 3) */
export const TANK_SWEEPS = {
  kp: { values: [0.5, 1, 2, 5], fixed: { ki: 0, kd: 0 }, tEnd: 60 },
  ki: { values: [0.02, 0.05, 0.1, 0.5], fixed: { kp: 2, kd: 0 }, tEnd: 100 },
  kd: { values: [0, 1, 5, 20], fixed: { kp: 2, ki: 0.1 }, tEnd: 100 },
} as const

// ---------------------------------------------------------------------- MCC

/** Tableau 4.1. L is printed "0.011 mH"; Tableau 2.1 (TP2, same motor) gives 0.011 H. */
export const MCC = {
  R: 0.8, // Ω
  J: 0.2, // kg·m²
  f: 1e-2, // printed "N.m" in the table
  ke: 1.91,
  kc: 1.91,
  U: 10, // V — consigne 10 rad/s
} as const

export const L_VALUES = { mH: 0.011e-3, H: 0.011 } as const
export type LChoice = keyof typeof L_VALUES

/** time of the load-torque step (s) */
export const CR_TIME = 0.5
export const MCC_T_END = 1.5 // MATLAB: step(U*Fm, 1.5)

export const MCC_PRESETS: Preset[] = [
  { id: 'sans', label: 'Sans PID', kp: 1, ki: 0, kd: 0 },
  { id: 'p', label: 'P (kp = 2)', kp: 2, ki: 0, kd: 0 },
  { id: 'pi', label: 'PI (kp = 2, ki = 20)', kp: 2, ki: 20, kd: 0, tp: true },
  { id: 'pid', label: 'PID (kp = 2, ki = 20, kd = 0.05)', kp: 2, ki: 20, kd: 0.05 },
]

/** Sweeps of cell IV.7 */
export const MCC_SWEEPS = {
  kp: { values: [1, 2, 5, 10], fixed: { ki: 0, kd: 0 }, tEnd: 0.5 },
  ki: { values: [5, 20, 50, 100], fixed: { kp: 2, kd: 0 }, tEnd: 1.5 },
  kd: { values: [0, 0.05, 0.2, 0.5], fixed: { kp: 2, ki: 20 }, tEnd: 1.5 },
} as const

/** D(s) = (Ls + R)(Js + f) + kc·ke */
export function motorDen(L: number): number[] {
  return polyAdd(polyMul([L, MCC.R], [MCC.J, MCC.f]), [MCC.kc * MCC.ke])
}

/** Ω/V = kc/D. MATLAB: Gm = feedback(tf(kc, [L R]) * tf(1, [J f]), ke) */
export const motorTF = (L: number): TF => tf([MCC.kc], motorDen(L))

/** Ω/Cr = −(Ls + R)/D (open loop, V = 0) */
export const motorLoadTF = (L: number): TF => tf([-L, -MCC.R], motorDen(L))

// ------------------------------------------------------------ loop algebra

export const controller = (g: Gains): TF => pid(g.kp, g.ki, g.kd)

/** y/r = CG/(1 + CG). MATLAB: feedback(C*G, 1) */
export const closedLoop = (C: TF, G: TF): TF => feedback(series(C, G), 1)

/** u/r = C/(1 + CG) = nc·dg/(dc·dg + nc·ng): the command sent to the plant */
export function commandTF(C: TF, G: TF): TF {
  return tf(polyMul(C.num, G.den), polyAdd(polyMul(C.den, G.den), polyMul(C.num, G.num)))
}

/**
 * Ω/Cr in closed loop: Gd/(1 + C·Gm) = −(Ls + R)·dc/(dc·D + nc·kc).
 * With an integrator (dc(0) = 0) its static gain is 0: the load is rejected.
 */
export function loadClosedLoopTF(C: TF, L: number): TF {
  const D = motorDen(L)
  return tf(polyMul([-L, -MCC.R], C.den), polyAdd(polyMul(C.den, D), polyScale(C.num, MCC.kc)))
}

// --------------------------------------------------------------- responses

export interface Measured {
  response: Response
  info: StepInfo
  stable: boolean
  final: number
}

/**
 * Step response of amplitude r on [0, tEnd] for the plot, and stepinfo
 * measured on a window long enough to settle (10 / slowest |Re p|), so that
 * slow loops (ki small) still get a settling time.
 */
export function measure(F: TF, r: number, tEnd: number, n = 1500): Measured {
  const response = stepContinuous(F, tEnd, n, r)
  const stable = isStable(F)
  const final = r * dcgain(F)
  if (!stable) {
    return { response, stable, final: NaN, info: stepinfo(response.t, response.y, { yFinal: NaN, consigne: r }) }
  }
  const slow = Math.min(...poles(F).map((p) => Math.abs(p.re)))
  const tLong = Math.min(1e4, Math.max(tEnd, 10 / slow))
  const long = stepContinuous(F, tLong, 20001, r)
  return { response, stable, final, info: stepinfo(long.t, long.y, { yFinal: final, yInit: 0, consigne: r }) }
}

/**
 * MCC speed with the setpoint step at 0 and the load torque cr stepped at
 * CR_TIME: by linearity, Ω = Ω_r(t) + cr·Ω_cr(t − CR_TIME).
 */
export function speedWithLoad(Fr: TF, Fd: TF, r: number, cr: number, tEnd = MCC_T_END, n = 1501): Response {
  const a = stepContinuous(Fr, tEnd, n, r)
  if (cr === 0) return a
  const d = stepContinuous(Fd, tEnd, n, cr)
  const shift = Math.round((CR_TIME / tEnd) * (n - 1))
  return { t: a.t, y: a.y.map((v, i) => v + (i >= shift ? d.y[i - shift] : 0)) }
}

// ------------------------------------------------------- effect of each gain

export type Arrow = '↑' | '↓' | '='
export type Gain = 'kp' | 'ki' | 'kd'
export type Criterion = 'stabilite' | 'rapidite' | 'precision'

/**
 * Classic table taught with the PID (gain ↑ → effect):
 *   kp: stabilité ↓, rapidité ↑, précision ↑ (erreur réduite, jamais nulle)
 *   ki: stabilité ↓, rapidité ↓, précision ↑ (erreur statique annulée)
 *   kd: stabilité ↑, rapidité ↑, précision = (pas d'effet sur l'erreur statique)
 */
export const THEORY: Record<Gain, Record<Criterion, Arrow>> = {
  kp: { stabilite: '↓', rapidite: '↑', precision: '↑' },
  ki: { stabilite: '↓', rapidite: '↓', precision: '↑' },
  kd: { stabilite: '↑', rapidite: '↑', precision: '=' },
}

export interface SweepPoint {
  value: number
  m: Measured
}

/**
 * What the swept curves actually show, from the first to the last value:
 *   stabilité ← dépassement (more overshoot = less stable), or instability
 *   rapidité  ← temps de réponse à 2 %
 *   précision ← |erreur statique|; for ki the reference is ki = 0 (`baseline`),
 *               since every ki > 0 already cancels the error.
 */
export function measuredTrend(points: SweepPoint[], criterion: Criterion, baseline?: Measured): { arrow: Arrow; from: number; to: number } {
  const first = points[0].m
  const last = points[points.length - 1].m
  if (criterion === 'stabilite') {
    if (!last.stable && first.stable) return { arrow: '↓', from: first.info.overshoot, to: NaN }
    const from = first.info.overshoot
    const to = last.info.overshoot
    return { arrow: to - from > 0.3 ? '↓' : from - to > 0.3 ? '↑' : '=', from, to }
  }
  if (criterion === 'rapidite') {
    const from = first.info.settlingTime
    const to = last.info.settlingTime
    return { arrow: to < 0.9 * from ? '↑' : to > 1.1 * from ? '↓' : '=', from, to }
  }
  const ref = baseline ?? first
  const from = Math.abs(ref.info.staticError)
  const to = Math.abs(last.info.staticError)
  if (from < 1e-9 && to < 1e-9) return { arrow: '=', from, to }
  return { arrow: to < 0.9 * from ? '↑' : to > 1.1 * from ? '↓' : '=', from, to }
}
