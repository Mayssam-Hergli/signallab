/**
 * TP3 signals and spectra, shared by the sections and the slider tests.
 * Every value shown on the page comes from here (and src/dsp).
 */
import {
  abs,
  argmaxWhere,
  centredSpectrum,
  dtft,
  isOnBin,
  linspace,
  nextPow2Exponent,
  sampleCount,
  sampleCountInclusive,
  sampledCosine,
  zeroPad,
} from '../../../dsp'

export const FILE = 'traitement-du-signal/tp3_tfd.m'

export const FE = 1000 // MATLAB: Fe = 1000;  Te = 1/Fe;
export const TMAX = 0.1 // MATLAB: tmax = 0.1;
export const A1 = 3 // MATLAB: x1 = 3*cos(2*pi*100*n*Te);
export const F1 = 100
export const DC = 5 // MATLAB: x2 = 5 + x1;
export const PHI_TP = -Math.PI / 3 // MATLAB: x3 = 5 + cos(2*pi*100*n*Te - pi/3);
export const F4 = 105 // MATLAB: x4 = 5 + cos(2*pi*105*nk*Te);
export const TMAX_LIST = [0.05, 0.1, 0.2] // MATLAB: tmax_list = [0.05 0.1 0.2];
export const TMAX_Q11 = 0.05 // MATLAB: tmax = 0.05;

/** Slider ranges (tested over their whole span in __tests__/sliders.test.ts). */
export const RANGES = {
  dc: { min: 0, max: 10, step: 0.5 },
  phi: { min: -Math.PI, max: Math.PI, step: Math.PI / 36 },
  tmax: { min: 0.02, max: 0.5, step: 0.005 },
  /** padded length 2^p, p = 6 … 10 → 64 … 1024 */
  padExp: { min: 6, max: 10, step: 1 },
} as const

/** One record and its centred DFT, ready to plot. */
export interface DftView {
  N: number
  /** n = 0 … N−1 */
  n: number[]
  x: number[]
  /** f = (−N/2 : N/2−1)·Fe/N (odd N: −(N−1)/2 … (N−1)/2) */
  f: number[]
  re: number[]
  im: number[]
  mag: number[]
  /** Δf = Fe/N */
  df: number
  /** the values were divided by N */
  scaled: boolean
}

/**
 * MATLAB: X = fftshift(fft(x)); f = (-N/2:N/2-1)*Fe/N;
 * With `scaled`: MATLAB: abs(X)/N  (the TP's "bonnes amplitudes")
 */
export function dftView(x: number[], scaled: boolean, Fe = FE): DftView {
  const N = x.length
  const { f, X } = centredSpectrum(x, Fe)
  const k = scaled ? N : 1
  return {
    N,
    n: Array.from({ length: N }, (_, i) => i),
    x,
    f,
    re: X.re.map((v) => v / k),
    im: X.im.map((v) => v / k),
    mag: abs(X).map((v) => v / k),
    df: Fe / N,
    scaled,
  }
}

/** Value at frequency hz (bin closest to it). */
export function valueAt(v: DftView, key: 're' | 'im' | 'mag', hz: number): number {
  let best = 0
  for (let i = 1; i < v.f.length; i++) if (Math.abs(v.f[i] - hz) < Math.abs(v.f[best] - hz)) best = i
  return v[key][best]
}

/** Largest |value| of a series. */
export const maxAbs = (y: readonly number[]) => y.reduce((m, v) => Math.max(m, Math.abs(v)), 0)

/**
 * x1[n] = 3cos(2π·100·nTe) on N = tmax·Fe samples, or on t = 0:Te:tmax
 * (N = 101, tmax included) when `inclusive`.
 * MATLAB: n = 0:round(tmax*Fe)-1;  x1 = 3*cos(2*pi*100*n*Te);
 */
export function x1(inclusive = false): number[] {
  const N = inclusive ? sampleCountInclusive(TMAX, FE) : sampleCount(TMAX, FE)
  return sampledCosine({ N, Fe: FE, f0: F1, A: A1 })
}

/** MATLAB: x2 = 5 + x1;  (dc = 5 in the TP) */
export function x2(dc = DC): number[] {
  return x1().map((v) => dc + v)
}

/**
 * MATLAB: x3 = 5 + cos(2*pi*100*n*Te - pi/3);
 * φ = 0 gives the reference "5 + cos(2π·100·nTe)" (X2 with amplitude 1) used in the comparison.
 */
export function x3(phi = PHI_TP): number[] {
  return sampledCosine({ N: sampleCount(TMAX, FE), Fe: FE, f0: F1, phi, dc: DC })
}

