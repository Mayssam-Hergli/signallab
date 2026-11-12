import type { Shape } from 'plotly.js'
import { useMemo, useState } from 'react'
import { convDefinition, convLinear, convViaFFT, maxAbsDiff } from '../../dsp'
import Console from '../../components/Console'
import { Conclusion, H, M as Tex, MBlock } from '../../components/Explanation'
import Insight from '../../components/Insight'
import Plot, { axisRefs, mergeAxes, stackedLayout } from '../../components/Plot'
import Section from '../../components/Section'
import Slider from '../../components/Slider'
import { stemTraces } from '../../components/StemPlot'
import { C } from '../../components/theme'
import { fmt, sci } from '../../lib/format'
import { ENONCE_A } from './enonce'
import { A_TP, FILE, idx, N_TP, tpSequences } from './sequences'


/** Vertical dotted marker on one subplot. */
function vline(x: number, xref: string, yref: string, color: string = C.axis): Partial<Shape> {
  return {
    type: 'line',
    xref: xref as Shape['xref'],
    yref: yref as Shape['yref'],
    x0: x,
    x1: x,
    y0: 0,
    y1: 1,
    line: { color, width: 1, dash: 'dot' },
  }
}

export default function LinearConvolution() {
  const [N, setN] = useState(N_TP)
  const [a, setA] = useState(A_TP)
  const M = 2 * N
  const isTP = N === N_TP && a === A_TP

  const r = useMemo(() => {
    const { x, g } = tpSequences(N, a)
    const y = convLinear(x, g) // MATLAB: y = conv_lineaire(x, g);
    const yFft = convViaFFT(x, g) // MATLAB: y_fft = conv_lineaire_fft(x, g);
    const yRef = convDefinition(x, g) // stands for MATLAB's conv(x, g)
    const peak = y[N - 1]
    return { x, g, y, yFft, errFft: maxAbsDiff(y, yFft), errConv: maxAbsDiff(y, yRef), peak }
  }, [N, a])

  const L = N + M - 1
  const xr: [number, number] = [-0.8, L - 0.2]

  // MATLAB figure 'A - Convolution linéaire': subplot(3,1,k)
  const titles = ['x(n)', `g(n) = ${a}^n`, 'y(n) = x(n) * g(n) (méthode fliplr)']
  const ax = [0, 1, 2].map(axisRefs)
  const fig1 = {
    data: [
      ...stemTraces(idx(N), r.x, { name: 'x(n)', color: C.blue, filled: true, size: 6, ...ax[0], showlegend: false }),
      ...stemTraces(idx(M), r.g, { name: 'g(n)', color: C.blue, filled: true, size: 6, ...ax[1], showlegend: false }),
      ...stemTraces(idx(L), r.y, { name: 'y(n)', color: C.blue, size: 7, ...ax[2], showlegend: false }),
    ],
    layout: {
      ...mergeAxes(stackedLayout(titles, 0.13), {
        xaxis: { range: xr },
        xaxis2: { range: xr },
        xaxis3: { range: xr, title: { text: 'n' } },
      }),
      showlegend: false,
      margin: { l: 56, r: 24, t: 30, b: 54 },
      // the three regimes of y: x entering g, x fully inside, x leaving
      shapes: [vline(N - 1, 'x3', 'y3 domain', C.orange), vline(M - 1, 'x3', 'y3 domain', C.orange)],
    },
  }

  // MATLAB figure 'A.4 - Comparaison': stem(y,'bo'); hold on; stem(y_fft,'rs')
  const fig2 = {
    data: [
      ...stemTraces(idx(L), r.y, { name: 'Méthode fliplr', color: C.blue, size: 13 }),
      ...stemTraces(idx(L), r.yFft, { name: 'Méthode FFT', color: C.red, size: 6, symbol: 'square' }),
    ],
    layout: {
      xaxis: { range: xr, title: { text: 'n' } },
      title: { text: '<b>Convolution linéaire : deux méthodes</b>', font: { size: 14 }, y: 0.97 },
      margin: { l: 56, r: 24, t: 70, b: 54 },
    },
  }

  const controls = (
    <>
      <Slider label="N (longueur de x)" value={N} min={2} max={20} onChange={setN} hint={`M = 2N = ${M}`} />
      <Slider label="a (g(n) = aⁿ)" value={a} min={0.1} max={0.95} step={0.05} onChange={(v) => setA(Number(v.toFixed(2)))} format={(v) => v.toFixed(2)} />
      {!isTP && (
        <button
          type="button"
          onClick={() => {
            setN(N_TP)
            setA(A_TP)
          }}
          className="self-center text-[0.9rem] underline decoration-rule-strong hover:decoration-trace"
        >
          Revenir aux valeurs du TP (N = 10, a = 0,7)
        </button>
      )}
    </>
  )

  return (
    <Section
      questions={ENONCE_A}
      controls={controls}
      explanation={<LinearExplanation N={N} a={a} peak={r.peak} />}
      code={[
        { file: FILE, cell: 'A.1-A.3' },
        { file: FILE, cell: 'A.4' },
        { file: FILE, fn: 'conv_lineaire' },
        { file: FILE, fn: 'conv_lineaire_fft' },
      ]}
    >
      <Console
        lines={[
          `Longueur de y = ${r.y.length} | N+M-1 = ${L}`,
          `Écart max fliplr / FFT = ${sci(r.errFft)}`,
          `Écart max avec conv() de MATLAB = ${sci(r.errConv)}`,
        ]}
        note="Calculé ici dans le navigateur (double précision) ; conv() est remplacée par la définition directe Σ x(m) g(n − m). MATLAB peut afficher un écart différent, du même ordre (10⁻¹⁶ à 10⁻¹⁵)."
      />
      <Insight
        title={
          <>
            Maximum en n = N − 1 = {N - 1} : y = (1 − a<sup>N</sup>)/(1 − a) = <span className="font-mono">{fmt(r.peak, 4)}</span>
          </>
        }
      >
        y monte tant que x entre dans g (n &lt; N), décroît comme a<sup>n</sup> tant que x est entièrement dans g, puis
        tombe à 0 quand x en sort (n &gt; M − 1). Pointillés orange : n = N − 1 et n = M − 1.
      </Insight>
      <Plot
        data={fig1.data}
        layout={fig1.layout}
        height={700}
        caption={
          <>
            les deux séquences de départ et leur convolution, {L} = N + M − 1 points (n = 0 … {L - 1}), tracées comme dans la
            figure « A - Convolution linéaire » du TP.
          </>
        }
      />
      <Plot
        data={fig2.data}
        layout={fig2.layout}
        height={380}
        caption={
          <>
            y calculé par « retourner et glisser » (cercles bleus) et par la FFT après ajout de zéros (carrés rouges) : chaque
            carré tombe exactement sur son cercle, l'écart maximal est de <span className="font-mono">{sci(r.errFft)}</span>.
          </>
        }
      />
    </Section>
  )
}

