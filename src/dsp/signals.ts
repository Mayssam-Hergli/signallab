/**
 * Basic signal generation and arithmetic on sampled signals.
 *
 * Signals are plain `number[]` so they can be passed straight to Plotly and
 * compared element by element with MATLAB output (copy/paste a MATLAB vector
 * into a test and compare).
 */

/** MATLAB's machine epsilon (`eps`), identical to JS Number.EPSILON. */
const EPS = Number.EPSILON

/**
 * MATLAB colon operator `a:d:b`.
 *
 * A naive `a + k*d` loop does NOT give the same vector as MATLAB: MATLAB
 * computes the number of points with a tolerance and builds the vector
 * symmetrically from both ends, so that e.g. `0:0.01:30` ends exactly on 30
 * and has 3001 points. This is a port of Cleve Moler's `colonop.m`, which
 * documents MATLAB's algorithm.
 *
 * MATLAB: t = a:d:b;
 */
export function range(a: number, d: number, b: number): number[] {
  if (d === 0 || !Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(d)) return []
  if ((d > 0 && a > b) || (d < 0 && a < b)) return [] // MATLAB returns an empty 1x0 vector

  const tol = 2.0 * EPS * Math.max(Math.abs(a), Math.abs(b))
  const sig = Math.sign(d)

  // n = number of intervals = length(v) - 1
  let n: number
  if (a === Math.floor(a) && d === 1) {
    n = Math.floor(b) - a // consecutive integers
  } else if (a === Math.floor(a) && d === Math.floor(d)) {
    const q = Math.floor(a / d) // integers with spacing > 1
    const r = a - q * d
    n = Math.floor((b - r) / d) - q
  } else {
    n = Math.round((b - a) / d) // general case
    if (sig * (a + n * d - b) > tol) n = n - 1
  }

  // last = right-hand end point, snapped to b when within tolerance
  let last = a + n * d
  if (sig * (last - b) > -tol) last = b

  // v is symmetric about its mid-point: first half from a, second half from last
  const v = new Array<number>(n + 1)
  for (let k = 0; k <= Math.floor(n / 2); k++) {
    v[k] = a + k * d
    v[n - k] = last - k * d
  }
  if (n % 2 === 0) v[n / 2] = (a + last) / 2
  return v
}

/**
 * MATLAB `linspace(a, b, n)`: n points, both end points included exactly.
 * MATLAB: t = linspace(a, b, n);
 */
export function linspace(a: number, b: number, n: number): number[] {
  if (n < 1) return []
  if (n === 1) return [b] // MATLAB returns b for n = 1
  const step = (b - a) / (n - 1)
  const v = new Array<number>(n)
  for (let k = 0; k < n; k++) v[k] = a + k * step
  v[n - 1] = b
  return v
}

/**
 * Sine of frequency f (Hz).
 * MATLAB: x = A*sin(2*pi*f*t + phi);
 */
export function sine(t: readonly number[], f: number, A = 1, phi = 0): number[] {
  return t.map((ti) => A * Math.sin(2 * Math.PI * f * ti + phi))
}

/**
 * Cosine of frequency f (Hz).
 * MATLAB: x = A*cos(2*pi*f*t + phi);
 */
export function cosine(t: readonly number[], f: number, A = 1, phi = 0): number[] {
  return t.map((ti) => A * Math.cos(2 * Math.PI * f * ti + phi))
}

/**
 * Cosine given by its period T (s), as written in TP1 §1.1 (T = 5 in the TP).
 * MATLAB: x_cos = cos(2*pi*t/5);
 */
export function cosPeriod(t: readonly number[], T: number): number[] {
  return t.map((ti) => Math.cos((2 * Math.PI * ti) / T))
}

/**
 * Square wave defined as the sign of a sine of period T (s). Values are
 * -1, 0 or +1 (0 only where sin is exactly 0, as with MATLAB's sign()). T = 3 in the TP.
 * MATLAB: x_car = sign(sin(2*pi*t/3));    % sign() renvoie +1, -1 (ou 0 quand sin = 0)
 */
export function squarePeriod(t: readonly number[], T: number): number[] {
  return t.map((ti) => Math.sign(Math.sin((2 * Math.PI * ti) / T)))
}

/**
 * Element-wise sum of two signals of the same length.
 * MATLAB: x_som = x_cos + x_car;
 */
export function add(a: readonly number[], b: readonly number[]): number[] {
  if (a.length !== b.length) {
    throw new Error(`add: lengths differ (${a.length} vs ${b.length})`)
  }
  return a.map((v, i) => v + b[i])
}

/** Greatest common divisor of two positive integers. MATLAB: gcd(a, b) */
export function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a))
  b = Math.abs(Math.round(b))
  while (b !== 0) [a, b] = [b, a % b]
  return a
}

/**
 * Least common multiple of two positive integers. The period of
 * x_cos + x_car (periods T1, T2 integers) is lcm(T1, T2).
 * MATLAB: T_som = lcm(5,3)                % pas de ';' -> MATLAB affiche 15
 */
export function lcm(a: number, b: number): number {
  if (a === 0 || b === 0) return 0
  return Math.abs(Math.round(a) * Math.round(b)) / gcd(a, b)
}

/** Largest |a[i] - b[i]|. MATLAB: max(abs(a - b)) */
export function maxAbsDiff(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length) {
    throw new Error(`maxAbsDiff: lengths differ (${a.length} vs ${b.length})`)
  }
  let m = 0
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i]))
  return m
}

/**
 * Multiplies every element by k (unit change for display, e.g. s → ms).
 * MATLAB: tc*1e3
 */
export function scale(x: readonly number[], k: number): number[] {
  return x.map((v) => v * k)
}

/** Sum of the elements. MATLAB: sum(x) */
export function sum(x: readonly number[]): number {
  let s = 0
  for (const v of x) s += v
  return s
}
