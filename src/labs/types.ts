import type { ComponentType } from 'react'

export type LabStatus = 'ready' | 'locked'

/** One exercise of a TP. Rendered by LabPage, in order. */
export interface SectionDef {
  /** url-safe id, used for in-page navigation (/#/tp/tp1?s=<id>) */
  id: string
  /** numbering as in the TP handout, e.g. "1.2" or "A" */
  number: string
  title: string
  /** the interactive section; undefined = not implemented yet (placeholder shown) */
  component?: ComponentType
}

/** One TP. Adding a TP = a folder in src/labs/ exporting a LabDef + one line in registry.ts. */
export interface LabDef {
  /** route id: /#/tp/<id> */
  id: string
  /** TP number as on the handout: "TP 1 : …" */
  number: number
  /** title as on the handout (empty while the TP is locked) */
  title: string
  status: LabStatus
  /** file name in public/matlab/, offered for download */
  matlabFile?: string
  sections: SectionDef[]
  /** shown instead of the sections when status = 'locked' */
  placeholder?: ComponentType
}

/** "TP 1 : Signaux discrets", as written on the handout. */
export function labHeading(lab: LabDef): string {
  return lab.title ? `TP ${lab.number} : ${lab.title}` : `TP ${lab.number}`
}
