/**
 * "Mode présentation": hides the section rail, enlarges text and figures.
 * Toggled with the button in the TP header or the P key; Échap leaves it.
 * The choice is remembered in localStorage (per browser), and mirrored on
 * <html data-presentation> so CSS can react to it.
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

const KEY = 'signallab:presentation'

interface Presentation {
  on: boolean
  toggle: () => void
  set: (v: boolean) => void
}

const Ctx = createContext<Presentation>({ on: false, toggle: () => {}, set: () => {} })

function readStored(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

/** true when a key press is meant for a form field, not for a shortcut */
export function isTyping(e: KeyboardEvent): boolean {
  const t = e.target
  return t instanceof Element && t.closest('input, textarea, select, [contenteditable="true"]') !== null
}

export function PresentationProvider({ children }: { children: ReactNode }) {
  const [on, setOn] = useState(readStored)

  useEffect(() => {
    if (on) document.documentElement.dataset.presentation = ''
    else delete document.documentElement.dataset.presentation
    try {
      localStorage.setItem(KEY, on ? '1' : '0')
    } catch {
      /* private mode / blocked storage: the mode just isn't remembered */
    }
  }, [on])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e)) return
      if (e.key === 'p' || e.key === 'P') setOn((v) => !v)
      else if (e.key === 'Escape') setOn(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const toggle = useCallback(() => setOn((v) => !v), [])
  return <Ctx.Provider value={{ on, toggle, set: setOn }}>{children}</Ctx.Provider>
}

export function usePresentation(): Presentation {
  return useContext(Ctx)
}
