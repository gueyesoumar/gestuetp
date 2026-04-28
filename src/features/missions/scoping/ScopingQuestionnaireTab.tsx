import { useState, useMemo } from 'react'
import { User, Check, Mail, Send, ShieldCheck, FileText, MessageSquare } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { Badge } from '../../../components/ui/Badge'
import { useMissionQuestionnaire, type EvidenceType } from '../useMissionQuestionnaire'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'
import type { MissionDetail } from '../useMissionDetail'

const EVIDENCE_META: Record<EvidenceType, { label: string; icon: typeof ShieldCheck; classes: string }> = {
  declared_with_signed_doc: { label: 'Doc signé', icon: ShieldCheck, classes: 'bg-forest-100 text-forest-700 border border-forest-200' },
  declared_with_doc: { label: 'Doc fourni', icon: FileText, classes: 'bg-gold-50 text-gold-700 border border-gold-200' },
  declared_only: { label: 'Déclaratif', icon: MessageSquare, classes: 'bg-gray-100 text-gray-600 border border-gray-200' },
}

function EvidenceBadge({ type }: { type: EvidenceType }): JSX.Element {
  const meta = EVIDENCE_META[type]
  const Icon = meta.icon
  return (
    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded inline-flex items-center gap-0.5 ${meta.classes}`}>
      <Icon size={9} /> {meta.label}
    </span>
  )
}

interface ScopingQuestionnaireTabProps {
  mission: MissionDetail
  onRefetch: () => void
}

// Group questions by section prefix (GOV, MAT, OPS, INC, ATT, etc.)
function groupBySection(questions: { code: string; text: string }[]): Map<string, typeof questions> {
  const groups = new Map<string, typeof questions>()
  for (const q of questions) {
    const prefix = q.code.split('-')[0] ?? q.code.substring(0, 3)
    const list = groups.get(prefix) ?? []
    list.push(q)
    groups.set(prefix, list)
  }
  return groups
}

const SECTION_LABELS: Record<string, string> = {
  GOV: 'Gouvernance SSI',
  MAT: 'Maturit\u00e9 & historique',
  OPS: 'S\u00e9curit\u00e9 op\u00e9rationnelle',
  INC: 'Incidents & continuit\u00e9',
  ATT: 'Attentes & contraintes',
}

export function ScopingQuestionnaireTab({ mission, onRefetch }: ScopingQuestionnaireTabProps): JSX.Element {
  const { instance, questions, responses, loading, answeredCount, totalCount, refetch: qRefetch } = useMissionQuestionnaire(mission.id)
  const [launching, setLaunching] = useState(false)
  const [launchError, setLaunchError] = useState<string | null>(null)

  const hasQuestionnaire = mission.status !== 'initialization' || !!instance
  const progress = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0

  const responseMap = useMemo(() => {
    const map = new Map<string, {
      value: string
      evidenceType: EvidenceType | null
      sourceDocs: string[]
      aiConfidence: number | null
    }>()
    for (const r of responses) {
      const val = r.response
      if (val && typeof val === 'object' && 'value' in val) {
        const v = String((val as { value: unknown }).value)
        map.set(r.question_code, {
          value: v,
          evidenceType: r.evidence_type,
          sourceDocs: r.source_documents ?? [],
          aiConfidence: r.ai_confidence,
        })
      }
    }
    return map
  }, [responses])

  const sections = useMemo(() => groupBySection(questions), [questions])

  const handleLaunch = async (): Promise<void> => {
    setLaunching(true)
    setLaunchError(null)
    const { data, error: fnError } = await supabase.functions.invoke('launch-questionnaire', { body: { mission_id: mission.id } })
    if (fnError || data?.error) {
      setLaunchError(fnError?.message ?? data?.error ?? 'Erreur.')
      setLaunching(false)
      return
    }
    setLaunching(false)
    onRefetch()
    qRefetch()
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {launchError && <ErrorAlert message={launchError} />}

      {hasQuestionnaire || instance ? (
        <>
          {/* Status header */}
          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-3.5">
            <div>
              <span className="text-[13px] font-semibold text-gray-900">Suivi du questionnaire client</span>
              <span className="text-[11px] text-gray-300 ml-2">{totalCount} questions &middot; {sections.size} sections</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-[120px] h-1.5 bg-gray-200 rounded-full">
                <div className="h-1.5 rounded-full bg-forest-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs font-semibold text-forest-700">{progress}%</span>
              <Badge label={`${answeredCount}/${totalCount}`} variant={progress === 100 ? 'green' : 'blue'} />
            </div>
          </div>

          {/* Info banner */}
          <div className="flex items-center gap-3 bg-forest-50 border border-forest-200 rounded-xl px-4 py-3">
            <User size={15} className="text-forest-700" />
            <p className="text-xs text-forest-700 flex-1">
              Le client r&eacute;pond via le <b>portail client</b>. Les r&eacute;ponses apparaissent automatiquement ici.
            </p>
          </div>

          {/* Responses table grouped by section */}
          {[...sections.entries()].map(([prefix, sectionQuestions]) => {
            const sectionAnswered = sectionQuestions.filter((q) => responseMap.has(q.code)).length
            const sectionTotal = sectionQuestions.length
            return (
              <div key={prefix} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {/* Section header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-forest-700 bg-forest-100 px-2 py-0.5 rounded">{prefix}</span>
                    <span className="text-xs font-semibold text-gray-700">{SECTION_LABELS[prefix] ?? prefix}</span>
                  </div>
                  <Badge
                    label={`${sectionAnswered}/${sectionTotal}`}
                    variant={sectionAnswered === sectionTotal ? 'green' : sectionAnswered > 0 ? 'blue' : 'gray'}
                  />
                </div>

                {/* Questions rows */}
                {sectionQuestions.map((q) => {
                  const resp = responseMap.get(q.code)
                  return (
                    <div key={q.code} className="flex items-start gap-3 px-4 py-2.5 border-b border-gray-50 last:border-b-0">
                      {/* Code */}
                      <span className="font-mono text-[10px] font-semibold text-forest-700 bg-forest-50 px-1.5 py-0.5 rounded mt-0.5 shrink-0 w-16 text-center">
                        {q.code}
                      </span>

                      {/* Question */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700">{q.text}</p>
                        {resp ? (
                          <>
                            <p className="text-[11px] text-forest-900 mt-1 bg-forest-50 rounded px-2 py-1.5 leading-relaxed">
                              {resp.value}
                            </p>
                            {(resp.evidenceType || resp.sourceDocs.length > 0 || resp.aiConfidence !== null) && (
                              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                {resp.evidenceType && <EvidenceBadge type={resp.evidenceType} />}
                                {resp.aiConfidence !== null && (
                                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                                    resp.aiConfidence >= 80 ? 'bg-forest-50 text-forest-700' :
                                    resp.aiConfidence >= 60 ? 'bg-gold-50 text-gold-700' :
                                    'bg-red-50 text-red-500'
                                  }`}>{resp.aiConfidence}%</span>
                                )}
                                {resp.sourceDocs.length > 0 && (
                                  <span className="text-[9px] text-gray-400 truncate" title={resp.sourceDocs.join(', ')}>
                                    Sources : {resp.sourceDocs.length === 1 ? resp.sourceDocs[0] : `${resp.sourceDocs[0]} +${resp.sourceDocs.length - 1}`}
                                  </span>
                                )}
                              </div>
                            )}
                          </>
                        ) : null}
                      </div>

                      {/* Status */}
                      <div className="shrink-0 mt-0.5">
                        {resp ? (
                          <span className="text-[9px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">
                            <Check size={10} /> R&eacute;pondu
                          </span>
                        ) : (
                          <span className="text-[9px] font-medium text-gray-300 bg-gray-50 px-2 py-0.5 rounded-full">
                            En attente
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </>
      ) : (
        <div className="space-y-3">
          <div className="bg-gold-50 border border-gold-200 rounded-xl p-5 text-center">
            <div className="flex justify-center mb-3"><Send size={28} className="text-gold-500" /></div>
            <h3 className="text-[15px] font-bold text-gray-900 mb-1">Questionnaire non envoy&eacute;</h3>
            <p className="text-[13px] text-gray-400 mb-4">Envoyez le questionnaire pour d&eacute;marrer la collecte d&rsquo;informations aupr&egrave;s du client.</p>
            <button onClick={handleLaunch} disabled={launching}
              className="bg-forest-700 text-white px-6 py-2.5 rounded-lg text-[13px] font-semibold hover:bg-forest-900 disabled:opacity-50 transition-colors">
              {launching ? 'Envoi...' : <><Mail size={14} className="inline mr-1" />Envoyer le questionnaire</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
