/**
 * Step responses: continuous, discrete, and the sampled loop as Simulink
 * shows it (continuous plant + sampler + ZOH + digital controller).
 */
import { zohMatrices } from './c2d'
import { matVec } from './matrix'
import { output, tf2ss } from './ss'
import { polyDiv } from './polynomial'
import { isProper, type TF, type TFz } from './tf'

export interface Response {
  t: number[]
  y: number[]
  /**
   * Area of a Dirac impulse at t = 0, not included in y. Only for a
   * transfer function one degree improper, e.g. the command u = C/(1 + CG)
   * of an ideal PID derivative: a step setpoint asks for an infinite,
   * instantaneous command.
   */
  impulse?: number
}

/**
 * Step response of a continuous system on a uniform grid of nPoints over
 * [0, tEnd]. MATLAB: [y, t] = step(amplitude*G, tEnd)
 *
 * The input is constant, so x[k+1] = Φ x[k] + Γ u with Φ = e^{A·dt} is the
 * exact solution at the grid points (no Euler, no RK error), whatever the
 * stiffness of the system.
 *
 * deg num = deg den + 1: G = q1·s + q0 + R(s) with R proper, so the step
 * response is q1·δ(t) (returned as `impulse`) + q0 + step of R.
 * Higher excess (δ′, δ″…) is refused.
 */
export function stepContinuous(G: TF, tEnd: number, nPoints = 1000, amplitude = 1): Response {
  if (!isProper(G)) {
    const { q, r } = polyDiv(G.num, G.den)
    if (q.length > 2) throw new Error('stepContinuous: transfer function improper by more than one degree')
    const [q1, q0] = q
    const rest = stepContinuous({ num: r, den: G.den }, tEnd, nPoints, amplitude)
    return { t: rest.t, y: rest.y.map((v) => v + q0 * amplitude), impulse: q1 * amplitude }
  }
  const sys = tf2ss(G)
  const dt = tEnd / (nPoints - 1)
  const { Phi, Gamma } = zohMatrices(sys, dt)
  const n = sys.A.length
  let x = new Array<number>(n).fill(0)
  const t: number[] = []
  const y: number[] = []
  for (let k = 0; k < nPoints; k++) {
    t.push(k * dt)
    y.push(output(sys, x, amplitude))
    const Px = matVec(Phi, x)
    x = Px.map((v, i) => v + Gamma[i] * amplitude)
  }
  return { t, y }
}

/**
 * Step response of a discrete system at t = kT, k = 0 … nSamples−1, from its
 * difference equation (den monic, num padded to the same length):
 *   y[k] = Σ b_i u[k−i] − Σ_{i≥1} a_i y[k−i]
 * MATLAB: step(amplitude*Gz)  (drawn as stairs)
 */
export function stepDiscrete(G: TFz, nSamples: number, amplitude = 1): Response & { k: number[] } {
  const a = G.den.map((c) => c / G.den[0])
  const n = a.length - 1
  if (G.num.length > a.length) throw new Error('stepDiscrete: non-causal (deg num > deg den)')
  const b = [...new Array<number>(a.length - G.num.length).fill(0), ...G.num.map((c) => c / G.den[0])]
  const y: number[] = []
  for (let k = 0; k < nSamples; k++) {
    let v = 0
    for (let i = 0; i <= n; i++) if (k - i >= 0) v += b[i] * amplitude
    for (let i = 1; i <= n; i++) if (k - i >= 0) v -= a[i] * y[k - i]
    y.push(v)
  }
  const k = y.map((_, i) => i)
  return { k, t: k.map((i) => i * G.T), y }
}

export interface HybridResponse extends Response {
  /** control u(t) = K·ε(kT), held on [kT, (k+1)T) — same grid as t */
  u: number[]
  /** sampling instants kT and the output / error / control there */
  tk: number[]
  yk: number[]
  ek: number[]
  uk: number[]
}

/**
 * The sampled loop of Figure 3.1, simulated the way Simulink does it:
 * every T the error ε(kT) = r − y(kT) is sampled, multiplied by K, held
 * constant by the ZOH, and drives the continuous plant, which evolves
 * exactly (matrix exponential) on a fine grid between two samples.
 *
 * At t = kT the output equals the discrete model
 * stepDiscrete(feedback(K·c2d(G, T), 1)), since both are the same loop;
 * in between, the fine grid shows the real continuous output, which a
 * discrete model cannot.
 */
export function stepSampledHybrid(
  plant: TF,
  K: number,
  T: number,
  tEnd: number,
  opts: { amplitude?: number; substeps?: number } = {},
): HybridResponse {
  const r = opts.amplitude ?? 1
  const sys = tf2ss(plant)
  const nSamples = Math.max(1, Math.ceil(tEnd / T - 1e-9))
  // enough points between samples for a smooth curve, ~3000 points in total
  const m = opts.substeps ?? Math.min(50, Math.max(2, Math.ceil(3000 / nSamples)))
  const h = T / m
  const { Phi, Gamma } = zohMatrices(sys, h)

  let x = new Array<number>(sys.A.length).fill(0)
  const res: HybridResponse = { t: [], y: [], u: [], tk: [], yk: [], ek: [], uk: [] }
  for (let k = 0; k <= nSamples; k++) {
    // sample: u = K(r − Cx − Du)  ⇒  u = K(r − Cx)/(1 + K·D)  (D = 0 for a strictly proper plant)
    const Cx = output(sys, x, 0)
    const u = (K * (r - Cx)) / (1 + K * sys.D)
    const yk = Cx + sys.D * u
    res.tk.push(k * T)
    res.yk.push(yk)
    res.ek.push(r - yk)
    res.uk.push(u)
    if (k === nSamples) {
      res.t.push(k * T)
      res.y.push(yk)
      res.u.push(u)
      break
    }
    for (let j = 0; j < m; j++) {
      res.t.push(k * T + j * h)
      res.y.push(output(sys, x, u))
      res.u.push(u)
      const Px = matVec(Phi, x)
      x = Px.map((v, i) => v + Gamma[i] * u)
    }
  }
  return res
}

/**
 * PID controller C(s) = kp + ki/s + kd·s = (kd s² + kp s + ki)/s.
 * MATLAB: tf(pid(kp, ki, kd))
 *
 * With ki = 0 there is no integrator, and MATLAB returns kd·s + kp (no /s):
 * keeping s/s would leave a pole and a zero at 0 in the closed loop, and
 * dcgain would be 0/0.
 */
export function pid(kp: number, ki: number, kd: number): TF {
  if (ki === 0) return kd === 0 ? { num: [kp], den: [1] } : { num: [kd, kp], den: [1] }
  return { num: [kd, kp, ki], den: [1, 0] }
}
