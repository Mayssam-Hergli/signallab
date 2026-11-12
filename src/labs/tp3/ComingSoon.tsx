import { Link } from 'react-router-dom'

export default function ComingSoon() {
  return (
    <div className="text-ink-soft">
      <p className="italic">Ce TP sera ajouté lorsque l'énoncé et le code MATLAB seront disponibles.</p>
      <Link to="/" className="mt-4 inline-block text-ink underline">
        Retour au sommaire
      </Link>
    </div>
  )
}
