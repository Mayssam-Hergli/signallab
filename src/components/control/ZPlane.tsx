/**
 * z-plane: unit circle, root locus of K·G(z) with unity feedback, open-loop
 * poles (×), and the current closed-loop pole(s): green inside the circle,
 * red on or outside it. Axis equal, like MATLAB's `rlocus(Gz); zgrid; axis equal`.
 */
import type { Data, Layout } from 'plotly.js'
import type { ReactNode } from 'react'
import { cabs, type Cplx } from '../../control'
import Plot from '../Plot'
import { C } from '../theme'

interface ZPlaneProps {
  /** locus branches, each a list of points in K order */
  branches: Cplx[][]
  /** open-loop poles (K = 0), drawn as × */
  openLoop: Cplx[]
  /** current closed-loop poles */
  current: Cplx[]
  /** current K, for the hover label */
  K: number
  /** where the locus leaves the circle, with the limit gain */
  crossing?: { z: Cplx; K: number }
  /** visible real range; poles outside are pinned to the edge with a label */
  xRange?: [number, number]
  height?: number
  caption: ReactNode
  title?: string
}

const circle = (() => {
  const th = Array.from({ length: 241 }, (_, i) => (2 * Math.PI * i) / 240)
  return { x: th.map(Math.cos), y: th.map(Math.sin) }
})()

export default function ZPlane({ branches, openLoop, current, K, crossing, xRange = [-1.6, 1.4], height = 400, caption, title }: ZPlaneProps) {
  const [x0, x1] = xRange
  const data: Data[] = [
    {
      type: 'scatter',
      mode: 'lines',
      x: circle.x,
      y: circle.y,
      line: { color: C.continuous, width: 1.2, dash: 'dash' },
      name: '|z| = 1',
      hoverinfo: 'skip',
    },
    ...branches.map(
      (b, i): Data => ({
        type: 'scatter',
        mode: 'lines',
        x: b.map((z) => z.re),
        y: b.map((z) => z.im),
        line: { color: C.blue, width: 2.5 },
        name: 'lieu des racines',
        showlegend: i === 0,
        legendgroup: 'locus',
        hoverinfo: 'skip',
      }),
    ),
    {
      type: 'scatter',
      mode: 'markers',
      x: openLoop.map((z) => z.re),
      y: openLoop.map((z) => z.im),
      marker: { symbol: 'x-thin', size: 13, line: { color: C.ink, width: 2 } },
      name: 'pôle en BO (K = 0)',
      hovertemplate: 'z = %{x:.4f}<extra>K = 0</extra>',
    },
  ]
  if (crossing) {
    data.push({
      type: 'scatter',
      mode: 'markers',
      x: [crossing.z.re],
      y: [crossing.z.im],
      marker: { symbol: 'diamond-open', size: 11, color: C.yellow, line: { color: C.yellow, width: 2 } },
      name: `K limite = ${crossing.K.toFixed(3)}`,
      hovertemplate: `z = %{x:.3f}<extra>K = ${crossing.K.toFixed(4)}</extra>`,
    })
  }

  const annotations: Partial<Layout>['annotations'] = []
  const pinned = current.map((z) => {
    const out = z.re < x0 || z.re > x1
    const re = Math.max(x0 + 0.05, Math.min(x1 - 0.05, z.re))
    if (out) {
      annotations.push({
        x: re,
        y: z.im,
        text: `${z.re < x0 ? '← ' : ''}z = ${z.re.toFixed(2)}${z.re > x1 ? ' →' : ''}`,
        showarrow: false,
        yshift: 18,
        font: { size: 13, color: C.red },
      })
    }
    return { ...z, re }
  })
  data.push({
    type: 'scatter',
    mode: 'markers',
    x: pinned.map((z) => z.re),
    y: pinned.map((z) => z.im),
    marker: {
      size: 14,
      color: current.map((z) => (cabs(z) < 1 ? C.green : C.red)),
      line: { color: C.screen, width: 1.5 },
    },
    name: `pôle en BF (K = ${K.toFixed(2)})`,
    customdata: current.map((z) => cabs(z)),
    hovertemplate: `z = %{x:.4f}<br>|z| = %{customdata:.4f}<extra>K = ${K.toFixed(3)}</extra>`,
  })

  const layout: Partial<Layout> = {
    xaxis: { title: { text: 'Re(z)' }, range: [x0, x1], zeroline: true, zerolinecolor: C.frame },
    yaxis: { title: { text: 'Im(z)' }, scaleanchor: 'x', scaleratio: 1, zeroline: true, zerolinecolor: C.frame },
    annotations,
    title: title ? { text: title, font: { size: 14 } } : undefined,
    margin: { l: 60, r: 20, t: title ? 70 : 40, b: 54 },
  }
  return <Plot data={data} layout={layout} height={height} caption={caption} />
}
