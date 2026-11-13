import type { Data, Layout } from 'plotly.js'
import { useMemo, useState, type FormEvent } from 'react'
import Console from '../../../components/Console'
import { Conclusion, H, M, MBlock } from '../../../components/Explanation'
import Insight, { Readout } from '../../../components/Insight'
import Plot, { axisRefs, mergeAxes, stackedLayout } from '../../../components/Plot'
import Section from '../../../components/Section'
import Select from '../../../components/Select'
import { lineTrace, stemTraces } from '../../../components/StemPlot'
import { C } from '../../../components/theme'
import { cabs, trimPoly } from '../../../control'
import { fmt } from '../../../lib/format'
import { ENONCE_I, OBJECTIF_I } from './enonce'
import {
  analyse,
  coef,
  cplxStr,
  FE,
  FILE,
  H1,
  H2,
  lead,
  maxModulus,
  parseVector,
  polyFromHandles,
  polyLatex,
  TE,
  toHandles,
  validate,
  type Handle,
  type Rational,
} from './model'
import PoleZeroPlane, { type RootKind } from './PoleZeroPlane'

type Choice = 'H1' | 'H2' | 'custom'

const vec = (p: readonly number[]) => `[${p.map(coef).join(' ')}]`

/** View half-width of the z-plane: room for every root of the system as given, at least 1.3. */
function viewRadius(sys: Rational): number {
  const a = analyse(sys, 1, 1)
  const m = Math.max(maxModulus(a.poles), maxModulus(a.zeros), 1)
  return Math.max(1.3, Math.ceil(m * 1.2 * 10) / 10)
}

interface Edit {
  zeros: Handle[]
  poles: Handle[]
}

const BTN = 'h-8 border border-rule-strong px-3 font-mono text-[0.85rem] text-ink-soft transition-colors hover:border-trace/70 hover:text-trace'
const FIELD = 'w-44 border border-rule-strong bg-screen px-2 py-1 font-mono text-[0.95rem] text-ink focus:border-trace/70'

