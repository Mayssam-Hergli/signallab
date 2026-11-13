/**
 * TP3 reference values (PROMPT_TS_TP3_TP4.md, checked against tp3_tfd.m).
 */
import { describe, expect, it } from 'vitest'
import { abs, fft } from '../fft'
import {
  argmaxWhere,
  centredSpectrum,
  dtft,
  fftshift,
  isOnBin,
  nextPow2Exponent,
  sampleCount,
  sampleCountInclusive,
  sampledCosine,
  shiftedFrequencies,
  zeroPad,
} from '../dft'

const Fe = 1000
const at = (f: number[], hz: number) => {
  const i = f.findIndex((v) => Math.abs(v - hz) < 1e-9)
  if (i < 0) throw new Error(`no bin at ${hz} Hz`)
  return i
}

describe('fftshift / frequency axis', () => {
  it('even N: k = −N/2 … N/2−1, like MATLAB', () => {
    const X = fftshift({ re: [0, 1, 2, 3], im: [0, 0, 0, 0] })
    expect(X.re).toEqual([2, 3, 0, 1])
    expect(shiftedFrequencies(4, 4)).toEqual([-2, -1, 0, 1])
    expect(shiftedFrequencies(100, Fe)[0]).toBe(-500)
    expect(shiftedFrequencies(100, Fe)[99]).toBe(490)
  })
  it('odd N: f = 0 in the middle', () => {
    expect(fftshift({ re: [0, 1, 2, 3, 4], im: [0, 0, 0, 0, 0] }).re).toEqual([3, 4, 0, 1, 2])
    expect(shiftedFrequencies(5, 5)).toEqual([-2, -1, 0, 1, 2])
  })
  it('sample counts: 0:tmax·Fe−1 vs 0:Te:tmax', () => {
    expect(sampleCount(0.1, Fe)).toBe(100)
    expect(sampleCountInclusive(0.1, Fe)).toBe(101)
    expect(sampleCount(0.05, Fe)).toBe(50)
  })
})

describe('Q1–Q4: x1 = 3cos(2π·100·nTe), N = 100', () => {
  const x1 = sampledCosine({ N: 100, Fe, f0: 100, A: 3 })
  const { f, X } = centredSpectrum(x1, Fe)
  const mag = abs(X)

  it('peaks exactly at ±100 Hz, value 150 = N·A/2', () => {
    expect(mag[at(f, 100)]).toBeCloseTo(150, 9)
    expect(mag[at(f, -100)]).toBeCloseTo(150, 9)
    for (let i = 0; i < f.length; i++) if (Math.abs(Math.abs(f[i]) - 100) > 1) expect(mag[i]).toBeLessThan(1e-9)
  })
  it('imaginary part ≈ 0', () => {
    expect(Math.max(...X.im.map(Math.abs))).toBeLessThan(1e-9)
  })
  it('÷N gives 1.5; ×2 one-sided gives back A = 3', () => {
    expect((2 * mag[at(f, 100)]) / 100).toBeCloseTo(3, 9)
  })
  it('N = 101 (t = 0:Te:tmax): leakage, max |X1| ≈ 149.81', () => {
    const N = sampleCountInclusive(0.1, Fe)
    const s = centredSpectrum(sampledCosine({ N, Fe, f0: 100, A: 3 }), Fe)
    expect(Math.max(...abs(s.X))).toBeCloseTo(149.81, 2)
    // 100 Hz is no longer on a bin (Δf = 1000/101 ≈ 9.901 Hz)
    expect(isOnBin(100, Fe / N)).toBe(false)
  })
})

describe('Q5–Q6: x2 = 5 + x1', () => {
  const { f, X } = centredSpectrum(sampledCosine({ N: 100, Fe, f0: 100, A: 3, dc: 5 }), Fe)
  it('X2(0) = 500, |X2(±100)| = 150', () => {
    expect(X.re[at(f, 0)]).toBeCloseTo(500, 9)
    expect(abs(X)[at(f, 100)]).toBeCloseTo(150, 9)
    expect(abs(X)[at(f, -100)]).toBeCloseTo(150, 9)
  })
})