/** MATLAB: Nk = round(tmax*Fe); nk = 0:Nk-1; x4 = 5 + cos(2*pi*105*nk*Te); */
export function x4(tmax: number): number[] {
  return sampledCosine({ N: sampleCount(tmax, FE), Fe: FE, f0: F4, dc: DC })
}

/** Q9–Q10: the FFT bins, the "true" spectrum of the record (DTFT) and where the line falls. */
export interface Resolution {
  tmax: number
  view: DftView
  /** dense frequency grid over [−Fe/2, Fe/2] and |DTFT|/N on it */
  fDense: number[]
  dense: number[]
  /** 105 Hz falls exactly on a bin */
  onBin: boolean
  /** 105/Δf */
  ratio: number
  /** positive-frequency bin with the largest |X|/N (away from DC) */
  peakF: number
  peakMag: number
}

export const DENSE_POINTS = 2001

export function resolution(tmax: number, densePoints = DENSE_POINTS): Resolution {
  const x = x4(tmax)
  const view = dftView(x, true)
  const N = view.N
  const fDense = linspace(-FE / 2, FE / 2, densePoints)
  const D = dtft(x, fDense, FE)
  const dense = D.re.map((r, i) => Math.hypot(r, D.im[i]) / N)
  const i = argmaxWhere(view.f, view.mag, (f) => f > F4 / 2)
  return {
    tmax,
    view,
    fDense,
    dense,
    onBin: isOnBin(F4, view.df),
    ratio: F4 / view.df,
    peakF: view.f[i],
    peakMag: view.mag[i],
  }
}

/** Q11–Q12: x4 on tmax = 0.05 s, padded with zeros to L = 2^p. */
export interface Padding {
  N: number
  /** MATLAB: p = puissance2(N); */
  p: number
  L: number
  x4: number[]
  x5: number[]
  /** |X4|/N on N points */
  X4: DftView
  /** f and |X5|/N on L points (divided by N, not L: the amplitudes stay those of x4) */
  f5: number[]
  mag5: number[]
  /** |DTFT of x4|/N on a dense grid (what the padded FFT converges to) */
  fDense: number[]
  dense: number[]
}

export function padding(L?: number): Padding {
  const N = sampleCount(TMAX_Q11, FE) // MATLAB: N = round(tmax*Fe);   % 50
  const p = nextPow2Exponent(N)
  const len = L ?? 2 ** p
  const xs = x4(TMAX_Q11)
  const x5 = zeroPad(xs, len) // MATLAB: x5 = [x4 zeros(1, 2^p - N)];
  const s5 = centredSpectrum(x5, FE)
  // finer than any padded FFT on the slider (Fe/1024 ≈ 0.98 Hz): 0.125 Hz, cheap for N = 50
  const fDense = linspace(-FE / 2, FE / 2, 8001)
  const D = dtft(xs, fDense, FE)
  return {
    N,
    p,
    L: len,
    x4: xs,
    x5,
    X4: dftView(xs, true),
    f5: s5.f,
    mag5: abs(s5.X).map((v) => v / N), // MATLAB: abs(fftshift(fft(x5)))/N
    fDense,
    dense: D.re.map((r, i) => Math.hypot(r, D.im[i]) / N),
  }
}

/** φ in multiples of π, for labels: −π/3 → "−π/3", 0 → "0". */
export function piLabel(phi: number): string {
  const k = phi / Math.PI
  if (Math.abs(k) < 1e-9) return '0'
  // the slider moves by π/36: try small denominators first
  for (const d of [1, 2, 3, 4, 6, 12, 18, 36]) {
    const num = Math.round(k * d)
    if (Math.abs(num / d - k) < 1e-9) {
      const sign = num < 0 ? '−' : ''
      const a = Math.abs(num)
      const top = a === 1 ? 'π' : `${a}π`
      return d === 1 ? `${sign}${top}` : `${sign}${top}/${d}`
    }
  }
  return `${k.toFixed(3).replace(/^-/, '−')}π`
}

/** Rounding noise (|v| < 1e-9) shown as 0, so readouts never print "−0.00". */
export const clean = (v: number) => (Math.abs(v) < 1e-9 ? 0 : v)

/** Largest value of y where fmin < |f| < fmax (0 if none): the height a figure must show. */
export function bandMax(f: readonly number[], y: readonly number[], fmin: number, fmax = Infinity): number {
  let best = 0
  for (let i = 0; i < f.length; i++) {
    const a = Math.abs(f[i])
    if (a > fmin && a < fmax && y[i] > best) best = y[i]
  }
  return best
}

/** Axis top: `min` (0.6), or the next multiple of 0.2 above v·1.08 when v does not fit. */
export const niceTop = (v: number, min = 0.6) => Math.max(min, Math.ceil(v * 1.08 * 5) / 5)
