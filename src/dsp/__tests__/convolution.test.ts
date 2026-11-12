import { describe, expect, it } from 'vitest'
import {
  circConvViaFFT,
  circStep,
  convCircular,
  convDefinition,
  convLinear,
  convStep,
  convViaFFT,
  expConvCircularAnalytic,
  expConvLinearAnalytic,
  expSequence,
} from '../convolution'
import { maxAbsDiff } from '../signals'

const geometric = (M: number, a = 0.7) => Array.from({ length: M }, (_, n) => a ** n)
const ones = (N: number) => new Array<number>(N).fill(1)
const SUM_G10 = (1 - 0.7 ** 10) / 0.3 // ≈ 3.2392

describe('TP2 A: linear convolution, x = ones(1,10), g = 0.7^n (M = 20)', () => {
  const N = 10
  const M = 2 * N
  const x = ones(N)
  const g = geometric(M)
  const y = convLinear(x, g)

  it('length(y) = N + M − 1 = 29', () => {
    expect(y).toHaveLength(29)
  })

  it('y(9) = (1 − 0.7^10)/0.3 ≈ 3.2392', () => {
    expect(SUM_G10).toBeCloseTo(3.2392, 4)
    expect(y[9]).toBeCloseTo(SUM_G10, 12)
  })

  it('matches the definition Σ x(m)·g(n−m) at every n', () => {
    for (let n = 0; n < N + M - 1; n++) {
      let ref = 0
      for (let m = 0; m < N; m++) if (n - m >= 0 && n - m < M) ref += x[m] * g[n - m]
      expect(y[n]).toBeCloseTo(ref, 12)
    }
  })

  it('FFT method (zero-padding to N+M−1) matches within 1e-10', () => {
    const yf = convViaFFT(x, g)
    expect(yf).toHaveLength(29)
    expect(maxAbsDiff(y, yf)).toBeLessThan(1e-10)
  })

  it('animator steps give the same y(n) as convLinear', () => {
    for (let n = 0; n < N + M - 1; n++) {
      const s = convStep(x, g, n)
      expect(s.value).toBeCloseTo(y[n], 12)
      expect(s.m[0]).toBe(-(M - 1))
      expect(s.m.at(-1)).toBe(N + M - 2)
    }
  })

  it('a small hand-computed example', () => {
    expect(convLinear([1, 2, 3], [1, 1])).toEqual([1, 3, 5, 3])
  })
})

describe('TP2 B: circular convolution, x = ones(1,10), g = 0.7^n (M = N = 10)', () => {
  const N = 10
  const x = ones(N)
  const g = geometric(N)

  it('length N and every value = Σg ≈ 3.2392 (direct formula)', () => {
    const y = convCircular(x, g)
    expect(y).toHaveLength(N)
    for (const v of y) expect(v).toBeCloseTo(SUM_G10, 12)
  })

  it('FFT method without zero-padding gives the same constant', () => {
    const y = circConvViaFFT(x, g)
    expect(y).toHaveLength(N)
    for (const v of y) expect(v).toBeCloseTo(SUM_G10, 10)
  })

  it('circular = linear once zero-padded to L ≥ N+M−1', () => {
    const lin = convLinear(x, g) // length 19
    for (const L of [19, 24, 32]) {
      const linPadded = [...lin, ...new Array<number>(L - lin.length).fill(0)]
      expect(maxAbsDiff(convCircular(x, g, L), linPadded)).toBeLessThan(1e-12)
      expect(maxAbsDiff(circConvViaFFT(x, g, L), linPadded)).toBeLessThan(1e-10)
    }
  })

  it('L < N+M−1 shows time-domain aliasing: y_L(k) = Σ_r y_lin(k + rL)', () => {
    const lin = convLinear(x, g)
    const L = 14
    const circ = convCircular(x, g, L)
    for (let k = 0; k < L; k++) {
      let ref = 0
      for (let i = k; i < lin.length; i += L) ref += lin[i]
      expect(circ[k]).toBeCloseTo(ref, 12)
    }
  })
})