describe('Q7–Q8: x3 = 5 + cos(2π·100·nTe − π/3)', () => {
  const { f, X } = centredSpectrum(sampledCosine({ N: 100, Fe, f0: 100, phi: -Math.PI / 3, dc: 5 }), Fe)
  it('X3(+100) = 25 − 43.301j, X3(−100) = 25 + 43.301j', () => {
    const p = at(f, 100)
    const m = at(f, -100)
    expect(X.re[p]).toBeCloseTo(25, 6)
    expect(X.im[p]).toBeCloseTo(-43.301, 3)
    expect(X.re[m]).toBeCloseTo(25, 6)
    expect(X.im[m]).toBeCloseTo(43.301, 3)
    expect(abs(X)[p]).toBeCloseTo(50, 9) // amplitude unchanged by the delay
  })
})

describe('Q9–Q10: x4 = 5 + cos(2π·105·nTe)', () => {
  const peak = (tmax: number) => {
    const N = sampleCount(tmax, Fe)
    const { f, X } = centredSpectrum(sampledCosine({ N, Fe, f0: 105, dc: 5 }), Fe)
    const mag = abs(X)
    const i = argmaxWhere(f, mag, (v) => v > 50) // positive line, away from DC
    return { N, df: Fe / N, f: f[i], mag: mag[i] }
  }
  it('tmax 0.05: N 50, Δf 20, peak at 100 Hz ≈ 22.87', () => {
    const p = peak(0.05)
    expect([p.N, p.df, p.f]).toEqual([50, 20, 100])
    expect(p.mag).toBeCloseTo(22.87, 2)
  })
  it('tmax 0.1: Δf 10, peak at 110 Hz ≈ 32.47', () => {
    const p = peak(0.1)
    expect([p.df, p.f]).toEqual([10, 110])
    expect(p.mag).toBeCloseTo(32.47, 2)
  })
  it('tmax 0.2: Δf 5, one clean line at 105 Hz, |X| = 100', () => {
    const p = peak(0.2)
    expect([p.df, p.f]).toEqual([5, 105])
    expect(p.mag).toBeCloseTo(100, 9)
    expect(isOnBin(105, 5)).toBe(true)
    expect(isOnBin(105, 10)).toBe(false)
  })
  it('the FFT bins are the DTFT sampled at k·Fe/N', () => {
    const x = sampledCosine({ N: 50, Fe, f0: 105, dc: 5 })
    const f = shiftedFrequencies(50, Fe)
    const X = fftshift(fft(x))
    const D = dtft(x, f, Fe)
    for (let k = 0; k < 50; k++) {
      expect(D.re[k]).toBeCloseTo(X.re[k], 8)
      expect(D.im[k]).toBeCloseTo(X.im[k], 8)
    }
  })
})

describe('Q11–Q12: zero-padding', () => {
  it('nextPow2Exponent: first 2^p that exceeds N', () => {
    expect(nextPow2Exponent(50)).toBe(6)
    expect(nextPow2Exponent(64)).toBe(7) // "dépasse": strictly greater
    expect(nextPow2Exponent(1)).toBe(1)
  })
  it('padding keeps the samples and interpolates the same DTFT', () => {
    const x4 = sampledCosine({ N: 50, Fe, f0: 105, dc: 5 })
    const x5 = zeroPad(x4, 64)
    expect(x5.length).toBe(64)
    expect(x5.slice(0, 50)).toEqual(x4)
    expect(x5.slice(50).every((v) => v === 0)).toBe(true)
    const { f, X } = centredSpectrum(x5, Fe)
    const D = dtft(x4, f, Fe)
    for (let k = 0; k < 64; k++) expect(Math.hypot(X.re[k] - D.re[k], X.im[k] - D.im[k])).toBeLessThan(1e-9)
    expect(() => zeroPad(x4, 40)).toThrow()
  })
})
