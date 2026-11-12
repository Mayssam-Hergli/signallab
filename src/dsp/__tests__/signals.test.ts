import { describe, expect, it } from 'vitest'
import { add, cosPeriod, gcd, lcm, linspace, maxAbsDiff, range, squarePeriod, sum } from '../signals'

describe('range (MATLAB colon a:d:b)', () => {
  it('0:0.01:30 has 3001 points and ends exactly on 30', () => {
    const t = range(0, 0.01, 30)
    expect(t).toHaveLength(3001)
    expect(t[0]).toBe(0)
    expect(t[3000]).toBe(30)
  })

  it('handles steps that are not exact in binary (0:1/fe:20e-3)', () => {
    expect(range(0, 1 / 4000, 20e-3)).toHaveLength(81)
    expect(range(0, 20e-6, 20e-3)).toHaveLength(1001)
  })

  it('integer ranges and empty ranges', () => {
    expect(range(0, 1, 4)).toEqual([0, 1, 2, 3, 4])
    expect(range(0, 2, 7)).toEqual([0, 2, 4, 6])
    expect(range(5, 1, 0)).toEqual([])
  })
})

describe('linspace', () => {
  it('includes both end points', () => {
    expect(linspace(0, 1, 5)).toEqual([0, 0.25, 0.5, 0.75, 1])
  })
})

describe('TP1 §1.1 operations', () => {
  it('lcm(5, 3) = 15 (period of the sum)', () => {
    expect(lcm(5, 3)).toBe(15)
    expect(gcd(5, 3)).toBe(1)
    expect(lcm(4, 6)).toBe(12)
  })

  it('cos of period 5 and sign(sin) of period 3 have the right values', () => {
    const t = range(0, 0.01, 30)
    const x1 = cosPeriod(t, 5)
    const x2 = squarePeriod(t, 3)
    expect(x1[0]).toBeCloseTo(1, 12)
    expect(x1[250]).toBeCloseTo(-1, 12) // t = 2.5 s, half a period
    for (const v of x2) expect([-1, 0, 1]).toContain(v)
    expect(x2[50]).toBe(1) // t = 0.5 s
    expect(x2[200]).toBe(-1) // t = 2 s
  })

  it('the sum is periodic with period lcm(5,3) = 15 s', () => {
    const t = range(0, 0.01, 30)
    const s = add(cosPeriod(t, 5), squarePeriod(t, 3))
    // compare s(t) and s(t + 15) away from the square wave's jumps (every 1.5 s)
    for (let i = 0; i < 1500; i++) {
      if (i % 150 === 0) continue
      expect(Math.abs(s[i] - s[i + 1500])).toBeLessThan(1e-9)
    }
  })

  it('helpers', () => {
    expect(sum([1, 2, 3])).toBe(6)
    expect(maxAbsDiff([1, 2], [1, 2.5])).toBe(0.5)
  })
})
