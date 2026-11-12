/**
 * A figure copied from the printed handout (public/figures/…), with its
 * caption as printed. The scans are black on white: they are inverted so
 * they read as a drawing on the dark bench, like the rest of the site.
 */
export default function HandoutFigure({ src, caption, alt, className = '' }: { src: string; caption: string; alt: string; className?: string }) {
  return (
    <figure className={`border border-rule-strong bg-black ${className}`}>
      <div className="overflow-x-auto px-4 py-4">
        <img
          src={`${import.meta.env.BASE_URL}${src.replace(/^\//, '')}`}
          alt={alt}
          className="mx-auto block max-w-full min-w-[30rem] opacity-90 invert"
          loading="lazy"
        />
      </div>
      <figcaption className="border-t border-rule bg-sheet px-4 py-2 text-[0.92rem] leading-snug text-ink-soft italic">{caption}</figcaption>
    </figure>
  )
}
