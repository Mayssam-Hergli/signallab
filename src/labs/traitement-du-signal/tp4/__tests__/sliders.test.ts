/**
 * Every control of the TP4 page must compute without throwing: test-signal
 * sliders over their whole range, both IIR denominators, custom systems, and
 * roots dragged anywhere in the view (on and outside the unit circle).
 */
import { describe, expect, it } from 'vitest'
import { filter } from '../../../../dsp'
import {
  A_BOOKLET,
  A_IIR,
  analyse,
  analyseIir,
  B_IIR,
  gainAt,
  H1,
  H2,
  lead,
  polyFromHandles,
  polyLatex,
  TEST_RANGES,
  testSignal,
  toHandles,
  validate,
  type Rational,
} from '../model'

const steps = (r: { min: number; max: number; step: number }) => {
  const n = Math.round((r.max - r.min) / r.step)
  return Array.from({ length: n + 1 }, (_, i) => r.min + i * r.step)
}
const finite = (y: readonly number[]) => y.every(Number.isFinite)

describe('bonus sliders', () => {
  it('every (ω1, ω2, A2) filters to a finite output; gains as predicted', () => {
    for (const w1 of steps(TEST_RANGES.w1))
      for (const w2 of steps(TEST_RANGES.w2))
        for (const a2 of [TEST_RANGES.a2.min, 1, TEST_RANGES.a2.max]) {
          const y = filter(B_IIR, A_IIR, testSignal(w1, w2, a2))
          expect(finite(y)).toBe(true)
          expect(gainAt(B_IIR, A_IIR, w1)).toBeGreaterThan(1 / Math.SQRT2) // at or below the cutoff (0.258π)
          expect(gainAt(B_IIR, A_IIR, w2)).toBeLessThan(0.75) // above it
        }
  })
  it('steady state: a single tone comes out with gain |H(ω)|', () => {
    const y = filter(B_IIR, A_IIR, testSignal(0.6, 0.6, 0))
    const tail = Math.max(...y.slice(100).map(Math.abs))
    expect(tail).toBeCloseTo(gainAt(B_IIR, A_IIR, 0.6), 2)
  })
})

describe('IIR denominators', () => {
  it.each([
    ['program', A_IIR],
    ['booklet', A_BOOKLET],
  ])('%s: finite h and response', (_, a) => {
    const r = analyseIir(a)
    expect(finite(r.h) && finite(r.freq.mag) && finite(r.freq.phase)).toBe(true)
  })
})

describe('dragging roots anywhere in the view', () => {
  const R = 1.7
  const grid = Array.from({ length: 15 }, (_, i) => -R + 0.02 + (i * (2 * R - 0.04)) / 14)
  it.each([
    ['H1', H1],
    ['H2', H2],
  ] as [string, Rational][])('%s: every pole / zero position gives a finite analysis', (_, base) => {
    const a0 = analyse(base)
    const zeros = toHandles(a0.zeros)
    const poles = toHandles(a0.poles)
    for (const kind of ['zeros', 'poles'] as const) {
      const list = kind === 'zeros' ? zeros : poles
      list.forEach((h, i) => {
        for (const re of grid)
          for (const im of h.pair ? grid.filter((v) => v >= 0) : [0]) {
            const z = [...zeros]
            const p = [...poles]
            ;(kind === 'zeros' ? z : p)[i] = { re, im, pair: h.pair }
            const sys = { num: polyFromHandles(z, lead(base.num)), den: polyFromHandles(p, lead(base.den)) }
            const a = analyse(sys)
            expect(finite(a.h), `${kind} ${i} at ${re}, ${im}`).toBe(true)
            expect(a.stable).toBe(a.rho < 1)
            expect(polyLatex(sys.num)).not.toMatch(/NaN|undefined/)
          }
      })
    }
  })
})

describe('custom systems', () => {
  it.each([
    [[1], [1, -0.5]],
    [[2], [1, 0]],
    [[1, 0], [1, -1]], // pole on the circle: |H(0)| infinite, flagged NaN, not a crash
    [[1, 1, 1], [1, 0, 0, 0.9]],
    [[0, 0, 1, -0.3], [1, -1.3, 0.7]], // leading zeros typed by the user
  ])('Num %j, Den %j', (num, den) => {
    expect(validate(num, den)).toBeNull()
    const a = analyse({ num, den })
    expect(finite(a.h)).toBe(true)
    expect(a.freq.mag.length).toBe(512)
  })
})
