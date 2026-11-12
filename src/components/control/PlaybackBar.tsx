import type { Playback } from '../../lib/usePlayback'

const KEY = 'h-8 border px-3 font-mono text-[0.88rem] transition-colors'
const OFF = 'border-rule-strong text-ink-soft hover:border-ink-soft hover:text-ink'
const ON = 'border-trace/70 bg-trace/[0.08] text-trace'

/** Lancer / Pause, remise à zéro, and the playback speeds (×1, ×10, ×50 or slow motion ×0.1 …). */
export default function PlaybackBar({ play, duration, speeds }: { play: Playback; duration: number; speeds: number[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button type="button" onClick={play.toggle} aria-pressed={play.playing} className={`${KEY} min-w-24 ${play.playing ? ON : OFF}`}>
        {play.playing ? '❚❚ Pause' : play.time > 0 && play.time < duration ? '▶ Reprendre' : '▶ Lancer'}
      </button>
      <button type="button" onClick={play.reset} className={`${KEY} ${OFF}`} title="Remise à zéro" aria-label="Remise à zéro">
        ↺
      </button>
      <span className="ml-auto flex gap-1" role="group" aria-label="Vitesse de lecture">
        {speeds.map((s) => (
          <button key={s} type="button" onClick={() => play.setSpeed(s)} aria-pressed={play.speed === s} className={`${KEY} px-2 ${play.speed === s ? ON : OFF}`}>
            ×{s}
          </button>
        ))}
      </span>
    </div>
  )
}
