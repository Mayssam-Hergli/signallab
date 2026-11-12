/**
 * State-space form, used to simulate and to discretise any proper TF:
 *   x' = A x + B u,  y = C x + D u      (continuous)
 *   x[k+1] = A x[k] + B u[k], y = C x + D u  (discrete)
 * Single input, single output.
 */
import { eye, matAdd, matMul, matScale, matVec, trace, type Mat } from './matrix'
import { polyAdd, polyScale, trimPoly, type Poly } from './polynomial'
import type { TF } from './tf'

export interface SS {
  A: Mat
  B: number[]
  C: number[]
  D: number
}

/**
 * Controllable canonical form, the one MATLAB's tf2ss returns:
 *   den = [1 a1 … an], num padded to [b0 b1 … bn]
 *   A = [−a1 … −an; I 0], B = e1, C_i = b_i − b0·a_i, D = b0
 * MATLAB: [A, B, C, D] = tf2ss(num, den)
 */
export function tf2ss(G: TF): SS {
  const den0 = trimPoly(G.den)
  const num0 = trimPoly(G.num)
  const n = den0.length - 1
  if (num0.length - 1 > n) throw new Error('tf2ss: improper transfer function (deg num > deg den)')
  const den = den0.map((c) => c / den0[0])
  const num = [...new Array<number>(n + 1 - num0.length).fill(0), ...num0.map((c) => c / den0[0])]
  const D = num[0]
  if (n === 0) return { A: [], B: [], C: [], D }
  const A: Mat = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === 0 ? -den[j + 1] : i === j + 1 ? 1 : 0)),
  )
  const B = Array.from({ length: n }, (_, i) => (i === 0 ? 1 : 0))
  const C = Array.from({ length: n }, (_, i) => num[i + 1] - D * den[i + 1])
  return { A, B, C, D }
}

/**
 * Back to a transfer function, by the Faddeev–LeVerrier recursion:
 *   det(λI − A) = λⁿ + c1 λⁿ⁻¹ + … + cn
 *   adj(λI − A) = Σ_{k=1..n} M_k λ^{n−k},  M_1 = I,  M_{k+1} = A M_k + c_k I
 * so  num(λ) = C·adj(λI − A)·B + D·den(λ).   MATLAB: [num, den] = ss2tf(A, B, C, D)
 */
export function ss2tf(sys: SS): { num: Poly; den: Poly } {
  const n = sys.A.length
  if (n === 0) return { num: [sys.D], den: [1] }
  const den: number[] = [1]
  const num: number[] = [0]
  let M = eye(n)
  for (let k = 1; k <= n; k++) {
    // coefficient of λ^{n−k} in C·adj·B comes from M_k
    const MB = matVec(M, sys.B)
    num.push(sys.C.reduce((s, ci, i) => s + ci * MB[i], 0))
    const AM = matMul(sys.A, M)
    const ck = -trace(AM) / k
    den.push(ck)
    M = matAdd(AM, matScale(eye(n), ck))
  }
  return { num: trimPoly(polyAdd(num, polyScale(den, sys.D))), den }
}

/** y = C x + D u */
export function output(sys: SS, x: readonly number[], u: number): number {
  return sys.C.reduce((s, c, i) => s + c * x[i], 0) + sys.D * u
}
