import { aeTp3 } from './automatique/tp3'
import { aeTp4 } from './automatique/tp4'
import { tsTp1 } from './traitement-du-signal/tp1'
import { tsTp2 } from './traitement-du-signal/tp2'
import { tsTp3 } from './traitement-du-signal/tp3'
import type { Course, CourseId, Lab } from './types'

/**
 * Every course and TP shown in the dashboard, in display order:
 * courses → labs → sections. The landing page, the course pages, the sidebar
 * and LabPage all read this tree — nothing else needs to change when a TP is
 * added.
 */
export const courses: Course[] = [
  {
    id: 'traitement-du-signal',
    title: 'Traitement du signal',
    subtitle: 'Signaux discrets, échantillonnage, quantification, convolution',
    labs: [tsTp1, tsTp2, tsTp3],
  },
  {
    id: 'automatique',
    title: 'Automatique linéaire échantillonnée',
    subtitle: 'Systèmes échantillonnés asservis, stabilité, précision, régulation PID',
    labs: [aeTp3, aeTp4],
  },
]

/** All labs of all courses, flattened. */
export const allLabs: Lab[] = courses.flatMap((c) => c.labs)

export function getCourse(id: string | undefined): Course | undefined {
  return courses.find((c) => c.id === id)
}

/** Lab of a course by its route segment (`tp1`), or undefined. */
export function getLab(courseId: string | undefined, slug: string | undefined): Lab | undefined {
  return getCourse(courseId)?.labs.find((l) => l.slug === slug)
}

export function coursePath(id: CourseId): string {
  return `/${id}`
}

export function labPath(lab: Lab): string {
  return `/${lab.course}/${lab.slug}`
}

/** Link to one section: /#/<course>/<lab>?s=<section> (LabPage scrolls to it). */
export function sectionHref(lab: Lab, sectionId: string): string {
  return `${labPath(lab)}?s=${sectionId}`
}

/**
 * Routes of the single-course version of the site (/#/tp/tp1, and /#/tp1),
 * mapped to their new place, so old links and bookmarks keep working.
 */
const LEGACY: Record<string, Lab> = { tp1: tsTp1, tp2: tsTp2, tp3: tsTp3 }

export function legacyLabPath(oldId: string | undefined): string | undefined {
  const lab = oldId ? LEGACY[oldId] : undefined
  return lab && labPath(lab)
}

export type { Course, CourseId, Lab, LabDef, SectionDef, LabStatus } from './types'
export { labHeading } from './types'
