/** Sequences of TP2 parts A and B, shared by the sections. */

/** MATLAB: N = 10; M = 2*N;  (part A) */
export const N_TP = 10
/** MATLAB: g = 0.7.^(0:M-1); */
export const A_TP = 0.7

export const FILE = 'tp2_convolution.m'

/** MATLAB: x = ones(1, N); g = a.^(0:M-1); */
export function tpSequences(N: number, a: number, M = 2 * N): { x: number[]; g: number[] } {
  return {
    x: new Array<number>(N).fill(1),
    g: Array.from({ length: M }, (_, n) => a ** n),
  }
}

/** 0, 1, …, L−1 (MATLAB: 0:L-1) */
export const idx = (L: number): number[] => Array.from({ length: L }, (_, n) => n)
