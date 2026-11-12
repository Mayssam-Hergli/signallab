import { lazy } from 'react'
import type { Lab } from '../../types'

// lazy(): sections (and Plotly) are downloaded only when the TP page opens.
const Intro = lazy(() => import('./Intro'))
const SampledLoop = lazy(() => import('./SampledLoop'))
const Reservoir = lazy(() => import('./Reservoir'))

// Sections follow the fascicule (I. But, II, III). The "%%" cells of
// public/matlab/automatique/tp3_stabilite_precision.m are shown in each
// section's "Code MATLAB" tab (II.3-4 … II.7, III.1-2 … III.6).
export const aeTp3: Lab = {
  id: 'ae-tp3',
  course: 'automatique',
  slug: 'tp3',
  number: 3,
  title: "Stabilité et précision d'un système échantillonné asservi",
  status: 'ready',
  matlabFile: 'automatique/tp3_stabilite_precision.m',
  sections: [
    { id: 'but', number: 'I', title: 'But', component: Intro },
    {
      id: 'controleur-numerique',
      number: 'II',
      title: "Stabilité d'un système échantillonné par un contrôleur numérique",
      component: SampledLoop,
    },
    { id: 'reservoir', number: 'III', title: "Contrôleur numérique : réservoir d'eau", component: Reservoir },
  ],
}
