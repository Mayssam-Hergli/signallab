import { useMemo, useState } from 'react'
import { findCell, findFunction, tokenizeLine, type TokenType } from '../lib/matlab'
import { matlabName, matlabUrl, useMatlabFile } from '../lib/useMatlabFile'
import { InlineLoading } from './Loading'

// MATLAB editor's dark-theme colours: keywords blue, comments green, strings purple.
const TOKEN_CLASS: Record<TokenType, string> = {
  comment: 'text-[#7fc46f]',
  string: 'text-[#d59ff0]',
  keyword: 'text-[#5fa8ff]',
  builtin: '',
  number: '',
  operator: '',
  identifier: '',
  text: '',
}

function HighlightedLine({ line }: { line: string }) {
  const tokens = useMemo(() => tokenizeLine(line), [line])
  return (
    <>
      {tokens.map((t, i) => (
        <span key={i} className={TOKEN_CLASS[t.type]}>
          {t.text}
        </span>
      ))}
    </>
  )
}

export interface CodeRef {
  /** path relative to public/matlab/, course folder included: "traitement-du-signal/tp1_signaux_discrets.m" */
  file: string
  /** "%%" cell to show, by its number, e.g. "1.2" */
  cell?: string
  /** or a local function of the script, by name, e.g. "conv_lineaire" */
  fn?: string
}
/** Omit both `cell` and `fn` to show the whole file. */
type CodeBlockProps = CodeRef

/**
 * MATLAB source viewer: the relevant "%%" cell of the TP's .m file, with the
 * file's own line numbers (so it can be compared with MATLAB's editor),
 * MATLAB editor colours, copy and download.
 */
export default function CodeBlock({ file, cell, fn }: CodeBlockProps) {
  const state = useMatlabFile(file)
  const name = matlabName(file)
  const [copied, setCopied] = useState(false)

  const extract = useMemo(() => {
    if (state.status !== 'ready') return null
    if (fn) return findFunction(state.source, fn) ?? null
    if (!cell) {
      const lines = state.source.replace(/\r\n?/g, '\n').replace(/\n+$/, '').split('\n')
      return { startLine: 1, endLine: lines.length, lines }
    }
    return findCell(state.source, cell) ?? null
  }, [state, cell, fn])

  if (state.status === 'loading') {
    return <InlineLoading>Chargement de {name}…</InlineLoading>
  }
  if (state.status === 'error' || !extract) {
    return (
      <p className="border border-pen px-4 py-3 text-pen">
        {state.status === 'error'
          ? `Impossible de charger public/matlab/${file} (${state.message}).`
          : fn
            ? `Fonction « ${fn} » introuvable dans ${name}.`
            : `Section « %% ${cell} » introuvable dans ${name}.`}
      </p>
    )
  }

  const text = extract.lines.join('\n')
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable (http, permissions): nothing to do */
    }
  }

  return (
    <div className="border border-rule-strong bg-screen">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule bg-sheet px-4 py-1.5 text-[0.9rem]">
        <p>
          <span className="font-mono">{name}</span>
          <span className="text-ink-soft">
            {' '}
            — lignes {extract.startLine} à {extract.endLine}
          </span>
        </p>
        <p className="flex gap-4">
          <button type="button" onClick={copy} className="underline decoration-rule-strong hover:decoration-trace">
            {copied ? 'Copié' : 'Copier'}
          </button>
          <a href={matlabUrl(file)} download={name} className="underline decoration-rule-strong hover:decoration-trace">
            Télécharger le fichier .m
          </a>
        </p>
      </div>
      <pre className="overflow-x-auto py-2 font-mono text-[14px] leading-[1.6] text-ink">
        <code>
          {extract.lines.map((line, i) => (
            <div key={i} className="flex hover:bg-white/[0.04]">
              <span className="w-12 shrink-0 pr-3 text-right text-ink-faint select-none">{extract.startLine + i}</span>
              <span className="pr-4 whitespace-pre">
                <HighlightedLine line={line} />
              </span>
            </div>
          ))}
        </code>
      </pre>
    </div>
  )
}
