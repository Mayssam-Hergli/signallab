import { useEffect } from 'react'
import { Link, Outlet, useLocation, useMatch } from 'react-router-dom'
import { getLab, labs } from '../labs/registry'
import { usePresentation } from '../lib/presentation'
import Footer from './Footer'
import LabNav, { LabKeys } from './LabNav'

/**
 * Page frame. The home page is a single column (it *is* the table of contents);
 * lab pages get a slim section rail on the left on wide screens, and a sticky
 * bar with the TP keys on narrow ones.
 */
export default function Layout() {
  const { pathname, search } = useLocation()
  const match = useMatch('/tp/:labId')
  const lab = getLab(match?.params.labId)
  const presentation = usePresentation()

  // New page → start at the top (HashRouter does not do it by itself),
  // unless a section was requested (?s=…): LabPage scrolls to it.
  useEffect(() => {
    if (!new URLSearchParams(search).has('s')) window.scrollTo(0, 0)
  }, [pathname, search])

  if (!lab) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-12 sm:px-10 sm:py-16">
        <Outlet />
        <Footer />
      </main>
    )
  }

  return (
    <div className="mx-auto flex max-w-[1880px]">
      {!presentation.on && (
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto border-r border-rule bg-paper/85 px-6 py-7 lg:block">
          <LabNav lab={lab} />
        </aside>
      )}

      <div className="min-w-0 flex-1">
        {presentation.on && (
          <div className="fixed top-3 right-3 z-20 flex items-center gap-2 border border-rule-strong bg-paper/90 px-2 py-1 font-mono text-[0.75rem] text-ink-soft backdrop-blur">
            <LabKeysCompact current={lab.id} />
            <button
              type="button"
              onClick={presentation.toggle}
              className="border border-rule-strong px-2 py-0.5 hover:border-trace/70 hover:text-trace"
            >
              Quitter la présentation (P / Échap)
            </button>
          </div>
        )}
        <header
          className={`sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-rule bg-paper/95 px-5 py-2.5 lg:hidden ${presentation.on ? 'hidden' : ''}`}
        >
          <Link to="/" className="font-mono text-[0.85rem] text-ink-soft hover:text-trace">
            ← Sommaire
          </Link>
          <div className="w-56">
            <LabKeys current={lab} />
          </div>
        </header>
        <main className={presentation.on ? 'px-6 py-8 sm:px-12 lg:px-16' : 'px-5 py-8 sm:px-10 lg:py-10'}>
          <Outlet />
          <Footer />
        </main>
      </div>
    </div>
  )
}

/** TP switch shown in the presentation bar (the left rail is hidden there). */
function LabKeysCompact({ current }: { current: string }) {
  return (
    <span className="flex gap-1">
      {labs
        .filter((l) => l.status === 'ready')
        .map((l) => (
          <Link
            key={l.id}
            to={`/tp/${l.id}`}
            className={`border px-1.5 py-0.5 ${l.id === current ? 'border-trace/70 text-trace' : 'border-rule-strong hover:text-ink'}`}
          >
            TP {l.number}
          </Link>
        ))}
    </span>
  )
}
