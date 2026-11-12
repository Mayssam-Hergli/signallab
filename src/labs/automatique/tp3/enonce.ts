/**
 * TP 3 statements, quoted from the fascicule
 * « TP Automatique Echantillonnée, INSAT 2024-2025 », pages 13–15.
 * Wording and numbering are the handout's own: part II starts at question 3.
 * Formulas are rendered separately (KaTeX) by the section components.
 */
import type { Question } from '../../../components/Section'

export const BUT =
  "Dans ce TP on va étudier la stabilité d'un système Echantillonné en tenant compte de l'effet de la période d'échantillonnage ainsi que du contrôleur numérique proportionnel."

export const FIG_3_1 = {
  src: 'figures/automatique/fig3_1_schema_systeme_echantillonne.png',
  caption: "Figure 3.1. Schéma bloc d'un système échantillonné avec un bloqueur d'ordre 0 et un contrôleur numérique",
  alt: "Schéma bloc : e(t), comparateur, échantillonneur, C(s), échantillonneur, B0(s), G1(s), sortie S(t), retour unitaire",
}

export const FIG_3_2 = {
  src: 'figures/automatique/fig3_2_schema_reservoir.png',
  caption: "Figure 3.2. Schéma bloc d'un réservoir d'eau avec un bloqueur d'ordre 0 et un contrôleur numérique",
  alt: 'Schéma bloc : Qe(S), comparateur, ε, échantillonneur, C(s), échantillonneur, B0(s), G1(s), sortie H(s), retour unitaire',
}

export const II = {
  /** before the figure; G1(s) = 1/(s+1) follows as a formula */
  intro: "Soit un système échantillonné dont la fonction de transfert est donnée par",
  introAfter: 'et le schéma bloc est représenté ci-dessous :',
  /** after the figure; C(s) = K and B0(s) = (1 − e^{−Ts})/s are rendered as formulas */
  given: [
    'On donne',
    "qui est un contrôleur numérique proportionnel et la fonction de transfert du bloqueur d'ordre zéro",
    'est',
  ],
  items: [
    { id: '3', text: 'Calculer la transformation en z G(z) en boucle fermé de ce système.' },
    { id: '4', text: 'Vérifier par Matlab votre calcule par les commandes tf, c2d et feedback' },
    {
      id: '5',
      text: "Déterminer l'ordre de ce système ainsi que les pôles et les zéros et vérifier la stabilité de ce système en utilisant la commande rlocus.",
    },
    { id: '6', text: "Utiliser l'interface Simulink dans Matlab pour voir la réponse de ce système." },
    { id: '7', text: 'Vérifier la stabilité du système pour différent valeur de K et indiquer la valeur limite de K.' },
  ] satisfies Question[],
}

export const III = {
  intro:
    "Dans cette partie on essaye de faire la simulation d'un système hydraulique qui comporte un réservoir d'eau de section constant. Le réservoir est alimenté par un débit Qe(t). H est la hauteur de 20 m d'eau dans le réservoir.",
  /** "La fonction de transfert de ce système est" G1(s) = H(s)/Qe(s) = 12.5/(50s+1) */
  tfIntro: 'La fonction de transfert de ce système est',
  controller: "Ce système est contrôlé par contrôleur numérique C(s) = K avec un temps d'échantillonnage T. La fonction de transfert du bloqueur d'ordre zéro est",
  figIntro: 'Le schéma bloc est représenté ci-dessous :',
  items: [
    { id: '1', text: 'Calculer la transformation en z G(z) en boucle fermé de ce système.' },
    { id: '2', text: 'Vérifier par Matlab votre calcule par les commandes tf, c2d et feedback' },
    {
      id: '3',
      text: "Utiliser l'interface Simulink dans Matlab pour voir la réponse de ce système pour différent période d'échantillonnage T.",
    },
    { id: '4', text: "Qu'elle est la valeur de K pour remplir 2m (consigne) de la hauteur du réservoir." },
    { id: '5', text: 'Déterminer les pôles et les zéros et vérifier la stabilité de ce système en utilisant la commande rlocus.' },
    { id: '6', text: "Qu'elle est l'erreur statique de ce système." },
  ] satisfies Question[],
}
