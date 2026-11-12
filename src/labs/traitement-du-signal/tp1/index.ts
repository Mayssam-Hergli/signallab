import { lazy } from 'react'
import type { Lab } from '../../types'

// lazy(): the sections (and Plotly, ~1.4 MB gzipped) are only downloaded when
// a TP page is opened, so the home page stays light.
const Operations = lazy(() => import('./Operations'))
const Sampling = lazy(() => import('./Sampling'))
const Quantization = lazy(() => import('./Quantization'))

export const tsTp1: Lab = {
  id: 'ts-tp1',
  course: 'traitement-du-signal',
  slug: 'tp1',
  number: 1,
  title: 'Signaux discrets',
  status: 'ready',
  matlabFile: 'traitement-du-signal/tp1_signaux_discrets.m',
  sections: [
    { id: 'operations', number: '1.1', title: 'Opérations sur les signaux discrets', component: Operations },
    { id: 'echantillonnage', number: '1.2', title: 'Échantillonnage', component: Sampling },
    { id: 'quantification', number: '1.3', title: 'Quantification', component: Quantization },
  ],
}
