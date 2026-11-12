/**
 * TP3 systems and the closed forms of public/matlab/automatique/tp3_stabilite_precision.m.
 * Both parts are a first-order plant k/(τs + 1) behind a ZOH, with a
 * proportional digital controller C = K and unity feedback:
 *
 *   G(z) = k(1 − b)/(z − b),  b = e^{−T/τ}
 *   F(z) = K·G(z)/(1 + K·G(z)) = Kk(1 − b)/(z − b + Kk(1 − b))
 *   pole p = b − Kk(1 − b),  stable ⇔ −1 < p < 1 ⇔ 0 < K < (1 + b)/(k(1 − b))
 *   static error (step of height r) = r/(1 + kK), since G(1) = k
 */
import { c2dFirstOrder, feedback, gain, tf, type TF, type TFz } from '../../../control'

export interface FirstOrderPlant {
  k: number
  tau: number
}

/** Part II: G1(s) = 1/(s + 1). MATLAB: G1 = tf(1, [1 1]) */
export const PLANT_II: FirstOrderPlant = { k: 1, tau: 1 }
/** Part III, water tank: G1(s) = 12.5/(50s + 1). MATLAB: G1r = tf(12.5, [50 1]) */
export const PLANT_III: FirstOrderPlant = { k: 12.5, tau: 50 }

/** Values used by the .m file */
export const TP = {
  II: { T: 0.1, K: 1, tEnd: 5 },
  III: { T: 1, K: 1, consigne: 2, tEnd: 300, Tlist: [1, 5, 10, 50] },
  /** tank height (fascicule: « H est la hauteur de 20 m d'eau dans le réservoir ») */
  tankHeight: 20,
} as const

export const plantTF = (p: FirstOrderPlant): TF => tf([p.k], [p.tau, 1])

/** b = e^{−T/τ} (a in part II, b in part III of the .m file) */
export const pole0 = (p: FirstOrderPlant, T: number) => Math.exp(-T / p.tau)

/** G(z) = Z{B0·G1}. MATLAB: Gz = c2d(G1, T, 'zoh') */
export const Gz = (p: FirstOrderPlant, T: number): TFz => c2dFirstOrder(p.k, p.tau, T)

/** F(z). MATLAB: Fz = feedback(K*Gz, 1) */
export const Fz = (p: FirstOrderPlant, K: number, T: number): TFz => feedback(gain(K, Gz(p, T)), 1)

/** Closed-loop pole p = b − Kk(1 − b). MATLAB: pole(Fz) */
export function closedPole(p: FirstOrderPlant, K: number, T: number): number {
  const b = pole0(p, T)
  return b - K * p.k * (1 - b)
}

/** Limit gain (1 + b)/(k(1 − b)). MATLAB: Kmax = (1 + a)/(1 - a), Kmax_r = (1 + b)/(12.5*(1 - b)) */
export function kmax(p: FirstOrderPlant, T: number): number {
  const b = pole0(p, T)
  return (1 + b) / (p.k * (1 - b))
}

/** Final value of the output for a step of height r: r·kK/(1 + kK) */
export const finalValue = (p: FirstOrderPlant, K: number, r = 1) => (r * p.k * K) / (1 + p.k * K)

/** Static error r/(1 + kK). MATLAB: e_stat = consigne - consigne*dcgain(Fzr) */
export const staticError = (p: FirstOrderPlant, K: number, r = 1) => r / (1 + p.k * K)

/**
 * Smallest K giving a static error ≤ `rel` (relative to the setpoint):
 * 1/(1 + kK) ≤ rel ⇔ K ≥ (1 − rel)/(k·rel).
 * MATLAB: K_2pc = 0.98/(12.5*0.02)  → 3.92
 */
export const kForError = (p: FirstOrderPlant, rel: number) => (1 - rel) / (p.k * rel)
