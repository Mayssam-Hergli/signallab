/**
 * The three figures of Q1–Q4 (and again for x2 in Q5–Q6): the record x[n],
 * Re/Im of fftshift(fft(x)) on two rows, and the amplitude spectrum |X|.
 */
import type { Layout } from 'plotly.js'
import type { ReactNode } from 'react'
import Plot, { axisRefs, mergeAxes, stackedLayout } from '../../../components/Plot'
import { stemTraces } from '../../../components/StemPlot'
import { C } from '../../../components/theme'
import { FE, maxAbs, type DftView } from './model'

const fAxis = { title: { text: 'f (Hz)' }, range: [-FE / 2 - 15, FE / 2 + 5], dtick: 100 }

/** y range shared by Re and Im, so a numerically-zero Im reads as flat (not as 1e-14 noise blown up). */
function sharedRange(v: DftView): [number, number] {
  const top = Math.max(maxAbs(v.re), maxAbs(v.im)) * 1.15 || 1
  return [-top, top]
}

export function SignalFigure({ v, name, color = C.blue, caption }: { v: DftView; name: string; color?: string; caption: ReactNode }) {
  const t = v.n.map((n) => (n * 1e3) / FE) // n·Te in ms
  const top = Math.max(...v.x)
  const bottom = Math.min(...v.x, 0)
  const pad = (top - bottom) * 0.12 || 1
  return (
    <Plot
      data={stemTraces(t, v.x, { name: `${name}[n]`, color, size: 4.5, showlegend: false })}
      layout={{
        xaxis: { title: { text: 't = n·Te (ms)' } },
        yaxis: { title: { text: `${name}[n]` }, range: [bottom - pad, top + pad] },
        margin: { l: 64, r: 24, t: 20, b: 54 },
      }}
      height={240}
      caption={caption}
    />
  )
}

export function ReImFigure({ v, name, caption }: { v: DftView; name: string; caption: ReactNode }) {
  const range = sharedRange(v)
  const div = v.scaled ? '/N' : ''
  const layout = mergeAxes(stackedLayout([`Re{${name}(f)}${div}`, `Im{${name}(f)}${div}`], 0.16), {
    xaxis: { ...fAxis, title: { text: '' } },
    xaxis2: fAxis,
    yaxis: { range },
    yaxis2: { range },
  })
  return (
    <Plot
      data={[
        ...stemTraces(v.f, v.re, { color: C.blue, size: 5, ...axisRefs(0), name: 'Re' }),
        ...stemTraces(v.f, v.im, { color: C.orange, size: 5, ...axisRefs(1), name: 'Im' }),
      ]}
      layout={{ ...layout, showlegend: false, margin: { l: 64, r: 24, t: 30, b: 54 } } as Partial<Layout>}
      height={420}
      caption={caption}
    />
  )
}

export function MagFigure({
  v,
  name,
  caption,
  labels = [],
}: {
  v: DftView
  name: string
  caption: ReactNode
  /** frequencies (Hz) whose value is written above the line */
  labels?: number[]
}) {
  const top = maxAbs(v.mag) * 1.22 || 1
  const annotations = labels.map((hz) => {
    let i = 0
    for (let k = 1; k < v.f.length; k++) if (Math.abs(v.f[k] - hz) < Math.abs(v.f[i] - hz)) i = k
    return {
      x: v.f[i],
      y: v.mag[i],
      text: v.mag[i].toFixed(v.scaled ? 2 : 1),
      showarrow: false,
      yshift: 14,
      font: { size: 13, color: C.yellow },
    }
  })
  return (
    <Plot
      data={stemTraces(v.f, v.mag, { color: C.blue, size: 5, name: `|${name}|` })}
      layout={{
        xaxis: fAxis,
        yaxis: { title: { text: `|${name}(f)|${v.scaled ? '/N' : ''}` }, range: [0, top] },
        showlegend: false,
        annotations,
        margin: { l: 64, r: 24, t: 20, b: 54 },
      }}
      height={300}
      caption={caption}
    />
  )
}
