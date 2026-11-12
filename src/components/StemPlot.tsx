/**
 * MATLAB-like trace builders for Plotly: stem(), stairs(), plot().
 * They only reshape arrays for drawing; all signal values come from src/dsp.
 */
import type { Data } from 'plotly.js'
import Plot, { type PlotProps } from './Plot'

interface TraceOpts {
  name?: string
  color: string
  xaxis?: string
  yaxis?: string
  showlegend?: boolean
  /** legend group, so stem lines and markers toggle together */
  group?: string
  /** hover label format for y */
  yformat?: string
}

interface StemOpts extends TraceOpts {
  /** MATLAB stem(…, 'filled') */
  filled?: boolean
  /** marker size in px */
  size?: number
  /** MATLAB marker shape: 'circle' (default) or 'square' */
  symbol?: 'circle' | 'square'
  /** 0 by default */
  baseline?: number
  /** dim some samples (e.g. outside the overlap), one opacity per point */
  opacity?: number[]
}

/**
 * stem(x, y): one vertical line from the baseline to each value, topped by a
 * marker — an open circle by default, like MATLAB's stem(). Drawn as two
 * traces: all the lines in one trace (separated by nulls, which Plotly does
 * not join) and the markers in another.
 *
 * MATLAB: stem(n*1e3, xn, 'filled');
 */
export function stemTraces(x: readonly number[], y: readonly number[], o: StemOpts): Data[] {
  const base = o.baseline ?? 0
  const lx: (number | null)[] = []
  const ly: (number | null)[] = []
  for (let i = 0; i < x.length; i++) lx.push(x[i], x[i], null), ly.push(base, y[i], null)
  const group = o.group ?? o.name
  return [
    {
      type: 'scatter',
      mode: 'lines',
      x: lx,
      y: ly,
      line: { color: o.color, width: 1.2 },
      hoverinfo: 'skip',
      showlegend: false,
      legendgroup: group,
      xaxis: o.xaxis,
      yaxis: o.yaxis,
    },
    {
      type: 'scatter',
      mode: 'markers',
      x: [...x],
      y: [...y],
      name: o.name,
      legendgroup: group,
      showlegend: o.showlegend ?? Boolean(o.name),
      marker: {
        color: o.filled ? o.color : 'rgba(0,0,0,0)',
        size: o.size ?? 7,
        symbol: o.symbol ?? 'circle',
        line: { color: o.color, width: 1.3 },
        opacity: o.opacity,
      },
      hovertemplate: `%{x}<br>%{y${o.yformat ?? ':.4f'}}<extra>${o.name ?? ''}</extra>`,
      xaxis: o.xaxis,
      yaxis: o.yaxis,
    },
  ]
}

/**
 * stairs(x, y): each value is held until the next sample.
 * MATLAB: stairs(n*1e3, xq, 'r');
 */
export function stairsTrace(x: readonly number[], y: readonly number[], o: TraceOpts & { width?: number }): Data {
  return {
    type: 'scatter',
    mode: 'lines',
    x: [...x],
    y: [...y],
    name: o.name,
    showlegend: o.showlegend ?? Boolean(o.name),
    legendgroup: o.group,
    line: { color: o.color, width: o.width ?? 2, shape: 'hv' },
    hovertemplate: `%{x}<br>%{y${o.yformat ?? ':.4f'}}<extra>${o.name ?? ''}</extra>`,
    xaxis: o.xaxis,
    yaxis: o.yaxis,
  }
}

/**
 * plot(x, y): continuous line.
 * MATLAB: plot(t, x_cos);
 */
export function lineTrace(
  x: readonly number[],
  y: readonly number[],
  o: TraceOpts & { width?: number; dash?: 'solid' | 'dash' | 'dot'; hover?: boolean },
): Data {
  return {
    type: 'scatter',
    mode: 'lines',
    x: [...x],
    y: [...y],
    name: o.name,
    showlegend: o.showlegend ?? Boolean(o.name),
    legendgroup: o.group,
    line: { color: o.color, width: o.width ?? 2, dash: o.dash ?? 'solid' },
    hovertemplate:
      o.hover === false ? undefined : `%{x}<br>%{y${o.yformat ?? ':.4f'}}<extra>${o.name ?? ''}</extra>`,
    hoverinfo: o.hover === false ? 'skip' : undefined,
    xaxis: o.xaxis,
    yaxis: o.yaxis,
  }
}

/** Convenience component: a single stem plot. */
export default function StemPlot({
  x,
  y,
  color,
  name,
  ...plot
}: Omit<PlotProps, 'data'> & { x: number[]; y: number[]; color: string; name?: string }) {
  return <Plot data={stemTraces(x, y, { color, name })} {...plot} />
}
