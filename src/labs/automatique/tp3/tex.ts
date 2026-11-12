/** Number formatting for KaTeX strings (ASCII minus, fixed decimals). */
export function tn(v: number, digits = 4): string {
  if (!Number.isFinite(v)) return v > 0 ? '\\infty' : '-\\infty'
  const s = v.toFixed(digits)
  return s === `-${(0).toFixed(digits)}` ? (0).toFixed(digits) : s
}

/** "z - 0.9048" or "z + 0.2310": the factor (z − p) for a real p. */
export function zMinus(p: number, digits = 4, v = 'z'): string {
  return p >= 0 ? `${v} - ${tn(p, digits)}` : `${v} + ${tn(-p, digits)}`
}
