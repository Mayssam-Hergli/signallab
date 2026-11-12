/**
 * TP 4 statements, quoted from the fascicule
 * « TP Automatique Echantillonnée, INSAT 2024-2025 », pages 16–18.
 * Wording, spelling and numbering are the handout's own (part IV continues
 * the numbering of part III: questions 5 to 8).
 */
import type { Question } from '../../../components/Section'

export const BUT = 'Dans ce TP on va étudier la régulation des systèmes asservis par un régulateur PID.'

export const RAPPEL = {
  paragraphs: [
    'La régulation des systèmes regroupe l’ensemble des moyens matériels et techniques mis en œuvre pour maintenir une grandeur physique à régler, égale à une valeur désirée, appelée consigne.',
    'Un régulateur PID est un organe de contrôle qui permet d’effectuer une régulation en boucle fermée d’un système.',
    'Le PID contient trois actions en fonction de l’erreur :',
  ],
  actions: [
    { name: 'Une action proportionnelle', text: 'l’erreur est multipliée par un gain kp' },
    { name: 'Une action intégrale', text: 'l’erreur est intégrée par un intervalle de temps, puis multiplié par un gain ki.' },
    { name: 'Une action dérivée', text: 'l’erreur est dérivée suivant un temps, puis multipliée par un gain kd.' },
  ],
  after: [
    'Chaque fonction dans le PID joue un rôle important dans l’optimisation des performances du système (stabilité, rapidité et précision).',
    'Pour insérer le régulateur PID dans l’interface Sumilink on peut insérer chaque fonction du PID séparément ou on utilise directement le bloc PID Controller comme indique le schéma suivant :',
  ],
}

export const FIG_4_1 = {
  src: 'figures/automatique/fig4_1_pid_simulink.png',
  caption: 'Figure 4.1. Le contrôleur PID dans l’interface Simulink',
  alt: 'Simulink : PID construit avec trois branches (Gain, Integrator 1/s puis Gain1, Derivative du/dt puis Gain2) sommées, et bloc PID Controller',
}

export const FIG_4_2 = {
  src: 'figures/automatique/fig4_2_reservoir_pid.png',
  caption: 'Figure 4.2. Asservissement de la hauteur d’eau d’un réservoir d’eau par un contrôleur PID.',
  alt: 'Schéma : Qe(S), comparateur, ε, PID, 12.5/(50s+1), sortie H(s), retour unitaire',
}

export const FIG_4_3 = {
  src: 'figures/automatique/fig4_3_mcc_pid.png',
  caption: 'Figure 4.3. Asservissement de la vitesse d’un moteur à courant continu par un contrôleur PID.',
  alt: 'Schéma : U, comparateur, PID, comparateur, 1/(Ls+R), kc, comparateur avec cr, 1/(Js+f), Ω ; retour interne par ke, retour unitaire externe',
}

export const III = {
  intro: 'Considérons le schéma fonctionnel d’un réservoir d’eau suivant :',
  after: 'On choisi 2 m comme consigne: le régulateur PID vise à réguler la hauteur de l’eau dans le réservoir.',
  items: [
    { id: '1', text: 'Faire le schéma bloc de ce réservoir dans Simulink sans et avec le régulateur PID.' },
    { id: '2', text: 'Faire varié la valeur du gain kp, ki et kd affin d’obtenir une réponse désirée' },
    { id: '3', text: 'Qu’elle est l’effet de chaque gain sur la stabilité, rapidité et précision du système.' },
    {
      id: '4',
      text: 'Déterminer l’erreur statique, le temps de réponse et le dépassement avant et après l’utilisation du régulateur PID avec Simulink et avec la commande >>stepinfo dans Malab',
    },
  ] satisfies Question[],
}

export const IV = {
  intro: 'Considérons le schéma fonctionnel d’un moteur à courant continu suivant :',
  after:
    'On choisi 10 rad/s comme commande : le régulateur PID vise à réguler la vitesse du moteur en prenant l’erreur comme entrée et fournit la tension nécessaire au moteur.',
  items: [
    { id: '5', text: 'Faire le schéma bloc du MCC dans Simulink sans et avec le régulateur PID.' },
    { id: '6', text: 'Faire varié la valeur du gain kp, ki et kd affin d’obtenir une réponse désirée' },
    { id: '7', text: 'Qu’elle est l’effet de chaque gain sur la stabilité, rapidité et précision du système' },
    {
      id: '8',
      text: 'Déterminer l’erreur statique, le temps de réponse et le dépassement avant et après l’utilisation du régulateur PID avec simulink et avec la commande >>stepinfo dans Malab',
    },
  ] satisfies Question[],
  tableIntro: 'Les paramètres utilisés sont résumés dans ce tableau',
  /** Tableau 4.1, as printed (f's unit included) */
  table: [
    { name: 'L', value: '0.011 mH' },
    { name: 'R', value: '0.8 Ω' },
    { name: 'J', value: '0.2 kg.m2' },
    { name: 'f', value: '1.10-2 N.m' },
    { name: 'k_{em}', value: '1.91 SI' },
    { name: 'k_c', value: '1.91 SI' },
    { name: 'U', value: '10 V' },
  ],
  tableCaption: 'Tableau 4.1. Paramètres d’un moteur à courant continu.',
}
