import { SITE } from '../labs/course'
import { courses } from '../labs/registry'

/** "À propos": who made the site and how it relates to the MATLAB files. */
export default function Footer() {
  const [a, b, c] = SITE.authors
  const [ts, ae] = courses.map((course) => course.title.toLowerCase())
  return (
    <footer id="a-propos" className="mt-20 border-t border-rule pt-6 pb-10 text-[0.92rem] text-ink-soft">
      <h2 className="font-mono text-[0.85rem] text-trace">À propos</h2>
      <p className="mt-2 max-w-3xl leading-relaxed">
        Travaux pratiques de {ts} et d'{ae} ({SITE.group}, {SITE.school}) repris à partir des scripts
        MATLAB du cours : chaque figure est recalculée dans le navigateur, et l'onglet « Code MATLAB » affiche le fichier .m de
        référence, téléchargeable tel quel.
      </p>
      <p className="mt-2">
        Réalisé par <span className="text-ink">{a}</span>, <span className="text-ink">{b}</span> et{' '}
        <span className="text-ink">{c}</span>.
      </p>
      <p className="mt-3 font-mono text-[0.8rem] text-ink-faint">Raccourcis : P mode présentation · Échap le quitter · ← → pas à pas dans les animations</p>
    </footer>
  )
}
