/**
 * Transfer functions, as in the Control System Toolbox:
 *   TF  = num(s)/den(s)        MATLAB: tf(num, den)
 *   TFz = num(z)/den(z), T     MATLAB: tf(num, den, T)
 * Coefficients in descending powers. Like MATLAB, nothing is simplified
 * (no pole/zero cancellation) unless asked.
 */
import type { Cplx } from './complex'
import { degree, polyAdd, polyMul, polyScale, polyval, roots, trimPoly, type Poly } from './polynomial'

export interface TF {
  num: Poly
  den: Poly
}

export interface TFz extends TF {
  /** sampling period (s) */
  T: number
}

type AnyTF = TF | TFz

/** MATLAB: tf(num, den) */
export function tf(num: readonly number[], den: readonly number[]): TF {
  if (trimPoly(den).every((c) => c === 0)) throw new Error('tf: zero denominator')
  return { num: trimPoly(num), den: trimPoly(den) }
}

/** MATLAB: tf(num, den, T) */
export function tfz(num: readonly number[], den: readonly number[], T: number): TFz {
  return { ...tf(num, den), T }
}

export function isDiscrete(G: AnyTF): G is TFz {
  return 'T' in G && typeof (G as TFz).T === 'number'
}

/** Same kind (and T) as G, with a new numerator and denominator. */
function like<G extends AnyTF>(G: G, num: Poly, den: Poly): G {
  return { ...G, num: trimPoly(num), den: trimPoly(den) }
}

function sameT(a: AnyTF, b: AnyTF): void {
  if (isDiscrete(a) !== isDiscrete(b) || (isDiscrete(a) && isDiscrete(b) && a.T !== b.T)) {
    throw new Error('incompatible systems (continuous/discrete or different T)')
  }
}

/** Divides num and den by den's leading coefficient (den monic), as MATLAB displays it. */
export function normalize<G extends AnyTF>(G: G): G {
  const d0 = G.den[0]
  return like(G, polyScale(G.num, 1 / d0), polyScale(G.den, 1 / d0))
}

/** K·G. MATLAB: K*G */
export function gain<G extends AnyTF>(K: number, G: G): G {
  return like(G, polyScale(G.num, K), G.den)
}

/** G1·G2 (blocks in cascade). MATLAB: series(G1, G2) or G1*G2 */
export function series<G extends AnyTF>(G1: G, G2: G): G {
  sameT(G1, G2)
  return like(G1, polyMul(G1.num, G2.num), polyMul(G1.den, G2.den))
}

/**
 * Closed loop G/(1 + G·H) (negative feedback, the default) or G/(1 − G·H).
 * MATLAB: feedback(G, H) / feedback(G, H, +1). H defaults to 1 (unity feedback).
 *
 *   num = nG·dH,  den = dG·dH ± nG·nH
 */
export function feedback<G extends AnyTF>(G: G, H: G | number = 1, sign: -1 | 1 = -1): G {
  const h: TF = typeof H === 'number' ? { num: [H], den: [1] } : H
  if (typeof H !== 'number') sameT(G, H)
  const num = polyMul(G.num, h.den)
  const den = polyAdd(polyMul(G.den, h.den), polyScale(polyMul(G.num, h.num), -sign))
  return like(G, num, den)
}

/**
 * Static gain: G(0) for a continuous system, G(1) for a discrete one.
 * MATLAB: dcgain(G). ±Infinity with a pole at s = 0 / z = 1, NaN for 0/0.
 */
export function dcgain(G: AnyTF): number {
  const x = isDiscrete(G) ? 1 : 0
  const n = polyval(G.num, x)
  const d = polyval(G.den, x)
  if (d === 0) return n === 0 ? NaN : n > 0 ? Infinity : -Infinity
  return n / d
}

/** MATLAB: pole(G) */
export function poles(G: AnyTF): Cplx[] {
  return roots(G.den)
}

/** MATLAB: zero(G) */
export function zeros(G: AnyTF): Cplx[] {
  if (trimPoly(G.num).every((c) => c === 0)) return []
  return roots(G.num)
}

/** Number of poles = degree of the denominator. MATLAB: order(G) */
export function order(G: AnyTF): number {
  return degree(G.den)
}

/** True when deg num ≤ deg den (a state-space realisation exists). */
export function isProper(G: AnyTF): boolean {
  return degree(G.num) <= degree(G.den)
}

/**
 * Stability from the poles: all Re(p) < 0 (continuous) or all |p| < 1
 * (discrete). `margin` > 0 when stable: −max Re(p), or 1 − max |p|.
 */
export function stabilityMargin(G: AnyTF): number {
  const p = poles(G)
  if (p.length === 0) return Infinity
  return isDiscrete(G) ? 1 - Math.max(...p.map((z) => Math.hypot(z.re, z.im))) : -Math.max(...p.map((z) => z.re))
}

export function isStable(G: AnyTF): boolean {
  return stabilityMargin(G) > 0
}

/** G(x) for a real x (s or z). */
export function evalTF(G: AnyTF, x: number): number {
  return polyval(G.num, x) / polyval(G.den, x)
}

