/**
 * Small dense matrices (n ≤ ~5 in the TPs) as arrays of rows, and the matrix
 * exponential. Just what state-space simulation and c2d need.
 */
export type Mat = number[][]

export function zeroMat(r: number, c: number): Mat {
  return Array.from({ length: r }, () => new Array<number>(c).fill(0))
}

export function eye(n: number): Mat {
  const I = zeroMat(n, n)
  for (let i = 0; i < n; i++) I[i][i] = 1
  return I
}

export function matAdd(A: Mat, B: Mat, kb = 1): Mat {
  return A.map((row, i) => row.map((v, j) => v + kb * B[i][j]))
}

export function matScale(A: Mat, k: number): Mat {
  return A.map((row) => row.map((v) => v * k))
}

export function matMul(A: Mat, B: Mat): Mat {
  const n = A.length
  const m = B[0]?.length ?? 0
  const p = B.length
  const C = zeroMat(n, m)
  for (let i = 0; i < n; i++)
    for (let k = 0; k < p; k++) {
      const a = A[i][k]
      if (a === 0) continue
      for (let j = 0; j < m; j++) C[i][j] += a * B[k][j]
    }
  return C
}

export function matVec(A: Mat, x: readonly number[]): number[] {
  return A.map((row) => row.reduce((s, v, j) => s + v * x[j], 0))
}

export function trace(A: Mat): number {
  return A.reduce((s, row, i) => s + row[i], 0)
}

/** Max absolute row sum (∞-norm). */
export function normInf(A: Mat): number {
  return Math.max(0, ...A.map((row) => row.reduce((s, v) => s + Math.abs(v), 0)))
}

/** Solves A·X = B by Gaussian elimination with partial pivoting. MATLAB: A \ B */
export function solve(A: Mat, B: Mat): Mat {
  const n = A.length
  const M = A.map((row, i) => [...row, ...B[i]])
  const w = M[0].length
  for (let col = 0; col < n; col++) {
    let piv = col
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r
    if (M[piv][col] === 0) throw new Error('solve: singular matrix')
    ;[M[col], M[piv]] = [M[piv], M[col]]
    for (let r = col + 1; r < n; r++) {
      const f = M[r][col] / M[col][col]
      if (f === 0) continue
      for (let c = col; c < w; c++) M[r][c] -= f * M[col][c]
    }
  }
  const X = zeroMat(n, w - n)
  for (let r = n - 1; r >= 0; r--)
    for (let c = 0; c < w - n; c++) {
      let s = M[r][n + c]
      for (let k = r + 1; k < n; k++) s -= M[r][k] * X[k][c]
      X[r][c] = s / M[r][r]
    }
  return X
}

/**
 * e^A by a (6,6) Padé approximant with scaling and squaring.
 * MATLAB: expm(A)
 *
 * A is first divided by 2^s so that ‖A/2^s‖ ≤ 0.5, where the Padé
 * approximant is accurate to machine precision, then the result is squared
 * s times. This stays accurate for stiff matrices (eigenvalues −22 and
 * −72 700 in the TP4 motor), where explicit Euler or RK4 on a coarse grid blow up.
 */
export function expm(A: Mat): Mat {
  const n = A.length
  if (n === 0) return []
  const norm = normInf(A)
  const s = norm > 0.5 ? Math.max(0, Math.ceil(Math.log2(norm / 0.5))) : 0
  const X = matScale(A, 2 ** -s)

  // Padé coefficients c_k = (2q−k)! q! / ((2q)! k! (q−k)!), q = 6
  const q = 6
  let c = 1
  let N = eye(n)
  let D = eye(n)
  let Xk = eye(n)
  for (let k = 1; k <= q; k++) {
    c = (c * (q - k + 1)) / (k * (2 * q - k + 1))
    Xk = matMul(Xk, X)
    N = matAdd(N, Xk, c)
    D = matAdd(D, Xk, k % 2 === 0 ? c : -c)
  }
  let E = solve(D, N)
  for (let k = 0; k < s; k++) E = matMul(E, E)
  return E
}
