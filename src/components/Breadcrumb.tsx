import { Link, useLocation, useMatch } from 'react-router-dom'
import { coursePath, getCourse, getLab, labPath } from '../labs/registry'

interface Crumb {
  label: string
  to: string
}

/**
 * "Accueil › Traitement du signal › TP 1", read from the URL.
 * The last crumb is the current page (not a link).
 */
export function useCrumbs(): Crumb[] {
  const { pathname } = useLocation()
  const labMatch = useMatch('/:courseId/:labSlug')
  const courseMatch = useMatch('/:courseId')
  const course = getCourse(labMatch?.params.courseId ?? courseMatch?.params.courseId)
  const lab = getLab(labMatch?.params.courseId, labMatch?.params.labSlug)

  const crumbs: Crumb[] = [{ label: 'Accueil', to: '/' }]
  if (course) crumbs.push({ label: course.title, to: coursePath(course.id) })
  if (lab) crumbs.push({ label: lab.title ? `TP ${lab.number} · ${lab.title}` : `TP ${lab.number}`, to: labPath(lab) })
  else if (pathname !== '/' && !course) crumbs.push({ label: 'Page introuvable', to: pathname })
  return crumbs
}

export default function Breadcrumb({ className = '' }: { className?: string }) {
  const crumbs = useCrumbs()
  return (
    <nav aria-label="Fil d'Ariane" className={`font-mono text-[0.82rem] text-ink-soft ${className}`}>
      <ol className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1
          return (
            <li key={c.to} className="flex min-w-0 items-baseline gap-x-2">
              {i > 0 && (
                <span aria-hidden className="text-ink-faint">
                  ›
                </span>
              )}
              {last ? (
                <span aria-current="page" className="truncate text-ink">
                  {c.label}
                </span>
              ) : (
                <Link to={c.to} className="hover:text-trace">
                  {c.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
