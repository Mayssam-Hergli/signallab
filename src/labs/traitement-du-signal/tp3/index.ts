import { lazy } from 'react'
import type { Lab } from '../../types'

// lazy(): sections (and Plotly) are downloaded only when the TP page opens.
const Objectifs = lazy(() => import('./Objectifs'))
const Amplitudes = lazy(() => import('./Amplitudes'))
const DcComponent = lazy(() => import('./DcComponent'))
const Delay = lazy(() => import('./Delay'))
const Resolution = lazy(() => import('./Resolution'))
const ZeroPadding = lazy(() => import('./ZeroPadding'))

// Sections follow the handout (2.1 Objectifs, 2.2 Q1–Q12). The "%%" cells of
// public/matlab/traitement-du-signal/tp3_tfd.m are shown in each section's
// "Code MATLAB" tab (Q1 … Q12, and the local function puissance2).
export const tsTp3: Lab = {
  id: 'ts-tp3',
  course: 'traitement-du-signal',
  slug: 'tp3',
  number: 3,
  title: 'Transformée de Fourier Discrète',
  status: 'ready',
  matlabFile: 'traitement-du-signal/tp3_tfd.m',
  sections: [
    { id: 'objectifs', number: '2.1', title: 'Objectifs', component: Objectifs },
    { id: 'amplitudes', number: 'Q1–Q4', title: 'TFD de x1 : amplitudes et fréquences des raies', component: Amplitudes },
    { id: 'composante-continue', number: 'Q5–Q6', title: 'Composante continue', component: DcComponent },
    { id: 'retard', number: 'Q7–Q8', title: 'Effet du retard', component: Delay },
    { id: 'resolution', number: 'Q9–Q10', title: 'Résolution fréquentielle et fuite spectrale', component: Resolution },
    { id: 'zero-padding', number: 'Q11–Q12', title: 'Ajout de zéros (zero-padding)', component: ZeroPadding },
  ],
}
