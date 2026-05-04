import { useEffect, useState } from 'react'
import { Check, Clock, X, Calendar, UserCheck, Users } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import type { AssessmentWithControl } from '../../useAuditorAssessments'
import type { AssessmentValidation, ValidationStage } from '../../../../types/database.types'

interface ValidationTabProps {
  assessment: AssessmentWithControl | null
}

const STAGE_LABELS: Record<ValidationStage, string> = {
  auditor_submitted: 'Soumission auditeur',
  lead_review: 'Chef de mission',
  associate_review: 'Associ&eacute;',
  client_review: 'Client',
}

const STAGE_ORDER: ValidationStage[] = ['auditor_submitted', 'lead_review', 'associate_review', 'client_review']

interface ValidatorInfo {
  first_name: string | null
  last_name: string | null
  email: string
}

function fullName(v: ValidatorInfo | undefined): string {
  if (!v) return '—'
  const parts = [v.first_name, v.last_name].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : v.email
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export function ValidationTab({ assessment }: ValidationTabProps) {
  const [validations, setValidations] = useState<AssessmentValidation[]>([])
  const [validatorMap, setValidatorMap] = useState<Map<string, ValidatorInfo>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!assessment?.id) {
      setValidations([])
      setLoading(false)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    void (async () => {
      const { data: vals } = await supabase
        .from('assessment_validations')
        .select('*')
        .eq('assessment_id', assessment.id)
        .order('created_at', { ascending: true })
        .abortSignal(controller.signal)
      if (controller.signal.aborted) return

      const list = (vals ?? []) as AssessmentValidation[]
      setValidations(list)

      const userIds = Array.from(new Set(list.map((v) => v.validated_by)))
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, first_name, last_name, email')
          .in('id', userIds)
          .abortSignal(controller.signal)
        if (controller.signal.aborted) return
        const map = new Map<string, ValidatorInfo>()
        for (const u of (users ?? []) as Array<{ id: string } & ValidatorInfo>) {
          map.set(u.id, { first_name: u.first_name, last_name: u.last_name, email: u.email })
        }
        setValidatorMap(map)
      }
      setLoading(false)
    })()
    return () => controller.abort()
  }, [assessment?.id])

  if (!assessment) {
    return <p className="text-[11px] text-gray-400 italic text-center py-6 px-3">S&eacute;lectionnez un contr&ocirc;le.</p>
  }

  if (loading) {
    return <p className="text-[11px] text-gray-400 italic text-center py-6 px-3">Chargement...</p>
  }

  const validationByStage = new Map<ValidationStage, AssessmentValidation>()
  for (const v of validations) {
    if (v.decision === 'approved' || v.decision === 'rejected') {
      validationByStage.set(v.stage, v)
    }
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-[10px] uppercase tracking-wider font-bold text-gray-500">Cascade de validation</div>

      <ol className="space-y-2.5">
        {STAGE_ORDER.map((stage) => {
          const v = validationByStage.get(stage)
          const isDone = v?.decision === 'approved'
          const isRejected = v?.decision === 'rejected'

          let isCurrent = false
          if (!v) {
            if (stage === 'auditor_submitted') isCurrent = assessment.status === 'submitted'
            else if (stage === 'lead_review') isCurrent = assessment.status === 'submitted'
            else if (stage === 'associate_review') isCurrent = assessment.status === 'in_review'
            else if (stage === 'client_review') isCurrent = assessment.status === 'approved'
          }

          let dotClass = 'bg-white text-gray-300 border-2 border-gray-200'
          let dotIcon: React.ReactNode = null
          if (isDone) {
            dotClass = 'bg-forest-700 text-white border-forest-700'
            dotIcon = <Check size={11} />
          } else if (isRejected) {
            dotClass = 'bg-red-600 text-white border-red-600'
            dotIcon = <X size={11} />
          } else if (isCurrent) {
            dotClass = 'bg-gold-500 text-white border-gold-500 animate-pulse'
            dotIcon = <Clock size={11} />
          }

          const stageIcon = stage === 'lead_review'
            ? <UserCheck size={11} />
            : stage === 'associate_review' || stage === 'client_review'
              ? <Users size={11} />
              : null

          return (
            <li key={stage} className="flex items-start gap-2.5">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${dotClass}`}>
                {dotIcon}
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-700">
                  {stageIcon} <span dangerouslySetInnerHTML={{ __html: STAGE_LABELS[stage] }} />
                </div>
                {v ? (
                  <>
                    <p className="text-[10px] text-gray-500">
                      {fullName(validatorMap.get(v.validated_by))} &middot; {formatDateTime(v.created_at)}
                    </p>
                    {v.comment && (
                      <p className="mt-1 text-[11px] text-gray-700 bg-gray-50 border border-gray-200 rounded px-2 py-1.5 whitespace-pre-wrap">
                        {v.comment}
                      </p>
                    )}
                  </>
                ) : isCurrent ? (
                  <p className="text-[10px] text-gold-700 italic">En attente</p>
                ) : (
                  <p className="text-[10px] text-gray-300 italic">À venir</p>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      {assessment.status === 'rejected' && (
        <div className="mt-3 rounded-lg bg-red-50 border border-red-200 p-2.5">
          <p className="text-[10px] uppercase tracking-wider font-bold text-red-700 inline-flex items-center gap-1">
            <X size={11} /> Rejet&eacute;
          </p>
          <p className="text-[11px] text-red-700 mt-0.5">Le constat doit &ecirc;tre corrig&eacute; et resoumis.</p>
        </div>
      )}

      {assessment.status === 'draft' && (
        <div className="mt-3 rounded-lg bg-gold-50 border border-gold-200 p-2.5">
          <p className="text-[10px] uppercase tracking-wider font-bold text-gold-700 inline-flex items-center gap-1">
            <Calendar size={11} /> Brouillon
          </p>
          <p className="text-[11px] text-gold-700 mt-0.5">Compl&eacute;tez et soumettez pour d&eacute;clencher la cascade.</p>
        </div>
      )}
    </div>
  )
}
