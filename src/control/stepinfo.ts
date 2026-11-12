/**
 * Step-response characteristics, with MATLAB's definitions.
 * MATLAB: S = stepinfo(y, t, yfinal)
 */

export interface StepInfo {
  /** time to go from 10 % to 90 % of the way from y(0) to yfinal (s) */
  riseTime: number
  /** time after which |y − yfinal| stays ≤ 2 % of |yfinal − y(0)| (s) */
  settlingTime: number
  /** (max y − yfinal)/(yfinal − y(0)) in %, 0 when there is none */
  overshoot: number
  /** max |y| and when it happens */
  peak: number
  peakTime: number
  /** final value used for all of the above */
  finalValue: number
  /** consigne − final value (static error), NaN if no consigne given */
  staticError: number
}

interface Options {
  /** final value; default: the last sample. Pass dcgain·amplitude when known. */
  yFinal?: number
  /**
   * value before the step; default y[0]. Pass 0 for the step response of a
   * system with a direct feedthrough (ideal PID derivative), which jumps at
   * t = 0: MATLAB's stepinfo(sys) measures from the pre-step value 0.
   */
  yInit?: number
  /** setpoint, for the static error */
  consigne?: number
  /** MATLAB 'SettlingTimeThreshold', default 0.02 */
  settlingThreshold?: number
  /** MATLAB 'RiseTimeLimits', default [0.1 0.9] */
  riseLimits?: [number, number]
}

/** Time where y first crosses `level`, interpolated between samples. */
function firstCrossing(t: readonly number[], y: readonly number[], level: number, up: boolean): number {
  for (let i = 0; i < y.length; i++) {
    const hit = up ? y[i] >= level : y[i] <= level
    if (!hit) continue
    if (i === 0) return t[0]
    const f = (level - y[i - 1]) / (y[i] - y[i - 1])
    return t[i - 1] + f * (t[i] - t[i - 1])
  }
  return NaN
}

const NAN_INFO = (yFinal: number, consigne?: number): StepInfo => ({
  riseTime: NaN,
  settlingTime: NaN,
  overshoot: NaN,
  peak: Infinity,
  peakTime: Infinity,
  finalValue: yFinal,
  staticError: consigne === undefined ? NaN : consigne - yFinal,
})

export function stepinfo(t: readonly number[], y: readonly number[], opts: Options = {}): StepInfo {
  const yFinal = opts.yFinal ?? y[y.length - 1]
  if (!Number.isFinite(yFinal) || y.some((v) => !Number.isFinite(v))) return NAN_INFO(yFinal, opts.consigne)
  const y0 = opts.yInit ?? y[0]
  const span = yFinal - y0
  const up = span >= 0
  const [lo, hi] = opts.riseLimits ?? [0.1, 0.9]
  const thr = opts.settlingThreshold ?? 0.02

  // peak
  let iPeak = 0
  for (let i = 1; i < y.length; i++) if (Math.abs(y[i]) > Math.abs(y[iPeak])) iPeak = i

  // the output never leaves its initial value (e.g. kp = ki = kd = 0): no rise,
  // no settling to measure — NaN, as MATLAB returns
  if (span === 0) {
    return { riseTime: NaN, settlingTime: NaN, overshoot: 0, peak: Math.abs(y[iPeak]), peakTime: t[iPeak], finalValue: yFinal, staticError: opts.consigne === undefined ? NaN : opts.consigne - yFinal }
  }

  const tLo = firstCrossing(t, y, y0 + lo * span, up)
  const tHi = firstCrossing(t, y, y0 + hi * span, up)

  // settling: last time the error is outside the band, interpolated to the band edge
  const band = thr * Math.abs(span)
  let settlingTime = 0
  for (let i = y.length - 1; i >= 0; i--) {
    const err = Math.abs(y[i] - yFinal)
    if (err > band) {
      if (i === y.length - 1) {
        settlingTime = NaN // never settles within the simulated window
      } else {
        const e1 = err
        const e2 = Math.abs(y[i + 1] - yFinal)
        const f = (e1 - band) / (e1 - e2)
        settlingTime = t[i] + f * (t[i + 1] - t[i])
      }
      break
    }
  }

  const extreme = up ? Math.max(...y) : Math.min(...y)
  const overshoot = Math.max(0, (100 * (extreme - yFinal)) / span)

  return {
    riseTime: tHi - tLo,
    settlingTime,
    overshoot,
    peak: Math.abs(y[iPeak]),
    peakTime: t[iPeak],
    finalValue: yFinal,
    staticError: opts.consigne === undefined ? NaN : opts.consigne - yFinal,
  }
}