describe('TP2 A.4: conv() stand-in', () => {
  it('convDefinition = convLinear on the TP sequences and on random ones', () => {
    expect(maxAbsDiff(convDefinition(ones(10), geometric(20)), convLinear(ones(10), geometric(20)))).toBeLessThan(1e-12)
    const a = [0.3, -1.2, 2, 0.5]
    const b = [1, -0.4, 0.25]
    expect(maxAbsDiff(convDefinition(a, b), convLinear(a, b))).toBeLessThan(1e-12)
  })
})

describe('TP2 A.5–A.6: f(n) = e^{0.1n} (Nf = 3), h(n) = e^{−0.1n} (Mh = 6)', () => {
  const f = expSequence(0.1, 3)
  const h = expSequence(-0.1, 6)

  it('length 8 and fliplr = FFT = closed form', () => {
    const y = convLinear(f, h)
    expect(y).toHaveLength(8)
    expect(maxAbsDiff(y, convViaFFT(f, h))).toBeLessThan(1e-10)
    expect(maxAbsDiff(y, expConvLinearAnalytic(3, 6))).toBeLessThan(1e-12)
  })

  it('first values by hand: y(0) = 1, y(1) = e^{-0.1} + e^{0.1}', () => {
    const y = expConvLinearAnalytic(3, 6)
    expect(y[0]).toBeCloseTo(1, 12)
    expect(y[1]).toBeCloseTo(Math.exp(-0.1) + Math.exp(0.1), 12)
  })

  it('closed form holds for other sizes too', () => {
    for (const [Nf, Mh] of [
      [1, 2],
      [4, 8],
      [7, 3],
    ]) {
      const y = convLinear(expSequence(0.1, Nf), expSequence(-0.1, Mh))
      expect(maxAbsDiff(y, expConvLinearAnalytic(Nf, Mh))).toBeLessThan(1e-12)
    }
  })
})

describe('TP2 B.4–B.6: circular f ⊛ h, N = 3', () => {
  const f = expSequence(0.1, 3)
  const h = expSequence(-0.1, 3)
  const tp = [1 + Math.exp(-0.1) + Math.exp(0.1), 1 + Math.exp(-0.1) + Math.exp(0.1), 1 + Math.exp(-0.2) + Math.exp(0.2)]

  it("direct = FFT = the TP's hand-computed values", () => {
    expect(maxAbsDiff(convCircular(f, h), tp)).toBeLessThan(1e-12)
    expect(maxAbsDiff(circConvViaFFT(f, h), tp)).toBeLessThan(1e-10)
  })

  it('general closed form reduces to the TP values for N = 3 and matches the direct formula for other N', () => {
    expect(maxAbsDiff(expConvCircularAnalytic(3), tp)).toBeLessThan(1e-12)
    for (const N of [1, 2, 5, 10]) {
      expect(maxAbsDiff(expConvCircularAnalytic(N), convCircular(expSequence(0.1, N), expSequence(-0.1, N)))).toBeLessThan(1e-12)
    }
  })
})

describe('circStep (ring of B)', () => {
  it('each step sums to convCircular(m), and g is turned by m', () => {
    const x = [1, 2, 0, -1, 3]
    const g = [0.5, 1, -2, 0, 4]
    const y = convCircular(x, g)
    for (let m = 0; m < 5; m++) {
      const s = circStep(x, g, m)
      expect(s.value).toBeCloseTo(y[m], 12)
      expect(s.gTurned[0]).toBe(g[m]) // n = 0 faces g(m)
    }
  })

  it('TP: x = 1 → every position sums to Σg', () => {
    for (let m = 0; m < 10; m++) expect(circStep(ones(10), geometric(10), m).value).toBeCloseTo(SUM_G10, 12)
  })
})
