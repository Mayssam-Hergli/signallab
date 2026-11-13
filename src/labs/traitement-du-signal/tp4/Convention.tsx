import { useMemo, useState } from 'react'
import { Conclusion, H, M, MBlock } from '../../../components/Explanation'
import Insight from '../../../components/Insight'
import Plot from '../../../components/Plot'
import Section from '../../../components/Section'
import Select from '../../../components/Select'
import { lineTrace, stemTraces } from '../../../components/StemPlot'
import { C } from '../../../components/theme'
import { freqzBA } from '../../../dsp'
import { ENONCE_CONVENTION } from './enonce'
import { analyse, coef, FE, FILE, H1, H2, polyLatex, type Rational } from './model'

const vec = (p: readonly number[]) => `[${p.map(coef).join(' ')}]`

/** I.4–I.5 pitfalls: z vs z⁻¹ in impz/freqz/zplane, and the two corrections of the provided program. */
export default function Convention() {
  const [which, setWhich] = useState<'H1' | 'H2'>('H1')
  const sys: Rational = which === 'H1' ? H1 : H2
  const a = useMemo(() => analyse(sys, 12), [sys])
  // MATLAB: [H, w] = freqz(Num, Den, 1/Te)  →  100 POINTS, w in rad/sample
  const wrong = useMemo(() => freqzBA(a.numz, sys.den, Math.round(1 / 0.01)), [a, sys])
  const pad = sys.den.length - sys.num.length
  const n = a.n

  return (
    <Section
      questions={ENONCE_CONVENTION}
      controls={
        <Select<'H1' | 'H2'>
          label="exemple"
          value={which}
          onChange={setWhich}
          options={[
            { value: 'H1', label: 'H1', tp: true },
            { value: 'H2', label: 'H2', tp: true },
          ]}
        />
      }
      explanation={<ConventionExplanation />}
      code={[
        { file: FILE, cell: 'I.4' },
        { file: FILE, cell: 'I.5' },
      ]}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="border border-rule-strong bg-sheet px-4 py-2">
          <p className="font-mono text-[0.82rem] text-trace">Écrit en puissances de z (tf, pzmap)</p>
          <MBlock>{String.raw`${which}(z) = \frac{${polyLatex(sys.num)}}{${polyLatex(sys.den)}}`}</MBlock>
          <p className="font-mono text-[0.92rem]">
            Num = {vec(sys.num)} &nbsp; Den = {vec(sys.den)}
          </p>
        </div>
        <div className="border border-rule-strong bg-sheet px-4 py-2">
          <p className="font-mono text-[0.82rem] text-trace">Lu en puissances de z⁻¹ (impz, freqz, zplane)</p>
          <MBlock>{String.raw`${which}(z) = \frac{${invZ(a.numz)}}{${invZ(sys.den)}}`}</MBlock>
          <p className="font-mono text-[0.92rem]">
            Num{which === 'H1' ? '1' : '2'}z = {vec(a.numz)} &nbsp; ({pad} zéro{pad > 1 ? 's' : ''} ajouté{pad > 1 ? 's' : ''} à gauche)
          </p>
        </div>
      </div>

      <Plot
        data={[
          ...stemTraces(n, a.h, { color: C.blue, size: 9, name: `impz(Num${which === 'H1' ? '1' : '2'}z, Den) : correct` }),
          ...stemTraces(n, a.hRaw, { color: C.red, size: 5, symbol: 'square', name: `impz(Num${which === 'H1' ? '1' : '2'}, Den) : décalé` }),
        ]}
        layout={{
          xaxis: { title: { text: 'n' }, dtick: 1, range: [-0.6, n.length - 0.4] },
          yaxis: { title: { text: 'h[n]' } },
          margin: { l: 64, r: 24, t: 40, b: 54 },
        }}
        height={320}
        caption={
          <>
            avec le numérateur brut, impz calcule z·{which}(z) : la même réponse <strong>avancée d'un échantillon</strong> (carrés rouges =
            cercles bleus décalés d'un cran vers la gauche). Le module de la réponse en fréquence est le même, la phase gagne +ω.
          </>
        }
      />

      <Insight tone="warn" title="freqz(Num, Den, 1/Te) : 100 est un nombre de points, pas une fréquence">
        La signature est freqz(b, a, n) ou freqz(b, a, n, Fs). Avec trois arguments, 1/Te = 100 est lu comme n = 100 points, et
        l'axe renvoyé est ω en rad/échantillon (0 … π), pas des Hz. Tracé comme des Hz, tout le spectre tient entre 0 et 3,14.
      </Insight>

      <Plot
        data={[
          lineTrace(wrong.w, wrong.mag, { color: C.red, name: '[H, f] = freqz(Num, Den, 1/Te) : axe 0 … π', width: 2 }),
          lineTrace(a.freq.f, a.freq.mag, { color: C.blue, name: '[H, f] = freqz(Num, Den, 512, 1/Te) : axe 0 … 50 Hz', width: 2 }),
        ]}
        layout={{
          xaxis: { title: { text: 'valeur de f renvoyée' }, range: [0, FE / 2] },
          yaxis: { title: { text: `|${which}|` } },
          margin: { l: 64, r: 24, t: 60, b: 54 },
        }}
        height={330}
        caption={
          <>
            la même courbe |{which}| : en bleu sur le bon axe (Hz) ; en rouge, l'axe renvoyé par freqz(Num, Den, 100), comprimé entre 0 et
            π ≈ 3,14 rad/échantillon.
          </>
        }
      />

      <Insight title="Deux corrections au programme fourni (reprises dans le .m)">
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            <code className="font-mono">H = dfilt.df1(Num, Den)</code> → <code className="font-mono">H = tf(Num, Den, Te)</code> : dfilt
            est déconseillé, et tf donne la TZ avec la période Te, comme le demande I.2. (Le programme fourni contient aussi, en
            commentaire, <code className="font-mono">%H=ft(Num,Den,Te)</code> : il faut lire tf.)
          </li>
          <li>
            <code className="font-mono">[H, f] = freqz(Num, Den, 1/Te)</code> →{' '}
            <code className="font-mono">[H, f] = freqz(Num1z, Den, 512, 1/Te)</code> : nombre de points, puis Fe, et le numérateur
            complété.
          </li>
        </ol>
      </Insight>
    </Section>
  )
}

