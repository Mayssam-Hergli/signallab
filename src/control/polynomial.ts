/**
 * Polynomials as coefficient arrays in MATLAB order (descending powers):
 *   [1 2 3]  ↔  s² + 2s + 3
 * The same convention as tf(num, den) in the Control System Toolbox.
 */
import { cabs, cadd, cdiv, cmul, csub, cx, type Cplx } from './complex'

export type Poly = number[]

/** Removes leading zeros (keeps at least one coefficient). */
export function trimPoly(p: readonly number[]): Poly {
  let i = 0
  while (i < p.length - 1 && p[i] === 0) i++
  return p.length ? p.slice(i) : [0]
}

/** Degree after trimming leading zeros (the zero polynomial has degree 0). */
export function degree(p: readonly number[]): number {
  return trimPoly(p).length - 1
}

/** p + q, right-aligned (constant terms added together). MATLAB: no built-in; [0 p] + q */
export function polyAdd(p: readonly number[], q: readonly number[]): Poly {
  const n = Math.max(p.length, q.length)
  const out = new Array<number>(n).fill(0)
  for (let i = 0; i < p.length; i++) out[n - p.length + i] += p[i]
  for (let i = 0; i < q.length; i++) out[n - q.length + i] += q[i]
  return trimPoly(out)
}

/** k·p. */
export function polyScale(p: readonly number[], k: number): Poly {
  return p.map((c) => c * k)
}

/** p·q. MATLAB: conv(p, q) */
export function polyMul(p: readonly number[], q: readonly number[]): Poly {
  const out = new Array<number>(p.length + q.length - 1).fill(0)
  for (let i = 0; i < p.length; i++) for (let j = 0; j < q.length; j++) out[i + j] += p[i] * q[j]
  return out
}

/** p(x) for real x, by Horner's rule. MATLAB: polyval(p, x) */
export function polyval(p: readonly number[], x: number): number {
  let y = 0
  for (const c of p) y = y * x + c
  return y
}

/** p(z) for complex z. MATLAB: polyval(p, z) */
export function polyvalC(p: readonly number[], z: Cplx): Cplx {
  let y = cx(0)
  for (const c of p) y = cadd(cmul(y, z), cx(c))
  return y
}

/**
 * Polynomial division p = q·d + r with deg r < deg d.
 * MATLAB: [q, r] = deconv(p, d)
 */
export function polyDiv(p: readonly number[], d: readonly number[]): { q: Poly; r: Poly } {
  const num = trimPoly(p)
  const den = trimPoly(d)
  if (den.length === 1 && den[0] === 0) throw new Error('polyDiv: division by zero polynomial')
  const rem = [...num]
  const nq = num.length - den.length + 1
  if (nq <= 0) return { q: [0], r: num }
  const q = new Array<number>(nq).fill(0)
  for (let i = 0; i < nq; i++) {
    const c = rem[i] / den[0]
    q[i] = c
    for (let j = 0; j < den.length; j++) rem[i + j] -= c * den[j]
  }
  return { q, r: trimPoly(rem.slice(nq)) }
}

/** Polynomial with the given real roots. MATLAB: poly(r) */
export function polyFromRoots(r: readonly number[]): Poly {
  return r.reduce<Poly>((acc, x) => polyMul(acc, [1, -x]), [1])
}

/** Roots of a·s² + b·s + c without cancellation (a ≠ 0). */
function quadraticRoots(a: number, b: number, c: number): Cplx[] {
  const disc = b * b - 4 * a * c
  if (disc >= 0) {
    // q = −(b + sign(b)·√Δ)/2: never subtracts two close numbers, so the small
    // root stays accurate when the roots are far apart (stiff systems).
    const q = -0.5 * (b + (b >= 0 ? 1 : -1) * Math.sqrt(disc))
    if (q === 0) return [cx(0), cx(0)]
    return [cx(q / a), cx(c / q)]
  }
  const re = -b / (2 * a)
  const im = Math.sqrt(-disc) / (2 * a)
  return [cx(re, -Math.abs(im)), cx(re, Math.abs(im))]
}

/**
 * All the roots of p, complex ones included. MATLAB: roots(p)
 *
 * - degree 1 and 2: closed form (exact, and stable for far-apart roots);
 * - higher degrees: Durand–Kerner (all roots refined simultaneously), then a
 *   few Newton steps on each root to polish it.
 * Roots at 0 (trailing zero coefficients) are taken out first.
 */
export function roots(p: readonly number[]): Cplx[] {
  let q = trimPoly(p)
  if (q.length === 1) return [] // constant: no root
  const zeros: Cplx[] = []
  while (q.length > 1 && q[q.length - 1] === 0) {
    zeros.push(cx(0))
    q = q.slice(0, -1)
  }
  const n = q.length - 1
  if (n === 0) return zeros
  const a = q.map((c) => c / q[0]) // monic
  if (n === 1) return [...zeros, cx(-a[1])]
  if (n === 2) return [...zeros, ...quadraticRoots(1, a[1], a[2])]

  // Cauchy bound: every root has |z| ≤ 1 + max|a_k|
  const R = 1 + Math.max(...a.slice(1).map(Math.abs))
  const seed = cx(0.4, 0.9) // not a root of unity, the usual DK start
  let z: Cplx[] = []
  let w = cx(R)
  for (let k = 0; k < n; k++) {
    z.push(w)
    w = cmul(w, seed)
  }
  for (let iter = 0; iter < 500; iter++) {
    let moved = 0
    const next = z.map((zi, i) => {
      let den = cx(1)
      for (let j = 0; j < n; j++) if (j !== i) den = cmul(den, csub(zi, z[j]))
      const step = cdiv(polyvalC(a, zi), den)
      moved = Math.max(moved, cabs(step) / Math.max(1, cabs(zi)))
      return csub(zi, step)
    })
    z = next
    if (moved < 1e-14) break
  }
  // Newton polish on the original polynomial
  const dp = a.slice(0, -1).map((c, i) => c * (n - i))
  z = z.map((zi) => {
    for (let k = 0; k < 3; k++) {
      const d = polyvalC(dp, zi)
      if (cabs(d) === 0) break
      zi = csub(zi, cdiv(polyvalC(a, zi), d))
    }
    // a real root found with a tiny imaginary residue: snap it to the axis
    if (Math.abs(zi.im) < 1e-10 * Math.max(1, Math.abs(zi.re))) zi = cx(zi.re)
    return zi
  })
  return [...zeros, ...z]
}
