/**
 * Digital filters given by their coefficients b (numerator) and a
 * (denominator), with MATLAB's convention for filter / impz / freqz / zplane:
 * the vectors hold the coefficients of powers of z⁻¹,
 *   H(z) = (b0 + b1 z⁻¹ + … + bM z⁻ᴹ) / (a0 + a1 z⁻¹ + … + aN z⁻ᴺ).
 * A transfer function written in powers of z (TP4 part I) must first be
 * aligned with alignToDen().
 */

/**
 * Difference equation a0·y[n] = Σ b_k x[n−k] − Σ_{k≥1} a_k y[n−k], zero initial state.
 * MATLAB: y = filter(b, a, x);
 */
export function filter(b: readonly number[], a: readonly number[], x: readonly number[]): number[] {
  if (a.length === 0 || a[0] === 0) throw new Error('filter: a(1) must be non-zero')
  const a0 = a[0]
  const y = new Array<number>(x.length)
  for (let n = 0; n < x.length; n++) {
    let acc = 0
    for (let k = 0; k < b.length && k <= n; k++) acc += b[k] * x[n - k]
    for (let k = 1; k < a.length && k <= n; k++) acc -= a[k] * y[n - k]
    y[n] = acc / a0
  }
  return y
}

/**
 * First N samples of the impulse response.
 * MATLAB: h = impz(b, a, N);
 */
export function impz(b: readonly number[], a: readonly number[], N: number): number[] {
  const d = new Array<number>(N).fill(0)
  if (N > 0) d[0] = 1
  return filter(b, a, d)
}

/**
 * Numerator of H(z) written in powers of z, left-padded with zeros to the
 * length of the denominator, so that impz/freqz (which read powers of z⁻¹)
 * see the same H. Dividing num(z) and den(z) by z^deg(den) is what this does.
 * MATLAB: Num1z = [zeros(1, length(Den1)-length(Num1)) Num1];
 */
export function alignToDen(num: readonly number[], den: readonly number[]): number[] {
  if (num.length > den.length) throw new Error('alignToDen: deg(Num) > deg(Den), H(z) is not causal')
  return [...new Array<number>(den.length - num.length).fill(0), ...num]
}

export interface FreqResponse {
  /** ω in rad/sample, 0 … π(1 − 1/n) */
  w: number[]
  /** f = ω·fs/(2π) */
  f: number[]
  re: number[]
  im: number[]
  mag: number[]
  /** MATLAB angle(): in (−π, π] */
  phase: number[]
}

/** Σ c_k e^{−jωk} (coefficients in powers of z⁻¹ evaluated on the unit circle) */
function evalInvZ(c: readonly number[], w: number): [number, number] {
  let re = 0
  let im = 0
  for (let k = 0; k < c.length; k++) {
    re += c[k] * Math.cos(w * k)
    im -= c[k] * Math.sin(w * k)
  }
  return [re, im]
}

/**
 * Frequency response on n points ω_k = π·k/n, k = 0 … n−1 (MATLAB's default
 * half-circle grid). With fs, f_k = ω_k·fs/(2π) runs from 0 to fs/2.
 * A pole on the unit circle gives |H| = ∞ there: those points are NaN.
 * MATLAB: [H, w] = freqz(b, a, n);   [H, f] = freqz(b, a, n, fs);
 */
export function freqzBA(b: readonly number[], a: readonly number[], n = 512, fs = 2 * Math.PI): FreqResponse {
  const out: FreqResponse = { w: [], f: [], re: [], im: [], mag: [], phase: [] }
  for (let k = 0; k < n; k++) {
    const w = (Math.PI * k) / n
    const [br, bi] = evalInvZ(b, w)
    const [ar, ai] = evalInvZ(a, w)
    const d = ar * ar + ai * ai
    const re = d === 0 ? NaN : (br * ar + bi * ai) / d
    const im = d === 0 ? NaN : (bi * ar - br * ai) / d
    out.w.push(w)
    out.f.push((w * fs) / (2 * Math.PI))
    out.re.push(re)
    out.im.push(im)
    out.mag.push(Math.hypot(re, im))
    out.phase.push(Math.atan2(im, re))
  }
  return out
}

/**
 * First ω where |H| falls below |H(0)|/√2 (−3 dB from the DC gain), or NaN.
 * MATLAB: w(find(abs(H) < abs(H(1))/sqrt(2), 1))
 */
export function cutoff3dB(r: FreqResponse): number {
  const lim = r.mag[0] / Math.SQRT2
  const i = r.mag.findIndex((m) => m < lim)
  return i < 0 ? NaN : r.w[i]
}

/** MATLAB: 20*log10(abs(H)) */
export const toDb = (mag: readonly number[]) => mag.map((m) => 20 * Math.log10(m))
