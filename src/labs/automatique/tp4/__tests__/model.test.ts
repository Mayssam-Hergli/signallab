import { describe, expect, it } from 'vitest'
import { dcgain, poles, sortCplx, stepContinuous, stepinfo, tf } from '../../../../control'
import {
  closedLoop,
  commandTF,
  controller,
  L_VALUES,
  loadClosedLoopTF,
  MCC,
  measure,
  motorLoadTF,
  motorTF,
  speedWithLoad,
  TANK,
  TANK_SETPOINT,
} from '../model'

const near = (a: number, b: number, tol: number) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol)
const ONE = tf([1], [1])

describe('TP4 reservoir', () => {
  it('open loop → 25 m, unity feedback → 1.8519 m (14.49 s, 8.14 s, no overshoot)', () => {
    near(TANK_SETPOINT * dcgain(TANK), 25, 1e-12)
    const m = measure(closedLoop(ONE, TANK), TANK_SETPOINT, 100)
    near(m.final, 1.8519, 1e-4)
    near(m.info.settlingTime, 14.49, 0.01)
    near(m.info.riseTime, 8.14, 0.01)
    expect(m.info.overshoot).toBe(0)
    near(m.info.staticError, 0.1481, 1e-4)
  })

  it('PI kp = 2, ki = 0.1: zero error, 3.89 % overshoot, 26.2 s', () => {
    const m = measure(closedLoop(controller({ kp: 2, ki: 0.1, kd: 0 }), TANK), TANK_SETPOINT, 100)
    near(m.info.staticError, 0, 1e-12)
    near(m.info.overshoot, 3.89, 0.01)
    near(m.info.settlingTime, 26.2, 0.3)
  })

  it('slow loop: settling time measured past the plot window (= direct long simulation)', () => {
    // kp = 0.5, ki = 0.005: poles ≈ −0.0092 and −0.136, zero −0.01 — the slow mode is not negligible
    const F = closedLoop(controller({ kp: 0.5, ki: 0.005, kd: 0 }), TANK)
    const m = measure(F, TANK_SETPOINT, 100)
    const long = stepContinuous(F, 3000, 60001, TANK_SETPOINT)
    const ref = stepinfo(long.t, long.y, { yFinal: TANK_SETPOINT, yInit: 0 })
    expect(m.info.settlingTime).toBeGreaterThan(100)
    near(m.info.settlingTime, ref.settlingTime, 0.5)
  })

  it('command u = C/(1+CG)·r: starts at kp·r, ends at r/12.5 with PI', () => {
    const U = commandTF(controller({ kp: 2, ki: 0.1, kd: 0 }), TANK)
    near(TANK_SETPOINT * dcgain(U), TANK_SETPOINT / 12.5, 1e-12)
    const u0 = measure(U, TANK_SETPOINT, 1).response.y[0]
    near(u0, 4, 1e-9)
  })

  it('ideal derivative: output jumps at t = 0, stepinfo measures from 0', () => {
    const m = measure(closedLoop(controller({ kp: 2, ki: 0.1, kd: 20 }), TANK), TANK_SETPOINT, 100)
    near(m.response.y[0], TANK_SETPOINT * 250 / 300, 1e-9) // D = 12.5·kd/(50 + 12.5·kd)
    expect(m.info.riseTime).toBeGreaterThanOrEqual(0)
  })
})

describe('TP4 MCC', () => {
  it('Gm with L = 0.011 mH = 1.91/(2.2e-6 s² + 0.16000011 s + 3.6561)', () => {
    const G = motorTF(L_VALUES.mH)
    near(G.den[0], 2.2e-6, 1e-15)
    near(G.den[1], 0.16000011, 1e-12)
    near(G.den[2], 3.6561, 1e-12)
    near(MCC.U * dcgain(G), 5.2241, 1e-4)
  })

  it('L = 0.011 H: unity feedback has poles −36.39 ± 34.73j and 3.72 % overshoot', () => {
    const F = closedLoop(ONE, motorTF(L_VALUES.H))
    const p = sortCplx(poles(F))
    near(p[0].re, -36.39, 0.01)
    near(Math.abs(p[0].im), 34.73, 0.01)
    near(measure(F, MCC.U, 1.5).info.overshoot, 3.72, 0.01)
  })

  it('load torque: without integrator the speed drops for good, with PI it recovers', () => {
    const L = L_VALUES.mH
    const sans = loadClosedLoopTF(ONE, L)
    near(dcgain(sans), -MCC.R / (0.8 * 0.01 + MCC.kc * MCC.ke + MCC.kc), 1e-12)
    near(dcgain(loadClosedLoopTF(controller({ kp: 2, ki: 20, kd: 0 }), L)), 0, 1e-15)
    // open loop: Ω/Cr static gain = −R/D(0)
    near(dcgain(motorLoadTF(L)), -MCC.R / 3.6561, 1e-12)
  })

  it('speedWithLoad: PI back to 10 rad/s at the end despite cr = 2 N·m', () => {
    const C = controller({ kp: 2, ki: 20, kd: 0 })
    const L = L_VALUES.mH
    const w = speedWithLoad(closedLoop(C, motorTF(L)), loadClosedLoopTF(C, L), 10, 2, 4, 4001)
    const i05 = w.t.findIndex((t) => t >= 0.5)
    const dip = Math.min(...w.y.slice(i05))
    expect(dip).toBeLessThan(w.y[i05 - 1])
    near(w.y.at(-1)!, 10, 1e-3)
  })
})
