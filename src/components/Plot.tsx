/**
 * Plotly wrapper styled like an oscilloscope screen: near-black plotting area,
 * dotted graticule, boxed axes with inward ticks (as MATLAB's box on), bright
 * traces in MATLAB's colour order.
 *
 * - Uses react-plotly.js/factory with plotly.js-dist-min (the prebuilt,
 *   minified bundle) instead of the full plotly.js source package.
 * - Every axis found in `layout` (xaxis, yaxis2, …) is merged over the MATLAB
 *   defaults, so sections only describe what is specific to their figure.
 * - Every figure has a one-sentence caption: "Ce que vous voyez : …".
 */
import type { Config, Data, Layout } from 'plotly.js'
import Plotly from 'plotly.js-dist-min'
import type { ReactNode } from 'react'
import createPlotlyComponent from 'react-plotly.js/factory'
import { usePresentation } from '../lib/presentation'
import { C, FIG_FONT } from './theme'

const PlotlyComponent = createPlotlyComponent(Plotly)

// Projector rule: no text in a figure below 13 px.
const AXIS_DEFAULTS = {
  showgrid: true, // graticule
  gridcolor: C.grid,
  gridwidth: 1,
  griddash: 'dot',
  zeroline: false, // MATLAB draws no special zero line
  showline: true,
  linecolor: C.frame,
  linewidth: 1,
  mirror: 'ticks' as const, // MATLAB: box on (ticks on all four sides)
  ticks: 'inside' as const, // MATLAB ticks point inwards
  ticklen: 5,
  tickcolor: C.axis,
  tickfont: { family: FIG_FONT, size: 13, color: C.axis },
  title: { font: { family: FIG_FONT, size: 14, color: C.axis } },
  automargin: true,
}

const BASE_LAYOUT: Partial<Layout> = {
  paper_bgcolor: C.figure,
  plot_bgcolor: C.screen,
  font: { family: FIG_FONT, size: 13, color: C.axis },
  margin: { l: 64, r: 24, t: 36, b: 54 },
  showlegend: true,
  // MATLAB: legend(..., 'Location', 'northoutside', 'Orientation', 'horizontal')
  legend: {
    orientation: 'h',
    x: 0.5,
    xanchor: 'center',
    y: 1.02,
    yanchor: 'bottom',
    bgcolor: 'rgba(0,0,0,0)',
    bordercolor: C.frame,
    borderwidth: 1,
    font: { family: FIG_FONT, size: 13, color: C.axis },
  },
  hoverlabel: { bgcolor: C.figure, bordercolor: C.frame, font: { family: FIG_FONT, size: 13, color: C.axis } },
  hovermode: 'closest',
}

const CONFIG: Partial<Config> = {
  displaylogo: false,
  responsive: true,
  modeBarButtonsToRemove: ['lasso2d', 'select2d', 'toggleSpikelines'],
  toImageButtonOptions: { format: 'png', scale: 2 },
}

const isAxisKey = (k: string) => /^[xy]axis\d*$/.test(k)

/** Font sizes ×k (presentation mode): base fonts, axes, legend, annotations. */
function scaleFonts(out: Record<string, unknown>, k: number) {
  if (k === 1) return
  const bump = (f: unknown) => (f && typeof f === 'object' && 'size' in f ? { ...f, size: Math.round((f as { size: number }).size * k) } : f)
  out.font = bump(out.font)
  if (out.legend) out.legend = { ...(out.legend as object), font: bump((out.legend as { font?: unknown }).font) }
  if (out.hoverlabel) out.hoverlabel = { ...(out.hoverlabel as object), font: bump((out.hoverlabel as { font?: unknown }).font) }
  for (const key of Object.keys(out)) {
    if (!isAxisKey(key)) continue
    const ax = out[key] as { tickfont?: unknown; title?: { font?: unknown } }
    out[key] = { ...ax, tickfont: bump(ax.tickfont), title: ax.title ? { ...ax.title, font: bump(ax.title.font) } : ax.title }
  }
  if (Array.isArray(out.annotations)) {
    out.annotations = out.annotations.map((a: { font?: unknown }) => ({ ...a, font: bump(a.font) }))
  }
  const title = out.title as { font?: unknown } | undefined
  if (title && typeof title === 'object') out.title = { ...title, font: bump(title.font ?? { size: 14 }) }
}

