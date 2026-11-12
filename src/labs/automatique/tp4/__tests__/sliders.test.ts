/**
 * Every slider position of the TP4 page must compute without throwing, with
 * finite numbers wherever the loop is stable. Runs the same calls as the
 * section components, over a grid covering each slider's whole range.
 */
import { describe, expect, it } from 'vitest'
import { dcgain, polyDiv, stepContinuous, tf } from '../../../../control'
import {
  closedLoop,
  commandTF,
  controller,
  L_VALUES,
  loadClosedLoopTF,
  MCC,
  MCC_T_END,
  measure,
  motorLoadTF,
  motorTF,
  speedWithLoad,
  TANK,
  TANK_SETPOINT,
  TANK_T_END,
} from '../model'

const grid = (min: number, max: number, n: number) => Array.from({ length: n }, (_, i) => min + ((max - min) * i) / (n - 1))
const near = (a: number, b: number, tol: number) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol)

describe('polyDiv / improper step', () => {
  it('deconv', () => {
    const { q, r } = polyDiv([1, 5, 6, 1], [1, 2]) // (s+2)(s²+3s) + 1
    expect(q).toEqual([1, 3, 0])
    expect(r).toEqual([1])
    expect(polyDiv([1, 1], [1, 0, 1])).toEqual({ q: [0], r: [1, 1] })
  })

  it('step of (s² + 3s + 1)/(s + 1) = δ(t) + 2 − e^{−t}', () => {
    // (s² + 3s + 1)/(s + 1) = s + 2 − 1/(s + 1)
    const r = stepContinuous(tf([1, 3, 1], [1, 1]), 5, 501, 2)
    expect(r.impulse).toBeCloseTo(2, 12)
    for (const i of [0, 100, 500]) near(r.y[i], 2 * (2 - (1 - Math.exp(-r.t[i]))), 1e-10)
  })

  it('refuses an excess of two degrees', () => {
    expect(() => stepContinuous(tf([1, 0, 0], [1]), 1, 10)).toThrow(/more than one degree/)
  })
})

describe('TP4 III sliders: kp 0–10, ki 0–1, kd 0–20', () => {
  it('the tank command with an ideal derivative is an impulse + a finite flow', () => {
    // the bug: moving kd made u = C/(1 + CG) improper and the section crashed
    for (const ki of [0, 0.1]) {
      const u = stepContinuous(commandTF(controller({ kp: 2, ki, kd: 1 }), TANK), TANK_T_END, 1501, TANK_SETPOINT)
      // impulse area = r · kd·50/(50 + 12.5·kd)
      near(u.impulse!, (TANK_SETPOINT * 50) / 62.5, 1e-12)
      expect(u.y.every(Number.isFinite)).toBe(true)
    }
  })

  it('every grid point computes', () => {
    for (const kp of grid(0, 10, 6))
      for (const ki of grid(0, 1, 6))
        for (const kd of grid(0, 20, 6)) {
          const C = controller({ kp, ki, kd })
          const m = measure(closedLoop(C, TANK), TANK_SETPOINT, TANK_T_END, 1501)
          const u = stepContinuous(commandTF(C, TANK), TANK_T_END, 1501, TANK_SETPOINT)
          const label = `kp=${kp} ki=${ki} kd=${kd}`
          expect(m.stable, label).toBe(true) // all coefficients of the closed loop are > 0
          expect(m.response.y.every(Number.isFinite), label).toBe(true)
          expect(u.y.every(Number.isFinite), label).toBe(true)
          expect(Number.isFinite(m.final), label).toBe(true)
        }
  })
})

describe('TP4 IV sliders: kp 0–20, ki 0–200, kd 0–1, cr 0–5, both L', () => {
  it('every grid point computes; unstable loops are flagged, not thrown', () => {
    let unstable = 0
    for (const L of [L_VALUES.mH, L_VALUES.H]) {
      const Gm = motorTF(L)
      speedWithLoad(Gm, motorLoadTF(L), MCC.U, 5)
      for (const kp of grid(0, 20, 5))
        for (const ki of grid(0, 200, 5))
          for (const kd of grid(0, 1, 5)) {
            const C = controller({ kp, ki, kd })
            const label = `L=${L} kp=${kp} ki=${ki} kd=${kd}`
            const m = measure(closedLoop(C, Gm), MCC.U, MCC_T_END)
            const w = speedWithLoad(closedLoop(C, Gm), loadClosedLoopTF(C, L), MCC.U, 5)
            expect(w.y.every(Number.isFinite), label).toBe(true)
            if (m.stable) expect(Number.isFinite(dcgain(loadClosedLoopTF(C, L))), label).toBe(true)
            else unstable++
          }
    }
    // L = 0.011 H, kp = 0, large ki: a real instability the page must show
    expect(unstable).toBeGreaterThan(0)
  })
})
