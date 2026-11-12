import { Component, type ReactNode } from 'react'

/**
 * Placeholder while a section's code (and Plotly, ~1.4 MB gzipped, on the
 * first TP opened) is downloaded: a small scope screen whose trace is being
 * drawn. Reserves roughly the section's height so the page does not jump.
 */
export function SectionLoading({ label = 'Chargement de la section…' }: { label?: string }) {
  return (
    <div role="status" className="flex min-h-[26rem] flex-col items-center justify-center gap-4 border border-dashed border-rule-strong bg-sheet/60 px-5">
      <svg viewBox="0 0 200 60" className="w-56 text-trace" aria-hidden>
        <path d="M0 30 H200 M100 0 V60" stroke="currentColor" strokeOpacity={0.15} strokeDasharray="2 4" />
        <path
          d="M0 30 C 12.5 5, 12.5 5, 25 30 S 37.5 55, 50 30 S 62.5 5, 75 30 S 87.5 55, 100 30 S 112.5 5, 125 30 S 137.5 55, 150 30 S 162.5 5, 175 30 S 187.5 55, 200 30"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          pathLength={100}
          strokeDasharray="100"
          className="motion-safe:animate-[trace_1.6s_linear_infinite]"
        />
      </svg>
      <p className="font-mono text-[0.9rem] text-ink-soft">{label}</p>
    </div>
  )
}

/** Small inline variant (e.g. the Code tab while the .m file is fetched). */
export function InlineLoading({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="flex items-center gap-3 py-6 font-mono text-[0.9rem] text-ink-soft">
      <span className="inline-block h-2 w-2 rounded-full bg-trace motion-safe:animate-pulse" />
      {children}
    </p>
  )
}

/** True when the section's code could not be downloaded (offline, or a new deployment replaced the files). */
function isLoadError(error: Error): boolean {
  return /dynamically imported module|Importing a module script failed|Loading chunk|ChunkLoadError|Failed to fetch/i.test(`${error.name} ${error.message}`)
}

/**
 * Catches a section that fails to load or to render, instead of a blank
 * page. A download failure offers to reload the page; an error while
 * computing (some slider value the code did not handle) offers to reset
 * the section to its default settings, without losing the rest of the page.
 */
export class SectionErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null; resets: number }> {
  state = { error: null as Error | null, resets: 0 }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    const { error, resets } = this.state
    // key: a reset remounts the section with its default settings
    if (!error) return <div key={resets}>{this.props.children}</div>
    const load = isLoadError(error)
    return (
      <div role="alert" className="border border-pen/70 bg-pen/[0.05] px-5 py-4 text-pen">
        <p className="font-semibold">{load ? "Cette section n'a pas pu être chargée." : 'Erreur de calcul dans cette section.'}</p>
        <p className="mt-1 text-[0.92rem]">
          {load ? 'Vérifiez la connexion, puis rechargez la page.' : 'Ces réglages ne sont pas pris en charge ; la section peut repartir des valeurs du TP.'}{' '}
          <span className="font-mono text-[0.85rem] opacity-80">({error.message})</span>
        </p>
        <button
          type="button"
          onClick={() => (load ? window.location.reload() : this.setState((s) => ({ error: null, resets: s.resets + 1 })))}
          className="mt-3 border border-pen/70 px-3 py-1 font-mono text-[0.88rem] hover:bg-pen/10"
        >
          {load ? 'Recharger la page' : 'Réinitialiser la section'}
        </button>
      </div>
    )
  }
}