/** I.1–I.5: H1 / H2 / custom H(z) — pôles, zéros, h[n], réponse en fréquence; draggable roots. */
export default function TransferFunctions() {
  const [choice, setChoice] = useState<Choice>('H1')
  const [custom, setCustom] = useState<Rational>({ num: [1, 0.5], den: [1, -0.9] })
  const [numText, setNumText] = useState('[1 0.5]')
  const [denText, setDenText] = useState('[1 -0.9]')
  const [error, setError] = useState<string | null>(null)
  const [edit, setEdit] = useState<Edit | null>(null)

  const base: Rational = choice === 'H1' ? H1 : choice === 'H2' ? H2 : custom
  const baseA = useMemo(() => analyse(base), [base])
  const R = useMemo(() => viewRadius(base), [base])
  const handles: Edit = useMemo(() => edit ?? { zeros: toHandles(baseA.zeros), poles: toHandles(baseA.poles) }, [edit, baseA])

  // the system shown: the original coefficients, or the one rebuilt from the dragged roots
  const sys: Rational = useMemo(
    () =>
      edit
        ? { num: polyFromHandles(edit.zeros, lead(base.num)), den: polyFromHandles(edit.poles, lead(base.den)) }
        : { num: trimPoly(base.num), den: trimPoly(base.den) },
    [edit, base],
  )
  const a = useMemo(() => analyse(sys), [sys])
  const nOut = a.poles.filter((p) => cabs(p) >= 1 - 1e-9).length
  const name = choice === 'custom' ? 'H' : choice

  const pick = (c: Choice) => {
    setChoice(c)
    setEdit(null)
    setError(null)
  }
  const apply = (e: FormEvent) => {
    e.preventDefault()
    const n = parseVector(numText)
    const d = parseVector(denText)
    if (!n.ok) return setError(`Num : ${n.error}`)
    if (!d.ok) return setError(`Den : ${d.error}`)
    const err = validate(n.v, d.v)
    if (err) return setError(err)
    setError(null)
    setCustom({ num: trimPoly(n.v), den: trimPoly(d.v) })
    setEdit(null)
  }
  const onDrag = (kind: RootKind, i: number, h: Handle) => {
    const cur = edit ?? handles
    const next = { zeros: [...cur.zeros], poles: [...cur.poles] }
    next[kind === 'zero' ? 'zeros' : 'poles'][i] = h
    setEdit(next)
  }

  const controls = (
    <>
      <Select<Choice>
        label="fonction de transfert"
        value={choice}
        onChange={pick}
        options={[
          { value: 'H1', label: 'H1 (exemple 1)', tp: true },
          { value: 'H2', label: 'H2 (exemple 2)', tp: true },
          { value: 'custom', label: 'personnalisée' },
        ]}
      />
      {choice === 'custom' && (
        <form onSubmit={apply} className="flex flex-wrap items-end gap-3">
          <label className="text-[0.9rem] text-ink-soft">
            Num (puissances de z)
            <input className={`${FIELD} mt-1 block`} value={numText} onChange={(e) => setNumText(e.target.value)} spellCheck={false} />
          </label>
          <label className="text-[0.9rem] text-ink-soft">
            Den (puissances de z)
            <input className={`${FIELD} mt-1 block`} value={denText} onChange={(e) => setDenText(e.target.value)} spellCheck={false} />
          </label>
          <button type="submit" className={BTN}>
            Appliquer
          </button>
          {error && (
            <p className="basis-full text-[0.88rem] text-pen" role="status">
              {error}
            </p>
          )}
        </form>
      )}
    </>
  )

  // ── figures ──
  const ghost = edit !== null
  const impulse: Data[] = [
    ...(ghost ? stemTraces(baseA.t, baseA.h, { color: C.continuous, size: 4, name: 'avant déplacement' }) : []),
    ...stemTraces(a.t, a.h, { color: a.stable ? C.blue : C.red, size: 6, name: 'après déplacement', showlegend: ghost }),
  ]
  const freqLayout = mergeAxes(stackedLayout([`|${name}(f)|`, `arg ${name}(f) (rad)`], 0.16), {
    xaxis: { range: [0, FE / 2], title: { text: '' } },
    xaxis2: { range: [0, FE / 2], title: { text: 'f (Hz)' } },
    yaxis2: { range: [-Math.PI - 0.3, Math.PI + 0.3], tickvals: [-Math.PI, -Math.PI / 2, 0, Math.PI / 2, Math.PI], ticktext: ['−π', '−π/2', '0', 'π/2', 'π'] },
  }) as Partial<Layout>
  const freq: Data[] = [
    ...(ghost
      ? [
          lineTrace(baseA.freq.f, baseA.freq.mag, { color: C.continuous, width: 1.3, dash: 'dash', ...axisRefs(0), name: 'avant déplacement', hover: false }),
          lineTrace(baseA.freq.f, baseA.freq.phase, { color: C.continuous, width: 1.3, dash: 'dash', ...axisRefs(1), showlegend: false, hover: false }),
        ]
      : []),
    lineTrace(a.freq.f, a.freq.mag, { color: C.blue, ...axisRefs(0), name: `|${name}|`, showlegend: false }),
    lineTrace(a.freq.f, a.freq.phase, { color: C.orange, ...axisRefs(1), name: 'arg', showlegend: false }),
  ]

  const poleStrs = a.poles.map((p) => cplxStr(p))
  const mods = a.poles.map((p) => cabs(p).toFixed(4))

  return (
    <Section
      questions={{ intro: <>{OBJECTIF_I}<br /><br />{ENONCE_I.intro}</>, items: ENONCE_I.items }}
      controls={controls}
      explanation={<TfExplanation />}
      code={[
        { file: FILE, cell: 'I.1' },
        { file: FILE, cell: 'I.2' },
        { file: FILE, cell: 'I.3' },
        { file: FILE, cell: 'I.4' },
        { file: FILE, cell: 'I.5' },
      ]}
    >
      <div className="overflow-x-auto border border-rule-strong bg-sheet px-4 py-1 text-[1.15rem]">
        <MBlock>{String.raw`${name}(z) = \frac{${polyLatex(sys.num)}}{${polyLatex(sys.den)}}, \qquad T_e = ${TE}\ \text{s}`}</MBlock>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,27rem)_minmax(0,1fr)]">
        <figure className="border border-rule-strong bg-[#0d131a] p-2">
          <PoleZeroPlane zeros={handles.zeros} poles={handles.poles} R={R} onChange={onDrag} label={`Plan z de ${name}`} />
          <figcaption className="mt-1 border-t border-rule px-2 pt-2 text-[0.88rem] leading-snug text-ink-soft">
            <span className="text-ml-blue">○ zéros</span>, <span className="text-ml-orange">× pôles</span> (
            <span className="text-[#FF5252]">rouge</span> sur ou hors du cercle unité). Survolez un point pour sa valeur ;{' '}
            <strong className="text-ink">faites-le glisser</strong> (ou flèches du clavier) : les paires conjuguées bougent
            ensemble.
          </figcaption>
        </figure>

        <div className="space-y-3">
          <Insight
            tone={a.stable ? 'note' : 'warn'}
            title={
              a.stable ? (
                <>Stable : max |p| = {fmt(a.rho, 4)} &lt; 1</>
              ) : (
                <>
                  Instable : max |p| = {fmt(a.rho, 4)} ≥ 1 ({nOut} pôle{nOut > 1 ? 's' : ''} sur ou hors du cercle)
                </>
              )
            }
          >
            {a.stable
              ? 'Tous les pôles sont dans le cercle unité : h[n] tend vers 0.'
              : 'Un pôle hors du cercle donne un terme en pⁿ qui croît : h[n] diverge.'}
          </Insight>
          <Console
            lines={[
              `zeros = ${a.zeros.length ? a.zeros.map((z) => cplxStr(z)).join(' ; ') : '(aucun)'}`,
              `poles = ${poleStrs.join(' ; ')}`,
              `|pôles| = [${mods.join(' ')}] -> ${a.stable ? 'stable' : 'INSTABLE'}`,
            ]}
            note={ghost ? 'Valeurs après déplacement des racines (le .m affiche celles de H1 et H2).' : undefined}
          />
          <div className="space-y-1">
            <Readout label="Num (z)" value={vec(sys.num)} />
            <Readout label="Den (z)" value={vec(sys.den)} />
            <Readout label="Num complété (z⁻¹, pour impz/freqz)" value={vec(a.numz)} />
          </div>
          {ghost && (
            <button type="button" className={BTN} onClick={() => setEdit(null)}>
              ↺ Remettre les racines de {name}
            </button>
          )}
        </div>
      </div>

      <Plot
        data={impulse}
        layout={{
          xaxis: { title: { text: 't = n·Te (s)' } },
          yaxis: { title: { text: 'h[n]' } },
          showlegend: ghost,
          margin: { l: 70, r: 24, t: ghost ? 40 : 20, b: 54 },
        }}
        height={300}
        caption={
          a.stable ? (
            <>
              réponse impulsionnelle (impz, 30 échantillons, Num complété) : h[0] = {fmt(a.h[0], 3)}, puis une oscillation amortie
              qui tend vers 0{ghost ? ' ; en gris, avant déplacement' : ''}.
            </>
          ) : (
            <>
              réponse impulsionnelle (tiges rouges) : elle diverge, max |h[n]| = {fmt(Math.max(...a.h.map(Math.abs)), 1)} sur 30 échantillons
              {ghost ? ' ; en gris, avant déplacement' : ''}.
            </>
          )
        }
      />
      <Plot
        data={freq}
        layout={{ ...freqLayout, showlegend: false, margin: { l: 70, r: 24, t: 30, b: 54 } }}
        height={460}
        caption={
          <>
            freqz(Num complété, Den, 512, 1/Te) : module (bleu) et phase (orange) de 0 à Fe/2 = {FE / 2} Hz. |{name}(0)| ={' '}
            {fmt(a.freq.mag[0], 3)}.{ghost ? ' En pointillé gris : avant déplacement.' : ''}{a.stable ? '' : ' Pour un système instable, cette courbe est un calcul formel : la TFTD de h[n] n’existe pas.'}
          </>
        }
      />
    </Section>
  )
}

