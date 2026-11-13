import { useMemo, useState } from 'react'
import { Conclusion, H, M, MBlock } from '../../../components/Explanation'
import Insight, { Readout } from '../../../components/Insight'
import Section from '../../../components/Section'
import Slider from '../../../components/Slider'
import Toggle from '../../../components/Toggle'
import { C } from '../../../components/theme'
import { fmt } from '../../../lib/format'
import { MagFigure, ReImFigure, SignalFigure } from './DftFigures'
import { ENONCE_Q5_Q6 } from './enonce'
import { DC, F1, FILE, RANGES, clean, dftView, valueAt, x2 } from './model'

/** Q5–Q6: x2 = 5 + x1 — the DC component is the line at f = 0. */
export default function DcComponent() {
  const [scaled, setScaled] = useState(true)
  const [dc, setDc] = useState(DC)

  const v = useMemo(() => dftView(x2(dc), scaled), [dc, scaled])
  const at0 = clean(valueAt(v, 're', 0))
  const at100 = valueAt(v, 'mag', F1)
  const d = scaled ? 2 : 0

  const controls = (
    <>
      <Toggle label="÷N (bonnes amplitudes)" checked={scaled} onChange={setScaled} hint="MATLAB : abs(X2)/N" />
      <Slider
        label="composante continue c"
        value={dc}
        min={RANGES.dc.min}
        max={RANGES.dc.max}
        step={RANGES.dc.step}
        onChange={setDc}
        format={(c) => fmt(c, 1)}
        hint={dc === DC ? 'TP : x2 = 5 + x1' : `x2 = ${fmt(dc, 1)} + x1 (TP : 5)`}
      />
    </>
  )

  return (
    <Section
      questions={ENONCE_Q5_Q6}
      controls={controls}
      explanation={<DcExplanation />}
      code={{ file: FILE, cell: 'Q5-6' }}
    >
      <div className="grid gap-x-10 gap-y-1 sm:grid-cols-2">
        <Readout label={`X2(0)${scaled ? '/N' : ''}`} value={fmt(at0, d)} />
        <Readout label={`|X2(±100 Hz)|${scaled ? '/N' : ''}`} value={fmt(at100, d)} />
      </div>

      <Insight
        title={
          <>
            Raie à f = 0 : {fmt(at0, d)} = {scaled ? 'c' : `c·N = ${fmt(dc, 1)} × 100`}
            {scaled && ` = ${fmt(dc, 1)}, la valeur moyenne`} ; les raies à ±100 Hz ne bougent pas ({fmt(at100, d)}).
          </>
        }
      >
        La TFD est linéaire : X2 = TFD(c) + X1. Une constante n'a qu'une fréquence, 0 Hz ; elle n'est pas partagée entre
        +f et −f, donc pas de facteur 1/2.
      </Insight>

      <SignalFigure v={v} name="x2" color={C.blue} caption={<>x2[n] = {fmt(dc, 1)} + 3cos(2π·100·nTe) : le cosinus de x1 décalé vers le haut de {fmt(dc, 1)}.</>} />
      <ReImFigure
        v={v}
        name="X2"
        caption={
          <>
            partie réelle (bleu) : la raie centrale {fmt(at0, d)} s'ajoute aux deux raies de x1 ; partie imaginaire (orange) :
            toujours nulle, x2 est pair.
          </>
        }
      />
      <MagFigure
        v={v}
        name="X2"
        labels={[-F1, 0, F1]}
        caption={<>|X2(f)|{scaled ? '/N' : ''} : la composante continue donne une raie à f = 0 ; le reste du spectre est celui de x1.</>}
      />
    </Section>
  )
}

function DcExplanation() {
  return (
    <>
      <H>Q5. Mêmes tracés pour x2</H>
      <p>
        <M>{String.raw`x_2[n] = 5 + x_1[n]`}</M>. Par linéarité de la TFD, <M>{String.raw`X_2 = \text{TFD}(5) + X_1`}</M> : on
        retrouve les deux raies de 150 (1,5 après ÷N) à ±100 Hz.
      </p>

      <H>Q6. Effet de la composante continue</H>
      <p>La TFD d'une constante c ne garde que k = 0 :</p>
      <MBlock>{String.raw`\sum_{n=0}^{N-1} c\, e^{-j2\pi kn/N} = \begin{cases} cN & k = 0 \\ 0 & k \neq 0 \end{cases}`}</MBlock>
      <p>
        Une seule raie, à <strong>f = 0</strong>, de hauteur <M>{String.raw`cN = 5 \times 100 = 500`}</M>, soit{' '}
        <M>{String.raw`5`}</M> après division par N : c'est la <strong>valeur moyenne</strong> du signal.
      </p>
      <p>
        Contrairement au cosinus, elle n'est pas partagée entre deux fréquences : pas de facteur 1/2, et pas de ×2 en spectre
        unilatéral. La raie est réelle : une constante est paire.
      </p>

      <Conclusion>
        <ul>
          <li>La composante continue ajoute une raie à f = 0 d'amplitude c (500 avant ÷N, 5 après).</li>
          <li>Elle ne modifie pas les raies à ±100 Hz : la TFD est linéaire.</li>
        </ul>
      </Conclusion>
    </>
  )
}
