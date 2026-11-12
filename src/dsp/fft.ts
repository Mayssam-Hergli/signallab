/**
 * FFT / IFFT for complex sequences, with MATLAB's fft(x, n) semantics.
 *
 * Sizes in the TPs are small (10, 29, …), so:
 *  - power-of-two lengths use an iterative radix-2 Cooley–Tukey FFT;
 *  - any other length uses the plain O(n²) DFT, which is exact enough
 *    (errors ~1e-15) and keeps the length equal to MATLAB's (no hidden padding).
 */

/** Complex vector stored as two parallel arrays (re[k] + j·im[k]). */
export interface Complex {
  re: number[]
  im: number[]
}

/** Wraps a real vector as complex (imaginary part 0). */
export function toComplex(x: readonly number[]): Complex {
  return { re: [...x], im: new Array<number>(x.length).fill(0) }
}

/** MATLAB: real(X) */
export function real(X: Complex): number[] {
  return [...X.re]
}

/** MATLAB: abs(X) */
export function abs(X: Complex): number[] {
  return X.re.map((r, k) => Math.hypot(r, X.im[k]))
}

/** Element-wise product. MATLAB: A .* B */
export function multiply(A: Complex, B: Complex): Complex {
  if (A.re.length !== B.re.length) {
    throw new Error(`multiply: lengths differ (${A.re.length} vs ${B.re.length})`)
  }
  const n = A.re.length
  const re = new Array<number>(n)
  const im = new Array<number>(n)
  for (let k = 0; k < n; k++) {
    re[k] = A.re[k] * B.re[k] - A.im[k] * B.im[k]
    im[k] = A.re[k] * B.im[k] + A.im[k] * B.re[k]
  }
  return { re, im }
}

const isPowerOfTwo = (n: number) => n > 0 && (n & (n - 1)) === 0

/**
 * Pads with zeros or truncates to length n, like MATLAB's fft(x, n).
 */
function resize(X: Complex, n: number): Complex {
  const re = new Array<number>(n).fill(0)
  const im = new Array<number>(n).fill(0)
  const m = Math.min(n, X.re.length)
  for (let k = 0; k < m; k++) {
    re[k] = X.re[k]
    im[k] = X.im[k]
  }
  return { re, im }
}

/** sign = -1 for the forward transform, +1 for the inverse (unscaled). */
function dft(X: Complex, sign: 1 | -1): Complex {
  const n = X.re.length
  const re = new Array<number>(n).fill(0)
  const im = new Array<number>(n).fill(0)
  for (let k = 0; k < n; k++) {
    let sr = 0
    let si = 0
    for (let m = 0; m < n; m++) {
      // reduce k·m modulo n before multiplying by 2π/n: keeps the angle small
      // and the twiddle factors accurate.
      const a = (sign * 2 * Math.PI * ((k * m) % n)) / n
      const c = Math.cos(a)
      const s = Math.sin(a)
      sr += X.re[m] * c - X.im[m] * s
      si += X.re[m] * s + X.im[m] * c
    }
    re[k] = sr
    im[k] = si
  }
  return { re, im }
}

function radix2(X: Complex, sign: 1 | -1): Complex {
  const n = X.re.length
  const re = [...X.re]
  const im = [...X.im]
  // bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      ;[re[i], re[j]] = [re[j], re[i]]
      ;[im[i], im[j]] = [im[j], im[i]]
    }
  }
  // butterflies
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < half; k++) {
        const a = (sign * 2 * Math.PI * k) / len
        const wr = Math.cos(a)
        const wi = Math.sin(a)
        const ur = re[i + k]
        const ui = im[i + k]
        const vr = re[i + k + half] * wr - im[i + k + half] * wi
        const vi = re[i + k + half] * wi + im[i + k + half] * wr
        re[i + k] = ur + vr
        im[i + k] = ui + vi
        re[i + k + half] = ur - vr
        im[i + k + half] = ui - vi
      }
    }
  }
  return { re, im }
}

function transform(x: readonly number[] | Complex, n: number | undefined, sign: 1 | -1): Complex {
  const X = Array.isArray(x) ? toComplex(x as number[]) : (x as Complex)
  const len = n ?? X.re.length
  const Y = resize(X, len)
  if (len === 0) return Y
  return isPowerOfTwo(len) ? radix2(Y, sign) : dft(Y, sign)
}

/**
 * Discrete Fourier transform X[k] = Σ_m x[m] e^{-j2πkm/n}.
 * If n is given, x is zero-padded or truncated to n first.
 * MATLAB: X = fft(x, n);
 */
export function fft(x: readonly number[] | Complex, n?: number): Complex {
  return transform(x, n, -1)
}

/**
 * Inverse DFT x[m] = (1/n) Σ_k X[k] e^{+j2πkm/n}.
 * MATLAB: x = ifft(X, n);
 */
export function ifft(X: readonly number[] | Complex, n?: number): Complex {
  const Y = transform(X, n, 1)
  const len = Y.re.length
  return { re: Y.re.map((v) => v / len), im: Y.im.map((v) => v / len) }
}
