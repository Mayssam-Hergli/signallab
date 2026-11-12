import { Suspense, useEffect } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { COURSE } from '../labs/course'
import { getLab, labHeading } from '../labs/registry'
import { SectionErrorBoundary, SectionLoading } from '../components/Loading'
import { usePresentation } from '../lib/presentation'
import { matlabUrl } from '../lib/useMatlabFile'

function SectionPlaceholder() {
  return <p className="border border-dashed border-rule px-5 py-8 text-center text-ink-soft italic">Section en préparation.</p>
}

/**
 * Scrolls to ?s=<section>. The sections above it are lazy-loaded and grow as
 * they arrive, so the scroll is repeated a few times while the layout settles.
 */
function useScrollToSection(sectionId: string | null) {
  useEffect(() => {
    if (!sectionId) return
    const go = () =>
      document.getElementById(`section-${sectionId}`)?.scrollIntoView({ block: 'start' })
    const timers = [0, 300, 900, 1800].map((ms) => window.setTimeout(go, ms))
    // stop correcting as soon as the reader scrolls by themselves
    const cancel = () => timers.forEach((t) => window.clearTimeout(t))
    window.addEventListener('wheel', cancel, { once: true, passive: true })
    window.addEventListener('touchmove', cancel, { once: true, passive: true })
    return () => {
      cancel()
      window.removeEventListener('wheel', cancel)
      window.removeEventListener('touchmove', cancel)
    }
  }, [sectionId])
}

export default function LabPage() {
  const { labId } = useParams()
  const [params] = useSearchParams()
  const lab = getLab(labId)
  const presentation = usePresentation()
  useScrollToSection(params.get('s'))

  if (!lab) {
    return (
      <div className="py-16">
        <h1 className="text-[1.8rem] font-bold">TP introuvable</h1>
        <Link to="/" className="mt-4 inline-block underline">
          Retour au sommaire
        </Link>
      </div>
    )
  }

  const Placeholder = lab.placeholder

  return (
    <article>
      <header className="mb-10 border-b border-rule-strong pb-4">
        <p className="font-mono text-[0.88rem] text-trace">
          {COURSE.subject} — {COURSE.group} — {COURSE.school}
        </p>
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
          <h1 className="text-[2rem] leading-tight font-bold">{labHeading(lab)}</h1>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
            {lab.matlabFile && lab.status === 'ready' && (
              <a href={matlabUrl(lab.matlabFile)} download className="text-[0.95rem] underline decoration-rule-strong hover:decoration-trace">
                Télécharger <span className="font-mono">{lab.matlabFile}</span>
              </a>
            )}
            {!presentation.on && (
              <button
                type="button"
                onClick={presentation.toggle}
                title="Masque la colonne de gauche et agrandit le texte et les figures (touche P)"
                className="border border-rule-strong px-3 py-1 font-mono text-[0.85rem] text-ink-soft transition-colors hover:border-trace/70 hover:text-trace"
              >
                ⛶ Mode présentation <span className="text-ink-faint">(P)</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {lab.status === 'locked' ? (
        Placeholder ? <Placeholder /> : null
      ) : (
        <div className="space-y-16">
          {lab.sections.map((s) => {
            const Content = s.component
            return (
              <section key={s.id} id={`section-${s.id}`} className="scroll-mt-6">
                <h2 className="mb-4 flex items-baseline gap-3 border-b border-rule pb-2 text-[1.5rem] font-bold">
                  <span className="font-mono text-[1.1rem] font-normal text-trace">{s.number}</span> {s.title}
                </h2>
                {Content ? (
                  <SectionErrorBoundary>
                    <Suspense fallback={<SectionLoading />}>
                      <Content />
                    </Suspense>
                  </SectionErrorBoundary>
                ) : (
                  <SectionPlaceholder />
                )}
              </section>
            )
          })}
        </div>
      )}
    </article>
  )
}
