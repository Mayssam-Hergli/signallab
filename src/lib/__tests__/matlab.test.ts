import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { findCell, findFunction, splitCells, tokenizeLine } from '../matlab'

const tp1 = readFileSync(
  fileURLToPath(new URL('../../../public/matlab/tp1_signaux_discrets.m', import.meta.url)),
  'utf8',
)

describe('splitCells / findCell on tp1_signaux_discrets.m', () => {
  it('finds the header cell and the three exercise cells', () => {
    const titles = splitCells(tp1).map((c) => c.title)
    expect(titles).toEqual([
      'TP1 : Signaux discrets',
      '1.1 Opérations sur les signaux discrets',
      '1.2 Échantillonnage',
      '1.3 Quantification',
    ])
  })

  it('cell 1.1 starts on its %% line and contains the TP code', () => {
    const c = findCell(tp1, '1.1')!
    expect(c.lines[0]).toMatch(/^%% 1\.1/)
    expect(c.lines.join('\n')).toContain('x_car = sign(sin(2*pi*t/3));')
    expect(c.lines.join('\n')).toContain('T_som = lcm(5,3)')
    // line numbers refer to the original file and trailing blank lines are dropped
    expect(tp1.split(/\r?\n/)[c.startLine - 1]).toBe(c.lines[0])
    expect(c.lines.at(-1)!.trim()).not.toBe('')
  })

  it('cell 1.2 uses freqz with 4096 points, cell 1.3 the mid-rise quantizer', () => {
    expect(findCell(tp1, '1.2')!.lines.join('\n')).toContain('freqz(xn, 1, 4096, fe)')
    expect(findCell(tp1, '1.3')!.lines.join('\n')).toContain('xq  = -A + (idx + 0.5)*q;')
  })

  it('does not match a longer number ("1.1" ≠ "1.10")', () => {
    expect(findCell('%% 1.10 X\na=1;', '1.1')).toBeUndefined()
  })
})

describe('tokenizeLine', () => {
  const types = (line: string) => tokenizeLine(line).map((t) => [t.type, t.text])

  it('round-trips every line of the file', () => {
    for (const line of tp1.split(/\r?\n/)) {
      expect(tokenizeLine(line).map((t) => t.text).join('')).toBe(line)
    }
  })

  it('a % inside a string is not a comment', () => {
    const toks = tokenizeLine("title(sprintf('fe = %.1f kHz', fe/1e3)); % commentaire")
    expect(toks.filter((t) => t.type === 'string').map((t) => t.text)).toEqual(["'fe = %.1f kHz'"])
    expect(toks.at(-1)).toEqual({ type: 'comment', text: '% commentaire' })
  })

  it("x' is a transpose, ' after ( is a string", () => {
    expect(types("y = x';")).toContainEqual(['operator', "'"])
    expect(types("figure('Name','1.1');")).toContainEqual(['string', "'Name'"])
    expect(types("xr = xn * sinc(fe*(tc - n.'));")).not.toContainEqual(['string', expect.anything()])
  })

  it('keywords, builtins and numbers', () => {
    expect(types('for k = 1:4')).toEqual([
      ['keyword', 'for'],
      ['text', ' '],
      ['identifier', 'k'],
      ['text', ' '],
      ['operator', '='],
      ['text', ' '],
      ['number', '1'],
      ['operator', ':'],
      ['number', '4'],
    ])
    expect(types('dt = 20e-6;')).toContainEqual(['number', '20e-6'])
    expect(types('x = sin(t);')).toContainEqual(['builtin', 'sin'])
  })
})

const tp2 = readFileSync(fileURLToPath(new URL('../../../public/matlab/tp2_convolution.m', import.meta.url)), 'utf8')

describe('tp2_convolution.m: cells and local functions', () => {
  it('finds every exercise cell by its number', () => {
    for (const id of ['A.1-A.3', 'A.4', 'A.5-A.6', 'B.1-B.3', 'B.4-B.6']) {
      const c = findCell(tp2, id)
      expect(c, id).toBeDefined()
      expect(c!.lines[0]).toMatch(new RegExp(`^%% ${id.replace('.', '\.')}`))
    }
  })

  it('A.4 cell does not swallow the next cell', () => {
    expect(findCell(tp2, 'A.4')!.lines.join('\n')).not.toContain('Nf = 3')
  })

  it('extracts each local function, from "function" to its own "end"', () => {
    const lin = findFunction(tp2, 'conv_lineaire')!
    expect(lin.lines[0]).toBe('function y = conv_lineaire(x, g)')
    expect(lin.lines.at(-1)).toBe('end')
    expect(lin.lines.join('\n')).toContain('gg = fliplr(g);')
    expect(lin.lines.join('\n')).not.toContain('conv_lineaire_fft(x, g)')
    expect(tp2.split(/\r?\n/)[lin.startLine - 1]).toBe(lin.lines[0])

    expect(findFunction(tp2, 'conv_lineaire_fft')!.lines.join('\n')).toContain('ifft(fft(x1) .* fft(g1))')
    expect(findFunction(tp2, 'conv_circulaire')!.lines.join('\n')).toContain('mod(m-n, N)')
    expect(findFunction(tp2, 'nope')).toBeUndefined()
  })
})
