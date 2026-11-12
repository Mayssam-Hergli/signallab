import { useEffect, useState } from 'react'

/**
 * Loads a MATLAB file from public/matlab/ at runtime.
 *
 * Why fetch instead of bundling: public/matlab/*.m is the single source of
 * truth — the Code tab, the download button and the professor's copy are
 * byte-for-byte the same file, and replacing it needs no rebuild of the JS.
 * Each file is fetched once and shared by every section that shows it.
 */
const cache = new Map<string, Promise<string>>()

export function matlabUrl(file: string): string {
  // BASE_URL is './' (see vite.config.ts): relative to index.html, so it works
  // on GitHub Pages sub-paths too.
  return `${import.meta.env.BASE_URL}matlab/${file}`
}

function load(file: string): Promise<string> {
  let p = cache.get(file)
  if (!p) {
    p = fetch(matlabUrl(file)).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.text()
    })
    p.catch(() => cache.delete(file)) // allow a retry after a failure
    cache.set(file, p)
  }
  return p
}

export type MatlabFileState =
  | { status: 'loading' }
  | { status: 'ready'; source: string }
  | { status: 'error'; message: string }

export function useMatlabFile(file: string): MatlabFileState {
  const [state, setState] = useState<MatlabFileState>({ status: 'loading' })

  useEffect(() => {
    let alive = true
    load(file).then(
      (source) => alive && setState({ status: 'ready', source }),
      (e: unknown) => alive && setState({ status: 'error', message: e instanceof Error ? e.message : String(e) }),
    )
    return () => {
      alive = false
    }
  }, [file])

  return state
}
