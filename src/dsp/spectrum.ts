/**
 * Frequency response / spectrum of a finite sequence, like MATLAB's freqz.
 */
import { fft } from './fft'

export interface Spectrum {
  /** frequency axis in Hz, from 0 (included) to fs/2 (excluded) */
  f: number[]
  /** |X(e^{jω})| */
  mag: number[]
  /** real and imaginary parts, kept for phase plots if needed */
  re: number[]
  im: number[]
}

/**
 * DTFT of the finite sequence x on nPoints frequencies between 0 and fs/2:
 *   X(e^{jω}) = Σ_{m=0}^{L-1} x[m] e^{-jωm},   ω_k = π·k / nPoints,   f_k = k·fs/(2·nPoints)
 *
 * freqz(b, 1, n, fs) treats x as the coefficients of an FIR filter, so |H(f)| is
 * the Fourier transform of the sequence x[n]. Like MATLAB, we compute it as an
 * FFT of length 2n of the zero-padded sequence and keep the first n bins
 * (bin k of a 2n-point FFT is exactly the DTFT at ω = 2πk/(2n) = πk/n).
 * If the sequence is longer than 2n we fall back to the direct sum.
 *
 * The TP uses 4096 points (MATLAB's own default is 512):
 * MATLAB: [H, f] = freqz(xn, 1, 4096, fe);              % axe de 0 à fe/2
 * MATLAB: plot(f, abs(H));
 */
export function freqz(x: readonly number[], nPoints = 512, fs = 2 * Math.PI): Spectrum {
  const f = new Array<number>(nPoints)
  const mag = new Array<number>(nPoints)
  const re = new Array<number>(nPoints)
  const im = new Array<number>(nPoints)

  if (x.length <= 2 * nPoints) {
    // MATLAB: h = fft(b, 2*n); h = h(1:n);
    const H = fft(x as number[], 2 * nPoints)
    for (let k = 0; k < nPoints; k++) {
      re[k] = H.re[k]
      im[k] = H.im[k]
    }
  } else {
    for (let k = 0; k < nPoints; k++) {
      const w = (Math.PI * k) / nPoints
      let sr = 0
      let si = 0
      for (let m = 0; m < x.length; m++) {
        sr += x[m] * Math.cos(w * m)
        si -= x[m] * Math.sin(w * m)
      }
      re[k] = sr
      im[k] = si
    }
  }

  for (let k = 0; k < nPoints; k++) {
    // MATLAB: f = (0:n-1)*fs/(2*n);
    f[k] = (k * fs) / (2 * nPoints)
    mag[k] = Math.hypot(re[k], im[k])
  }
  return { f, mag, re, im }
}

/**
 * Frequency of the largest magnitude in a spectrum (first one on ties).
 * MATLAB: [~, i] = max(abs(H)); fpeak = f(i);
 */
export function peakFrequency(spec: Spectrum): number {
  let best = 0
  for (let k = 1; k < spec.mag.length; k++) if (spec.mag[k] > spec.mag[best]) best = k
  return spec.f[best]
}

/** Largest magnitude of a spectrum. MATLAB: max(abs(H)) */
export function peakMagnitude(spec: Spectrum): number {
  let best = 0
  for (const v of spec.mag) if (v > best) best = v
  return best
}
