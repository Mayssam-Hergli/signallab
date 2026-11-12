/**
 * Reference values (MATLAB, Control System Toolbox) for TP3 and TP4 of
 * Automatique linéaire échantillonnée.
 */
import { describe, expect, it } from 'vitest'
import {
  c2d,
  dcgain,
  feedback,
  gain,
  order,
  pid,
  poles,
  series,
  sortCplx,
  stabilityLimit,
  stepContinuous,
  stepDiscrete,
  stepinfo,
  stepSampledHybrid,
  tf,
  zeros,
} from '..'
import {
  closedPole,
  finalValue,
  Fz,
  Gz,
  kForError,
  kmax,
  PLANT_II,
  PLANT_III,
  plantTF,
  staticError,
} from '../../labs/automatique/tp3/model'

const near = (a: number, b: number, tol: number) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol)

describe('TP3 II: G1(s) = 1/(s+1)', () => {
  it('T = 0.1: G(z) = 0.09516/(z − 0.90484), by hand and by c2d', () => {
    for (const G of [Gz(PLANT_II, 0.1), c2d(plantTF(PLANT_II), 0.1)]) {
      near(G.num[0], 0.09516, 5e-6)
      near(G.den[1], -0.90484, 5e-6)
    }
  })

  it('Kmax(T) = (1 + e^−T)/(1 − e^−T)', () => {
    near(kmax(PLANT_II, 0.1), 20.0167, 1e-4)
    near(kmax(PLANT_II, 0.5), 4.083, 1e-4)
    near(kmax(PLANT_II, 1), 2.164, 1e-4)
    // the generic root-locus search finds the same value
    near(stabilityLimit(Gz(PLANT_II, 0.1)), kmax(PLANT_II, 0.1), 1e-8)
  })

  it('F(z): order 1, no zero, pole a − K(1 − a), static error 1/(1 + K)', () => {
    const F = Fz(PLANT_II, 1, 0.1)
    expect(order(F)).toBe(1)
    expect(zeros(F)).toEqual([])
    near(poles(F)[0].re, closedPole(PLANT_II, 1, 0.1), 1e-12)
    near(closedPole(PLANT_II, 1, 0.1), 0.80967, 1e-5)
    near(1 - dcgain(F), 0.5, 1e-12)
    near(staticError(PLANT_II, 3), 0.25, 1e-12)
  })

  it('pole crosses z = −1 at Kmax', () => {
    near(closedPole(PLANT_II, kmax(PLANT_II, 0.5), 0.5), -1, 1e-12)
  })
})

describe('TP3 III: tank G1(s) = 12.5/(50s+1)', () => {
  it('T = 1: G(z) = 0.24752/(z − 0.98020)', () => {
    const G = c2d(plantTF(PLANT_III), 1)
    near(G.num[0], 0.24752, 5e-6)
    near(G.den[1], -0.9802, 5e-6)
  })

  it('Kmax for T = 1, 5, 10, 50 s', () => {
    near(kmax(PLANT_III, 1), 8.0003, 1e-4)
    near(kmax(PLANT_III, 5), 1.6013, 1e-4)
    near(kmax(PLANT_III, 10), 0.8027, 1e-4)
    near(kmax(PLANT_III, 50), 0.1731, 1e-4)
  })

  it('static error 2/(1 + 12.5K), K for ≤ 2 % error = 3.92', () => {
    near(staticError(PLANT_III, 1, 2), 0.1481, 1e-4)
    near(2 - 2 * dcgain(Fz(PLANT_III, 1, 1)), 0.1481, 1e-4)
    near(kForError(PLANT_III, 0.02), 3.92, 1e-12)
    near(finalValue(PLANT_III, 3.92, 2), 1.96, 1e-12)
  })

  it('hybrid response: settles at H(∞) and matches the discrete loop at kT', () => {
    const h = stepSampledHybrid(plantTF(PLANT_III), 1, 1, 300, { amplitude: 2 })
    near(h.yk.at(-1)!, finalValue(PLANT_III, 1, 2), 1e-6)
    const d = stepDiscrete(Fz(PLANT_III, 1, 1), h.tk.length, 2)
    h.yk.forEach((v, k) => near(v, d.y[k], 1e-9))
  })
})

describe('TP4 reservoir (consigne 2 m)', () => {
  const G = tf([12.5], [50, 1])
  const info = (sys: ReturnType<typeof tf>, tEnd: number) => {
    const r = stepContinuous(sys, tEnd, 60001, 2)
    return stepinfo(r.t, r.y, { yFinal: 2 * dcgain(sys), consigne: 2 })
  }

  it('open loop ends at 25 m', () => {
    near(2 * dcgain(G), 25, 1e-12)
  })

  it('unity feedback without PID', () => {
    const s = info(feedback(G, 1), 100)
    near(s.finalValue, 1.8519, 1e-4)
    expect(s.overshoot).toBe(0)
    near(s.settlingTime, 14.49, 0.01)
    near(s.riseTime, 8.14, 0.01)
  })

  it('PI kp = 2, ki = 0.1', () => {
    const s = info(feedback(series(pid(2, 0.1, 0), G), 1), 150)
    near(s.finalValue, 2, 1e-12)
    near(s.overshoot, 3.89, 0.01)
    near(s.settlingTime, 26.2, 0.3)
  })

  it('PI kp = 5, ki = 0.5', () => {
    const s = info(feedback(series(pid(5, 0.5, 0), G), 1), 100)
    near(s.overshoot, 4.55, 0.01)
    near(s.settlingTime, 13.2, 0.1)
  })
})

describe('TP4 motor (L = 0.011 mH, consigne 10 rad/s): stiff system', () => {
  const Gm = tf([1.91], [2.2e-6, 0.16000011, 3.6561])

  it('poles ≈ −22.858 and −72 704', () => {
    const p = sortCplx(poles(Gm))
    near(p[0].re, -72704, 1)
    near(p[1].re, -22.858, 1e-3)
  })

  it('open loop with U = 10 V → 5.2241 rad/s', () => {
    near(10 * dcgain(Gm), 5.2241, 1e-4)
  })

  it('unity feedback without PID: 3.4315 rad/s, no overshoot, settling ≈ 0.112 s', () => {
    const F = feedback(Gm, 1)
    const r = stepContinuous(F, 0.5, 50001, 10)
    const s = stepinfo(r.t, r.y, { yFinal: 10 * dcgain(F) })
    near(s.finalValue, 3.4315, 1e-4)
    expect(s.overshoot).toBe(0)
    near(s.settlingTime, 0.112, 0.001)
  })

  it('PI kp = 2, ki = 20: 10 rad/s, no overshoot, settling ≈ 0.546 s', () => {
    const F = feedback(series(pid(2, 20, 0), Gm), 1)
    const r = stepContinuous(F, 3, 60001, 10)
    const s = stepinfo(r.t, r.y, { yFinal: 10 * dcgain(F) })
    near(s.finalValue, 10, 1e-9)
    near(s.overshoot, 0, 1e-6)
    near(s.settlingTime, 0.546, 0.002)
  })

  it('K·G closed loop is unchanged by gain(1, …)', () => {
    expect(feedback(gain(1, Gm), 1).den).toEqual(feedback(Gm, 1).den)
  })
})
