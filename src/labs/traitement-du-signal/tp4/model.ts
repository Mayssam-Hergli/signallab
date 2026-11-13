/**
 * TP4 transfer functions and their analysis, shared by the sections and the
 * tests. Polynomials are row vectors of coefficients in DESCENDING powers of z
 * (MATLAB's polynomial convention, as in the handout's H(z)); impz/freqz need
 * powers of z⁻¹, see alignToDen().
 */
import { cabs, polyMul, roots, trimPoly, type Cplx } from '../../../control'
import { alignToDen, cutoff3dB, freqzBA, impz, toDb, type FreqResponse } from '../../../dsp'

export const FILE = 'traitement-du-signal/tp4_filtres.m'

// ── Part I ────────────────────────────────────────────────────────────────
export const TE = 0.01 // MATLAB: Te = 0.01;
export const FE = 1 / TE
export const N_IMP = 30 // MATLAB: impz(Num1z, Den1, 30, 1/Te)
export const N_FREQ = 512 // MATLAB: freqz(Num1z, Den1, 512, 1/Te)

export interface Rational {
  num: number[]
  den: number[]
}

/** MATLAB: Num1 = [1 -0.3];  Den1 = [1 -1.3 0.7]; */
export const H1: Rational = { num: [1, -0.3], den: [1, -1.3, 0.7] }
/** MATLAB: Num2 = [1 0 -0.3];  Den2 = [1 -1.3 0.7 1.5]; */
export const H2: Rational = { num: [1, 0, -0.3], den: [1, -1.3, 0.7, 1.5] }

/** Largest |root|, 0 for none. */
export const maxModulus = (zs: readonly Cplx[]) => zs.reduce((m, z) => Math.max(m, cabs(z)), 0)

export interface Analysis {
  sys: Rational
  zeros: Cplx[]
  poles: Cplx[]
  /** max |pole| */
  rho: number
  /** every pole strictly inside the unit circle */
  stable: boolean
  /** numerator aligned to powers of z⁻¹ (MATLAB Num1z) */
  numz: number[]
  /** n = 0 … N−1, t = n·Te, h[n] */
  n: number[]
  t: number[]
  h: number[]
  /** h[n] with the raw numerator read in powers of z⁻¹ (the classic mistake) */
  hRaw: number[]
  freq: FreqResponse
  freqRaw: FreqResponse
}

/** Part I.3–I.5 for one transfer function in powers of z. */
export function analyse(given: Rational, nImp = N_IMP, nFreq = N_FREQ): Analysis {
  // leading zeros typed by the user ([0 0 1 -0.3]) do not change H, but would break the alignment
  const sys = { num: trimPoly(given.num), den: trimPoly(given.den) }
  const zeros = roots(sys.num) // MATLAB: zeros1 = roots(Num1)
  const poles = roots(sys.den) // MATLAB: poles1 = roots(Den1)
  const rho = maxModulus(poles)
  const numz = alignToDen(sys.num, sys.den)
  const n = Array.from({ length: nImp }, (_, i) => i)
  return {
    sys,
    zeros,
    poles,
    rho,
    stable: rho < 1 - 1e-12,
    numz,
    n,
    t: n.map((k) => k * TE),
    h: impz(numz, sys.den, nImp), // MATLAB: [h1, t1] = impz(Num1z, Den1, 30, 1/Te);
    hRaw: impz(sys.num, sys.den, nImp),
    freq: freqzBA(numz, sys.den, nFreq, FE), // MATLAB: [Hf1, f1] = freqz(Num1z, Den1, 512, 1/Te);
    freqRaw: freqzBA(sys.num, sys.den, nFreq, FE),
  }
}

// ── Dragging poles and zeros ──────────────────────────────────────────────

/**
 * One draggable root: a real root (stays on the real axis), or the upper
 * member of a conjugate pair (its mirror re − j·im moves with it, so the
 * coefficients stay real).
 */
