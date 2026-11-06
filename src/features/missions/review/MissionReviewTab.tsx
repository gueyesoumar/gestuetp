import { useState, useMemo, useCallback } from 'react'
import { Check } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { supabase } from '../../../lib/supabase'
import { readInvokeError } from '../../../lib/edgeError'
import { useToast } from '../../../hooks/useToast'
import { useReviewAssessments } from '../useReviewAssessments'
import { ValidationQueue } from './ValidationQueue'
import { ValidationDetailPanel } from './ValidationDetailPanel'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'
import { EmptyState } from '../../../components/ui/EmptyState'
import { resolveReviewStage, isActionable, groupByDomain, type DomainGroup } from './reviewQueue'
import type { MissionDetail } from '../useMissionDetail'
import type { ReviewAssessment } from '../useReviewAssessments'

interface MissionReviewTabProps {
  mission: MissionDetail
}

export function MissionReviewTab({ mission }: MissionReviewTabProps){
  const { profile } = useAuth()
  const toast = useToast()
  const { assessments, loading, error, refetch } = useReviewAssessments(mission.id)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [detail, setDetail] = useState<ReviewAssessment | null>(null)
  const [busy, setBusy] = useState(false)

  const stage = resolveReviewStage(profile?.id, mission.lead_auditor_user?.id, mission.associate_user?.id)

  const groups = useMemo(() => groupByDomain(assessments), [assessments])
  const actionableCount = useMemo(
    () => (stage ? assessments.filter((a) => isActionable(a, stage)).length : 0),
    [assessments, stage],
  )
  const validatedCount = useMemo(() => assessments.filter((a) => a.status === 'approved').length, [assessments])

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

  const toggleDomain = useCallback((group: DomainGroup) => {
    if (!stage) return
    const ids = group.items.filter((a) => isActionable(a, stage)).map((a) => a.id)
    setSelected((prev) => {
      const next = new Set(prev)
      const allIn = ids.every((id) => next.has(id))
      for (const id of ids) { if (allIn) next.delete(id); else next.add(id) }
      return next
    })
  }, [stage])

  const approveSelected = useCallback(async () => {
    const ids = [...selected]
    if (ids.length === 0) return
    setBusy(true)
    let ok = 0, failed = 0
    // Boucle séquentielle : l'edge recalcule le rôle et l'étape à chaque appel.
    for (const id of ids) {
      const { data, error: fnError } = await supabase.functions.invoke('review-assessment', {
        body: { assessment_id: id, decision: 'approved', comment: null },
      })
      if (fnError || data?.error) {
        failed++
        console.error('approveSelected:', await readInvokeError(fnError, data, 'Validation impossible'))
      } else ok++
    }
    setBusy(false)
    setSelected(new Set())
    if (ok > 0) toast.success(`${ok} évaluation(s) validée(s)`)
    if (failed > 0) toast.error(`${failed} validation(s) ont échoué`)
    refetch()
  }, [selected, toast, refetch])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />
  if (!stage) {
    return <EmptyState title="Accès réservé" description="Seuls le chef de mission et l&apos;associé peuvent valider." />
  }
  if (assessments.length === 0) {
    return <EmptyState title="Aucun contrôle soumis" description="Les auditeurs n&apos;ont pas encore soumis de travaux." />
  }

  return (
    <div className="pb-20">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-bold text-gray-900">Validations</h3>
          <p className="text-[13px] text-gray-500 mt-0.5">Les contrôles soumis, regroupés par domaine. Cochez pour valider en lot.</p>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600">{actionableCount} à valider</span>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-600">{validatedCount} validés</span>
        </div>
      </div>

      <ValidationQueue
        groups={groups}
        stage={stage}
        selected={selected}
        busy={busy}
        onToggle={toggle}
        onToggleDomain={toggleDomain}
        onOpen={setDetail}
      />

      {selected.size > 0 && (
        <div className="sticky bottom-4 mt-4 flex items-center justify-between gap-4 bg-white border border-gray-200 shadow-lg rounded-xl px-4 py-3">
          <span className="text-[13px] font-medium text-gray-700">{selected.size} sélectionné(s)</span>
          <div className="flex gap-2">
            <button onClick={() => setSelected(new Set())} disabled={busy} className="px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50">Annuler</button>
            <button onClick={() => void approveSelected()} disabled={busy} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">
              <Check size={15} /> {busy ? 'Validation…' : `Valider la sélection (${selected.size})`}
            </button>
          </div>
        </div>
      )}

      {detail && (
        <ValidationDetailPanel
          assessment={detail}
          reviewStage={stage}
          onClose={() => setDetail(null)}
          onReviewed={refetch}
        />
      )}
    </div>
  )
}
