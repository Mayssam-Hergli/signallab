import { describe, expect, it } from 'vitest'
import { c2d, c2dFirstOrder } from '../c2d'
import { cabs, sortCplx } from '../complex'
import { eye, expm, matMul } from '../matrix'
import { polyAdd, polyFromRoots, polyMul, polyval, polyvalC, roots } from '../polynomial'
import { closedLoopPoles, rlocus, stabilityLimit } from '../rlocus'
import { pid, stepContinuous, stepDiscrete, stepSampledHybrid } from '../simulate'
import { ss2tf, tf2ss } from '../ss'
import { stepinfo } from '../stepinfo'
import { dcgain, feedback, gain, isStable, order, poles, series, tf, tfz, zeros } from '../tf'

const close = (a: number, b: number, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)))

describe('polynomial', () => {
  it('add / multiply / evaluate in MATLAB order', () => {
    expect(polyAdd([1, 2, 3], [4, 5])).toEqual([1, 6, 8])
    expect(polyMul([1, 1], [1, -1])).toEqual([1, 0, -1]) // conv
    expect(polyval([1, 2, 3], 2)).toBe(11)
    const z = polyvalC([1, 0, 1], { re: 0, im: 1 }) // i² + 1 = 0
    close(z.re, 0)
    close(z.im, 0)
  })

  it('roots: real, complex and at zero', () => {
    expect(roots([1, 1])).toEqual([{ re: -1, im: 0 }])
    const c = sortCplx(roots([1, 2, 5])) // −1 ± 2j
    close(c[0].re, -1)
    close(Math.abs(c[0].im), 2)
    const r0 = roots([1, 0, 0]).map(cabs)
    expect(r0).toEqual([0, 0])
  })

  it('roots of a degree-5 polynomial with a complex pair (Durand–Kerner)', () => {
    // (s+1)(s+2)(s+3)(s² + 2s + 10)
    const p = polyMul(polyFromRoots([-1, -2, -3]), [1, 2, 10])
    const r = sortCplx(roots(p))
    const re = r.map((z) => z.re)
    close(re[0], -3, 1e-9)
    close(re[1], -2, 1e-9)
    const pair = r.filter((z) => Math.abs(z.im) > 1e-6)
    expect(pair).toHaveLength(2)
    for (const z of pair) {
      close(z.re, -1, 1e-9)
      close(Math.abs(z.im), 3, 1e-9)
    }
    for (const z of r) expect(cabs(polyvalC(p, z))).toBeLessThan(1e-8)
  })

  it('roots stay accurate when far apart (stiff motor, TP4)', () => {
    const r = sortCplx(roots([2.2e-6, 0.16000011, 3.6561]))
    close(r[0].re, -72704, 1e-4)
    close(r[1].re, -22.858, 1e-4)
  })
})

describe('tf: series, feedback, dcgain, poles, zeros, order', () => {
  const G = tf([1], [1, 1])

  it('feedback(K*G, 1) like MATLAB', () => {
    const F = feedback(gain(4, G), 1)
    expect(F.num).toEqual([4])
    expect(F.den).toEqual([1, 5])
    close(dcgain(F), 0.8)
    expect(order(F)).toBe(1)
    expect(zeros(F)).toEqual([])
  })

  it('feedback with a dynamic H and positive feedback', () => {
    const H = tf([1], [1, 2])
    const F = feedback(G, H) // (s+2)/((s+1)(s+2)+1)
    expect(F.num).toEqual([1, 2])
    expect(F.den).toEqual([1, 3, 3])
    expect(feedback(G, 1, 1).den).toEqual([1, 0]) // 1/s: integrator
    expect(dcgain(feedback(G, 1, 1))).toBe(Infinity)
  })

  it('series multiplies, dcgain of a discrete system is G(1)', () => {
    const S = series(G, tf([2], [1, 3]))
    expect(S.den).toEqual([1, 4, 3])
    close(dcgain(S), 2 / 3)
    close(dcgain(tfz([0.5], [1, -0.5], 1)), 1)
  })

  it('stability from the poles', () => {
    expect(isStable(tfz([1], [1, -0.5], 0.1))).toBe(true)
    expect(isStable(tfz([1], [1, 1.2], 0.1))).toBe(false)
    expect(isStable(tf([1], [1, -1]))).toBe(false)
    expect(poles(tf([1], [1, 3, 2])).map((p) => p.re).sort((a, b) => a - b)).toEqual([-2, -1])
  })
})

