import { useState, useEffect, useCallback } from 'react'
import { Check, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useClientMissions } from './useClientMissions'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'

interface AggregatedFinding {
  id: string
  controlCode: string
  controlName: string
  findings: string
  missionName: string
  missionId: string
  clientValidation: 'pending' | 'approved' | 'contested'
}

export function ClientValidationsPage(): JSX.Element {
  const { missions, loading: mLoading } = useClientMissions()
  const [items, setItems] = useState<AggregatedFinding[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const fetchData = useCallback(async (): Promise<void> => {
    if (mLoading || missions.length === 0) { setLoading(false); return }
    setLoading(true)

    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    if (!token) { setLoading(false); return }

    const baseUrl = import.meta.env.VITE_SUPABASE_URL
    const apikey = import.meta.env.VITE_SUPABASE_ANON_KEY
    const headers = { 'apikey': apikey, 'Authorization': `Bearer ${token}` }
    const missionIds = missions.map((m) => m.id)
    const idsFilter = `in.(${missionIds.join(',')})`
    const missionMap = Object.fromEntries(missions.map((m) => [m.id, m.name]))

    const res = await fetch(
      `${baseUrl}/rest/v1/control_assessments?mission_id=${idsFilter}&status=in.(submitted,in_review,approved)&select=id,control_id,mission_id,findings`,
      { headers }
    )
    if (!res.ok) { setLoading(false); return }
    const assessments = await res.json() as Record<string, unknown>[]

    if (assessments.length === 0) { setItems([]); setLoading(false); return }

    // Controls
    const controlIds = [...new Set(assessments.map((a) => a.control_id as string))]
    let controlMap: Record<string, { code: string; name: string }> = {}
    if (controlIds.length > 0) {
      const ctrlRes = await fetch(`${baseUrl}/rest/v1/controls?id=in.(${controlIds.join(',')})&select=id,code,name`, { headers })
      if (ctrlRes.ok) {
        const controls = await ctrlRes.json() as { id: string; code: string; name: string }[]
        controlMap = Object.fromEntries(controls.map((c) => [c.id, { code: c.code, name: c.name }]))
      }
    }

    // Validations
    const aIds = assessments.map((a) => a.id as string)
    const valRes = await fetch(
      `${baseUrl}/rest/v1/assessment_validations?assessment_id=in.(${aIds.join(',')})&stage=eq.client_review&select=assessment_id,decision`,
      { headers }
    )
    const validations = valRes.ok ? await valRes.json() as { assessment_id: string; decision: string }[] : []
    const valMap = Object.fromEntries(validations.map((v) => [v.assessment_id, v.decision]))

    const mapped: AggregatedFinding[] = assessments.map((a) => {
      const ctrl = controlMap[a.control_id as string]
      return {
        id: a.id as string,
        controlCode: ctrl?.code ?? '',
        controlName: ctrl?.name ?? '',
        findings: (a.findings as string) ?? '',
        missionName: missionMap[a.mission_id as string] ?? '',
        missionId: a.mission_id as string,
        clientValidation: (valMap[a.id as string] as 'approved' | 'contested') ?? 'pending',
      }
    })

    mapped.sort((a, b) => {
      const order = { pending: 0, contested: 1, approved: 2 }
      return (order[a.clientValidation] ?? 0) - (order[b.clientValidation] ?? 0)
    })

    setItems(mapped)
    setLoading(false)
  }, [missions, mLoading])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSubmit = async (assessmentId: string, decision: 'approved' | 'contested'): Promise<void> => {
    setSubmitting(true)
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    if (!token) { setSubmitting(false); return }

    const userRes = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/users?auth_id=eq.${(await supabase.auth.getUser()).data.user?.id}&select=id`,
      { headers: { 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}` } }
    )
    const users = userRes.ok ? await userRes.json() as { id: string }[] : []
    const userId = users[0]?.id

    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/assessment_validations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify({ assessment_id: assessmentId, stage: 'client_review', decision, validated_by: userId }),
    })

    setSubmitting(false)
    fetchData()
  }

  const pendingCount = items.filter((i) => i.clientValidation === 'pending').length
  const approvedCount = items.filter((i) => i.clientValidation === 'approved').length
  const contestedCount = items.filter((i) => i.clientValidation === 'contested').length

  if (loading || mLoading) return <LoadingSpinner />

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Validations</h1>
      <p className="text-sm text-gray-400 mb-4">Constats d&rsquo;audit &agrave; examiner, toutes missions confondues</p>

      <div className="flex gap-2 mb-4">
        {pendingCount > 0 && <span className="text-[10px] font-medium text-gold-600 bg-gold-50 px-2.5 py-1 rounded-full">{pendingCount} en attente</span>}
        {approvedCount > 0 && <span className="text-[10px] font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full">{approvedCount} approuv&eacute;{approvedCount > 1 ? 's' : ''}</span>}
        {contestedCount > 0 && <span className="text-[10px] font-medium text-red-500 bg-red-50 px-2.5 py-1 rounded-full">{contestedCount} contest&eacute;{contestedCount > 1 ? 's' : ''}</span>}
      </div>

      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map((f) => (
            <div key={f.id} className={`border rounded-lg overflow-hidden ${f.clientValidation === 'pending' ? 'border-gray-200' : f.clientValidation === 'approved' ? 'border-green-200' : 'border-red-200'}`}>
              <div className="flex items-center gap-2 px-3 py-2.5">
                <span className="font-mono text-[11px] font-semibold text-forest-700">{f.controlCode}</span>
                <span className="text-xs font-semibold flex-1 truncate">{f.controlName}</span>
                <span className="text-[9px] text-gray-300 bg-gray-50 px-2 py-0.5 rounded">{f.missionName}</span>
                {f.clientValidation === 'pending' && <span className="text-[10px] font-medium text-gold-600 bg-gold-50 px-2 py-0.5 rounded-full">&Agrave; valider</span>}
                {f.clientValidation === 'approved' && <span className="text-[10px] font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full"><Check size={10} /></span>}
                {f.clientValidation === 'contested' && <span className="text-[10px] font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full"><X size={10} /></span>}
              </div>
              {f.clientValidation === 'pending' && (
                <div className="flex gap-2 px-3 py-2 border-t border-gray-100 bg-gray-50/50">
                  <p className="text-[11px] text-gray-500 flex-1 truncate">{f.findings}</p>
                  <button onClick={() => handleSubmit(f.id, 'approved')} disabled={submitting}
                    className="px-2.5 py-1 bg-green-500 text-white rounded text-[10px] font-semibold disabled:opacity-50"><Check size={10} /></button>
                  <button onClick={() => handleSubmit(f.id, 'contested')} disabled={submitting}
                    className="px-2.5 py-1 bg-white text-red-500 border border-red-400 rounded text-[10px] font-semibold disabled:opacity-50"><X size={10} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-300 text-sm">Aucun constat en attente de validation.</div>
      )}
    </div>
  )
}
