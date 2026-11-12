import Oscilloscope from '../components/Oscilloscope'
import Toc from '../components/Toc'
import { COURSE } from '../labs/course'

/** Home: course title, the live oscilloscope, then the table of contents. */
export default function Home() {
  return (
    <article>
      <header className="border-b border-rule-strong pb-5">
        <p className="font-mono text-[0.9rem] text-trace">
          {COURSE.group} · {COURSE.school}
        </p>
        <h1 className="mt-1 text-[2.1rem] leading-tight font-bold">{COURSE.title}</h1>
      </header>

      <div className="mt-8">
        <Oscilloscope />
      </div>

      <h2 className="mt-12 mb-5 border-b border-rule pb-2 text-[1.3rem] font-semibold">Sommaire</h2>
      <Toc />
    </article>
  )
}