function LinearExplanation({ N, a, peak }: { N: number; a: number; peak: number }) {
  const M = 2 * N
  return (
    <>
      <H>Définition</H>
      <MBlock>{String.raw`y(n) = (x * g)(n) = \sum_{m} x(m)\, g(n - m)`}</MBlock>
      <p>
        Pour chaque n : on <strong>retourne</strong> g (<code className="font-mono">gg = fliplr(g)</code>), on le{' '}
        <strong>décale</strong> de n, on <strong>multiplie</strong> terme à terme avec x puis on <strong>somme</strong>. Dans
        le code, x est entouré de M − 1 zéros (<code className="font-mono">xp</code>) pour que la fenêtre{' '}
        <code className="font-mono">xp(n:n+M-1)</code> puisse glisser d'un bout à l'autre. L'animateur, section suivante,
        montre ces quatre opérations pas à pas.
      </p>

      <H>Longueur N + M − 1 (A.3)</H>
      <p>
        Le premier recouvrement non nul a lieu pour n = 0 (x(0) face à g(0)), le dernier pour n = (N − 1) + (M − 1). Il y a
        donc <Tex>{`N + M - 1 = ${N} + ${M} - 1 = ${N + M - 1}`}</Tex> valeurs.
      </p>

      <H>Forme de y</H>
      <p>Avec x = 1 sur N points, y(n) est la somme des valeurs de g qui sont sous la fenêtre :</p>
      <MBlock>{String.raw`y(n) = \begin{cases} \dfrac{1-a^{n+1}}{1-a} & n \le N-1 \\[8pt] a^{\,n-N+1}\,\dfrac{1-a^{N}}{1-a} & N-1 \le n \le M-1 \\[8pt] \dfrac{a^{\,n-N+1}-a^{M}}{1-a} & n \ge M-1 \end{cases}`}</MBlock>
      <p>
        Le maximum est atteint en n = N − 1, quand la fenêtre couvre pour la première fois les N plus grandes valeurs de g :{' '}
        <Tex>{String.raw`\frac{1-${a}^{${N}}}{1-${a}} \approx ${peak.toFixed(4)}`}</Tex>.
      </p>

      <H>Par la FFT (A.4)</H>
      <p>
        La TFD transforme la convolution <em>circulaire</em> sur L points en produit :{' '}
        <Tex>{String.raw`\text{TFD}(x \circledast g) = X \cdot G`}</Tex>. Pour qu'elle donne la convolution <em>linéaire</em>, on
        complète x et g par des zéros jusqu'à <Tex>{String.raw`L = N + M - 1`}</Tex> : le résultat ne déborde plus de la période
        et rien ne se replie (sinon, voir la partie B). L'écart avec la première méthode, de l'ordre de 10⁻¹⁶, n'est que
        l'arrondi des calculs en virgule flottante.
      </p>

      <Conclusion>
        <ul>
          <li>La convolution linéaire de N et M points a N + M − 1 points (29 dans le TP).</li>
          <li>« Retourner et glisser » et FFT donnent le même résultat, à l'arrondi machine près.</li>
          <li>La FFT n'est égale à la convolution linéaire qu'avec des zéros ajoutés jusqu'à N + M − 1.</li>
        </ul>
      </Conclusion>
    </>
  )
}
