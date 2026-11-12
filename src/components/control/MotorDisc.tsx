/**
 * DC motor seen from the side: stator housing, shaft and a flywheel disc that
 * turns by the simulated angle θ(t) = ∫Ω dt. When the load torque cr acts, a
 * brake shoe presses on the rim.
 */
interface MotorDiscProps {
  /** shaft angle (rad), integral of the speed */
  angle: number
  /** speed (rad/s), for the readout */
  speed: number
  /** load torque currently applied (N·m) */
  load: number
  label: string
}

const CX = 168
const CY = 100
const R = 62

export default function MotorDisc({ angle, speed, load, label }: MotorDiscProps) {
  const deg = (angle * 180) / Math.PI
  const spokes = Array.from({ length: 6 }, (_, i) => (i * Math.PI) / 3)
  return (
    <svg viewBox="0 0 250 200" role="img" aria-label={label} className="block w-full">
      {/* stator housing with cooling fins */}
      <rect x={8} y={62} width={70} height={76} rx={6} className="fill-sheet stroke-ink-soft" strokeWidth={1.6} />
      {[74, 86, 98, 110, 122].map((y) => (
        <path key={y} d={`M14 ${y} H72`} className="stroke-rule-strong" strokeWidth={1.2} />
      ))}
      <text x={43} y={154} textAnchor="middle" className="fill-ink-faint font-mono text-[11px]">
        MCC
      </text>
      {/* shaft */}
      <rect x={78} y={95} width={CX - 78} height={10} className="fill-rule-strong" />

      {/* flywheel */}
      <g transform={`rotate(${deg.toFixed(2)} ${CX} ${CY})`}>
        <circle cx={CX} cy={CY} r={R} className="fill-screen stroke-ink-soft" strokeWidth={2} />
        <circle cx={CX} cy={CY} r={R - 9} fill="none" className="stroke-rule-strong" strokeWidth={1} />
        {spokes.map((a) => (
          <path key={a} d={`M${CX} ${CY} L${CX + (R - 9) * Math.cos(a)} ${CY + (R - 9) * Math.sin(a)}`} className="stroke-rule-strong" strokeWidth={4} />
        ))}
        {/* index mark, so the rotation is easy to follow */}
        <path d={`M${CX + R - 18} ${CY} L${CX + R - 2} ${CY}`} stroke="#5ef0a0" strokeWidth={5} strokeLinecap="round" />
        <circle cx={CX} cy={CY} r={9} className="fill-sheet stroke-ink-soft" strokeWidth={1.5} />
      </g>

      {/* brake shoe = load torque cr */}
      {load > 0 && (
        <g>
          <rect x={CX - 20} y={CY - R - 15} width={40} height={11} rx={2} className="fill-pen" />
          <path d={`M${CX} ${CY - R - 15} V${CY - R - 30}`} className="stroke-pen" strokeWidth={3} />
          <text x={CX - 26} y={CY - R - 6} textAnchor="end" className="fill-pen font-mono text-[11px]">
            cr = {load} N·m
          </text>
        </g>
      )}

      <text x={CX} y={194} textAnchor="middle" className="fill-ch2 font-mono text-[13px]">
        Ω = {speed.toFixed(2)} rad/s
      </text>
    </svg>
  )
}
