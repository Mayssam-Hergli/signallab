/**
 * Linear and circular convolution (TP2), computed directly and through the FFT.
 *
 * Indexing: arrays are 0-based, so x[0] is MATLAB's x(1). In the comments,
 * MATLAB lines use MATLAB's 1-based indexing.
 */
import { fft, ifft, multiply, real } from './fft'

/**
 * Linear convolution by "flip and slide", the way it is done by hand and in the
 * TP's MATLAB loop: flip g, pad x with M-1 zeros on each side, then for each
 * output index slide the flipped g along x and sum the products.
 *
 *   y(n) = Σ_m x(m) · g(n − m),   n = 0 … N+M−2,   length(y) = N+M−1
 */
export function convLinear(x: readonly number[], g: readonly number[]): number[] {
  const N = x.length
  const M = g.length
  if (N === 0 || M === 0) return []

  // MATLAB: gg = fliplr(g);
  const gg = [...g].reverse()

  // MATLAB: xx = [zeros(1,M-1) x zeros(1,M-1)];
  const xx = [...new Array<number>(M - 1).fill(0), ...x, ...new Array<number>(M - 1).fill(0)]

  // MATLAB: for n = 1:N+M-1
  // MATLAB:     y(n) = sum(xx(n:n+M-1) .* gg);
  // MATLAB: end
  const y = new Array<number>(N + M - 1)
  for (let n = 0; n < N + M - 1; n++) {
    let acc = 0
    for (let k = 0; k < M; k++) acc += xx[n + k] * gg[k]
    y[n] = acc
  }
  return y
}

/** One frame of the convolution animator: everything needed to draw step n. */
export interface ConvStep {
  /** output index currently computed */
  n: number
  /** common horizontal axis m = -(M-1) … N+M-2 */
  m: number[]
  /** x(m) on that axis (0 outside 0…N-1) */
  x: number[]
  /** g(n − m): g flipped and shifted by n (0 outside the support) */
  gShifted: number[]
  /** x(m)·g(n − m) */
  products: number[]
  /** true where both x(m) and g(n−m) are inside their supports */
  overlap: boolean[]
  /** y(n) = Σ products */
  value: number
}

/**
 * Computes step n of the flip-and-slide convolution on a fixed axis wide enough
 * to show every shift. Independent of convLinear (written with explicit indices)
 * so the two can be checked against each other.
 * This is the data shown at each `pause` of the TP's MATLAB animation loop.
 */
export function convStep(x: readonly number[], g: readonly number[], n: number): ConvStep {
  const N = x.length
  const M = g.length
  const mMin = -(M - 1)
  const mMax = N + M - 2
  const m: number[] = []
  const xs: number[] = []
  const gs: number[] = []
  const products: number[] = []
  const overlap: boolean[] = []
  let value = 0
  for (let k = mMin; k <= mMax; k++) {
    const inX = k >= 0 && k < N
    const j = n - k // index into g
    const inG = j >= 0 && j < M
    const xv = inX ? x[k] : 0
    const gv = inG ? g[j] : 0
    m.push(k)
    xs.push(xv)
    gs.push(gv)
    products.push(xv * gv)
    overlap.push(inX && inG)
    value += xv * gv
  }
  return { n, m, x: xs, gShifted: gs, products, overlap, value }
}

/**
 * Wraps a sequence onto L points (time-domain aliasing): out[k mod L] += x[k].
 * For length(x) ≤ L this is plain zero-padding to L.
 */
export function wrapToLength(x: readonly number[], L: number): number[] {
  const out = new Array<number>(L).fill(0)
  for (let k = 0; k < x.length; k++) out[k % L] += x[k]
  return out
}

/**
 * L-point circular convolution, direct formula:
 *   y(m) = Σ_{n=0}^{L-1} x(n) · g((m − n) mod L),   m = 0 … L−1
 * L defaults to max(N, M). Shorter sequences are zero-padded to L; longer ones
 * are wrapped modulo L (same result as MATLAB's cconv(x, g, L)).
 *
 * MATLAB: for m = 0:L-1
 * MATLAB:     for n = 0:L-1
 * MATLAB:         y(m+1) = y(m+1) + x(n+1)*g(mod(m-n, L)+1);
 * MATLAB:     end
 * MATLAB: end
 */
export function convCircular(x: readonly number[], g: readonly number[], L?: number): number[] {
  const len = L ?? Math.max(x.length, g.length)
  if (len <= 0) return []
  const xp = wrapToLength(x, len)
  const gp = wrapToLength(g, len)
  const y = new Array<number>(len).fill(0)
  for (let m = 0; m < len; m++) {
    let acc = 0
    for (let n = 0; n < len; n++) {
      // ((a % b) + b) % b is the mathematical modulo (JS % keeps the sign of a)
      acc += xp[n] * gp[(((m - n) % len) + len) % len]
    }
    y[m] = acc
  }
  return y
}

/**
 * Linear convolution through the FFT: zero-pad both sequences to N+M−1 so the
 * circular convolution computed by the FFT equals the linear one.
 *
 * MATLAB: x1 = [x zeros(1, M-1)];
 * MATLAB: g1 = [g zeros(1, N-1)];
 * MATLAB: y  = real(ifft(fft(x1) .* fft(g1)));
 */
