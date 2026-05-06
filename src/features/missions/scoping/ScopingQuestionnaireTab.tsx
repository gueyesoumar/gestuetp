import { useState, useMemo } from 'react'
import { User, Check, Mail, Send, ShieldCheck, FileText, MessageSquare, Pencil, X } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'
import { Badge } from '../../../components/ui/Badge'
import { useMissionQuestionnaire, type EvidenceType } from '../useMissionQuestionnaire'
import { useResponseComments } from '../../questionnaire/comments/useResponseComments'
import { ResponseCommentThread } from '../../questionnaire/comments/ResponseCommentThread'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'
import type { MissionDetail } from '../useMissionDetail'

const EVIDENCE_META: Record<EvidenceType, { label: string; icon: typeof ShieldCheck; classes: string }> = {
  declared_with_signed_doc: { label: 'Doc signé', icon: ShieldCheck, classes: 'bg-forest-100 text-forest-700 border border-forest-200' },
  declared_with_doc: { label: 'Doc fourni', icon: FileText, classes: 'bg-gold-50 text-gold-700 border border-gold-200' },
  declared_only: { label: 'Déclaratif', icon: MessageSquare, classes: 'bg-gray-100 text-gray-600 border border-gray-200' },
}

const SKIP_LABELS: Record<'rssi_validation' | 'no_object' | 'unknown', string> = {
  rssi_validation: 'À valider avec le RSSI',
  no_object: 'Sans objet',
  unknown: 'Je ne sais pas',
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
  const { profile } = useAuth()
  const { instance, questions, responses, loading, answeredCount, totalCount, refetch: qRefetch } = useMissionQuestionnaire(mission.id)
  const commentsHook = useResponseComments(instance?.id ?? null)
  const [launching, setLaunching] = useState(false)
  const [launchError, setLaunchError] = useState<string | null>(null)
  const [openThreadCode, setOpenThreadCode] = useState<string | null>(null)
  const [editingCode, setEditingCode] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const handleStartEdit = (code: string, currentValue: string) => {
    setEditingCode(code)
    setEditDraft(currentValue)
    setOpenThreadCode(null)
  }

  const handleSaveEdit = async (code: string): Promise<void> => {
    if (!instance?.id || !profile?.id) return
    setSavingEdit(true)
    const { error: saveError } = await supabase
      .from('questionnaire_responses')
      .upsert({
        instance_id: instance.id,
        question_code: code,
        response: { value: editDraft },
        responded_by: profile.id,
        entered_by_auditor: true,
        skip_reason: null,
      }, { onConflict: 'instance_id,question_code' })
    setSavingEdit(false)
    if (saveError) {
      console.error('[ScopingQuestionnaireTab] save:', saveError.message)
      return
    }
    setEditingCode(null)
    setEditDraft('')
    qRefetch()
  }

  const hasQuestionnaire = mission.status !== 'initialization' || !!instance
  const progress = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0

  const responseMap = useMemo(() => {
    const map = new Map<string, {
      value: string
      evidenceType: EvidenceType | null
      sourceDocs: string[]
      aiConfidence: number | null
      skipReason: 'rssi_validation' | 'no_object' | 'unknown' | null
      isPrefilled: boolean
      enteredByAuditor: boolean
    }>()
    for (const r of responses) {
      const val = r.response
      const hasValue = val && typeof val === 'object' && 'value' in val && (val as { value: unknown }).value !== null
      // Include responses that have a value OR a skip_reason (the client marked it explicitly)
      if (hasValue || r.skip_reason) {
        const v = hasValue ? String((val as { value: unknown }).value) : ''
        map.set(r.question_code, {
          value: v,
          evidenceType: r.evidence_type,
          sourceDocs: r.source_documents ?? [],
          aiConfidence: r.ai_confidence,
          skipReason: r.skip_reason,
          isPrefilled: r.is_prefilled,
          enteredByAuditor: r.entered_by_auditor,
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
                  const commentCount = commentsHook.countByQuestion.get(q.code) ?? 0
                  const isEditing = editingCode === q.code
                  const isThreadOpen = openThreadCode === q.code
                  return (
                    <div key={q.code} className="border-b border-gray-50 last:border-b-0">
                      <div className="flex items-start gap-3 px-4 py-2.5">
                        {/* Code */}
                        <span className="font-mono text-[10px] font-semibold text-forest-700 bg-forest-50 px-1.5 py-0.5 rounded mt-0.5 shrink-0 w-16 text-center">
                          {q.code}
                        </span>

                        {/* Question */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-700">{q.text}</p>
                          {resp ? (
                            <>
                              {resp.skipReason ? (
                                <p className="text-[11px] text-gold-700 mt-1 bg-gold-50 border border-gold-200 rounded px-2 py-1.5 leading-relaxed font-semibold">
                                  {SKIP_LABELS[resp.skipReason]}
                                </p>
                              ) : resp.value ? (
                                <p className="text-[11px] text-forest-900 mt-1 bg-forest-50 rounded px-2 py-1.5 leading-relaxed">
                                  {resp.value}
                                </p>
                              ) : null}
                              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                {resp.isPrefilled && (
                                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-forest-50 text-forest-700 border border-forest-200">
                                    ✓ Pré-rempli
                                  </span>
                                )}
                                {resp.enteredByAuditor && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gold-50 text-gold-700 border border-gold-300">
                                    ⚡ Saisie auditeur
                                  </span>
                                )}
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
                            </>
                          ) : null}
                        </div>

                        {/* Status + actions */}
                        <div className="shrink-0 flex items-center gap-1.5 mt-0.5">
                          {resp ? (
                            resp.skipReason ? (
                              <span className="text-[9px] font-semibold text-gold-700 bg-gold-50 border border-gold-300 px-2 py-0.5 rounded-full">
                                À creuser
                              </span>
                            ) : (
                              <span className="text-[9px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">
                                <Check size={10} /> Répondu
                              </span>
                            )
                          ) : (
                            <span className="text-[9px] font-medium text-gray-300 bg-gray-50 px-2 py-0.5 rounded-full">
                              En attente
                            </span>
                          )}

                          {/* Action buttons */}
                          <div className="relative inline-flex gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(q.code, resp?.value ?? '')}
                              title="Saisir / éditer la réponse (mode interview)"
                              className="w-6 h-6 inline-flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gold-50 hover:border-gold-300 hover:text-gold-700 transition-colors"
                            >
                              <Pencil size={11} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setOpenThreadCode((prev) => prev === q.code ? null : q.code)}
                              title={commentCount > 0 ? `${commentCount} commentaire${commentCount > 1 ? 's' : ''}` : 'Commenter'}
                              className={`w-6 h-6 inline-flex items-center justify-center rounded border transition-colors relative ${
                                commentCount > 0
                                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                                  : 'border-gray-200 text-gray-500 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700'
                              }`}
                            >
                              <MessageSquare size={11} />
                              {commentCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-blue-600 text-white text-[8px] font-bold flex items-center justify-center">
                                  {commentCount}
                                </span>
                              )}
                            </button>
                            {isThreadOpen && (
                              <ResponseCommentThread
                                questionCode={q.code}
                                hook={commentsHook}
                                onClose={() => setOpenThreadCode(null)}
                              />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Inline editor */}
                      {isEditing && (
                        <div className="px-4 pb-3 ml-[76px]">
                          <div className="bg-gold-50 border border-gold-300 rounded-lg p-2.5">
                            <div className="text-[10px] font-bold uppercase tracking-wide text-gold-700 mb-1.5 inline-flex items-center gap-1">
                              <Pencil size={10} /> Saisir à la place du client (mode interview)
                            </div>
                            <textarea
                              value={editDraft}
                              onChange={(e) => setEditDraft(e.target.value)}
                              placeholder="Réponse à enregistrer..."
                              rows={3}
                              autoFocus
                              className="w-full px-2 py-1.5 border border-gold-200 rounded text-[12px] text-gray-900 bg-white outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-200 resize-y"
                            />
                            <div className="flex items-center gap-1.5 mt-2">
                              <button
                                type="button"
                                onClick={() => void handleSaveEdit(q.code)}
                                disabled={savingEdit || editDraft.trim().length === 0}
                                className="text-[11px] font-semibold text-white bg-forest-700 px-3 py-1 rounded hover:bg-forest-900 disabled:opacity-50"
                              >
                                {savingEdit ? 'Enregistrement...' : 'Enregistrer'}
                              </button>
                              <button
                                type="button"
                                onClick={() => { setEditingCode(null); setEditDraft('') }}
                                className="text-[11px] text-gray-500 px-3 py-1 hover:text-gray-700 inline-flex items-center gap-1"
                              >
                                <X size={11} /> Annuler
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
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
