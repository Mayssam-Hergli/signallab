import { describe, expect, it } from 'vitest'
import { abs, fft, ifft, real } from '../fft'

/** reference DFT written the textbook way */
function naiveDft(x: number[]): { re: number[]; im: number[] } {
  const n = x.length
  const re: number[] = []
  const im: number[] = []
  for (let k = 0; k < n; k++) {
    let sr = 0
    let si = 0
    for (let m = 0; m < n; m++) {
      sr += x[m] * Math.cos((2 * Math.PI * k * m) / n)
      si -= x[m] * Math.sin((2 * Math.PI * k * m) / n)
    }
    re.push(sr)
    im.push(si)
  }
  return { re, im }
}

describe('fft / ifft', () => {
  it.each([8, 10, 16, 29])('matches the naive DFT for n = %i', (n) => {
    const x = Array.from({ length: n }, (_, i) => Math.cos(i) + 0.3 * i)
    const X = fft(x)
    const R = naiveDft(x)
    for (let k = 0; k < n; k++) {
      expect(X.re[k]).toBeCloseTo(R.re[k], 10)
      expect(X.im[k]).toBeCloseTo(R.im[k], 10)
    }
  })

  it('fft(x, n) zero-pads like MATLAB', () => {
    const X = fft([1, 1, 1], 8)
    expect(X.re).toHaveLength(8)
    expect(X.re[0]).toBeCloseTo(3, 12)
  })

  it('ifft(fft(x)) = x', () => {
    const x = [1, -2, 3.5, 0, 7, 0.25, -1, 2, 9, 4]
    const y = real(ifft(fft(x)))
    y.forEach((v, i) => expect(v).toBeCloseTo(x[i], 12))
  })

  it('fft(ones(1,10)) is 10 at k = 0 and 0 elsewhere', () => {
    const m = abs(fft(new Array(10).fill(1)))
    expect(m[0]).toBeCloseTo(10, 12)
    for (let k = 1; k < 10; k++) expect(m[k]).toBeLessThan(1e-12)
  })
})