function TfExplanation() {
  return (
    <>
      <H>I.1–I.2. Déclarer H(z)</H>
      <p>
        <code className="font-mono">tf(Num, Den, Te)</code> construit une fonction de transfert discrète à partir des coefficients
        en <strong>puissances décroissantes de z</strong>, comme on l'écrit : Num1 = [1 −0.3] pour z − 0.3. Le programme fourni
        utilisait <code className="font-mono">dfilt.df1</code>, déconseillé dans les versions récentes de MATLAB (voir la section
        suivante).
      </p>

      <H>I.3. Pôles, zéros, stabilité</H>
      <p>
        <code className="font-mono">roots(Num)</code> et <code className="font-mono">roots(Den)</code>. Un système causal est
        stable si et seulement si tous ses pôles sont <strong>dans le cercle unité</strong> : chaque pôle p contribue un terme en{' '}
        <M>{String.raw`p^n`}</M> à h[n].
      </p>
      <ul>
        <li>
          H1 : pôles <M>{String.raw`0{,}65 \pm 0{,}5268j`}</M>, <M>{String.raw`|p| = \sqrt{0{,}7} = 0{,}8367`}</M> : stable, h[n]
          est une sinusoïde amortie en <M>{String.raw`0{,}8367^n`}</M>.
        </li>
        <li>
          H2 : pôles <M>{String.raw`1{,}0037 \pm 1{,}0549j`}</M> (|p| = 1,4561) et −0,7075 : deux pôles hors du cercle, instable.
        </li>
      </ul>

      <H>I.4. Transformée en z inverse</H>
      <p>Par division selon les puissances de z⁻¹ (c'est ce que fait impz) :</p>
      <MBlock>{String.raw`H_1(z) = \frac{z^{-1} - 0{,}3z^{-2}}{1 - 1{,}3z^{-1} + 0{,}7z^{-2}} = 0 + z^{-1} + z^{-2} + 0{,}6z^{-3} + 0{,}08z^{-4} - 0{,}316z^{-5} + \dots`}</MBlock>
      <p>
        h[0] = 0 : le degré du numérateur est inférieur d'une unité à celui du dénominateur, la réponse commence avec un retard
        d'un échantillon.
      </p>

      <H>I.5. Réponse en fréquence</H>
      <p>
        <M>{String.raw`H(e^{j2\pi f T_e})`}</M> pour f de 0 à Fe/2 = 50 Hz. Elle n'a de sens physique que si le système est
        stable.
      </p>

      <H>Faire glisser les racines</H>
      <ul>
        <li>Un pôle près du cercle donne un pic de |H| à sa fréquence <M>{String.raw`f = \arg(p)/(2\pi T_e)`}</M>, et un h[n] qui s'amortit lentement.</li>
        <li>Un zéro sur le cercle annule |H| à sa fréquence.</li>
        <li>Un pôle hors du cercle : h[n] diverge.</li>
        <li>Les racines complexes vont par paires conjuguées : sinon les coefficients ne seraient plus réels.</li>
      </ul>

      <Conclusion>
        <ul>
          <li>Les pôles fixent la stabilité et la forme de h[n] ; les zéros façonnent |H(f)|.</li>
          <li>H1 est stable (|p| = 0,8367), H2 est instable (|p| = 1,4561).</li>
        </ul>
      </Conclusion>
    </>
  )
}
