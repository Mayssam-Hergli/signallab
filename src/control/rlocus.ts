/**
 * Root locus of the loop K·G with unity feedback: the closed-loop poles are
 * the roots of den(x) + K·num(x), for K ≥ 0.
 * MATLAB: rlocus(G)   (and pole(feedback(K*G, 1)) for one K)
 */
import { cabs, type Cplx } from './complex'
import { polyAdd, polyScale, roots } from './polynomial'
import { isDiscrete, type TF, type TFz } from './tf'

/** Closed-loop poles of feedback(K·G, 1). */
export function closedLoopPoles(G: TF | TFz, K: number): Cplx[] {
  return roots(polyAdd(G.den, polyScale(G.num, K)))
}

export interface LocusPoint {
  K: number
  poles: Cplx[]
}

/** Poles for each gain of the sweep. MATLAB: [r, k] = rlocus(G, Ks) */
export function rlocus(G: TF | TFz, Ks: readonly number[]): LocusPoint[] {
  return Ks.map((K) => ({ K, poles: closedLoopPoles(G, K) }))
}

/** Gains 0 … Kmax, n points, for drawing a locus. */
export function gainSweep(Kmax: number, n = 400): number[] {
  return Array.from({ length: n }, (_, i) => (Kmax * i) / (n - 1))
}

/**
 * > 0 when the closed loop is stable for this K:
 *   discrete: 1 − max|p|   (poles inside the unit circle)
 *   continuous: −max Re(p) (poles in the left half-plane)
 */
export function loopMargin(G: TF | TFz, K: number): number {
  const p = closedLoopPoles(G, K)
  if (p.length === 0) return Infinity
  return isDiscrete(G) ? 1 - Math.max(...p.map(cabs)) : -Math.max(...p.map((z) => z.re))
}

/**
 * Smallest K > 0 where a closed-loop pole leaves the stability region
 * (crosses |z| = 1, or Re(s) = 0): the "valeur limite de K" of the TP.
 * Scans K on a logarithmic grid up to Kceil, then bisects the first sign
 * change. Returns 0 if the loop is already unstable at K → 0⁺ and Infinity
 * if it stays stable up to Kceil.
 */
export function stabilityLimit(G: TF | TFz, Kceil = 1e6): number {
  const f = (K: number) => loopMargin(G, K)
  const n = 600
  let prevK = 1e-9
  if (f(prevK) <= 0) return 0
  for (let i = 1; i <= n; i++) {
    const K = 1e-9 * (Kceil / 1e-9) ** (i / n)
    if (f(K) <= 0) {
      let lo = prevK
      let hi = K
      for (let it = 0; it < 100; it++) {
        const mid = (lo + hi) / 2
        if (f(mid) > 0) lo = mid
        else hi = mid
      }
      return (lo + hi) / 2
    }
    prevK = K
  }
  return Infinity
}
