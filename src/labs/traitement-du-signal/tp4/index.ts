import { lazy } from 'react'
import type { Lab } from '../../types'

// lazy(): sections (and Plotly) are downloaded only when the TP page opens.
const TransferFunctions = lazy(() => import('./TransferFunctions'))
const Convention = lazy(() => import('./Convention'))
const LowPassIir = lazy(() => import('./LowPassIir'))
const TestSignal = lazy(() => import('./TestSignal'))

// Sections follow the handout (I, II). The "%%" cells of
// public/matlab/traitement-du-signal/tp4_filtres.m are shown in each
// section's "Code MATLAB" tab (I.1 … I.5, II).
export const tsTp4: Lab = {
  id: 'ts-tp4',
  course: 'traitement-du-signal',
  slug: 'tp4',
  number: 4,
  title: 'Analyse des filtres numériques',
  status: 'ready',
  matlabFile: 'traitement-du-signal/tp4_filtres.m',
  sections: [
    { id: 'fonction-transfert', number: 'I.1–I.5', title: 'Fonction de transfert en z : pôles, zéros, réponses', component: TransferFunctions },
    { id: 'convention', number: 'I.4–I.5', title: 'Convention z / z⁻¹ et corrections du programme fourni', component: Convention },
    { id: 'filtre-rii', number: 'II.1–II.3', title: 'Filtre passe-bas RII du second ordre', component: LowPassIir },
    { id: 'signal-test', number: 'Bonus', title: 'Filtrage d’un signal à deux composantes', component: TestSignal },
  ],
}