export interface Handle {
  re: number
  im: number
  pair: boolean
}

/** Groups roots into handles: real roots, and one handle per conjugate pair. */
export function toHandles(zs: readonly Cplx[]): Handle[] {
  const out: Handle[] = []
  for (const z of zs) {
    if (Math.abs(z.im) < 1e-9) out.push({ re: z.re, im: 0, pair: false })
    else if (z.im > 0) out.push({ re: z.re, im: z.im, pair: true })
  }
  return out
}

/** Handles back to the full list of roots. */
export function fromHandles(hs: readonly Handle[]): Cplx[] {
  return hs.flatMap((h) => (h.pair ? [{ re: h.re, im: h.im }, { re: h.re, im: -h.im }] : [{ re: h.re, im: 0 }]))
}

/**
 * lead·Π(z − r) with real coefficients: (z − r) for a real root,
 * z² − 2·re·z + (re² + im²) for a pair.
 * MATLAB: lead*poly(r)
 */
export function polyFromHandles(hs: readonly Handle[], lead: number): number[] {
  let p = [lead]
  for (const h of hs) p = polyMul(p, h.pair ? [1, -2 * h.re, h.re * h.re + h.im * h.im] : [1, -h.re])
  return p
}

/** Leading coefficient of a polynomial (first non-zero). */
export const lead = (p: readonly number[]) => trimPoly(p)[0] ?? 0

// ── Custom coefficients ───────────────────────────────────────────────────

/**
 * Parses a MATLAB row vector typed by the user: "[1 -0.3]", "1, -0.3", "1 0 -0.3".
 * Returns the coefficients, or an error message in French.
 */
export function parseVector(text: string): { ok: true; v: number[] } | { ok: false; error: string } {
  const body = text.trim().replace(/^\[/, '').replace(/\]$/, '').trim()
  if (!body) return { ok: false, error: 'vecteur vide' }
  const parts = body.split(/[\s,;]+/).filter(Boolean)
  const v = parts.map(Number)
  const bad = parts.find((_, i) => !Number.isFinite(v[i]))
  if (bad !== undefined) return { ok: false, error: `« ${bad} » n'est pas un nombre` }
  if (v.length > 9) return { ok: false, error: 'au plus 9 coefficients (degré 8)' }
  return { ok: true, v }
}

/** Checks a custom H(z): non-zero polynomials, deg(Num) ≤ deg(Den) (causal). */
export function validate(num: readonly number[], den: readonly number[]): string | null {
  const n = trimPoly(num)
  const d = trimPoly(den)
  if (n.length === 1 && n[0] === 0) return 'le numérateur est nul'
  if (d.length === 1 && d[0] === 0) return 'le dénominateur est nul'
  if (d.length < 2) return 'le dénominateur doit être au moins de degré 1 (un pôle)'
  if (n.length > d.length) return 'deg(Num) > deg(Den) : H(z) n’est pas causal (impz demande deg Num ≤ deg Den)'
  return null
}

// ── Part II: low-pass IIR ─────────────────────────────────────────────────

/** MATLAB: b = [0.079 2*0.079 0.079]; */
export const B_IIR = [0.079, 2 * 0.079, 0.079]
/** MATLAB: a = [1 -1.2 0.516];  (the provided program: the correct, stable version) */
export const A_IIR = [1, -1.2, 0.516]
/** The booklet's denominator 0.516z² − 1.2z + 1 (unstable). */
export const A_BOOKLET = [0.516, -1.2, 1]
export const N_IIR = 32 // MATLAB: N = 32;
export const L_IIR = 256 // MATLAB: L = 256;

export interface IirAnalysis {
  a: number[]
  zeros: Cplx[]
  poles: Cplx[]
  rho: number
  stable: boolean
  h: number[]
  freq: FreqResponse
  db: number[]
  /** |H(0)| */
  dc: number
  /** largest |H| and where (ω/π) */
  peak: number
  peakW: number
  /** first ω (rad/sample) below |H(0)|/√2 */
  cutoff: number
}

