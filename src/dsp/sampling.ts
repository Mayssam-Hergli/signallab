/**
 * Sampling of a sine (TP1 §1.2) and Shannon reconstruction.
 * MATLAB reference: public/matlab/traitement-du-signal/tp1_signaux_discrets.m, cell "%% 1.2".
 */
import { range } from './signals'

export interface SampledSignal {
  /** sample instants (s) */
  t: number[]
  /** sample values */
  x: number[]
}

/**
 * Sine of frequency f0 evaluated on the grid 0:dt:tmax.
 * With dt = 20 µs this is the TP's "continuous" signal.
 *
 * MATLAB: tc = 0:dt:tmax;
 * MATLAB: xc = sin(2*pi*f0*tc);
 */
export function sampleWithStep(f0: number, dt: number, tmax: number): SampledSignal {
  const t = range(0, dt, tmax)
  const x = t.map((ti) => Math.sin(2 * Math.PI * f0 * ti))
  return { t, x }
}

/**
 * Samples a sine of frequency f0 (Hz) at fe (Hz) from 0 to tmax (s).
 *
 * MATLAB: n  = 0:1/fe:tmax;      % instants d'échantillonnage nTe
 * MATLAB: xn = sin(2*pi*f0*n);   % x[n] = x(nTe)
 */
export function sample(f0: number, fe: number, tmax: number): SampledSignal {
  return sampleWithStep(f0, 1 / fe, tmax)
}

/**
 * Apparent (alias) frequency of a sine of frequency f0 sampled at fe:
 * fa = |f0 - k·fe| with k the integer closest to f0/fe, so that fa ∈ [0, fe/2].
 * Example: f0 = 1000, fe = 1100 → k = 1 → fa = 100 Hz.
 */
export function aliasFrequency(f0: number, fe: number): number {
  const k = Math.round(f0 / fe)
  return Math.abs(f0 - k * fe)
}

/** Integer k used by aliasFrequency (useful to print "|f0 − k·fe|"). */
export function aliasOrder(f0: number, fe: number): number {
  return Math.round(f0 / fe)
}

/**
 * Sign of the alias: at the sample instants, sin(2π f0 nTe) = s · sin(2π fa nTe)
 * with s = +1 when f0 − k·fe ≥ 0 and s = −1 otherwise.
 * fe = 1100 Hz: f0 − fe = −100 → s = −1 (the samples follow −sin(2π·100 t)).
 * fe =  900 Hz: f0 − fe = +100 → s = +1 (the samples follow +sin(2π·100 t)).
 */
export function aliasSign(f0: number, fe: number): 1 | -1 {
  return f0 - aliasOrder(f0, fe) * fe >= 0 ? 1 : -1
}

export type NyquistStatus = 'ok' | 'limit' | 'aliasing'

/**
 * Shannon condition: fe > 2 f0 → ok, fe = 2 f0 → limit case, fe < 2 f0 → aliasing.
 * `relTol` absorbs slider rounding (e.g. 1999.9999 Hz is treated as 2 kHz).
 */
export function nyquistStatus(f0: number, fe: number, relTol = 1e-9): NyquistStatus {
  const diff = fe - 2 * f0
  if (Math.abs(diff) <= relTol * 2 * f0) return 'limit'
  return diff > 0 ? 'ok' : 'aliasing'
}

/** Normalised sinc: sin(πu)/(πu), sinc(0) = 1. MATLAB: sinc(u) */
export function sinc(u: number): number {
  if (u === 0) return 1
  const pu = Math.PI * u
  return Math.sin(pu) / pu
}

/**
 * Shannon (ideal low-pass) reconstruction from samples taken at fe:
 *   x_r(t) = Σ_n x[n] · sinc(fe·(t − n·Te))
 * With a finite number of samples this is only an approximation (edge effects
 * near 0 and tmax), but it shows which sine the samples actually describe:
 * when fe < 2 f0 it is the alias at |f0 − k·fe|, not f0.
 * (Not in the TP's .m file — a bonus of the dashboard.)
 *
 * Equivalent MATLAB: xr = xn * sinc(fe*(tc - n.'));
 */
export function sincReconstruct(
  sampleTimes: readonly number[],
  samples: readonly number[],
  fe: number,
  t: readonly number[],
): number[] {
  return t.map((ti) => {
    let acc = 0
    for (let n = 0; n < samples.length; n++) acc += samples[n] * sinc(fe * (ti - sampleTimes[n]))
    return acc
  })
}
