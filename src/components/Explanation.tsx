/**
 * Building blocks for the explanations, styled as annotations in amber (like a
 * scope's cursor readout) with a thin left border. Explanations are JSX so
 * formulas and live values (computed by src/dsp) can be mixed with text.
 */
import 'katex/dist/katex.min.css'
import type { ReactNode } from 'react'
import { BlockMath, InlineMath } from 'react-katex'

/** Inline formula: <M>{'f_e > 2f_0'}</M> */
export function M({ children }: { children: string }) {
  return <InlineMath math={children} />
}

/** Display formula on its own line. */
export function MBlock({ children }: { children: string }) {
  return <BlockMath math={children} />
}

/** Sub-heading inside an explanation. */
export function H({ children }: { children: ReactNode }) {
  return <h4 className="mt-5 mb-1 font-semibold first:mt-0">{children}</h4>
}

/** Boxed "Conclusion" block for the key take-aways. */
export function Conclusion({ children, title = 'Conclusion' }: { children: ReactNode; title?: string }) {
  return (
    <aside className="my-4 border-[1.5px] border-pen/80 bg-pen/[0.04] px-4 py-3">
      <p className="mb-1 font-semibold">{title}</p>
      <div className="space-y-2">{children}</div>
    </aside>
  )
}

/** Container: amber annotation with a thin left border. */
export default function Explanation({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-2.5 border-l-2 border-pen/60 pl-4 leading-relaxed text-pen/95 [&_.katex-display]:text-[0.95em] [&_code]:text-[0.9em] [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
      {children}
    </div>
  )
}
