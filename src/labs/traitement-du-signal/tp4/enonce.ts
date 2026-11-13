/**
 * TP 4 statements, quoted from the handout
 * (~/Downloads/TP_Traitement_Signal_TP1-4-1.pdf, page 6: "TP 04 : Analyse des
 * filtres numériques"). Ids are the handout's numbering.
 */
import type { Question } from '../../../components/Section'

interface Statement {
  intro?: string
  items: Question[]
}

export const OBJECTIF_I =
  "L'objectif de cette partie du TP est de se familiariser avec quelques fonctions Matlab concernant la transformée en Z. Par exemple : la fonction tf (Num, Den, Te) ou dfilt.df1 ou freqz qui détermine la TF à partir des coefficients du numérateur et dénominateur de la TZ et la période d'échantillonnage Te ; les fonctions roots, pour calculer les zéros du numérateur ou dénominateur ; la fonction pzmap ou zplane pour localiser les zéros et les pôles dans le plan complexe ; la fonction impz pour calculer la transformée en Z inverse ; la fonction invfreqz pour déterminer le numérateur et le dénominateur en utilisant la TF (freqz)."

export const ENONCE_I: Statement = {
  intro:
    'Prenons deux exemples de fonctions de transferts (TF) de la forme suivantes : H(z) = (z − 0.3) / (z² − 1.3z + 0.7) ; H(z) = (z² − 0.3) / (z³ − 1.3z² + 0.7z + 1.5). On donne Te = 0.01.',
  items: [
    {
      id: 'I.1',
      text: 'Déclarer la période d’échantillonnage, les coefficients du numérateur de la TZ et les coefficients du dénominateur de la TZ.',
    },
    {
      id: 'I.2',
      text: 'Déterminer la TZ. Ici il ne faut pas mettre le point-virgule afin de visualiser l’expression de la TZ dans l’invite Matlab (insérer une pause de 5s).',
    },
    { id: 'I.3', text: 'Localiser les zéros et les pôles dans le plan complexe (sans le point-virgule et une pause de 5s).' },
    { id: 'I.4', text: 'Calculer la transformée en Z inverse et visualiser sa forme (stem) (pause de 5s).' },
    {
      id: 'I.5',
      text: 'Calculer la TF en utilisant la fonction freqz et représenter sa réponse en amplitude et sa réponse en phase (pause de 5s) dans la même figure.',
    },
  ],
}

export const ENONCE_CONVENTION: Statement = {
  items: [
    { id: 'I.4', text: 'Calculer la transformée en Z inverse et visualiser sa forme (stem).' },
    { id: 'I.5', text: 'Calculer la TF en utilisant la fonction freqz et représenter sa réponse en amplitude et sa réponse en phase.' },
  ],
}

export const ENONCE_II: Statement = {
  intro:
    'La fonction de transfert du filtre passe-bas RII du second ordre est de la forme : H(z) = (0.079z² + 0.158z + 0.079) / (0.516z² − 1.2z + 1)',
  items: [
    {
      id: 'II.1',
      text: 'Générer et tracer la réponse impulsionnelle du filtre RII par l’utilisation de la fonction impz. On donne l’ordre du filtre N = 32.',
    },
    {
      id: 'II.2',
      text: 'Calculer la réponse en fréquence de nombre de points L = 256 et représenter la réponse en amplitude (échelle logarithmique) et la réponse en phase.',
    },
    { id: 'II.3', text: 'Représenter les pôles et les zéros dans le plan z.' },
  ],
}
