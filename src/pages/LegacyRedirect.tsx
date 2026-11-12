import { Navigate, useLocation, useParams } from 'react-router-dom'
import { legacyLabPath } from '../labs/registry'
import NotFound from './NotFound'

/**
 * Old single-course routes → new ones, keeping ?s=<section>:
 *   /#/tp1, /#/tp/tp1  →  /#/traitement-du-signal/tp1
 * `id` is given for the static /tp1… routes, read from :labId for /tp/:labId.
 */
export default function LegacyRedirect({ id }: { id?: string }) {
  const { labId } = useParams()
  const { search } = useLocation()
  const to = legacyLabPath(id ?? labId)
  if (!to) return <NotFound what="TP introuvable" />
  return <Navigate to={`${to}${search}`} replace />
}
