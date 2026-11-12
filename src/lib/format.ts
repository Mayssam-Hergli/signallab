/** Number formatting for readouts (dot decimal separator, like MATLAB's output). */

/** Fixed number of decimals. */
export function fmt(v: number, digits = 2): string {
  if (!Number.isFinite(v)) return v > 0 ? '∞' : v < 0 ? '−∞' : '—'
  return v.toFixed(digits).replace(/^-/, '−')
}

/** Frequency in kHz with up to 2 decimals, trailing zeros removed: 1100 → "1.1". */
export function kHz(hz: number): string {
  return String(Number((hz / 1000).toFixed(2)))
}

/** MATLAB's %.2e: 4.44e-16, 0.00e+00 (sign and two-digit exponent). */
export function sci(v: number, digits = 2): string {
  if (!Number.isFinite(v)) return fmt(v)
  const [mant, exp] = v.toExponential(digits).split('e')
  const e = Number(exp)
  return `${mant.replace(/^-/, '−')}e${e < 0 ? '-' : '+'}${String(Math.abs(e)).padStart(2, '0')}`
}
