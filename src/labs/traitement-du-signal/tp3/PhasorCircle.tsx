import { C, FIG_FONT } from '../../../components/theme'
import { fmt } from '../../../lib/format'
import { piLabel } from './model'

const S = 320 // viewBox size
const CX = S / 2
const CY = S / 2
const R = 112 // pixels for |X|/N = 0.5

/** complex value (in units of |X|/N) → SVG point */
const pt = (re: number, im: number): [number, number] => [CX + (re / 0.5) * R, CY - (im / 0.5) * R]

/**
 * The +100 Hz line of X3/N in the complex plane: 0.5·e^{jφ}. The reference
 * (X2 with amplitude 1, φ = 0) is the blue phasor on the real axis; moving φ
 * turns the orange phasor on the circle of radius 0.5 — its projections (Re,
 * Im) change, its length (the amplitude) does not. The −100 Hz line is the
 * conjugate (dotted).
 */
export default function PhasorCircle({ phi }: { phi: number }) {
  const re = 0.5 * Math.cos(phi)
  const im = 0.5 * Math.sin(phi)
  const [px, py] = pt(re, im)
  const [cx, cy] = pt(re, -im)
  const [rx] = pt(0.5, 0)

  // angle arc from 0 to φ, radius 34 px (SVG y points down: sweep flag follows the sign of φ)
  const ar = 34
  const arcEnd: [number, number] = [CX + ar * Math.cos(phi), CY - ar * Math.sin(phi)]
  const large = Math.abs(phi) > Math.PI ? 1 : 0
  const sweep = phi < 0 ? 1 : 0
  const arc = Math.abs(phi) > 1e-6 ? `M ${CX + ar} ${CY} A ${ar} ${ar} 0 ${large} ${sweep} ${arcEnd[0]} ${arcEnd[1]}` : ''
  const mid = phi / 2
  const lbl: [number, number] = [CX + (ar + 18) * Math.cos(mid), CY - (ar + 18) * Math.sin(mid)]

  const text = { fontFamily: FIG_FONT, fontSize: 13 }

  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="w-full max-w-[22rem]" role="img" aria-label={`Raie à +100 Hz : 0,5·e^{j${piLabel(phi)}}`}>
      {/* axes */}
      <line x1={14} y1={CY} x2={S - 14} y2={CY} stroke={C.frame} strokeWidth={1} />
      <line x1={CX} y1={14} x2={CX} y2={S - 14} stroke={C.frame} strokeWidth={1} />
      <text x={S - 14} y={CY - 6} textAnchor="end" fill={C.axis} style={text}>
        Re
      </text>
      <text x={CX + 6} y={24} fill={C.axis} style={text}>
        Im
      </text>
      {/* circle |X|/N = 0.5 */}
      <circle cx={CX} cy={CY} r={R} fill="none" stroke={C.grid} strokeWidth={1.2} strokeDasharray="3 4" />
      <text x={CX - R * 0.72} y={CY + R * 0.72 + 16} textAnchor="middle" fill={C.inkSoft} style={text}>
        |X|/N = 0,5
      </text>

      {/* −100 Hz: conjugate */}
      <line x1={CX} y1={CY} x2={cx} y2={cy} stroke={C.orange} strokeOpacity={0.45} strokeWidth={1.5} strokeDasharray="2 4" />
      <circle cx={cx} cy={cy} r={3.5} fill="none" stroke={C.orange} strokeOpacity={0.5} />

      {/* reference: X2 (φ = 0) */}
      <line x1={CX} y1={CY} x2={rx} y2={CY} stroke={C.blue} strokeWidth={3} />
      <circle cx={rx} cy={CY} r={4.5} fill={C.blue} />

      {/* projections of X3(+100)/N */}
      <line x1={px} y1={py} x2={px} y2={CY} stroke={C.yellow} strokeWidth={1} strokeDasharray="4 3" />
      <line x1={px} y1={py} x2={CX} y2={py} stroke={C.yellow} strokeWidth={1} strokeDasharray="4 3" />
      <text x={px} y={CY + (im >= 0 ? 18 : -8)} textAnchor="middle" fill={C.yellow} style={text}>
        {fmt(re, 3)}
      </text>
      <text x={CX + (re >= 0 ? -6 : 6)} y={py + 4} textAnchor={re >= 0 ? 'end' : 'start'} fill={C.yellow} style={text}>
        {fmt(im, 3)}j
      </text>

      {/* angle */}
      {arc && <path d={arc} fill="none" stroke={C.orange} strokeWidth={1.2} />}
      {arc && (
        <text x={lbl[0]} y={lbl[1] + 4} textAnchor="middle" fill={C.orange} style={text}>
          φ
        </text>
      )}

      {/* X3(+100)/N */}
      <line x1={CX} y1={CY} x2={px} y2={py} stroke={C.orange} strokeWidth={3} />
      <circle cx={px} cy={py} r={5} fill={C.orange} />
    </svg>
  )
}