export function convViaFFT(x: readonly number[], g: readonly number[]): number[] {
  const N = x.length
  const M = g.length
  if (N === 0 || M === 0) return []
  const L = N + M - 1
  const x1 = [...x, ...new Array<number>(M - 1).fill(0)]
  const g1 = [...g, ...new Array<number>(N - 1).fill(0)]
  return real(ifft(multiply(fft(x1, L), fft(g1, L))))
}

/**
 * L-point circular convolution through the FFT (no zero-padding beyond L).
 * L defaults to max(N, M); sequences longer than L are wrapped first, so the
 * result always equals convCircular(x, g, L).
 *
 * MATLAB: y = real(ifft(fft(x) .* fft(g)));
 */
export function circConvViaFFT(x: readonly number[], g: readonly number[], L?: number): number[] {
  const len = L ?? Math.max(x.length, g.length)
  if (len <= 0) return []
  const xp = wrapToLength(x, len)
  const gp = wrapToLength(g, len)
  return real(ifft(multiply(fft(xp), fft(gp))))
}

/**
 * Linear convolution straight from the definition, the way MATLAB's conv()
 * defines it (used for the "écart avec conv()" check of A.4):
 *   y(n) = Σ_{m=0}^{N-1} x(m) · g(n − m),  0 ≤ n − m ≤ M − 1
 */
export function convDefinition(x: readonly number[], g: readonly number[]): number[] {
  const N = x.length
  const M = g.length
  if (N === 0 || M === 0) return []
  const y = new Array<number>(N + M - 1).fill(0)
  for (let n = 0; n < N + M - 1; n++) {
    for (let m = Math.max(0, n - M + 1); m <= Math.min(n, N - 1); m++) y[n] += x[m] * g[n - m]
  }
  return y
}

/** e^{a·n} for n = 0 … len−1. MATLAB: exp(a*(0:len-1)) */
export function expSequence(a: number, len: number): number[] {
  return Array.from({ length: len }, (_, n) => Math.exp(a * n))
}

/**
 * TP2 A.6, closed form of f * h with f(n) = e^{0.1n} (0 ≤ n < Nf) and
 * h(n) = e^{−0.1n} (0 ≤ n < Mh):
 *   y(n) = e^{−0.1n} Σ_{m=a}^{b} e^{0.2m} = e^{−0.1n} (e^{0.2(b+1)} − e^{0.2a}) / (e^{0.2} − 1)
 *   a = max(0, n − Mh + 1),  b = min(n, Nf − 1)
 *
 * MATLAB: y_ana(n+1) = exp(-0.1*n) * (exp(0.2*(b+1)) - exp(0.2*a)) / (exp(0.2) - 1);
 */
export function expConvLinearAnalytic(Nf: number, Mh: number): number[] {
  const L = Nf + Mh - 1
  const y = new Array<number>(L)
  for (let n = 0; n < L; n++) {
    const a = Math.max(0, n - Mh + 1)
    const b = Math.min(n, Nf - 1)
    y[n] = (Math.exp(-0.1 * n) * (Math.exp(0.2 * (b + 1)) - Math.exp(0.2 * a))) / (Math.exp(0.2) - 1)
  }
  return y
}

/**
 * TP2 B.6, closed form of the N-point circular convolution of f(n) = e^{0.1n}
 * and h(n) = e^{−0.1n} (0 ≤ n < N). Splitting the sum where (m − n) mod N
 * wraps around (n ≤ m: m − n ; n > m: m − n + N):
 *   y(m) = e^{−0.1m} Σ_{n=0}^{m} e^{0.2n} + e^{−0.1(m+N)} Σ_{n=m+1}^{N−1} e^{0.2n}
 *        = [e^{−0.1m}(e^{0.2(m+1)} − 1) + e^{−0.1(m+N)}(e^{0.2N} − e^{0.2(m+1)})] / (e^{0.2} − 1)
 * For N = 3 it gives the TP's values 1 + e^{−0.1} + e^{0.1} (m = 0, 1) and
 * 1 + e^{−0.2} + e^{0.2} (m = 2).
 */
export function expConvCircularAnalytic(N: number): number[] {
  const d = Math.exp(0.2) - 1
  return Array.from({ length: N }, (_, m) => {
    const head = Math.exp(-0.1 * m) * (Math.exp(0.2 * (m + 1)) - 1)
    const tail = Math.exp(-0.1 * (m + N)) * (Math.exp(0.2 * N) - Math.exp(0.2 * (m + 1)))
    return (head + tail) / d
  })
}

/** One position m of the circular convolution: what the ring shows. */
export interface CircStep {
  m: number
  /** x(n), n = 0 … N−1 */
  x: number[]
  /** g((m − n) mod N): g flipped and turned by m */
  gTurned: number[]
  /** x(n) · g((m − n) mod N) */
  products: number[]
  /** y(m) = Σ products */
  value: number
}

/**
 * Step m of the N-point circular convolution (N = length(x); g is wrapped or
 * zero-padded to N like in convCircular).
 * MATLAB (conv_circulaire): y(m+1) = y(m+1) + x(n+1) * g(mod(m-n, N) + 1);
 */
export function circStep(x: readonly number[], g: readonly number[], m: number): CircStep {
  const N = x.length
  const gp = wrapToLength(g, N)
  const gTurned = x.map((_, n) => gp[(((m - n) % N) + N) % N])
  const products = x.map((v, n) => v * gTurned[n])
  return { m, x: [...x], gTurned, products, value: products.reduce((s, v) => s + v, 0) }
}