/** II.1–II.3 for b = B_IIR and the given denominator (same degree: z or z⁻¹ read the same). */
export function analyseIir(a: readonly number[] = A_IIR, nImp = N_IIR, L = L_IIR): IirAnalysis {
  const freq = freqzBA(B_IIR, a, L) // MATLAB: [H, w] = freqz(b, a, L);
  let k = 0
  freq.mag.forEach((m, i) => {
    if (m > freq.mag[k]) k = i
  })
  const poles = roots(a)
  const rho = maxModulus(poles)
  return {
    a: [...a],
    zeros: roots(B_IIR),
    poles,
    rho,
    stable: rho < 1,
    h: impz(B_IIR, a, nImp), // MATLAB: h = impz(b, a, N);
    freq,
    db: toDb(freq.mag),
    dc: freq.mag[0],
    peak: freq.mag[k],
    peakW: freq.w[k] / Math.PI,
    cutoff: cutoff3dB(freq),
  }
}

// ── Bonus: filtering a two-tone test signal ───────────────────────────────

export const TEST_N = 200
export const TEST_RANGES = {
  w1: { min: 0.01, max: 0.25, step: 0.01 },
  w2: { min: 0.3, max: 1, step: 0.02 },
  a2: { min: 0, max: 2, step: 0.1 },
} as const
export const TEST_DEFAULT = { w1: 0.04, w2: 0.6, a2: 1 }

/** x[n] = cos(ω1·n) + A2·cos(ω2·n), ω in units of π rad/sample. */
export function testSignal(w1: number, w2: number, a2: number, N = TEST_N): number[] {
  return Array.from({ length: N }, (_, n) => Math.cos(Math.PI * w1 * n) + a2 * Math.cos(Math.PI * w2 * n))
}

/** |H| at ω (units of π), evaluated exactly (not read off the grid). */
export function gainAt(b: readonly number[], a: readonly number[], wOverPi: number): number {
  const w = Math.PI * wOverPi
  const ev = (c: readonly number[]) => {
    let re = 0
    let im = 0
    c.forEach((v, k) => {
      re += v * Math.cos(w * k)
      im -= v * Math.sin(w * k)
    })
    return Math.hypot(re, im)
  }
  return ev(b) / ev(a)
}

// ── Formatting ────────────────────────────────────────────────────────────

/** Coefficient for display: up to 4 decimals, trailing zeros removed, −0 → 0. */
export function coef(v: number): string {
  const s = Number(v.toFixed(4))
  return String(Object.is(s, -0) ? 0 : s)
}

/** LaTeX of a polynomial in descending powers of z: [1 -1.3 0.7] → "z^{2} - 1.3z + 0.7". */
export function polyLatex(p: readonly number[], v = 'z'): string {
  const q = trimPoly(p)
  const deg = q.length - 1
  const terms: string[] = []
  q.forEach((c, i) => {
    const k = deg - i
    const r = Number(c.toFixed(4))
    if (r === 0) return
    const mag = Math.abs(r)
    const pow = k === 0 ? '' : k === 1 ? v : `${v}^{${k}}`
    const num = mag === 1 && k > 0 ? '' : String(mag)
    const sign = r < 0 ? '-' : '+'
    terms.push(terms.length === 0 ? `${r < 0 ? '-' : ''}${num}${pow}` : ` ${sign} ${num}${pow}`)
  })
  return terms.join('') || '0'
}

/** "0.65 + 0.5268j" */
export function cplxStr(z: Cplx, digits = 4): string {
  const re = Number(z.re.toFixed(digits))
  const im = Number(z.im.toFixed(digits))
  if (Math.abs(im) === 0) return String(Object.is(re, -0) ? 0 : re)
  return `${re} ${im < 0 ? '−' : '+'} ${Math.abs(im)}j`
}
