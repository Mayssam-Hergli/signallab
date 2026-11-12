import { lazy } from 'react'
import type { Lab } from '../../types'

// lazy(): sections (and Plotly) are downloaded only when the TP page opens.
const Intro = lazy(() => import('./Intro'))
const Rappel = lazy(() => import('./Rappel'))
const ReservoirPid = lazy(() => import('./ReservoirPid'))
const MccSpeed = lazy(() => import('./MccSpeed'))

// Sections follow the fascicule (I. But, II. Rappel, III, IV). The "%%" cells
// of public/matlab/automatique/tp4_pid.m are shown in each section's
// "Code MATLAB" tab (III.1 … III.4, IV … IV.8).
export const aeTp4: Lab = {
  id: 'ae-tp4',
  course: 'automatique',
  slug: 'tp4',
  number: 4,
  title: 'Asservissement des systèmes continus par régulateur PID',
  status: 'ready',
  matlabFile: 'automatique/tp4_pid.m',
  sections: [
    { id: 'but', number: 'I', title: 'But', component: Intro },
    { id: 'rappel', number: 'II', title: 'Rappel', component: Rappel },
    { id: 'reservoir-pid', number: 'III', title: "Hauteur d'eau d'un réservoir par un régulateur PID", component: ReservoirPid },
    { id: 'mcc', number: 'IV', title: "Vitesse d'un MCC", component: MccSpeed },
  ],
}
