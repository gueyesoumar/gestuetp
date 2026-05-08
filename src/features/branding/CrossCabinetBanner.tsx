import { useEffect, useState } from 'react'
import { ExternalLink, Info, X } from 'lucide-react'
import { useBranding } from './useBranding'
import { supabase } from '../../lib/supabase'

/**
 * Bannière affichée sur le portail brandé (custom domain) quand l'utilisateur
 * a aussi des missions chez d'autres cabinets. Permet de basculer rapidement
 * vers le portail neutre Gestu pour voir tout son audit transverse.
 *
 * Logique :
 *   1. Visible uniquement si on est sur un custom domain (isCustomDomain && branding)
 *   2. Compte les missions de l'utilisateur dans des cabinets différents du courant
 *   3. Affiche le bandeau si > 0 missions ailleurs
 *   4. Peut être fermé pour la session (sessionStorage)
 */

const DISMISS_KEY = 'gestu:cross-cabinet-banner-dismissed'

export function CrossCabinetBanner(): JSX.Element | null {
  const { branding, isCustomDomain } = useBranding()
  const [otherCount, setOtherCount] = useState(0)
  const [otherCabinets, setOtherCabinets] = useState<string[]>([])
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try { return sessionStorage.getItem(DISMISS_KEY) === '1' } catch { return false }
  })

  const currentCabinetId = branding?.cabinet_id ?? null

  useEffect(() => {
    if (!isCustomDomain || !currentCabinetId) return
    let cancelled = false

    void (async () => {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) return
      const baseUrl = import.meta.env.VITE_SUPABASE_URL
      const apikey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const headers = { apikey, Authorization: `Bearer ${token}` }

      const accessRes = await fetch(`${baseUrl}/rest/v1/client_mission_access?select=mission_id`, { headers })
      if (!accessRes.ok) return
      const access = await accessRes.json() as { mission_id: string }[]
      if (access.length === 0) return

      const ids = access.map((a) => a.mission_id).join(',')
      const missionsRes = await fetch(`${baseUrl}/rest/v1/missions?select=cabinet_id,cabinet:organizations!missions_cabinet_id_fkey(name)&id=in.(${ids})`, { headers })
      if (!missionsRes.ok) return
      const rows = await missionsRes.json() as Array<{ cabinet_id: string; cabinet: { name: string } | null }>

      const otherIds = new Set<string>()
      const otherNames = new Set<string>()
      for (const r of rows) {
        if (r.cabinet_id !== currentCabinetId) {
          otherIds.add(r.cabinet_id)
          if (r.cabinet?.name) otherNames.add(r.cabinet.name)
        }
      }
      if (cancelled) return
      setOtherCount(otherIds.size)
      setOtherCabinets([...otherNames].slice(0, 3))
    })()

    return () => { cancelled = true }
  }, [isCustomDomain, currentCabinetId])

  if (!isCustomDomain || !branding) return null
  if (dismissed) return null
  if (otherCount === 0) return null

  const handleDismiss = (): void => {
    try { sessionStorage.setItem(DISMISS_KEY, '1') } catch { /* ignore */ }
    setDismissed(true)
  }

  return (
    <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center gap-3">
      <Info size={14} className="text-blue-700 shrink-0" />
      <div className="flex-1 min-w-0 text-[12px] text-blue-900 leading-snug">
        Vous êtes audité par <strong>{otherCount} autre{otherCount > 1 ? 's' : ''} cabinet{otherCount > 1 ? 's' : ''}</strong>
        {otherCabinets.length > 0 && <span className="text-blue-700"> ({otherCabinets.join(', ')}{otherCount > otherCabinets.length ? '…' : ''})</span>}.
        {' '}Voir toutes vos missions sur{' '}
        <a
          href="https://app.gestugroup.com/portal"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold underline hover:text-blue-700 inline-flex items-center gap-0.5"
        >
          le portail Gestu <ExternalLink size={11} />
        </a>.
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Masquer"
        className="text-blue-400 hover:text-blue-700 shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  )
}
