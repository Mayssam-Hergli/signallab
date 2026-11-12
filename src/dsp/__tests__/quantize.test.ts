import { describe, expect, it } from 'vitest'
import {
  meanPower,
  midRiseQuantize,
  quantizationError,
  quantizationReport,
  snrDb,
  snrSweep,
  theoreticalSnrDb,
} from '../quantize'
import { sample, sampleWithStep } from '../sampling'

describe('mid-rise quantizer on [-1, 1]', () => {
  it('outputs level centres and clamps the end points', () => {
    // N = 4 → q = 0.5, levels −0.75, −0.25, 0.25, 0.75
    expect(midRiseQuantize([-1, -0.6, -0.1, 0, 0.3, 0.9, 1], 4)).toEqual([
      -0.75, -0.75, -0.25, 0.25, 0.25, 0.75, 0.75,
    ])
  })

  it('error is bounded by q/2', () => {
    const x = Array.from({ length: 1000 }, (_, i) => -1 + (2 * i) / 999)
    const e = quantizationError(x, midRiseQuantize(x, 64))
    for (const v of e) expect(Math.abs(v)).toBeLessThanOrEqual(1 / 64 + 1e-15)
  })
})

describe('TP1 §1.3 quantization SNR (f0 = 1 kHz, tmax = 20 ms)', () => {
  // fc = 2·f0 = 2 kHz (Nyquist rate), fe = 2·fc = 4 kHz
  const fe = 4000
  const { x } = sample(1000, fe, 20e-3)

  it('fe = 4 kHz, N = 64: SNR = 33.06 dB', () => {
    expect(Math.abs(snrDb(x, midRiseQuantize(x, 64)) - 33.06)).toBeLessThanOrEqual(0.05)
  })

  it('fe = 4 kHz, N = 256: SNR = 45.10 dB', () => {
    expect(Math.abs(snrDb(x, midRiseQuantize(x, 256)) - 45.1)).toBeLessThanOrEqual(0.05)
  })

  it('theory 6.02·b + 1.76: 37.88 dB (N = 64) and 49.92 dB (N = 256)', () => {
    expect(theoreticalSnrDb(64)).toBeCloseTo(37.88, 10)
    expect(theoreticalSnrDb(256)).toBeCloseTo(49.92, 10)
  })

  it('fe = 4 kHz: samples are only 0, ±1 so |e| = q/2 always → error power q²/4 instead of q²/12', () => {
    const q = 2 / 64
    const e = quantizationError(x, midRiseQuantize(x, 64))
    for (const v of e) expect(Math.abs(Math.abs(v) - q / 2)).toBeLessThan(1e-12)
    // factor 3 on the noise power = 10·log10(3) ≈ 4.77 dB
    expect(10 * Math.log10(3)).toBeCloseTo(4.77, 2)
  })

  it('signal power is 40/81 (not 1/2): this adds the last 0.05 dB to the 4.77 dB gap', () => {
    expect(meanPower(x)).toBeCloseTo(40 / 81, 12)
    // 10·log10(3) + 10·log10(0.5 / (40/81)) = 4.771 + 0.054 = 4.825 dB
    const gap = theoreticalSnrDb(64) - snrDb(x, midRiseQuantize(x, 64))
    expect(Math.abs(gap - 4.82)).toBeLessThan(0.01)
  })

  it('quantizationReport at fe = 4 kHz: noise power is exactly 3·q²/12', () => {
    const r = quantizationReport(x, 64)
    expect(r.q).toBe(1 / 32)
    expect(r.bits).toBe(6)
    expect(r.noiseRatio).toBeCloseTo(3, 10)
    expect(r.snr).toBeCloseTo(snrDb(x, midRiseQuantize(x, 64)), 12)
    expect(r.gap).toBeCloseTo(r.snrTheory - r.snr, 12)
    expect(r.noiseExcessDb).toBeCloseTo(4.771, 3) // 10·log10(3)
    expect(r.signalDeficitDb).toBeCloseTo(0.054, 3) // 10·log10(0.5 / (40/81))
    // the two parts explain the gap up to the rounding of 6.02 / 1.76 in the formula
    expect(Math.abs(r.gap - r.noiseExcessDb - r.signalDeficitDb)).toBeLessThan(0.01)
  })

  it('snrSweep: gap stays ≈ 4.8 dB for every b at fe = 4 kHz', () => {
    for (const p of snrSweep(x, [1, 2, 4, 6, 8, 12])) {
      expect(p.N).toBe(2 ** p.bits)
      expect(Math.abs(p.theoretical - p.practical - 4.82)).toBeLessThan(0.02)
    }
  })

  it('dense signal (dt = 20 µs): SNR ≈ 36.06 dB (N = 64) and 49.41 dB (N = 256)', () => {
    const dense = sampleWithStep(1000, 20e-6, 20e-3).x
    expect(Math.abs(snrDb(dense, midRiseQuantize(dense, 64)) - 36.06)).toBeLessThanOrEqual(0.05)
    expect(Math.abs(snrDb(dense, midRiseQuantize(dense, 256)) - 49.41)).toBeLessThanOrEqual(0.05)
  })
})
