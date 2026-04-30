import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useMissionUserRole } from '../useMissionUserRole'
import { CARVerificationDialog } from './CARVerificationDialog'
import type { CorrectiveActionRequest } from '../../../types/database.types'
import type { MissionDetail } from '../useMissionDetail'

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  open: { label: 'Ouvert', color: 'text-gold-600 bg-gold-50' },
  client_responded: { label: 'À vérifier', color: 'text-blue-600 bg-blue-50' },
  verified: { label: 'Vérifié', color: 'text-green-600 bg-green-50' },
  closed: { label: 'Clôturé', color: 'text-gray-500 bg-gray-100' },
}

const CLASS_BADGES: Record<string, { label: string; color: string }> = {
  major_nc: { label: 'NC Maj.', color: 'text-red-600 bg-red-50' },
  minor_nc: { label: 'NC Min.', color: 'text-orange-600 bg-orange-50' },
  observation: { label: 'Obs.', color: 'text-blue-600 bg-blue-50' },
}

interface Props {
  missionId: string
  mission?: MissionDetail
}

export function CARTracking({ missionId, mission }: Props): JSX.Element {
  const [cars, setCars] = useState<CorrectiveActionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<CorrectiveActionRequest | null>(null)
  const userRole = useMissionUserRole(mission ?? ({ id: missionId } as MissionDetail))

  const load = useCallback(async (signal?: AbortSignal): Promise<void> => {
    const { data, error } = await supabase
      .from('corrective_action_requests')
      .select('*')
      .eq('mission_id', missionId)
      .order('code', { ascending: true })
    if (signal?.aborted) return
    if (error) {
      console.error('CARTracking load:', error.message)
      setLoading(false)
      return
    }
    setCars((data ?? []) as CorrectiveActionRequest[])
    setLoading(false)
  }, [missionId])

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  if (loading) return <p className="text-xs text-gray-400 text-center py-4">Chargement...</p>

  const accepted = cars.filter((c) => c.status === 'verified' || c.status === 'closed').length
  const total = cars.length
  const pct = total > 0 ? Math.round((accepted / total) * 100) : 0
  const pendingVerif = cars.filter((c) => c.status === 'client_responded').length

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-gray-900">Suivi des actions correctives</h4>
        {pendingVerif > 0 && userRole.isPrivileged && (
          <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
            {pendingVerif} à vérifier
          </span>
        )}
      </div>

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
                    <tr key={car.id} onClick={() => setSelected(car)} className="cursor-pointer hover:bg-gray-50 transition-colors">
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

      <CARVerificationDialog
        car={selected}
        canVerify={userRole.isPrivileged}
        onClose={() => setSelected(null)}
        onChanged={load}
      />
    </div>
  )
}
