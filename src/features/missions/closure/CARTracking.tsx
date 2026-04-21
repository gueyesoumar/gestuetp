import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import type { CorrectiveActionRequest } from '../../../types/database.types'

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  open: { label: 'Ouvert', color: 'text-gold-600 bg-gold-50' },
  client_responded: { label: 'R&eacute;pondu', color: 'text-blue-600 bg-blue-50' },
  verified: { label: 'V&eacute;rifi&eacute;', color: 'text-green-600 bg-green-50' },
  closed: { label: 'Cl&ocirc;tur&eacute;', color: 'text-gray-500 bg-gray-100' },
}

const CLASS_BADGES: Record<string, { label: string; color: string }> = {
  major_nc: { label: 'NC Maj.', color: 'text-red-600 bg-red-50' },
  minor_nc: { label: 'NC Min.', color: 'text-orange-600 bg-orange-50' },
  observation: { label: 'Obs.', color: 'text-blue-600 bg-blue-50' },
}

interface Props {
  missionId: string
}

export function CARTracking({ missionId }: Props): JSX.Element {
  const [cars, setCars] = useState<CorrectiveActionRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    const load = async (): Promise<void> => {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) { setLoading(false); return }

      const baseUrl = import.meta.env.VITE_SUPABASE_URL
      const apikey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const res = await fetch(
        `${baseUrl}/rest/v1/corrective_action_requests?mission_id=eq.${missionId}&order=created_at.asc`,
        { headers: { 'apikey': apikey, 'Authorization': `Bearer ${token}` }, signal: controller.signal }
      )
      if (controller.signal.aborted) return
      if (res.ok) setCars((await res.json()) as CorrectiveActionRequest[])
      setLoading(false)
    }
    load()
    return () => controller.abort()
  }, [missionId])

  if (loading) return <p className="text-xs text-gray-400 text-center py-4">Chargement...</p>

  const accepted = cars.filter((c) => c.status === 'verified' || c.status === 'closed').length
  const total = cars.length
  const pct = total > 0 ? Math.round((accepted / total) * 100) : 0

  return (
    <div>
      <h4 className="text-sm font-bold text-gray-900 mb-3">Suivi des actions correctives</h4>
      {total === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">Aucune CAR pour cette mission.</p>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-semibold text-gray-600">{accepted}/{total} ({pct}%)</span>
          </div>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">Code</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">Contr&ocirc;le</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">Classification</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cars.map((car) => {
                  const cls = CLASS_BADGES[car.finding_classification] ?? { label: car.finding_classification, color: 'text-gray-500 bg-gray-50' }
                  const st = STATUS_BADGES[car.status] ?? STATUS_BADGES.open
                  return (
                    <tr key={car.id}>
                      <td className="px-3 py-2 font-mono font-semibold text-forest-700">{car.code}</td>
                      <td className="px-3 py-2 text-gray-700">{car.control_code ?? '-'}</td>
                      <td className="px-3 py-2"><span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${cls.color}`}>{cls.label}</span></td>
                      <td className="px-3 py-2"><span className={`text-[9px] font-medium px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
