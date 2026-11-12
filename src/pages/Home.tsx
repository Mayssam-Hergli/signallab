import { Link } from 'react-router-dom'
import Oscilloscope from '../components/Oscilloscope'
import { SITE } from '../labs/course'
import { coursePath, courses, type Course } from '../labs/registry'

/**
 * Each course is a scope channel: CH1 yellow, CH2 cyan (the ch1/ch2 tokens of
 * index.css). Purely a visual key between the two cards.
 */
const CHANNEL = [
  { label: 'CH1', text: 'text-ch1', border: 'border-l-ch1' },
  { label: 'CH2', text: 'text-ch2', border: 'border-l-ch2' },
] as const

function CourseCard({ course, channel }: { course: Course; channel: (typeof CHANNEL)[number] }) {
  const ready = course.labs.filter((l) => l.status === 'ready').length
  return (
    <Link
      to={coursePath(course.id)}
      className={`group flex flex-col border border-l-4 border-rule-strong ${channel.border} bg-sheet transition-colors hover:border-trace/60`}
    >
      <div className="flex items-baseline justify-between gap-4 border-b border-rule px-5 py-1.5 font-mono text-[0.8rem] text-ink-soft">
        <span className={channel.text}>{channel.label}</span>
        <span>
          {ready}/{course.labs.length} TP
        </span>
      </div>

      <div className="flex flex-1 flex-col px-5 pt-4 pb-5">
        <h2 className="text-[1.45rem] leading-tight font-bold group-hover:text-trace">{course.title}</h2>
        <p className="mt-1.5 text-[0.98rem] text-ink-soft">{course.subtitle}</p>

        <ol className="mt-5 space-y-1.5 border-t border-rule pt-4">
          {course.labs.map((lab) => (
            <li key={lab.id} className={`flex gap-3 ${lab.status === 'locked' ? 'text-ink-faint' : ''}`}>
              <span className={`w-12 shrink-0 font-mono text-[0.9em] ${lab.status === 'locked' ? '' : 'text-trace/80'}`}>
                TP {lab.number}
              </span>
              <span>{lab.status === 'locked' ? <em>à venir</em> : lab.title}</span>
            </li>
          ))}
        </ol>

        <p className="mt-auto pt-5 font-mono text-[0.85rem] text-ink-soft group-hover:text-trace">Ouvrir le cours →</p>
      </div>
    </Link>
  )
}

/** Landing page: site title, one card per course, then the live oscilloscope. */
export default function Home() {
  return (
    <article>
      <header className="border-b border-rule-strong pb-5">
        <p className="font-mono text-[0.9rem] text-trace">
          {SITE.group} · {SITE.school}
        </p>
        <h1 className="mt-1 text-[2.1rem] leading-tight font-bold">
          {SITE.title} — {SITE.subtitle}
        </h1>
      </header>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {courses.map((course, i) => (
          <CourseCard key={course.id} course={course} channel={CHANNEL[i % CHANNEL.length]} />
        ))}
      </div>

      <div className="mt-12">
        <Oscilloscope />
      </div>
    </article>
  )
}
