import { Link } from 'react-router-dom'
import { labHeading, labPath, sectionHref, type Course } from '../labs/registry'
import { matlabName, matlabUrl } from '../lib/useMatlabFile'

/**
 * Table of contents of a course page:
 *   TP 1 : Signaux discrets
 *       1.1 Opérations sur les signaux discrets
 *       …
 * (The lab pages use the section rail in LabNav instead.)
 */
export default function Toc({ course }: { course: Course }) {
  return (
    <ol className="space-y-7">
      {course.labs.map((lab) => {
        const heading = labHeading(lab)

        if (lab.status === 'locked') {
          return (
            <li key={lab.id} className="text-ink-faint">
              <span className="text-[1.2rem]">{heading}</span> <em>(à venir)</em>
            </li>
          )
        }

        return (
          <li key={lab.id}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-6">
              <Link to={labPath(lab)} className="text-[1.2rem] font-semibold hover:underline">
                {heading}
              </Link>
              {lab.matlabFile && (
                <a href={matlabUrl(lab.matlabFile)} download className="font-mono text-[0.85rem] text-ink-soft hover:underline">
                  {matlabName(lab.matlabFile)}
                </a>
              )}
            </div>
            <ol className="mt-2 space-y-1 pl-8">
              {lab.sections.map((s) => (
                <li key={s.id} className="flex gap-3">
                  <span className="w-20 shrink-0 font-mono text-[0.9em] text-trace/80">{s.number}</span>
                  {s.component ? (
                    <Link to={sectionHref(lab, s.id)} className="hover:underline">
                      {s.title}
                    </Link>
                  ) : (
                    <span className="text-ink-faint">
                      {s.title}
                      <em> (en préparation)</em>
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </li>
        )
      })}
    </ol>
  )
}
