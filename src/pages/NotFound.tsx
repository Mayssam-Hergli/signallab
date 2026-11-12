import { Link } from 'react-router-dom'

export default function NotFound({ what = 'Page introuvable' }: { what?: string }) {
  return (
    <div className="py-16">
      <h1 className="text-[1.8rem] font-bold">{what}</h1>
      <Link to="/" className="mt-4 inline-block underline">
        Retour à l'accueil
      </Link>
    </div>
  )
}
