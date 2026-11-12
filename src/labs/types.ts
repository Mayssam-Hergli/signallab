import type { ComponentType } from 'react'

export type LabStatus = 'ready' | 'locked'

/** url-safe course id, also the first part of the route: /#/<course>/<lab> */
export type CourseId = 'traitement-du-signal' | 'automatique'

/** One exercise of a TP. Rendered by LabPage, in order. */
export interface SectionDef {
  /** url-safe id, used for in-page navigation (/#/traitement-du-signal/tp1?s=<id>) */
  id: string
  /** numbering as in the TP handout, e.g. "1.2" or "A" */
  number: string
  title: string
  /** the interactive section; undefined = not implemented yet (placeholder shown) */
  component?: ComponentType
}

/**
 * One TP. Adding a TP = a folder in src/labs/<course>/ exporting a Lab + one
 * line in that course's `labs` list in registry.ts.
 */
export interface Lab {
  /**
   * Unique across the whole site, prefixed by the course: "ts-tp3", "ae-tp3".
   * Both courses have a TP 3, so a bare "tp3" is never used as an id.
   */
  id: string
  course: CourseId
  /** route segment inside the course: /#/<course>/<slug>, e.g. "tp1" */
  slug: string
  /** TP number as on the handout: "TP 1 : …" */
  number: number
  /** title as on the handout (empty while the TP is locked) */
  title: string
  status: LabStatus
  /** path relative to public/matlab/, offered for download: "<course>/<file>.m" */
  matlabFile?: string
  sections: SectionDef[]
  /** shown instead of the sections when status = 'locked' */
  placeholder?: ComponentType
}

/** @deprecated old name, kept so existing imports keep compiling */
export type LabDef = Lab

export interface Course {
  id: CourseId
  title: string
  subtitle: string
  labs: Lab[]
}

/** "TP 1 : Signaux discrets", as written on the handout. */
export function labHeading(lab: Lab): string {
  return lab.title ? `TP ${lab.number} : ${lab.title}` : `TP ${lab.number}`
}
