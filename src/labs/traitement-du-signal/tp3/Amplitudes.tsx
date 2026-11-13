import { useMemo, useState } from 'react'
import { Conclusion, H, M, MBlock } from '../../../components/Explanation'
import Insight, { Readout } from '../../../components/Insight'
import Section from '../../../components/Section'
import Toggle from '../../../components/Toggle'
import { fmt, sci } from '../../../lib/format'
import { MagFigure, ReImFigure, SignalFigure } from './DftFigures'
import { ENONCE_Q1_Q4 } from './enonce'
import { A1, F1, FE, FILE, dftView, maxAbs, valueAt, x1 } from './model'

/** Q1–Q4: x1 = 3cos(2π·100·nTe), tmax = 0.1 s — raw FFT amplitudes and the frequency axis. */
export default function Amplitudes() {
  const [scaled, setScaled] = useState(false)
  const [inclusive, setInclusive] = useState(false)

  const v = useMemo(() => dftView(x1(inclusive), scaled), [inclusive, scaled])
  // the bin nearest to +100 Hz, and the largest value outside the two main lines
  const peak = valueAt(v, 'mag', F1)
  const peakF = v.f.reduce((b, f) => (Math.abs(f - F1) < Math.abs(b - F1) ? f : b), v.f[0])
  const leak = maxAbs(v.mag.filter((_, i) => Math.abs(Math.abs(v.f[i]) - peakF) > 1e-9))
  const k = scaled ? 1 : v.N
  const digits = scaled ? 3 : 2

  const controls = (
    <>
      <Toggle label="÷N (bonnes amplitudes)" checked={scaled} onChange={setScaled} hint="MATLAB : abs(X1)/N" />
      <Toggle
        label="N = 101 (t = 0:Te:tmax)"
        checked={inclusive}
        onChange={setInclusive}
        hint={inclusive ? 'tmax inclus : 101 échantillons' : 'TP : n = 0 : tmax·Fe − 1, N = 100'}
      />
    </>
  )

  return (
    <Section
      questions={ENONCE_Q1_Q4}
      controls={controls}
      explanation={<AmplitudesExplanation />}
      code={[
        { file: FILE, cell: 'Q1' },
        { file: FILE, cell: 'Q2' },
        { file: FILE, cell: 'Q3' },
        { file: FILE, cell: 'Q4' },
      ]}
    >
      <div className="grid gap-x-10 gap-y-1 sm:grid-cols-2">
        <Readout label="N" value={String(v.N)} />
        <Readout label="Δf = Fe/N" value={fmt(v.df, inclusive ? 3 : 0)} unit="Hz" />
        <Readout label={`|X1(${fmt(peakF, inclusive ? 2 : 0)} Hz)|${scaled ? '/N' : ''}`} value={fmt(peak, digits)} tone={inclusive ? 'warn' : 'note'} />
        <Readout label={`max |Im{X1}|${scaled ? '/N' : ''}`} value={inclusive ? fmt(maxAbs(v.im), digits) : sci(maxAbs(v.im))} />
      </div>

      {inclusive ? (
        <Insight tone="warn" title={<>Fuite spectrale : {fmt(peak, digits)} au lieu de {scaled ? '1.500' : '150.00'}</>}>
          Avec t = 0:Te:tmax on prend 101 échantillons, soit 10,1 périodes. Δf = 1000/101 ≈ 9,90 Hz : 100 Hz n'est plus
          un multiple de Δf, la raie la plus proche est à {fmt(peakF, 2)} Hz et une partie de l'énergie fuit sur les voisines
          (jusqu'à {fmt(leak, digits)}). La partie imaginaire n'est plus nulle.
        </Insight>
      ) : scaled ? (
        <Insight title={<>|X1(±100 Hz)|/N = {fmt(peak, 2)} = A/2 ; unilatéral : 2 × {fmt(peak, 2)} = {fmt(2 * peak, 0)} = A</>}>
          Diviser par N rend l'amplitude de chaque raie ; l'amplitude A = {A1} du cosinus est partagée entre +100 Hz et
          −100 Hz.
        </Insight>
      ) : (
        <Insight title={<>Raies à ±100 Hz d'amplitude {fmt(peak, 0)} = N·A/2 = 100 × 3/2</>}>
          fft somme les N échantillons sans normaliser : la hauteur des raies dépend de la durée d'observation, pas
          seulement de A.
        </Insight>
      )}

      <SignalFigure
        v={v}
        name="x1"
        caption={
          <>
            les {v.N} échantillons de x1[n] = 3cos(2π·100·nTe), Fe = 1000 Hz : {fmt((v.N * F1) / FE, 1)} périodes de 10 ms
            {inclusive ? ' (la dernière est entamée : t = 100 ms est inclus).' : '.'}
          </>
        }
      />
      <ReImFigure
        v={v}
        name="X1"
        caption={
          inclusive ? (
            <>
              partie réelle (bleu) et imaginaire (orange) de fftshift(fft(x1)) pour N = 101 : les raies voisines de ±100 Hz ne
              sont plus nulles, et Im ≠ 0.
            </>
          ) : (
            <>
              partie réelle (bleu) : deux raies de {fmt(valueAt(v, 're', F1), scaled ? 2 : 0)} à ±100 Hz ; partie imaginaire
              (orange) : nulle (max {sci(maxAbs(v.im))}, erreurs d'arrondi). Le cosinus est pair, son spectre est réel.
            </>
          )
        }
      />
      <MagFigure
        v={v}
        name="X1"
        labels={[-peakF, peakF]}
        caption={
          <>
            spectre d'amplitude |X1(f)|{scaled ? '/N' : ''} : raies à ±{fmt(peakF, inclusive ? 2 : 0)} Hz de hauteur{' '}
            {fmt(peak, digits)}
            {scaled ? '' : ` (= ${fmt(peak / k, 3)} × N)`}.
          </>
        }
      />
    </Section>
  )
}

function AmplitudesExplanation() {
  return (
    <>
      <H>Q1. Le signal</H>
      <p>
        <M>{String.raw`x_1[n] = 3\cos(2\pi \cdot 100\, n T_e)`}</M>, <M>{String.raw`T_e = 1/F_e = 1\ \text{ms}`}</M>, pour{' '}
        <M>{String.raw`n = 0 \dots N-1`}</M> avec <M>{String.raw`N = t_{\max} F_e = 100`}</M> : exactement 10 périodes.
      </p>

      <H>Q2–Q3. Ce que calcule fft</H>
      <MBlock>{String.raw`X[k] = \sum_{n=0}^{N-1} x[n]\, e^{-j 2\pi k n / N}`}</MBlock>
      <p>
        L'indice k correspond à <M>{String.raw`f_k = k\,F_e/N`}</M> : les raies sont espacées de{' '}
        <M>{String.raw`\Delta f = F_e/N = 1/t_{\max} = 10\ \text{Hz}`}</M>. 100 Hz est la raie k = 10, pile sur la grille.
        Pour un cosinus d'amplitude A sur un nombre entier de périodes :
      </p>
      <MBlock>{String.raw`X[k] = \frac{A N}{2}\,\big(\delta[k-k_0] + \delta[k+k_0]\big), \quad k_0 = 10`}</MBlock>
      <p>
        Le cosinus est pair et réel, donc son spectre est réel et pair : Im{'{'}X1{'}'} vaut 0 aux erreurs d'arrondi près
        (≈ 10⁻¹⁴).
      </p>

      <H>Q4. Bonnes amplitudes</H>
      <p>
        Les raies valent <M>{String.raw`AN/2 = 3 \times 100 / 2 = 150`}</M> : la hauteur grandit avec N. Il faut{' '}
        <strong>diviser par N</strong> : <M>{String.raw`150/100 = 1{,}5 = A/2`}</M> à +100 Hz et à −100 Hz. En spectre
        unilatéral (f ≥ 0), on additionne les deux moitiés : <M>{String.raw`2 \times 1{,}5 = 3 = A`}</M>.
      </p>

      <H>Q4. Bonnes fréquences</H>
      <p>
        fft rend k = 0 … N − 1, c'est-à-dire 0 … Fe − Δf : les fréquences négatives sont rangées en haut (k = 90 ↔ −100 Hz).
        fftshift ramène f = 0 au centre, et l'axe devient
      </p>
      <MBlock>{String.raw`f = \left(-\tfrac{N}{2} : \tfrac{N}{2}-1\right)\cdot \frac{F_e}{N} \;=\; -500 \dots 490\ \text{Hz}`}</MBlock>

      <H>N = 101 : pourquoi exclure tmax</H>
      <p>
        <code className="font-mono">t = 0:Te:tmax</code> contient 101 instants : 10,1 périodes. Δf = 1000/101 ≈ 9,90 Hz, et
        100 Hz tombe entre deux raies (k = 10,1). L'énergie se répartit sur les raies voisines : <strong>fuite spectrale</strong>{' '}
        (149,81 au lieu de 150, et des raies de 15,8 et 14,4 autour). Pour N impair, l'axe exact après fftshift est{' '}
        <M>{String.raw`\left(-\tfrac{N-1}{2} : \tfrac{N-1}{2}\right) F_e/N`}</M> ; la formule du TP ne vaut que pour N pair.
      </p>

      <Conclusion>
        <ul>
          <li>fft ne normalise pas : |X| = N·A/2 ; diviser par N donne A/2 de chaque côté, ×2 en unilatéral donne A.</li>
          <li>Les fréquences s'obtiennent par fftshift et l'axe f = (−N/2 : N/2−1)·Fe/N, de pas Δf = Fe/N.</li>
          <li>Il faut un nombre entier de périodes (N = 100, pas 101) pour que la raie tombe exactement sur un point de la TFD.</li>
        </ul>
      </Conclusion>
    </>
  )
}
