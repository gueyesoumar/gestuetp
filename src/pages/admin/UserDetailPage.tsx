import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Eye } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAdminUserDetail } from '../../features/admin/useAdminUserDetail'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { useToast } from '../../hooks/useToast'

/**
 * Aperçu détaillé d'un utilisateur en mode super-admin.
 *
 * Lecture seule par construction — aucune mutation possible depuis cette page.
 * À l'arrivée sur la page, déclenche admin-view-user qui crée une session
 * d'audit et notifie le target (RGPD).
 */
export function UserDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { user, loading, error } = useAdminUserDetail(id)
  const [reasonModalOpen, setReasonModalOpen] = useState(true)
  const [reason, setReason] = useState('')
  const [registering, setRegistering] = useState(false)
  const [sessionStarted, setSessionStarted] = useState(false)

  // Si l'utilisateur quitte / change d'id, on relance la modale
  useEffect(() => {
    setReasonModalOpen(true)
    setSessionStarted(false)
    setReason('')
  }, [id])

  const startSession = async () => {
    if (!id || !reason.trim()) return
    setRegistering(true)
    const { data, error: fnError } = await supabase.functions.invoke('admin-view-user', {
      body: { target_user_id: id, reason },
    })
    setRegistering(false)
    if (fnError) {
      toast.error('Démarrage impossible', fnError)
      return
    }
    if (data?.error) {
      toast.error('Démarrage impossible')
      console.error('admin-view-user:', data.error)
      return
    }
    setReasonModalOpen(false)
    setSessionStarted(true)
    toast.success('Aperçu démarré', {
      description: data?.notification_sent ? 'L\'utilisateur a été notifié.' : 'Notification déjà envoyée récemment.',
    })
  }

  if (loading) return <div className="p-8"><LoadingSpinner /></div>
  if (error || !user) return <div className="p-8"><ErrorAlert message={error ?? 'Utilisateur introuvable'} /></div>

  return (
    <div className="px-7 py-6">
      <div className="flex items-center gap-3 mb-1">
        <button onClick={() => navigate(-1)} className="text-[12px] text-forest-700 font-semibold hover:text-forest-900 inline-flex items-center gap-1">
          <ChevronLeft size={14} /> Retour
        </button>
      </div>

      {sessionStarted && (
        <div className="mt-4 mb-4 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2.5">
          <Eye size={14} className="text-amber-700 flex-shrink-0" />
          <span className="text-[12px] text-amber-700"><b className="font-bold">Aperçu actif</b> — vous consultez cette fiche en lecture seule. L&apos;utilisateur a été notifié.</span>
        </div>
      )}

      <div className="flex items-center gap-3 mt-3 mb-5">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-[14px] font-extrabold ${user.is_active ? 'bg-forest-100 text-forest-700' : 'bg-red-50 text-red-600'}`}>
          {user.first_name.charAt(0)}{user.last_name.charAt(0)}
        </div>
        <div>
          <h1 className="text-[18px] font-bold text-gray-900">{user.first_name} {user.last_name}</h1>
          <div className="text-[11.5px] text-gray-500">{user.email}</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {user.is_platform_owner && <span className="text-[10px] uppercase tracking-wider font-bold bg-gold-50 text-gold-600 px-2 py-1 rounded-full">Platform owner</span>}
          {user.is_active ? (
            <span className="px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-[11px] font-semibold">Actif</span>
          ) : (
            <span className="px-2.5 py-1 bg-red-50 text-red-700 rounded-full text-[11px] font-semibold">Désactivé</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-5">
        <div className="space-y-4">
          <Card title="Profil">
            <dl className="grid grid-cols-[140px_1fr] gap-y-2.5 gap-x-5 text-[13px]">
              <Row k="Email">{user.email}</Row>
              <Row k="Téléphone">{user.phone ?? <Em>—</Em>}</Row>
              <Row k="Poste">{user.job_title ?? <Em>—</Em>}</Row>
              <Row k="Type">{user.role === 'auditor' ? 'Auditeur' : 'Référent client'}</Row>
              <Row k="Créé le">{new Date(user.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</Row>
              <Row k="Dernière connexion">{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('fr-FR') : <Em>jamais</Em>}</Row>
            </dl>
          </Card>

          <Card title={`Missions assignées (${user.missions_assigned.length})`}>
            {user.missions_assigned.length === 0 ? (
              <Em>Aucune mission.</Em>
            ) : (
              <ul className="divide-y divide-gray-100">
                {user.missions_assigned.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 py-2.5 text-[12.5px]">
                    <span className="font-semibold text-gray-900 truncate flex-1">{m.name}</span>
                    <span className="text-[11px] text-gray-300 capitalize">{m.status.replaceAll('_', ' ')}</span>
                    <Link to={`/missions/${m.id}`} className="text-[11.5px] text-forest-700 font-semibold">Voir &rarr;</Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={`Consultations admin récentes (${user.recent_admin_views.length})`}>
            {user.recent_admin_views.length === 0 ? (
              <Em>Aucune consultation enregistrée.</Em>
            ) : (
              <ul className="divide-y divide-gray-100">
                {user.recent_admin_views.map((v) => (
                  <li key={v.id} className="py-2.5 text-[12px]">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-gray-900">{v.admin_email}</span>
                      <span className="text-[11px] text-gray-300 font-mono">{new Date(v.started_at).toLocaleString('fr-FR')}</span>
                    </div>
                    <div className="text-[11.5px] text-gray-500 mt-0.5 italic">« {v.reason} »</div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Organisation">
            <dl className="grid grid-cols-[100px_1fr] gap-y-2 gap-x-3 text-[12.5px]">
              <Row k="Nom">{user.organization.name}</Row>
              <Row k="Slug"><code className="font-mono text-[11px]">{user.organization.slug}</code></Row>
              <Row k="Types">{user.organization.types.join(', ')}</Row>
              <Row k="Statut">{user.organization.is_active ? 'Actif' : 'Suspendu'}</Row>
            </dl>
            <Link to={`/admin/cabinets/${user.organization.id}`} className="mt-3 inline-block text-[12px] text-forest-700 font-semibold">Voir l&apos;organisation &rarr;</Link>
          </Card>

          <Card title="Rôles cabinet">
            {user.platform_roles.length === 0 ? (
              <Em>Aucun rôle attribué.</Em>
            ) : (
              <ul className="space-y-1.5">
                {user.platform_roles.map((r) => (
                  <li key={r.id} className="text-[12px] inline-block bg-gold-50 text-gold-600 px-2.5 py-1 rounded-full font-semibold mr-1">{r.name}</li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {reasonModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="text-[14.5px] font-bold text-gray-900">Aperçu de {user.first_name} {user.last_name}</h3>
              <p className="text-[12px] text-gray-500 mt-1">L&apos;utilisateur sera notifié de votre consultation (RGPD).</p>
            </div>
            <div className="px-5 py-4">
              <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">Motif <span className="text-red-500">*</span></label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Pourquoi consultez-vous ce compte ? (obligatoire)" className="w-full" disabled={registering} />
              <p className="mt-2 text-[11px] text-gray-400">Le motif est tracé indéfiniment dans l&apos;audit log.</p>
            </div>
            <div className="px-5 py-3 bg-page-bg border-t border-gray-200 flex justify-end gap-2">
              <button onClick={() => navigate(-1)} disabled={registering} className="px-3.5 py-2 text-[12.5px] font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">Annuler</button>
              <button onClick={startSession} disabled={registering || !reason.trim()} className="px-3.5 py-2 text-[12.5px] font-semibold rounded-lg bg-forest-700 text-white hover:bg-forest-900 disabled:opacity-50">
                {registering ? 'En cours…' : 'Voir la fiche'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <header className="px-4 py-3 border-b border-gray-200">
        <span className="text-[13px] font-bold text-gray-900">{title}</span>
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  )
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-gray-500 text-[12px]">{k}</dt>
      <dd className="text-gray-900 font-medium">{children}</dd>
    </>
  )
}

function Em({ children }: { children: React.ReactNode }) {
  return <span className="text-gray-300 italic text-[12px]">{children}</span>
}
