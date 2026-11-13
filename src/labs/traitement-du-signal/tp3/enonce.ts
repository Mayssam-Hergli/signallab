/**
 * TP 3 statements, quoted from the handout
 * (~/Downloads/TP_Traitement_Signal_TP1-4-1.pdf, page 5: "TP 3 : Transformée
 * de Fourier Discrète", parts 2.1 and 2.2). Ids are the handout's question
 * numbers.
 */
import type { Question } from '../../../components/Section'

interface Statement {
  intro?: string
  items: Question[]
}

/** 2.1 Objectifs */
export const OBJECTIF =
  "Étudier l'influence du choix de la fréquence d'échantillonnage et de la durée d'observation d'un signal sur ses caractéristiques temporelles et fréquentielles."

/** 2.2, first sentence */
const INTRO =
  "Le signal analogique x(t) = 3cos(2π100t) est échantillonné à la fréquence d'échantillonnage Fe = 1000 Hz pour donner le signal x1[n]."

export const ENONCE_Q1_Q4: Statement = {
  intro: INTRO,
  items: [
    { id: 'Q1', text: 'Générer le signal x1[n] sur une durée (temps d’acquisition) tmax = 0.1 s.' },
    {
      id: 'Q2',
      text: 'Tracer sur la même figure que vous allez subdiviser sur deux lignes, la partie réelle et la partie imaginaire de la transformée de Fourier X1(f) de x1[n]. Utiliser la fonction fft pour le calcul de la transformée de Fourier, la fonction fftshift pour obtenir un spectre symétrique par rapport à f = 0 et la fonction stem pour tracer le spectre sous forme discrète.',
    },
    { id: 'Q3', text: 'Tracer le spectre d’amplitude sur une nouvelle fenêtre.' },
    {
      id: 'Q4',
      text: 'Que constatez-vous concernant l’amplitude des raies ? Que faut-il faire pour trouver les bonnes amplitudes et les bonnes fréquences ?',
    },
  ],
}

export const ENONCE_Q5_Q6: Statement = {
  items: [
    { id: 'Q5', text: 'Soit le signal discret x2[n] = 5 + x1[n]. Refaire les questions 1, 2, 3 et 4 pour le signal x2[n].' },
    { id: 'Q6', text: 'Quel est l’effet de la composante continue de x2[n].' },
  ],
}

export const ENONCE_Q7_Q8: Statement = {
  items: [
    {
      id: 'Q7',
      text: 'Soit le signal discret x3[n] = 5 + cos[2π100nTe − π/3]. Tracer les parties réelle et imaginaire de X3(f) ainsi que le spectre d’amplitude.',
    },
    {
      id: 'Q8',
      text: 'Quel est l’effet du retard sur les parties réelle et imaginaire du spectre (comparées à X2(f)) ainsi que sur le spectre d’amplitude ?',
    },
  ],
}

export const ENONCE_Q9_Q10: Statement = {
  items: [
    { id: 'Q9', text: 'Tracer le spectre du signal x4[n] = 5 + cos[2π105nTe]. Que constatez-vous ?' },
    {
      id: 'Q10',
      text: 'Refaire la question 9) pour des temps d’acquisition tmax = 0.05 s et tmax = 0.2 s. Que constatez-vous ? Pourquoi ?',
    },
  ],
}

export const ENONCE_Q11_Q12: Statement = {
  items: [
    {
      id: 'Q11',
      text: 'On se fixe un temps d’acquisition tmax = 0.05 s, programmer une fonction qui permet de déterminer l’indice p tel que 2^p est la première valeur qui dépasse le nombre d’échantillons N.',
    },
    {
      id: 'Q12',
      text: 'On considère un signal x5[n] tel que : x5[n] = x4[n] si n ≤ N ; 0 si N ≤ n ≤ 2^p. Tracer le spectre d’amplitude de x5[n]. Que constatez-vous ? Quelle est l’utilité de l’ajout des zéros.',
    },
  ],
}
