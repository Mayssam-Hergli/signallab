import { useParams } from 'react-router-dom'
import Toc from '../components/Toc'
import { SITE } from '../labs/course'
import { getCourse } from '../labs/registry'
import NotFound from './NotFound'

/** One course: its title, then the table of contents of its TPs. */
export default function CoursePage() {
  const { courseId } = useParams()
  const course = getCourse(courseId)
  if (!course) return <NotFound />

  return (
    <article>
      <header className="border-b border-rule-strong pb-5">
        <p className="font-mono text-[0.9rem] text-trace">
          {SITE.group} · {SITE.school}
        </p>
        <h1 className="mt-1 text-[2.1rem] leading-tight font-bold">{course.title}</h1>
        <p className="mt-1.5 text-[1.05rem] text-ink-soft">{course.subtitle}</p>
      </header>

      <h2 className="mt-10 mb-5 border-b border-rule pb-2 text-[1.3rem] font-semibold">Sommaire</h2>
      <Toc course={course} />
    </article>
  )
}
