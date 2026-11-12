import { describe, expect, it } from 'vitest'
import { aliasFrequency, aliasSign, nyquistStatus, sample, sampleWithStep, sincReconstruct } from '../sampling'
import { freqz, peakFrequency } from '../spectrum'

const f0 = 1000
const tmax = 20e-3

describe('TP1 §1.2 sampling (f0 = 1 kHz, tmax = 20 ms)', () => {
  it.each([
    [4000, 81],
    [2000, 41],
    [1100, 23],
    [900, 19],
  ])('fe = %i Hz gives %i samples', (fe, n) => {
    expect(sample(f0, fe, tmax).x).toHaveLength(n)
  })

  it('"continuous" signal with dt = 20 µs has 1001 points', () => {
    expect(sampleWithStep(f0, 20e-6, tmax).t).toHaveLength(1001)
  })

  it('fe = 2 kHz: every sample falls on a zero crossing (|x[n]| < 1e-12)', () => {
    const { x } = sample(f0, 2000, tmax)
    for (const v of x) expect(Math.abs(v)).toBeLessThan(1e-12)
  })

  it('alias frequency |f0 − k·fe|', () => {
    expect(aliasFrequency(f0, 4000)).toBe(1000)
    expect(aliasFrequency(f0, 1100)).toBe(100)
    expect(aliasFrequency(f0, 900)).toBe(100)
    expect(aliasFrequency(f0, 2000)).toBe(1000)
  })

  it('alias sign: −sin(2π·100t) at 1.1 kHz, +sin(2π·100t) at 0.9 kHz', () => {
    expect(aliasSign(f0, 1100)).toBe(-1)
    expect(aliasSign(f0, 900)).toBe(1)
    for (const fe of [1100, 900]) {
      const s = sample(f0, fe, tmax)
      const sign = aliasSign(f0, fe)
      s.t.forEach((tn, i) => expect(s.x[i]).toBeCloseTo(sign * Math.sin(2 * Math.PI * 100 * tn), 9))
    }
  })

  it('Nyquist status', () => {
    expect(nyquistStatus(f0, 4000)).toBe('ok')
    expect(nyquistStatus(f0, 2000)).toBe('limit')
    expect(nyquistStatus(f0, 1100)).toBe('aliasing')
    expect(nyquistStatus(f0, 900)).toBe('aliasing')
  })
})

describe('TP1 §1.2 spectrum (freqz, 512 points, 0..fe/2)', () => {
  it('frequency axis is (0:n-1)*fs/(2n)', () => {
    const { f } = freqz([1, 2, 3], 512, 4000)
    expect(f).toHaveLength(512)
    expect(f[0]).toBe(0)
    expect(f[511]).toBeCloseTo((511 * 4000) / 1024, 9)
  })

  it('fe = 4 kHz: peak at 1000 Hz', () => {
    const { x } = sample(f0, 4000, tmax)
    expect(peakFrequency(freqz(x, 512, 4000))).toBeCloseTo(1000, 6)
  })

  it.each([1100, 900])('fe = %i Hz: peak at the 100 Hz alias (±5 Hz)', (fe) => {
    const { x } = sample(f0, fe, tmax)
    expect(Math.abs(peakFrequency(freqz(x, 512, fe)) - 100)).toBeLessThanOrEqual(5)
  })

  it('FFT-based freqz equals the direct DTFT sum', () => {
    const { x } = sample(f0, 1100, tmax)
    const n = 64
    const spec = freqz(x, n, 1100)
    for (let k = 0; k < n; k++) {
      const w = (Math.PI * k) / n
      let re = 0
      let im = 0
      x.forEach((v, m) => {
        re += v * Math.cos(w * m)
        im -= v * Math.sin(w * m)
      })
      expect(spec.mag[k]).toBeCloseTo(Math.hypot(re, im), 10)
    }
  })

  // the TP's .m file uses 4096 points
  it('TP settings (4096 points): peaks at 1000 / 100 / 100 Hz', () => {
    expect(Math.abs(peakFrequency(freqz(sample(f0, 4000, tmax).x, 4096, 4000)) - 1000)).toBeLessThan(1)
    for (const fe of [1100, 900]) {
      expect(Math.abs(peakFrequency(freqz(sample(f0, fe, tmax).x, 4096, fe)) - 100)).toBeLessThanOrEqual(5)
    }
  })

  it('spectrum of the "continuous" signal: freqz(xc, 1, 4096, 1/dt) peaks at 1 kHz', () => {
    const dt = 20e-6
    const { x } = sampleWithStep(f0, dt, tmax)
    const fs = 1 / dt
    // frequency grid step fs/8192 ≈ 6.1 Hz
    expect(Math.abs(peakFrequency(freqz(x, 4096, fs)) - 1000)).toBeLessThanOrEqual(fs / 8192)
  })

  it('freqz of a unit impulse is flat', () => {
    const { mag } = freqz([1], 16, 1)
    for (const v of mag) expect(v).toBeCloseTo(1, 12)
  })
})

describe('Shannon reconstruction', () => {
  it('passes through the samples', () => {
    const fe = 4000
    const s = sample(f0, fe, tmax)
    const xr = sincReconstruct(s.t, s.x, fe, s.t)
    for (let i = 0; i < s.x.length; i++) expect(xr[i]).toBeCloseTo(s.x[i], 9)
  })

  it('fe = 1.1 kHz: the samples describe a 100 Hz sine, not 1 kHz', () => {
    const fe = 1100
    const s = sample(f0, fe, tmax)
    // at the sample instants sin(2π·1000·nTe) = −sin(2π·100·nTe) exactly (aliasing)
    s.t.forEach((tn, i) => expect(s.x[i]).toBeCloseTo(-Math.sin(2 * Math.PI * 100 * tn), 9))
    // between two samples, mid-record, the reconstruction follows the 100 Hz alias
    const tMid = (s.t[11] + s.t[12]) / 2
    const [xr] = sincReconstruct(s.t, s.x, fe, [tMid])
    expect(Math.abs(xr + Math.sin(2 * Math.PI * 100 * tMid))).toBeLessThan(0.1)
  })
})