/** Merges the MATLAB-like defaults under every axis of the layout. */
function themeLayout(layout: Partial<Layout>, height: number, fontScale = 1): Partial<Layout> {
  const out: Record<string, unknown> = { ...BASE_LAYOUT, height, uirevision: 'keep' }
  // the default axes must be styled even if the section does not mention them
  const keys = new Set(['xaxis', 'yaxis', ...Object.keys(layout)])
  for (const key of keys) {
    const value = (layout as Record<string, unknown>)[key]
    if (isAxisKey(key)) {
      const axis = (value ?? {}) as Record<string, unknown>
      const title =
        typeof axis.title === 'string'
          ? { ...AXIS_DEFAULTS.title, text: axis.title }
          : { ...AXIS_DEFAULTS.title, ...((axis.title as object) ?? {}) }
      out[key] = { ...AXIS_DEFAULTS, ...axis, title }
    } else if (value !== undefined) {
      out[key] = value
    }
  }
  scaleFonts(out, fontScale)
  return out as Partial<Layout>
}

export interface PlotProps {
  data: Data[]
  layout?: Partial<Layout>
  height?: number
  /** completes "Ce que vous voyez : …" */
  caption: ReactNode
}

export default function Plot({ data, layout = {}, height = 360, caption }: PlotProps) {
  // presentation mode: taller figures, larger text
  const { on } = usePresentation()
  height = on ? Math.round(height * 1.3) : height
  return (
    <figure className="border border-rule-strong bg-[#0d131a]">
      <PlotlyComponent
        data={data}
        layout={themeLayout(layout, height, on ? 1.25 : 1)}
        config={CONFIG}
        useResizeHandler
        style={{ width: '100%', height }}
      />
      <figcaption className="border-t border-rule bg-sheet px-4 py-2 text-[0.92rem] leading-snug text-ink-soft">
        <em className="text-ink">Ce que vous voyez :</em> {caption}
      </figcaption>
    </figure>
  )
}

/**
 * Layout for n subplots stacked vertically (like MATLAB subplot(n,1,k)), each
 * with its own x and y axes and a bold title above it (MATLAB title()).
 * Returns the axes and annotations to spread into a layout; trace k must use
 * xaxis: `x${k+1}` / yaxis: `y${k+1}` (k = 0 → 'x' / 'y'), see axisRefs().
 */
export function stackedLayout(titles: string[], gap = 0.09): Partial<Layout> {
  const n = titles.length
  const h = (1 - gap * (n - 1)) / n
  const out: Record<string, unknown> = { annotations: [] as unknown[] }
  titles.forEach((title, k) => {
    const top = 1 - k * (h + gap)
    const suffix = k === 0 ? '' : String(k + 1)
    out[`xaxis${suffix}`] = { anchor: `y${suffix}` }
    out[`yaxis${suffix}`] = { domain: [top - h, top], anchor: `x${suffix}` }
    ;(out.annotations as unknown[]).push({
      text: `<b>${title}</b>`,
      xref: 'paper',
      yref: 'paper',
      x: 0.5,
      y: top,
      yanchor: 'bottom',
      xanchor: 'center',
      yshift: 2,
      showarrow: false,
      font: { family: FIG_FONT, size: 14, color: C.axis },
    })
  })
  return out as Partial<Layout>
}

/** Axis ids of subplot k (0-based) for stackedLayout. */
export function axisRefs(k: number): { xaxis: string; yaxis: string } {
  const s = k === 0 ? '' : String(k + 1)
  return { xaxis: `x${s}`, yaxis: `y${s}` }
}

/** Merges per-axis overrides (e.g. titles) into a stacked layout. */
export function mergeAxes(base: Partial<Layout>, extra: Record<string, object>): Partial<Layout> {
  const out: Record<string, unknown> = { ...base }
  for (const [k, v] of Object.entries(extra)) {
    out[k] = { ...((out[k] as object) ?? {}), ...v }
  }
  return out as Partial<Layout>
}
