/**
 * TP 2 statements, quoted in the box at the top of each section.
 *
 * PROVISIONAL WORDING: written from what each "%%" cell of
 * public/matlab/tp2_convolution.m computes (the handout's own sentences were
 * not provided). Replace each `text` with the exact sentence of the printed
 * handout; ids follow the cell numbers of the .m file.
 */
import type { Question } from '../../components/Section'

interface Statement {
  intro?: string
  items: Question[]
}

export const ENONCE_A: Statement = {
  intro: 'x(n) = 1 pour 0 ≤ n ≤ N − 1 ; g(n) = 0,7ⁿ pour 0 ≤ n ≤ M − 1 ; N = 10, M = 2N.',
  items: [
    { id: 'A.1–A.3', text: 'Convolution linéaire y = x * g par la méthode « retourner et glisser » (fliplr) ; longueur de y.' },
    { id: 'A.4', text: 'Convolution linéaire par la FFT ; comparaison avec la première méthode.' },
  ],
}

export const ENONCE_ANIMATOR: Statement = {
  intro: 'Mêmes séquences x et g qu’en A ; fonction conv_lineaire.',
  items: [{ id: 'A', text: 'Suivre, pour chaque n, le retournement, le décalage, le produit et la somme qui donnent y(n).' }],
}

export const ENONCE_B: Statement = {
  intro: 'x(n) = 1 et g(n) = 0,7ⁿ pour 0 ≤ n ≤ N − 1, N = 10.',
  items: [
    { id: 'B.1–B.3', text: 'Convolution circulaire par la formule directe puis par la FFT sans zéros ajoutés ; longueur du résultat.' },
  ],
}

export const ENONCE_ANALYTIC: Statement = {
  intro: 'f(n) = exp(0,1·n), h(n) = exp(−0,1·n).',
  items: [
    { id: 'A.5–A.6', text: 'Nf = 3, Mh = 2Nf : convolution linéaire f * h par les deux méthodes et par le calcul analytique.' },
    { id: 'B.4–B.6', text: 'N = M = 3 : convolution circulaire f ⊛ h, directe, par la FFT et par le calcul analytique.' },
  ],
}
