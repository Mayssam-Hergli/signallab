import { M, MBlock } from '../../../components/Explanation'
import HandoutFigure from '../../../components/HandoutFigure'
import { FIG_4_1, RAPPEL } from './enonce'

const ACTION_TEX = ['k_p\\,\\varepsilon(t)', 'k_i\\displaystyle\\int_0^t \\varepsilon(\\tau)\\,d\\tau', 'k_d\\,\\dfrac{d\\varepsilon}{dt}']

/** II. Rappel — quoted from the fascicule, with Figure 4.1 and the PID transfer function. */
export default function Rappel() {
  return (
    <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-5">
        <blockquote className="max-w-4xl space-y-2.5 border border-rule-strong bg-sheet px-5 py-4 leading-relaxed">
          {RAPPEL.paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
          <ul className="space-y-1.5 pl-1">
            {RAPPEL.actions.map((a, i) => (
              <li key={a.name} className="grid grid-cols-[1.2rem_minmax(0,1fr)_auto] items-baseline gap-x-2">
                <span className="text-trace">▪</span>
                <span>
                  <strong>{a.name}</strong> : {a.text}
                </span>
                <span className="hidden text-pen sm:inline">
                  <M>{ACTION_TEX[i]}</M>
                </span>
              </li>
            ))}
          </ul>
          {RAPPEL.after.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </blockquote>
        <HandoutFigure {...FIG_4_1} className="max-w-3xl" />
      </div>

      <aside className="h-fit border-l-2 border-pen/60 pl-4 leading-relaxed text-pen/95">
        <p className="font-semibold">Ce que calcule pid(kp, ki, kd) dans le .m</p>
        <p className="mt-1">
          La somme des trois branches de la figure 4.1 (forme parallèle, celle du bloc PID Controller), en Laplace :
        </p>
        <MBlock>{String.raw`C(s) = k_p + \frac{k_i}{s} + k_d\,s = \frac{k_d s^2 + k_p s + k_i}{s}`}</MBlock>
        <p>
          Le terme <M>{'k_i/s'}</M> est un intégrateur : un pôle en s = 0 dans la boucle. C'est lui qui annulera l'erreur
          statique en III et IV. Le terme <M>{'k_d s'}</M> est une dérivée idéale, comme dans le .m (sans filtre) : il réagit
          instantanément à un échelon de consigne.
        </p>
      </aside>
    </div>
  )
}
