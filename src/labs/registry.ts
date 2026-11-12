import { tp1 } from './tp1'
import { tp2 } from './tp2'
import { tp3 } from './tp3'
import type { LabDef } from './types'

/**
 * Every TP shown in the dashboard, in display order. The home page, the
 * sidebar and LabPage all read this list — nothing else needs to change
 * when a TP is added.
 */
export const labs: LabDef[] = [tp1, tp2, tp3]

export function getLab(id: string | undefined): LabDef | undefined {
  return labs.find((l) => l.id === id)
}

export type { LabDef, SectionDef, LabStatus } from './types'
export { labHeading } from './types'
