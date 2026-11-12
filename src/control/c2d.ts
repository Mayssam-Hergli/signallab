/**
 * Zero-order-hold discretisation: G(z) = (1 − z⁻¹)·Z{G(s)/s}, the plant seen
 * through the bloqueur d'ordre 0 B0(s) = (1 − e^{−Ts})/s.
 * MATLAB: c2d(G, T, 'zoh')
 */
import { expm, zeroMat, type Mat } from './matrix'
import { ss2tf, tf2ss, type SS } from './ss'
import { tfz, type TF, type TFz } from './tf'

/**
 * First-order plant k/(τs + 1), by hand:
 *   Z{ k/(s(τs+1)) } = k·z/(z−1) − k·z/(z − b),  b = e^{−T/τ}
 *   ⇒ G(z) = k(1 − b)/(z − b)
 * MATLAB: Gz_main = tf(k*(1-b), [1 -b], T)   (tp3_stabilite_precision.m)
 */
export function c2dFirstOrder(k: number, tau: number, T: number): TFz {
  const b = Math.exp(-T / tau)
  return tfz([k * (1 - b)], [1, -b], T)
}

/**
 * Exact discretisation of x' = Ax + Bu for an input held constant over each
 * step h (ZOH):  Φ = e^{Ah},  Γ = ∫₀ʰ e^{Aτ} dτ · B.
 * Both come from a single exponential of the augmented matrix
 *   expm([A B; 0 0]·h) = [Φ Γ; 0 1]   (Van Loan),
 * so A need not be invertible (integrators, e.g. the PID's 1/s).
 */
export function zohMatrices(sys: SS, h: number): { Phi: Mat; Gamma: number[] } {
  const n = sys.A.length
  if (n === 0) return { Phi: [], Gamma: [] }
  const M = zeroMat(n + 1, n + 1)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) M[i][j] = sys.A[i][j] * h
    M[i][n] = sys.B[i] * h
  }
  const E = expm(M)
  return { Phi: E.slice(0, n).map((row) => row.slice(0, n)), Gamma: E.slice(0, n).map((row) => row[n]) }
}

/**
 * Any proper G(s): tf → state space → (Φ, Γ) → G(z).
 * MATLAB: c2d(G, T, 'zoh')
 */
export function c2d(G: TF, T: number): TFz {
  const sys = tf2ss(G)
  const { Phi, Gamma } = zohMatrices(sys, T)
  const { num, den } = ss2tf({ A: Phi, B: Gamma, C: sys.C, D: sys.D })
  return tfz(num, den, T)
}

