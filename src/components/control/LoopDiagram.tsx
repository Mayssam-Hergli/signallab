/**
 * Block diagram of a sampled loop, redrawn in SVG from the handout figures:
 *
 *   input →(⊗)→ sampler → [C(s)] → sampler → [B0(s)] → [G1(s)] →┬→ output
 *            ↑−                                                  │
 *            └───────────────────────────────────────────────────┘
 *
 * Each block shows its current value; when that value changes (a slider
 * moved) the block lights up in phosphor green for a moment, so the reader
 * sees which part of the loop the slider acts on.
 */
import { useFlash } from './flash'

export type LoopItem =
  /** title: `_x` makes x a subscript, e.g. "B_0(s)" */
  | { kind: 'block'; id: string; title: string; value?: string }
  | { kind: 'sampler'; id: string; value: string }

interface LoopDiagramProps {
  input: string
  output: string
  /** label of the error signal after the summing junction (Figure 3.2: ε) */
  error?: string
  items: LoopItem[]
  /** accessible description */
  label: string
}

const H = 170
const Y = 62 // signal line
const YFB = 140 // feedback line
const BLOCK_H = 60
const SAMPLER_W = 60
const GAP = 22

/** "B_0(s)" → B with a subscript 0 (the Unicode ₀ looks like an "o" in the italic serif). */
function Title({ text }: { text: string }) {
  const parts = text.split(/_(\w)/)
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <tspan key={i} baselineShift="sub" fontSize="0.72em">
            {part}
          </tspan>
        ) : (
          part
        ),
      )}
    </>
  )
}

function blockWidth(item: Extract<LoopItem, { kind: 'block' }>): number {
  const chars = item.title.replace(/_/g, '').length
  return Math.max(104, chars * 8.6 + 30, (item.value?.length ?? 0) * 7.6 + 26)
}

function Block({ x, item }: { x: number; item: Extract<LoopItem, { kind: 'block' }> }) {
  const lit = useFlash(item.value)
  const w = blockWidth(item)
  return (
    <g>
      <rect
        x={x}
        y={Y - BLOCK_H / 2}
        width={w}
        height={BLOCK_H}
        className={`transition-[fill,stroke] duration-300 ${lit ? 'fill-trace/15 stroke-trace' : 'fill-sheet stroke-rule-strong'}`}
        strokeWidth={1.5}
      />
      <text x={x + w / 2} y={item.value ? Y - 5 : Y + 5} textAnchor="middle" className="fill-ink font-serif text-[15px] italic">
        <Title text={item.title} />
      </text>
      {item.value && (
        <text
          x={x + w / 2}
          y={Y + 17}
          textAnchor="middle"
          className={`font-mono text-[12.5px] transition-[fill] duration-300 ${lit ? 'fill-trace' : 'fill-ink-soft'}`}
        >
          {item.value}
        </text>
      )}
    </g>
  )
}

function Sampler({ x, value }: { x: number; value: string }) {
  const lit = useFlash(value)
  const cls = `transition-[stroke,fill] duration-300 ${lit ? 'stroke-trace' : 'stroke-ink-soft'}`
  return (
    <g>
      <path d={`M${x} ${Y} H${x + 16} L${x + SAMPLER_W - 18} ${Y - 14}`} fill="none" strokeWidth={1.6} className={cls} />
      <path d={`M${x + SAMPLER_W - 14} ${Y} H${x + SAMPLER_W}`} fill="none" strokeWidth={1.6} className={cls} />
      <text x={x + SAMPLER_W / 2} y={Y + 22} textAnchor="middle" className={`font-mono text-[12px] ${lit ? 'fill-trace' : 'fill-ink-faint'}`}>
        {value}
      </text>
    </g>
  )
}

export default function LoopDiagram({ input, output, error, items, label }: LoopDiagramProps) {
  const SUM_X = 92
  const R = 13
  // positions
  let x = SUM_X + R + GAP + (error ? 14 : 0)
  const placed = items.map((item) => {
    const w = item.kind === 'block' ? blockWidth(item) : SAMPLER_W
    const at = x
    x += w + (item.kind === 'sampler' ? 4 : GAP)
    return { item, at, w }
  })
  const tapX = x + 18
  const W = tapX + 90

  return (
    <figure className="border border-rule-strong bg-screen">
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="block w-full min-w-[40rem]">
          <defs>
            <marker id="loop-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" className="fill-ink-soft" />
            </marker>
          </defs>

          {/* input */}
          <text x={12} y={Y - 12} className="fill-ink font-serif text-[15px] font-semibold italic">
            {input}
          </text>
          <path d={`M10 ${Y} H${SUM_X - R}`} className="stroke-ink-soft" strokeWidth={1.4} markerEnd="url(#loop-arrow)" />
          <text x={SUM_X - R - 14} y={Y + 24} className="fill-ink-soft font-mono text-[15px]">
            +
          </text>

          {/* summing junction ⊗ */}
          <circle cx={SUM_X} cy={Y} r={R} className="fill-sheet stroke-ink-soft" strokeWidth={1.4} />
          <path
            d={`M${SUM_X - R * 0.7} ${Y - R * 0.7} L${SUM_X + R * 0.7} ${Y + R * 0.7} M${SUM_X - R * 0.7} ${Y + R * 0.7} L${SUM_X + R * 0.7} ${Y - R * 0.7}`}
            className="stroke-ink-soft"
            strokeWidth={1.2}
          />
          <text x={SUM_X + 6} y={Y + R + 16} className="fill-ink-soft font-mono text-[16px]">
            −
          </text>
          {error && (
            <text x={SUM_X + R + 8} y={Y - 12} className="fill-ink font-serif text-[15px] italic">
              {error}
            </text>
          )}

          {/* wires between items */}
          {placed.map(({ item, at, w }, i) => {
            const prevEnd = i === 0 ? SUM_X + R : placed[i - 1].at + placed[i - 1].w
            const wire = <path key={`w-${item.id}`} d={`M${prevEnd} ${Y} H${at}`} className="stroke-ink-soft" strokeWidth={1.4} />
            return (
              <g key={item.id}>
                {wire}
                {item.kind === 'block' ? <Block x={at} item={item} /> : <Sampler x={at} value={item.value} />}
                {i === placed.length - 1 && (
                  <path d={`M${at + w} ${Y} H${W - 14}`} className="stroke-ink-soft" strokeWidth={1.4} markerEnd="url(#loop-arrow)" />
                )}
              </g>
            )
          })}

          {/* output and feedback */}
          <text x={W - 14} y={Y - 12} textAnchor="end" className="fill-ink font-serif text-[15px] font-semibold italic">
            {output}
          </text>
          <circle cx={tapX} cy={Y} r={2.6} className="fill-ink-soft" />
          <path
            d={`M${tapX} ${Y} V${YFB} H${SUM_X} V${Y + R}`}
            fill="none"
            className="stroke-ink-soft"
            strokeWidth={1.4}
            markerEnd="url(#loop-arrow)"
          />
        </svg>
      </div>
    </figure>
  )
}
