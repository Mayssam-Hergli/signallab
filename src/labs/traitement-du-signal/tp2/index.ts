import { lazy } from 'react'
import type { Lab } from '../../types'

// lazy(): sections (and Plotly) are downloaded only when the TP page opens.
const LinearConvolution = lazy(() => import('./LinearConvolution'))
const ConvolutionAnimator = lazy(() => import('./ConvolutionAnimator'))
const CircularConvolution = lazy(() => import('./CircularConvolution'))
const AnalyticSequences = lazy(() => import('./AnalyticSequences'))

export const tsTp2: Lab = {
  id: 'ts-tp2',
  course: 'traitement-du-signal',
  slug: 'tp2',
  number: 2,
  title: 'Convolution des signaux numériques',
  status: 'ready',
  matlabFile: 'traitement-du-signal/tp2_convolution.m',
  sections: [
    { id: 'convolution-lineaire', number: 'A.1–A.4', title: 'Convolution linéaire', component: LinearConvolution },
    { id: 'animateur', number: 'A', title: 'Animateur de convolution', component: ConvolutionAnimator },
    { id: 'convolution-circulaire', number: 'B.1–B.3', title: 'Convolution circulaire', component: CircularConvolution },
    { id: 'sequences-analytiques', number: 'A.5 / B.4', title: 'Séquences analytiques', component: AnalyticSequences },
  ],
}
