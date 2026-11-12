/**
 * Figure colours for Plotly (literal strings; Plotly cannot read CSS variables).
 * Figures look like an oscilloscope / spectrum-analyser screen: near-black
 * screen, dotted graticule, bright traces. The hues keep MATLAB's colour order
 * (blue, orange, yellow, purple…) because the captions name them ("tiges
 * bleues", "escalier rouge"), only lifted so they read on a dark screen.
 * Keep in sync with src/index.css.
 */
export const C = {
  blue: '#4DA6FF',
  orange: '#FF8A3D',
  yellow: '#F2C14E',
  purple: '#C486E6',
  green: '#8FD14F',
  /** MATLAB 'r', used by the TP for xline('r--') and stairs(…, 'r') */
  red: '#FF5252',
  /** the TP's "continuous" reference, grey */
  continuous: '#7d8894',

  /** axes, ticks and labels */
  axis: '#aeb8c3',
  /** graticule */
  grid: 'rgba(120, 200, 160, 0.24)',
  /** outer figure (the instrument bezel) */
  figure: '#0d131a',
  /** plotting area (the screen) */
  screen: '#050807',
  frame: '#3a4859',
  ink: '#e2e7ec',
  inkSoft: '#98a4b2',
} as const

/** Sans-serif in figures, like an instrument's screen labels. */
export const FIG_FONT = 'Helvetica, Arial, sans-serif'
