import type { LabDef } from '../types'
import ComingSoon from './ComingSoon'

// To unlock TP3: set status to 'ready', fill in the title, add the section
// components in this folder and list them in `sections`.
export const tp3: LabDef = {
  id: 'tp3',
  number: 3,
  title: '',
  status: 'locked',
  sections: [],
  placeholder: ComingSoon,
}
