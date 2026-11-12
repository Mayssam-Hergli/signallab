/**
 * Uniform (linear) mid-rise quantization (TP1 §1.3).
 * MATLAB reference: public/matlab/tp1_signaux_discrets.m, cell "%% 1.3".
 */

/**
 * Mid-rise uniform quantizer with N levels on [-A, A].
 *
 *   q   = 2A / N                          (quantization step)
 *   idx = clamp(floor((x + A)/q), 0, N-1)  (level index)
 *   xq  = -A + (idx + 0.5)·q              (centre of the level)
 *
 * Mid-rise means 0 is a decision threshold, not an output level: outputs are
 * ±q/2, ±3q/2, … The clamp keeps x = +A in the top level (idx = N-1).
 *
 * MATLAB: q   = 2*A/N;
 * MATLAB: idx = floor((xn + A)/q);            % numéro de l'intervalle (0 ... N)
 * MATLAB: idx = min(max(idx, 0), N-1);        % x = A exactement tombe dans le dernier niveau
 * MATLAB: xq  = -A + (idx + 0.5)*q;           % valeur au milieu de l'intervalle
 */
export function midRiseQuantize(x: readonly number[], N: number, A = 1): number[] {
  const q = (2 * A) / N
  return x.map((v) => {
    let idx = Math.floor((v + A) / q)
    idx = Math.min(Math.max(idx, 0), N - 1)
    return -A + (idx + 0.5) * q
  })
}

/** Quantization step. MATLAB: q = 2*A/N; */
export function quantizationStep(N: number, A = 1): number {
  return (2 * A) / N
}

/**
 * Quantization error.
 * MATLAB: e = xn - xq;                      % erreur (bruit) de quantification
 */
export function quantizationError(x: readonly number[], xq: readonly number[]): number[] {
  return x.map((v, i) => v - xq[i])
}

/** Mean power. MATLAB: mean(x.^2) */
export function meanPower(x: readonly number[]): number {
  if (x.length === 0) return 0
  let s = 0
  for (const v of x) s += v * v
  return s / x.length
}

/**
 * Measured ("practical") signal-to-quantization-noise ratio in dB.
 * MATLAB: RSB_pratique = 10*log10( mean(xn.^2) / mean(e.^2) );
 */
export function snrDb(x: readonly number[], xq: readonly number[]): number {
  return 10 * Math.log10(meanPower(x) / meanPower(quantizationError(x, xq)))
}

/**
 * Theoretical SNR of a full-scale sine with an N-level quantizer:
 *   SNR_th = 6.02·b + 1.76 dB,  b = log2(N)
 * It assumes the error is uniformly distributed on [-q/2, q/2] (power q²/12).
 *
 * MATLAB: b             = log2(N);            % nombre de bits
 * MATLAB: RSB_theorique = 6.02*b + 1.76;
 */
export function theoreticalSnrDb(N: number): number {
  const b = Math.log2(N)
  return 6.02 * b + 1.76
}

/** N = 2^b levels for b bits. */
export function bitsToLevels(b: number): number {
  return 2 ** b
}

export interface QuantizationReport {
  N: number
  bits: number
  /** step q = 2A/N */
  q: number
  xq: number[]
  e: number[]
  /** mean(x.^2) */
  signalPower: number
  /** mean(e.^2) */
  noisePower: number
  /** q²/12: noise power assumed by the theoretical formula (uniform error) */
  uniformNoisePower: number
  /** noisePower / (q²/12): 1 if the error were uniform, 3 when |e| = q/2 always */
  noiseRatio: number
  /** RSB_pratique (dB) */
  snr: number
  /** RSB_theorique (dB) */
  snrTheory: number
  /** RSB_theorique − RSB_pratique (dB) */
  gap: number
  /** 10·log10(noiseRatio): part of the gap due to the error not being uniform (4.77 dB when ratio = 3) */
  noiseExcessDb: number
  /** 10·log10((A²/2) / signalPower): part of the gap due to the signal power differing from A²/2 */
  signalDeficitDb: number
}

/**
 * Everything section 1.3 displays for one quantizer, in one place.
 * MATLAB (loop body of cell 1.3): q, idx, xq, e, RSB_pratique, b, RSB_theorique
 */
export function quantizationReport(x: readonly number[], N: number, A = 1): QuantizationReport {
  const q = quantizationStep(N, A)
  const xq = midRiseQuantize(x, N, A)
  const e = quantizationError(x, xq)
  const signalPower = meanPower(x)
  const noisePower = meanPower(e)
  const uniformNoisePower = (q * q) / 12
  const snr = 10 * Math.log10(signalPower / noisePower)
  const snrTheory = theoreticalSnrDb(N)
  const noiseRatio = noisePower / uniformNoisePower
  return {
    noiseExcessDb: 10 * Math.log10(noiseRatio),
    signalDeficitDb: 10 * Math.log10((A * A) / 2 / signalPower),
    N,
    bits: Math.log2(N),
    q,
    xq,
    e,
    signalPower,
    noisePower,
    uniformNoisePower,
    noiseRatio,
    snr,
    snrTheory,
    gap: snrTheory - snr,
  }
}

export interface SnrPoint {
  bits: number
  N: number
  practical: number
  theoretical: number
}

/** Practical and theoretical SNR for each number of bits (same signal x). */
export function snrSweep(x: readonly number[], bitsList: readonly number[], A = 1): SnrPoint[] {
  return bitsList.map((bits) => {
    const N = bitsToLevels(bits)
    return { bits, N, practical: snrDb(x, midRiseQuantize(x, N, A)), theoretical: theoreticalSnrDb(N) }
  })
}
