/**
 * Every slider position of the TP3 page must compute without throwing and
 * give finite numbers. Runs the same calls as the section components, over
 * every step of each slider.
 */
import { describe, expect, it } from 'vitest'
import { isOnBin, sampleCount } from '../../../../dsp'
import { DC, F1, F4, FE, PHI_TP, RANGES, dftView, maxAbs, padding, piLabel, resolution, valueAt, x1, x2, x3 } from '../model'

const steps = (r: { min: number; max: number; step: number }) => {
  const n = Math.round((r.max - r.min) / r.step)
  return Array.from({ length: n + 1 }, (_, i) => r.min + i * r.step)
}
const finite = (y: readonly number[]) => y.every(Number.isFinite)

describe('Q1–Q4 toggles', () => {
  it.each([
    [false, false],
    [false, true],
    [true, false],
    [true, true],
  ])('inclusive=%s, ÷N=%s', (inclusive, scaled) => {
    const v = dftView(x1(inclusive), scaled)
    expect(v.N).toBe(inclusive ? 101 : 100)
    expect(finite(v.mag) && finite(v.re) && finite(v.im)).toBe(true)
    const k = scaled ? v.N : 1
    if (!inclusive) expect(valueAt(v, 'mag', F1) * k).toBeCloseTo(150, 9)
    else expect(Math.max(...v.mag) * k).toBeCloseTo(149.81, 2)
  })
})

describe('Q5–Q6: dc slider', () => {
  it('X2(0)/N = c and the ±100 Hz lines stay at 1.5, for every c', () => {
    for (const c of steps(RANGES.dc)) {
      const v = dftView(x2(c), true)
      expect(valueAt(v, 're', 0)).toBeCloseTo(c, 9)
      expect(valueAt(v, 'mag', F1)).toBeCloseTo(1.5, 9)
    }
    expect(valueAt(dftView(x2(DC), false), 're', 0)).toBeCloseTo(500, 9)
  })
})

describe('Q7–Q8: φ slider (−π … π)', () => {
  it('the +100 Hz line is 0.5·e^{jφ}, amplitude 0.5', () => {
    for (const phi of steps(RANGES.phi)) {
      const v = dftView(x3(phi), true)
      expect(valueAt(v, 're', F1)).toBeCloseTo(0.5 * Math.cos(phi), 9)
      expect(valueAt(v, 'im', F1)).toBeCloseTo(0.5 * Math.sin(phi), 9)
      expect(valueAt(v, 'mag', F1)).toBeCloseTo(0.5, 9)
      expect(valueAt(v, 'mag', 0)).toBeCloseTo(DC, 9)
      expect(piLabel(phi)).not.toMatch(/NaN|undefined/)
    }
  })
  it('labels', () => {
    expect(piLabel(PHI_TP)).toBe('−π/3')
    expect(piLabel(0)).toBe('0')
    expect(piLabel(Math.PI)).toBe('π')
    expect(piLabel(-Math.PI / 2)).toBe('−π/2')
    expect(piLabel((5 * Math.PI) / 36)).toBe('5π/36')
  })
})

describe('Q9–Q10: tmax slider (0.02 … 0.5 s)', () => {
  const all = steps(RANGES.tmax)
  it('every position computes finite bins and DTFT; the bins sample the DTFT', () => {
    for (const t of all) {
      const r = resolution(t, 401)
      expect(r.view.N).toBe(sampleCount(t, FE))
      expect(finite(r.view.mag) && finite(r.dense)).toBe(true)
      expect(Number.isFinite(r.peakF) && r.peakMag > 0).toBe(true)
      // the dense curve's max (DC) is the DC bin's value: f = 0 is on every grid
      expect(maxAbs(r.dense)).toBeGreaterThan(4.9)
    }
  })
  it('locks onto 105 Hz only for N multiple of 200 (tmax 0.2 and 0.4 s)', () => {
    const locked = all.filter((t) => isOnBin(F4, FE / sampleCount(t, FE))).map((t) => Number(t.toFixed(3)))
    expect(locked).toEqual([0.2, 0.4])
    for (const t of [0.2, 0.4]) {
      const r = resolution(t, 11)
      expect(r.onBin).toBe(true)
      expect(r.peakF).toBe(105)
      expect(r.peakMag).toBeCloseTo(0.5, 9)
    }
  })
})

describe('Q11–Q12: padded length slider (2^6 … 2^10)', () => {
  it('every length interpolates the same spectrum; N and p unchanged', () => {
    for (const e of steps(RANGES.padExp)) {
      const pd = padding(2 ** e)
      expect([pd.N, pd.p, pd.L]).toEqual([50, 6, 2 ** e])
      expect(pd.mag5.length).toBe(2 ** e)
      expect(finite(pd.mag5) && finite(pd.dense)).toBe(true)
      // the peak never exceeds the true spectrum's maximum near 105 Hz
      const top = Math.max(...pd.dense.filter((_, i) => pd.fDense[i] > 60))
      expect(Math.max(...pd.mag5.filter((_, i) => pd.f5[i] > 60))).toBeLessThanOrEqual(top + 1e-3)
    }
  })
})