/** LaTeX of coefficients in ascending powers of z⁻¹: [0 1 −0.3] → "z^{-1} - 0.3z^{-2}". */
function invZ(c: readonly number[]): string {
  const terms: string[] = []
  c.forEach((v, k) => {
    const r = Number(v.toFixed(4))
    if (r === 0) return
    const mag = Math.abs(r)
    const pow = k === 0 ? '' : `z^{-${k}}`
    const num = mag === 1 && k > 0 ? '' : String(mag)
    terms.push(terms.length === 0 ? `${r < 0 ? '-' : ''}${num}${pow}` : ` ${r < 0 ? '-' : '+'} ${num}${pow}`)
  })
  return terms.join('') || '0'
}

function ConventionExplanation() {
  return (
    <>
      <H>Deux conventions pour les mêmes coefficients</H>
      <p>
        <code className="font-mono">tf(Num, Den, Te)</code> et <code className="font-mono">pzmap</code> lisent les vecteurs en
        puissances <strong>décroissantes de z</strong>. <code className="font-mono">impz</code>,{' '}
        <code className="font-mono">freqz</code> et <code className="font-mono">zplane</code> (fonctions de traitement du signal)
        les lisent en puissances <strong>croissantes de z⁻¹</strong> :
      </p>
      <MBlock>{String.raw`[b_0\ b_1\ \dots] \;\longrightarrow\; b_0 + b_1 z^{-1} + b_2 z^{-2} + \dots`}</MBlock>

      <H>Pourquoi compléter le numérateur à gauche</H>
      <p>On divise numérateur et dénominateur par la plus haute puissance du dénominateur :</p>
      <MBlock>{String.raw`\frac{z - 0{,}3}{z^2 - 1{,}3z + 0{,}7} = \frac{0 + z^{-1} - 0{,}3z^{-2}}{1 - 1{,}3z^{-1} + 0{,}7z^{-2}}`}</MBlock>
      <p>
        Le numérateur devient [0 1 −0,3] : même longueur que Den, zéros ajoutés à gauche. Avec [1 −0,3] seul, impz calcule{' '}
        <M>{String.raw`(1 - 0{,}3z^{-1})/(\dots) = z\,H(z)`}</M> : la réponse avancée d'un échantillon (non causale par rapport à H).
        De même, zplane(Num1, Den1) verrait un zéro supplémentaire en z = 0.
      </p>
      <p>Quand Num et Den ont le même degré (filtre RII de la partie II), les deux lectures coïncident.</p>

      <H>freqz : nombre de points puis fréquence d'échantillonnage</H>
      <p>
        <code className="font-mono">freqz(b, a, n, Fs)</code> renvoie n points de 0 à Fs/2 en Hz. Sans Fs, l'axe est ω en
        rad/échantillon de 0 à π. <code className="font-mono">freqz(Num, Den, 1/Te)</code> demande donc 100 points en
        rad/échantillon, pas un axe en Hz.
      </p>

      <Conclusion>
        <ul>
          <li>Pour impz, freqz et zplane, écrire H en z⁻¹ : compléter le numérateur par des zéros à gauche.</li>
          <li>freqz(Num, Den, nPoints, Fe) pour un axe en Hz.</li>
        </ul>
      </Conclusion>
    </>
  )
}
