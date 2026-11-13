/**
 * TP4 reference values (PROMPT_TS_TP3_TP4.md, checked against tp4_filtres.m).
 */
import { describe, expect, it } from 'vitest'
import { cabs, sortCplx } from '../../../../control'
import { alignToDen, filter, freqzBA, impz } from '../../../../dsp'
import {
  A_BOOKLET,
  analyse,
  analyseIir,
  fromHandles,
  H1,
  H2,
  parseVector,
  polyFromHandles,
  polyLatex,
  toHandles,
  validate,
} from '../model'

const close = (a: number, b: number, tol = 1e-4) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol)

describe('dsp/filters', () => {
  it('filter = difference equation, a(1) normalised', () => {
    // y[n] = 0.5 y[n-1] + x[n], scaled by a0 = 2
    expect(filter([2], [2, -1], [1, 0, 0])).toEqual([1, 0.5, 0.25])
  })
  it('alignToDen left-pads the numerator (MATLAB Num1z)', () => {
    expect(alignToDen([1, -0.3], [1, -1.3, 0.7])).toEqual([0, 1, -0.3])
    expect(() => alignToDen([1, 0, 0], [1, 2])).toThrow()
  })
  it('freqzBA: n points from 0 to fs/2 excluded', () => {
    const r = freqzBA([1], [1], 4, 100)
    expect(r.f).toEqual([0, 12.5, 25, 37.5])
    expect(r.mag).toEqual([1, 1, 1, 1])
  })
})

describe('H1 = (z − 0.3)/(z² − 1.3z + 0.7)', () => {
  const r = analyse(H1)
  it('zero 0.3; poles 0.65 ± 0.5268j, |p| = 0.8367, stable', () => {
    close(r.zeros[0].re, 0.3, 1e-12)
    const [p1, p2] = sortCplx(r.poles)
    close(p1.re, 0.65)
    close(Math.abs(p1.im), 0.5268)
    close(p2.im, -p1.im, 1e-12)
    close(r.rho, 0.8367)
    expect(r.stable).toBe(true)
  })
  it('impulse response in powers of z: 0, 1, 1, 0.6, 0.08, −0.316', () => {
    ;[0, 1, 1, 0.6, 0.08, -0.316].forEach((v, i) => close(r.h[i], v, 1e-12))
  })
  it('raw numerator read in z⁻¹ = z·H(z): one sample early', () => {
    for (let i = 0; i < 20; i++) close(r.hRaw[i], r.h[i + 1], 1e-12)
    // same magnitude, phase shifted by +ω
    for (let k = 0; k < 512; k += 37) close(r.freqRaw.mag[k], r.freq.mag[k], 1e-9)
  })
  it('frequency axis in Hz: 0 … Fe/2 = 50 Hz', () => {
    expect(r.freq.f[0]).toBe(0)
    close(r.freq.f[511], 50 * (511 / 512), 1e-9)
    // H(1) = 0.7/0.4 = 1.75 at f = 0
    close(r.freq.mag[0], 1.75, 1e-12)
  })
})

describe('H2 = (z² − 0.3)/(z³ − 1.3z² + 0.7z + 1.5)', () => {
  const r = analyse(H2)
  it('zeros ±0.5477', () => {
    const z = r.zeros.map((x) => x.re).sort((a, b) => a - b)
    close(z[0], -0.5477)
    close(z[1], 0.5477)
  })
  it('poles 1.0037 ± 1.0549j (|p| = 1.4561) and −0.7075: unstable', () => {
    const real = r.poles.find((p) => Math.abs(p.im) < 1e-9)!
    const cplx = r.poles.filter((p) => p.im > 1e-9)[0]
    close(real.re, -0.7075)
    close(cplx.re, 1.0037)
    close(cplx.im, 1.0549)
    close(cabs(cplx), 1.4561)
    expect(r.stable).toBe(false)
    // h diverges
    expect(Math.abs(r.h[29])).toBeGreaterThan(100)
  })
})

describe('II: low-pass IIR, b = [0.079 0.158 0.079], a = [1 −1.2 0.516]', () => {
  const r = analyseIir()
  it('zeros −1, −1; poles 0.6 ± 0.395j, |p| = 0.7183', () => {
    for (const z of r.zeros) close(z.re, -1, 1e-6)
    const p = r.poles.find((x) => x.im > 0)!
    close(p.re, 0.6)
    close(p.im, 0.395, 1e-3)
    close(r.rho, 0.7183)
    expect(r.stable).toBe(true)
  })
  it('h[0..4] = 0.079, 0.2528, 0.3416, 0.2795, 0.1591', () => {
    ;[0.079, 0.2528, 0.3416, 0.2795, 0.1591].forEach((v, i) => close(r.h[i], v))
    expect(r.h.length).toBe(32)
  })
  it('DC gain 1 (0 dB), peak ≈ 1.1224, −3 dB at ω ≈ 0.258π', () => {
    close(r.dc, 1, 1e-12)
    close(r.db[0], 0, 1e-10)
    close(r.peak, 1.1224, 2e-4)
    close(r.cutoff / Math.PI, 0.258, 1e-3)
  })
  it("the booklet's denominator 0.516z² − 1.2z + 1 is unstable, |p| = 1.39", () => {
    const b = analyseIir(A_BOOKLET)
    close(b.rho, 1.392, 1e-3)
    expect(b.stable).toBe(false)
  })
})

describe('handles (drag)', () => {
  it('conjugate pairs round-trip to the same polynomial', () => {
    const hs = toHandles(analyse(H2).poles)
    expect(hs.map((h) => h.pair).sort()).toEqual([false, true])
    expect(fromHandles(hs)).toHaveLength(3)
    polyFromHandles(hs, 1).forEach((c, i) => close(c, H2.den[i], 1e-9))
    polyFromHandles(toHandles(analyse(H1).zeros), 1).forEach((c, i) => close(c, H1.num[i], 1e-12))
  })
  it('a pair moved onto the real axis is a double real root', () => {
    expect(polyFromHandles([{ re: 0.5, im: 0, pair: true }], 2)).toEqual([2, -2, 0.5])
  })
})

describe('custom input', () => {
  it('parses MATLAB row vectors', () => {
    expect(parseVector('[1 -0.3]')).toEqual({ ok: true, v: [1, -0.3] })
    expect(parseVector('1, 0, -0.3')).toEqual({ ok: true, v: [1, 0, -0.3] })
    expect(parseVector('[1 a]').ok).toBe(false)
    expect(parseVector('  ').ok).toBe(false)
  })
  it('refuses non-causal or empty systems', () => {
    expect(validate([1, 0, 0], [1, 1])).toMatch(/causal/)
    expect(validate([0], [1, 1])).toMatch(/nul/)
    expect(validate([1], [3])).toMatch(/degré 1/)
    expect(validate([1, -0.3], [1, -1.3, 0.7])).toBeNull()
  })
  it('polyLatex', () => {
    expect(polyLatex([1, -1.3, 0.7])).toBe('z^{2} - 1.3z + 0.7')
    expect(polyLatex([1, 0, -0.3])).toBe('z^{2} - 0.3')
    expect(polyLatex([-1, 0.5])).toBe('-z + 0.5')
    expect(polyLatex([0.079, 0.158, 0.079])).toBe('0.079z^{2} + 0.158z + 0.079')
  })
  it('impz of the aligned numerator equals the long division of H(z)', () => {
    expect(impz([0, 1], [1, -0.5], 4)).toEqual([0, 1, 0.5, 0.25])
  })
})