describe('matrix exponential', () => {
  it('expm of a diagonal and of a rotation generator', () => {
    const E = expm([
      [1, 0],
      [0, -2],
    ])
    close(E[0][0], Math.E)
    close(E[1][1], Math.exp(-2))
    const R = expm([
      [0, -Math.PI / 2],
      [Math.PI / 2, 0],
    ])
    close(R[0][0], 0, 1e-12)
    close(R[1][0], 1, 1e-12)
  })

  it('e^A · e^−A = I for a stiff matrix', () => {
    const A = [
      [-72727, -1.66e6],
      [1, 0],
    ].map((r) => r.map((v) => v * 1e-4))
    const P = matMul(expm(A), expm(A.map((r) => r.map((v) => -v))))
    const I = eye(2)
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) close(P[i][j], I[i][j], 1e-8)
  })
})

describe('tf2ss / ss2tf round trip', () => {
  it('third order with a numerator', () => {
    const G = tf([2, 3, 1], [1, 6, 11, 6])
    const back = ss2tf(tf2ss(G))
    back.num.forEach((c, i) => close(c, G.num[i]))
    back.den.forEach((c, i) => close(c, G.den[i]))
  })
  it('biproper: D ≠ 0', () => {
    const back = ss2tf(tf2ss(tf([2, 1], [1, 3])))
    back.num.forEach((c, i) => close(c, [2, 1][i]))
  })
})

describe('c2d (ZOH)', () => {
  it('first order: closed form = general state-space version', () => {
    for (const [k, tau, T] of [
      [1, 1, 0.1],
      [1, 1, 2],
      [12.5, 50, 1],
      [12.5, 50, 50],
    ]) {
      const a = c2dFirstOrder(k, tau, T)
      const b = c2d(tf([k], [tau, 1]), T)
      expect(b.num).toHaveLength(1)
      close(b.num[0], a.num[0], 1e-10)
      close(b.den[1], a.den[1], 1e-10)
      expect(b.T).toBe(T)
    }
  })

  it('second order: steps of G(z) = continuous step at t = kT', () => {
    const G = tf([1], [1, 0.6, 1])
    const T = 0.3
    const d = stepDiscrete(c2d(G, T), 40)
    const c = stepContinuous(G, 39 * T, 39 * 50 + 1)
    for (let k = 0; k < 40; k++) close(d.y[k], c.y[k * 50], 1e-9)
  })

  it('works with an integrator (A singular)', () => {
    const Gz = c2d(tf([1], [1, 0]), 0.5) // 1/s → T/(z−1)
    close(Gz.num[0], 0.5)
    close(Gz.den[1], -1)
  })
})

