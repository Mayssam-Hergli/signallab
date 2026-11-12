/**
 * Helpers to display MATLAB source files: split a .m file into its "%%" cells
 * and tokenize lines for syntax highlighting. Pure functions, unit-tested.
 */

export interface MatlabCell {
  /** text after "%%" on the cell's first line, trimmed */
  title: string
  /** 1-based line number of the "%%" line in the original file */
  startLine: number
  /** 1-based line number of the last non-empty line of the cell */
  endLine: number
  /** lines startLine..endLine */
  lines: string[]
}

/** Splits a .m file into cells. Lines before the first "%%" are ignored. */
export function splitCells(source: string): MatlabCell[] {
  const all = source.replace(/\r\n?/g, '\n').split('\n')
  const cells: MatlabCell[] = []
  let current: { title: string; start: number } | null = null

  const close = (endExclusive: number) => {
    if (!current) return
    let end = endExclusive - 1 // 0-based index of last line
    while (end > current.start && all[end].trim() === '') end--
    cells.push({
      title: current.title,
      startLine: current.start + 1,
      endLine: end + 1,
      lines: all.slice(current.start, end + 1),
    })
  }

  all.forEach((line, i) => {
    const m = /^\s*%%(.*)$/.exec(line)
    if (m) {
      close(i)
      current = { title: m[1].trim(), start: i }
    }
  })
  close(all.length)
  return cells
}

/**
 * Finds the cell whose title starts with `prefix` (e.g. "1.2" matches
 * "%% 1.2 Échantillonnage"). The prefix must be followed by a space or the end
 * of the title, so "1.1" does not match "1.10".
 */
export function findCell(source: string, prefix: string): MatlabCell | undefined {
  return splitCells(source).find((c) => c.title === prefix || c.title.startsWith(prefix + ' '))
}

/**
 * Finds a local function of a script, e.g. "conv_lineaire" in
 *   function y = conv_lineaire(x, g)
 *       …
 *   end
 * The function ends at the first following line that is just "end" at the
 * indentation of the "function" line (the convention of the TP files).
 */
export function findFunction(source: string, name: string): MatlabCell | undefined {
  const all = source.replace(/\r\n?/g, '\n').split('\n')
  const head = new RegExp(String.raw`^(\s*)function\b.*\b${name}\s*\(`)
  const start = all.findIndex((l) => head.test(l))
  if (start < 0) return undefined
  const indent = head.exec(all[start])![1]
  for (let i = start + 1; i < all.length; i++) {
    if (all[i].trimEnd() === `${indent}end`) {
      return { title: `function ${name}`, startLine: start + 1, endLine: i + 1, lines: all.slice(start, i + 1) }
    }
  }
  return undefined
}

export type TokenType = 'comment' | 'string' | 'keyword' | 'builtin' | 'number' | 'operator' | 'identifier' | 'text'

export interface Token {
  type: TokenType
  text: string
}

const KEYWORDS = new Set([
  'for', 'end', 'if', 'else', 'elseif', 'while', 'function', 'return', 'break', 'continue',
  'switch', 'case', 'otherwise', 'try', 'catch', 'global', 'persistent',
])

const BUILTINS = new Set([
  'sin', 'cos', 'tan', 'exp', 'log', 'log2', 'log10', 'sqrt', 'abs', 'sign', 'real', 'imag', 'angle',
  'floor', 'ceil', 'round', 'mod', 'rem', 'min', 'max', 'mean', 'sum', 'prod', 'length', 'size',
  'zeros', 'ones', 'linspace', 'lcm', 'gcd', 'fft', 'ifft', 'conv', 'cconv', 'freqz', 'sinc', 'fliplr',
  'plot', 'stem', 'stairs', 'bar', 'figure', 'subplot', 'xlabel', 'ylabel', 'title', 'legend', 'grid',
  'axis', 'xlim', 'ylim', 'xline', 'yline', 'hold', 'pause', 'disp', 'fprintf', 'sprintf',
  'clear', 'close', 'clc', 'pi', 'eps', 'on', 'off', 'all',
])

/**
 * Tokenizes one line of MATLAB. Concatenating the token texts gives back the
 * line exactly. Handles the two MATLAB traps for highlighters:
 *  - '%' inside a string is not a comment ('fe = %.1f kHz');
 *  - a quote right after a value (x', A(1)', [1 2]') is the transpose operator,
 *    not the start of a string.
 */
export function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  // last non-space token decides whether ' is a transpose or a string
  let prevSignificant: Token | undefined

  const push = (type: TokenType, text: string) => {
    const t = { type, text }
    tokens.push(t)
    if (type !== 'text' || text.trim() !== '') prevSignificant = t
  }

  while (i < line.length) {
    const c = line[i]

    if (c === '%') {
      push('comment', line.slice(i))
      break
    }

    if (c === ' ' || c === '\t') {
      let j = i
      while (j < line.length && (line[j] === ' ' || line[j] === '\t')) j++
      push('text', line.slice(i, j))
      i = j
      continue
    }

    if (c === "'") {
      const p = prevSignificant
      const prevEndsValue =
        p !== undefined &&
        tokens[tokens.length - 1] === p && // transpose only when glued to the value: x'
        (p.type === 'identifier' ||
          p.type === 'builtin' ||
          p.type === 'number' ||
          (p.type === 'operator' && /[)\]}'.]$/.test(p.text)))
      if (prevEndsValue) {
        push('operator', "'")
        i++
        continue
      }
      // string: '' inside a string is an escaped quote
      let j = i + 1
      while (j < line.length) {
        if (line[j] === "'") {
          if (line[j + 1] === "'") j += 2
          else break
        } else j++
      }
      push('string', line.slice(i, Math.min(j + 1, line.length)))
      i = j + 1
      continue
    }

    if (c === '"') {
      let j = i + 1
      while (j < line.length && line[j] !== '"') j++
      push('string', line.slice(i, Math.min(j + 1, line.length)))
      i = j + 1
      continue
    }

    const num = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(line.slice(i))
    if (num) {
      push('number', num[0])
      i += num[0].length
      continue
    }

    const ident = /^[A-Za-z_]\w*/.exec(line.slice(i))
    if (ident) {
      const w = ident[0]
      push(KEYWORDS.has(w) ? 'keyword' : BUILTINS.has(w) ? 'builtin' : 'identifier', w)
      i += w.length
      continue
    }

    push('operator', c)
    i++
  }
  return tokens
}
