/**
 * TP 1 statements, quoted in the box at the top of each section.
 *
 * PROVISIONAL WORDING: taken from the "% Qn" comments of
 * public/matlab/traitement-du-signal/tp1_signaux_discrets.m (answers removed). Replace each `text`
 * with the exact sentence of the printed handout.
 */
import type { Question } from '../../../components/Section'

interface Statement {
  intro?: string
  items: Question[]
}

export const ENONCE_1_1: Statement = {
  intro: 'Axe des temps : t = 0:0.01:30 (de 0 à 30 s, pas de 0,01 s).',
  items: [
    { id: 'Q1', text: 'Cosinus de période 5.' },
    { id: 'Q2', text: "Signal carré de période 3 : le signe d'un sinus de période 3." },
    { id: 'Q3', text: 'Somme des deux signaux ; période de la somme.' },
    { id: 'Q4', text: 'Les trois courbes dans la même fenêtre.' },
  ],
}

export const ENONCE_1_2: Statement = {
  intro: 'f0 = 1 kHz (T0 = 1 ms), durée 20 ms.',
  items: [
    { id: 'Q1', text: 'Signal « continu » (pas de 20 µs).' },
    { id: 'Q2', text: 'Signaux échantillonnés pour fe = 4 ; 2 ; 1,1 et 0,9 kHz.' },
    { id: 'Q3', text: 'Spectres avec freqz.' },
    { id: 'Q4', text: 'Conclusion.' },
  ],
}

export const ENONCE_1_3: Statement = {
  intro: 'f0 = 1 kHz, durée 20 ms.',
  items: [
    { id: 'Q1', text: 'Signal x(t).' },
    { id: 'Q2', text: 'Fréquence de Nyquist fc.' },
    { id: 'Q3', text: 'Échantillonnage à fe = 2 fc.' },
    { id: 'Q4', text: 'Quantificateur linéaire sur [−A, A], N niveaux, pas q = 2A/N (N = 64 et 256).' },
    { id: 'Q5', text: 'RSB pratique et RSB théorique.' },
  ],
}