describe('simulation', () => {
  it('stepContinuous: first order = 1 − e^{−t}', () => {
    const r = stepContinuous(tf([1], [1, 1]), 5, 501)
    for (const i of [0, 100, 250, 500]) close(r.y[i], 1 - Math.exp(-r.t[i]), 1e-12)
  })

  it('stepContinuous handles the stiff motor (no blow-up)', () => {
    const Gm = tf([1.91], [2.2e-6, 0.16000011, 3.6561])
    const r = stepContinuous(Gm, 1, 1001, 10) // dt = 1 ms ≫ 1/72 704 s
    close(r.y.at(-1)!, 10 * 1.91 / 3.6561, 1e-6) // open loop, U = 10 V → 5.2241 rad/s
    close(r.y.at(-1)!, 5.2241, 1e-4)
    expect(r.y.every((v) => Number.isFinite(v) && v >= 0)).toBe(true)
  })

  it('stepDiscrete: difference equation', () => {
    const r = stepDiscrete(tfz([0.5], [1, -0.5], 1), 4)
    expect(r.y).toEqual([0, 0.5, 0.75, 0.875])
    expect(r.t).toEqual([0, 1, 2, 3])
  })

  it('hybrid sampled loop = discrete closed loop at t = kT', () => {
    for (const [plant, K, T] of [
      [tf([1], [1, 1]), 5, 0.1],
      [tf([1], [1, 1]), 19, 0.1], // close to Kmax, strong oscillation
      [tf([12.5], [50, 1]), 1, 5],
      [tf([1], [1, 0.6, 1]), 0.8, 0.4], // second order
    ] as const) {
      const h = stepSampledHybrid(plant, K, T, 30 * T, { amplitude: 2 })
      const d = stepDiscrete(feedback(gain(K, c2d(plant, T)), 1), h.tk.length, 2)
      h.yk.forEach((v, k) => close(v, d.y[k], 1e-9))
      // the fine grid passes through the samples
      const i = h.t.findIndex((t) => Math.abs(t - 10 * T) < 1e-9)
      close(h.y[i], h.yk[10], 1e-12)
      // u is held between samples
      expect(h.u[i + 1]).toBe(h.uk[10])
    }
  })

  it('pid(kp, ki, kd) = (kd s² + kp s + ki)/s', () => {
    expect(pid(2, 0.1, 3)).toEqual({ num: [3, 2, 0.1], den: [1, 0] })
    expect(pid(2, 0, 0)).toEqual({ num: [2], den: [1] })
  })
})

describe('stepinfo (MATLAB definitions)', () => {
  it('first order τ: rise τ·ln 9, settling τ·ln 50, no overshoot', () => {
    const r = stepContinuous(tf([1], [2, 1]), 30, 30001)
    const s = stepinfo(r.t, r.y, { yFinal: 1, consigne: 1 })
    close(s.riseTime, 2 * Math.log(9), 1e-4)
    close(s.settlingTime, 2 * Math.log(50), 1e-4)
    expect(s.overshoot).toBe(0)
    close(s.staticError, 0)
  })

  it('second order ζ = 0.5: overshoot e^{−πζ/√(1−ζ²)}', () => {
    const r = stepContinuous(tf([1], [1, 1, 1]), 30, 30001)
    const s = stepinfo(r.t, r.y, { yFinal: 1 })
    close(s.overshoot, 100 * Math.exp((-Math.PI * 0.5) / Math.sqrt(0.75)), 1e-4)
    close(s.peakTime, Math.PI / Math.sqrt(0.75), 1e-3)
  })

  it('unstable response → NaN', () => {
    const s = stepinfo([0, 1, 2], [0, 1, Infinity])
    expect(s.settlingTime).toBeNaN()
  })
})

describe('rlocus and stability limit', () => {
  it('closed-loop poles = roots(den + K·num)', () => {
    const G = tf([1], [1, 3, 2])
    const p = closedLoopPoles(G, 2).map((z) => z.re)
    expect(p.sort()).toEqual([-1.5, -1.5]) // s² + 3s + 4 → −1.5 ± 1.32j (real parts)
    expect(rlocus(G, [0, 1])).toHaveLength(2)
  })

  it('discrete limit where |p| = 1, continuous limit where Re p = 0', () => {
    const a = Math.exp(-0.1)
    close(stabilityLimit(tfz([1 - a], [1, -a], 0.1)), (1 + a) / (1 - a), 1e-9)
    // 1/(s(s+1)(s+2)): Routh gives K = 6
    close(stabilityLimit(tf([1], [1, 3, 2, 0])), 6, 1e-6)
    expect(stabilityLimit(tf([1], [1, 1]))).toBe(Infinity)
  })
})
