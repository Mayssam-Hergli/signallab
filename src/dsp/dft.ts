/**
 * Discrete Fourier transform helpers for TP 3 (TFD et visualisation spectrale):
 * centred spectrum (fftshift), its frequency axis, the "true" spectrum of the
 * finite record (DTFT), zero-padding and the radix-2 length.
 */
import { fft, type Complex } from './fft'

/**
 * Moves the zero-frequency bin to the centre, like MATLAB's fftshift for a
 * vector: circshift(X, floor(N/2)). For even N the order becomes
 * k = −N/2 … N/2−1; for odd N, k = −(N−1)/2 … (N−1)/2.
 * MATLAB: X1 = fftshift(fft(x1));
 */
export function fftshift(X: Complex): Complex {
  const N = X.re.length
  const s = Math.floor(N / 2)
  const re = new Array<number>(N)
  const im = new Array<number>(N)
  for (let i = 0; i < N; i++) {
    const src = (i - s + N) % N
    re[i] = X.re[src]
    im[i] = X.im[src]
  }
  return { re, im }
}

/**
 * Frequency (Hz) of each bin after fftshift: (i − floor(N/2))·Fe/N.
 * For even N this is the TP's axis
 * MATLAB: f = (-N/2:N/2-1)*Fe/N;
 * For odd N, the TP's formula would give half-integer bins (−50.5 … 49.5 for
 * N = 101), which do not match fftshift; the correct axis is
 * (−(N−1)/2 : (N−1)/2)·Fe/N.
 */
export function shiftedFrequencies(N: number, Fe: number): number[] {
  const s = Math.floor(N / 2)
  return Array.from({ length: N }, (_, i) => ((i - s) * Fe) / N)
}

/** Centred spectrum of a real record: frequency axis + fftshift(fft(x)). */
export interface CentredSpectrum {
  f: number[]
  X: Complex
}

/**
 * MATLAB: X = fftshift(fft(x)); f = (-N/2:N/2-1)*Fe/N;
 * If L > length(x), x is zero-padded to L first (MATLAB: fft(x, L)).
 */
export function centredSpectrum(x: readonly number[], Fe: number, L = x.length): CentredSpectrum {
  return { f: shiftedFrequencies(L, Fe), X: fftshift(fft(x as number[], L)) }
}

/** MATLAB: imag(X) */
export function imag(X: Complex): number[] {
  return [...X.im]
}

/** MATLAB: X / N (complex vector divided by a real number) */
export function divide(X: Complex, k: number): Complex {
  return { re: X.re.map((v) => v / k), im: X.im.map((v) => v / k) }
}

/**
 * Samples of A·cos(2π·f0·n·Te + φ) + dc for n = 0 … N−1, with Te = 1/Fe.
 * MATLAB: x3 = 5 + cos(2*pi*100*n*Te - pi/3);
 */
export function sampledCosine(o: { N: number; Fe: number; f0: number; A?: number; phi?: number; dc?: number }): number[] {
  const { N, Fe, f0, A = 1, phi = 0, dc = 0 } = o
  return Array.from({ length: N }, (_, n) => dc + A * Math.cos((2 * Math.PI * f0 * n) / Fe + phi))
}

/**
 * Number of samples in [0, tmax[ at Fe: n = 0 : tmax·Fe − 1.
 * round() absorbs the floating-point error of tmax·Fe (0.1·1000 = 100.00000000000001).
 * MATLAB: n = 0:round(tmax*Fe)-1;
 */
export function sampleCount(tmax: number, Fe: number): number {
  return Math.round(tmax * Fe)
}

/**
 * Number of samples of t = 0:Te:tmax (tmax included): one more than above.
 * MATLAB: t = 0:Te:tmax;   % N = 101 pour tmax = 0.1 s
 */
export function sampleCountInclusive(tmax: number, Fe: number): number {
  return Math.round(tmax * Fe) + 1
}

/**
 * Discrete-time Fourier transform of the finite record x, at any frequency f (Hz):
 *   X(f) = Σ_{n=0}^{N−1} x[n] e^{−j2π f n / Fe}
 * The FFT bins are exactly this function sampled at f = k·Fe/N.
 */
export function dtft(x: readonly number[], freqs: readonly number[], Fe: number): Complex {
  const re = new Array<number>(freqs.length)
  const im = new Array<number>(freqs.length)
  for (let k = 0; k < freqs.length; k++) {
    // e^{−jwn} by recurrence (one cos/sin per frequency instead of N)
    const w = (2 * Math.PI * freqs[k]) / Fe
    const cw = Math.cos(w)
    const sw = Math.sin(w)
    let c = 1
    let s = 0
    let sr = 0
    let si = 0
    for (let n = 0; n < x.length; n++) {
      sr += x[n] * c
      si -= x[n] * s
      const c2 = c * cw - s * sw
      s = s * cw + c * sw
      c = c2
    }
    re[k] = sr
    im[k] = si
  }
  return { re, im }
}

/**
 * Smallest p such that 2^p is the first value that exceeds N (strictly):
 * 50 → 6 (64), 64 → 7 (128). This follows the handout ("2^p est la première
 * valeur qui dépasse le nombre d'échantillons N") and the .m function; it
 * differs from MATLAB's nextpow2 only when N is already a power of two.
 * MATLAB: p = puissance2(N);
 */
export function nextPow2Exponent(N: number): number {
  let p = 0
  // MATLAB: while 2^p <= N, p = p + 1; end
  while (2 ** p <= N) p++
  return p
}

/** MATLAB: x5 = [x4 zeros(1, L - N)]; */
export function zeroPad(x: readonly number[], L: number): number[] {
  if (L < x.length) throw new Error(`zeroPad: L = ${L} < length(x) = ${x.length}`)
  return [...x, ...new Array<number>(L - x.length).fill(0)]
}

/** True when f is an integer multiple of the bin spacing df (to 1e-9 relative). */
export function isOnBin(f: number, df: number): boolean {
  const k = f / df
  return Math.abs(k - Math.round(k)) < 1e-9 * Math.max(1, Math.abs(k))
}

/** Index of the largest value of y among the points where `keep(x)` holds (−1 if none). */
export function argmaxWhere(x: readonly number[], y: readonly number[], keep: (v: number) => boolean): number {
  let best = -1
  for (let i = 0; i < y.length; i++) if (keep(x[i]) && (best < 0 || y[i] > y[best])) best = i
  return best
}
