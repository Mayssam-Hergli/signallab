/**
 * One complex number (re + j·im). Poles and zeros are scalars, unlike the
 * complex *vectors* of src/dsp/fft.ts, hence a separate, minimal type.
 */
export interface Cplx {
  re: number
  im: number
}

export const cx = (re: number, im = 0): Cplx => ({ re, im })
export const cadd = (a: Cplx, b: Cplx): Cplx => ({ re: a.re + b.re, im: a.im + b.im })
export const csub = (a: Cplx, b: Cplx): Cplx => ({ re: a.re - b.re, im: a.im - b.im })
export const cmul = (a: Cplx, b: Cplx): Cplx => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re })

export function cdiv(a: Cplx, b: Cplx): Cplx {
  const d = b.re * b.re + b.im * b.im
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d }
}

/** MATLAB: abs(z) */
export const cabs = (a: Cplx): number => Math.hypot(a.re, a.im)

/** Sorts like MATLAB's display of pole(): by real part, then imaginary part. */
export function sortCplx(zs: Cplx[]): Cplx[] {
  return [...zs].sort((a, b) => a.re - b.re || a.im - b.im)
}
