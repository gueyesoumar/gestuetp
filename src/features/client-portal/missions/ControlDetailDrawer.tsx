import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, AlertTriangle, MessageSquare, Send, Clock, CheckCircle2, FileEdit, Sparkles } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { FindingsList } from '../../missions/fieldwork/findings/FindingsList'
import type { AssessmentObservation, FindingClassification } from '../../../types/database.types'
import type { ControlWithAssessment } from './useMissionControls'

interface ControlDetailDrawerProps {
  control: ControlWithAssessment
  canContribute: boolean
  canApprove: boolean
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  onObservationSubmitted: () => void
  hasPrev: boolean
  hasNext: boolean
}

interface ObservationWithAuthor extends AssessmentObservation {
  authorName: string | null
  responderName: string | null
}

const CLASSIF_META: Record<FindingClassification | 'conforme', { label: string; color: string; bg: string; border: string; icon: typeof AlertTriangle }> = {
  conforme:     { label: 'Conforme',      color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', icon: CheckCircle2 },
  observation:  { label: 'Observation',   color: '#B8922E', bg: '#FDF8E8', border: '#F2E2B1', icon: AlertTriangle },
  minor_nc:     { label: 'NC mineure',    color: '#92400E', bg: '#FEF3C7', border: '#FCD34D', icon: AlertTriangle },
  major_nc:     { label: 'NC majeure',    color: '#C0392B', bg: '#FDE8E8', border: '#FCA5A5', icon: AlertTriangle },
  strength:     { label: 'Point fort',    color: '#B8922E', bg: '#FEF9C3', border: '#D4A843', icon: Sparkles },
}

export function ControlDetailDrawer({
  control, canContribute, canApprove, onClose, onPrev, onNext, onObservationSubmitted, hasPrev, hasNext,
}: ControlDetailDrawerProps): JSX.Element {
  const [observations, setObservations] = useState<ObservationWithAuthor[]>([])
  const [newObsText, setNewObsText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loadingObs, setLoadingObs] = useState(true)
  // État du flux de validation client_review (approver-only)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const isAwaitingClientReview = control.assessmentStatus === 'in_review'

  const classifKey = (control.classification ?? (control.assessmentId ? 'conforme' : 'conforme')) as keyof typeof CLASSIF_META
  const classifMeta = CLASSIF_META[classifKey]
  const Icon = classifMeta.icon

  // Fetch observations for this assessment
  useEffect(() => {
    if (!control.assessmentId) { setLoadingObs(false); return }
    const controller = new AbortController()
    setLoadingObs(true)
    setNewObsText('')

    const fetchObs = async (): Promise<void> => {
      const { data } = await supabase
        .from('assessment_observations')
        .select('*')
        .eq('assessment_id', control.assessmentId)
        .order('observation_at', { ascending: true })
        .abortSignal(controller.signal)

      if (controller.signal.aborted) return

      const rows = (data ?? []) as AssessmentObservation[]
      const userIds = new Set<string>()
      for (const r of rows) {
        userIds.add(r.observation_by)
        if (r.response_by) userIds.add(r.response_by)
      }

      const userMap = new Map<string, string>()
      if (userIds.size > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .in('id', [...userIds])
          .abortSignal(controller.signal)

        if (controller.signal.aborted) return
        for (const u of users ?? []) {
          userMap.set(u.id, `${u.first_name} ${u.last_name}`)
        }
      }

      setObservations(rows.map((r) => ({
        ...r,
        authorName: userMap.get(r.observation_by) ?? null,
        responderName: r.response_by ? userMap.get(r.response_by) ?? null : null,
      })))
      setLoadingObs(false)
    }

    fetchObs()
    return () => controller.abort()
  }, [control.assessmentId])

  const handleClientReview = async (decision: 'approved' | 'rejected'): Promise<void> => {
    if (!control.assessmentId) return
    if (decision === 'rejected' && !reviewComment.trim()) {
      setReviewError('Un commentaire est obligatoire pour un rejet.')
      return
    }
    setReviewError(null)
    setReviewing(true)
    const { data, error } = await supabase.functions.invoke('client-review-assessment', {
      body: {
        assessment_id: control.assessmentId,
        decision,
        comment: reviewComment.trim() || null,
      },
    })
    setReviewing(false)
    if (error || data?.error) {
      const msg = (data?.error as string | undefined) ?? error?.message ?? 'Validation impossible'
      console.error('client-review-assessment:', msg)
      setReviewError(msg)
      return
    }
    setReviewComment('')
    onObservationSubmitted()
    onClose()
  }

  const handleSubmit = async (): Promise<void> => {
    if (!control.assessmentId || !newObsText.trim()) return
    setSubmitting(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSubmitting(false); return }

    const { data: profile } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single()

    if (!profile) { setSubmitting(false); return }

    const { error } = await supabase
      .from('assessment_observations')
      .insert({
        assessment_id: control.assessmentId,
        observation_text: newObsText.trim(),
        observation_by: profile.id,
      })

    setSubmitting(false)
    if (error) {
      console.error('submit observation:', error.message)
      return
    }

    setNewObsText('')
    onObservationSubmitted()
    // Reload observations
    const { data } = await supabase
      .from('assessment_observations')
      .select('*')
      .eq('assessment_id', control.assessmentId)
      .order('observation_at', { ascending: true })

    const rows = (data ?? []) as AssessmentObservation[]
    const userIds = new Set<string>()
    for (const r of rows) {
      userIds.add(r.observation_by)
      if (r.response_by) userIds.add(r.response_by)
    }
    const userMap = new Map<string, string>()
    if (userIds.size > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', [...userIds])
      for (const u of users ?? []) {
        userMap.set(u.id, `${u.first_name} ${u.last_name}`)
      }
    }
    setObservations(rows.map((r) => ({
      ...r,
      authorName: userMap.get(r.observation_by) ?? null,
      responderName: r.response_by ? userMap.get(r.response_by) ?? null : null,
    })))
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/35 z-40" onClick={onClose} />

      {/* Drawer */}
      <aside className="fixed top-0 right-0 bottom-0 w-[620px] max-w-full bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={16} className="text-gray-500" />
          </button>
          <span className="font-mono text-[12px] font-semibold text-forest-700 bg-forest-50 px-2 py-0.5 rounded">
            {control.controlCode}
          </span>
          <span
            className="text-[10px] font-medium px-2.5 py-0.5 rounded-full"
            style={{ background: classifMeta.bg, color: classifMeta.color }}
          >
            {classifMeta.label}
          </span>
          <div className="ml-auto flex gap-1">
            <button
              onClick={onPrev}
              disabled={!hasPrev}
              className="p-1.5 border border-gray-200 rounded-lg hover:bg-forest-50 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Contrôle précédent"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={onNext}
              disabled={!hasNext}
              className="p-1.5 border border-gray-200 rounded-lg hover:bg-forest-50 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Contrôle suivant"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <h2 className="text-[16px] font-bold text-gray-900 mb-1">{control.controlName}</h2>
          <p className="text-[11px] text-gray-400 mb-5">
            Domaine {control.domainCode} {'·'} {control.domainName}
          </p>

          {/* Exigence */}
          {control.controlDescription && (
            <div className="mb-5">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                {'\u{1F4CB}'} Exigence du r{'é'}f{'é'}rentiel
              </div>
              <p className="text-[13px] text-gray-700 leading-relaxed px-3 py-2.5 bg-gray-50 border-l-[3px] border-gray-300 rounded">
                {control.controlDescription}
              </p>
            </div>
          )}

          {/* Classification carte */}
          <div
            className="mb-5 p-3.5 rounded-lg border"
            style={{ background: classifMeta.bg, borderColor: classifMeta.border }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Icon size={16} style={{ color: classifMeta.color }} />
              <span className="text-[13px] font-bold" style={{ color: classifMeta.color }}>
                {classifMeta.label}
              </span>
            </div>
            <p className="text-[12px] leading-relaxed" style={{ color: classifMeta.color }}>
              {classifMeta.label === 'Conforme' && 'Ce contrôle a été validé par l’auditeur. La mesure est en place et documenter.'}
              {classifMeta.label === 'Observation' && 'Ce contrôle a une observation mineure. La mesure est en place mais des améliorations sont recommandées.'}
              {classifMeta.label === 'NC mineure' && 'Non-conformité mineure. La mesure est partiellement en place, des lacunes ont été identifiées.'}
              {classifMeta.label === 'NC majeure' && 'Non-conformité majeure. Action corrective prioritaire requise.'}
              {classifMeta.label === 'Point fort' && 'Mise en œuvre exemplaire qui dépasse les exigences minimales.'}
            </p>
          </div>

          {/* Constats d'audit */}
          {control.findings.length > 0 && (
            <div className="mb-5">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                {'\u{1F50D}'} Constats d{'’'}audit
              </div>
              <FindingsList findings={control.findings} density="compact" />
            </div>
          )}

          {/* Guidance */}
          {control.controlGuidance && (
            <div className="mb-6 px-3 py-2.5 bg-forest-50 rounded-lg flex items-start gap-2">
              <span className="text-[11px] text-forest-700">{control.controlGuidance}</span>
            </div>
          )}

          {/* Section observations */}
          {control.assessmentId && (
            <div className="border-t border-gray-200 pt-5">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare size={16} className="text-forest-700" />
                <span className="text-[13px] font-semibold text-gray-900">
                  Observations {observations.length > 0 && <span className="text-gray-400">({observations.length})</span>}
                </span>
              </div>

              {/* Existing observations */}
              {loadingObs ? (
                <p className="text-xs text-gray-400 text-center py-3">Chargement...</p>
              ) : observations.length > 0 && (
                <div className="space-y-3 mb-4">
                  {observations.map((obs) => (
                    <div key={obs.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Observation */}
                      <div className="p-3 bg-forest-50">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="w-6 h-6 rounded-full bg-forest-700 text-white flex items-center justify-center text-[9px] font-semibold">
                            {(obs.authorName ?? 'C').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-[11px] font-semibold text-gray-700">{obs.authorName ?? 'Client'}</span>
                          <span className="text-[10px] text-gray-400 ml-auto">{formatDate(obs.observation_at)}</span>
                        </div>
                        <p className="text-[12px] text-gray-700 leading-relaxed whitespace-pre-wrap">{obs.observation_text}</p>
                      </div>

                      {/* Response */}
                      {obs.response_text ? (
                        <div className="p-3 bg-gold-50 border-t border-gold-200">
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="w-6 h-6 rounded-full bg-gold-500 text-white flex items-center justify-center text-[9px] font-semibold">
                              {(obs.responderName ?? 'A').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-[11px] font-semibold text-gray-700">{obs.responderName ?? 'Auditeur'}</span>
                            <span className="text-[10px] text-gray-400">{obs.response_at ? formatDate(obs.response_at) : ''}</span>
                            {obs.response_action === 'modified' ? (
                              <span className="ml-auto text-[9px] font-medium text-forest-700 bg-forest-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <FileEdit size={10} /> Constat modifi{'é'}
                              </span>
                            ) : (
                              <span className="ml-auto text-[9px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                Constat conserv{'é'}
                              </span>
                            )}
                          </div>
                          <p className="text-[12px] text-gray-700 leading-relaxed whitespace-pre-wrap">{obs.response_text}</p>
                        </div>
                      ) : (
                        <div className="p-2.5 border-t border-dashed border-gray-200 bg-white flex items-center gap-2 text-[11px] text-gray-400">
                          <Clock size={11} />
                          En attente de r{'é'}ponse de l{'’'}auditeur
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Validation client_review — approver only */}
              {isAwaitingClientReview && canApprove && (
                <div className="rounded-xl border border-forest-200 bg-forest-50 p-4 space-y-3">
                  <div>
                    <p className="text-[12px] font-bold text-forest-700">Validation client en attente</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      En tant qu&apos;Approbateur, vous pouvez signer ou contester ce contr{'ô'}le au nom de votre organisation.
                    </p>
                  </div>
                  {reviewError && (
                    <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded p-2">{reviewError}</p>
                  )}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Commentaire <span className="text-gray-400 font-normal">(obligatoire en cas de rejet)</span></label>
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      rows={2}
                      disabled={reviewing}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[12px] outline-none focus:border-forest-500 resize-y bg-white"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleClientReview('approved')}
                      disabled={reviewing}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-[12px] font-semibold hover:bg-green-700 disabled:opacity-50"
                    >
                      Approuver
                    </button>
                    <button
                      onClick={() => handleClientReview('rejected')}
                      disabled={reviewing}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg text-[12px] font-semibold hover:bg-red-700 disabled:opacity-50"
                    >
                      Rejeter
                    </button>
                  </div>
                </div>
              )}

              {/* Mention pour contributors / viewers quand un approver doit valider */}
              {isAwaitingClientReview && !canApprove && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2.5">
                  Ce contr{'ô'}le est en attente de validation par un Approbateur de votre organisation.
                </p>
              )}

              {/* New observation form (contributor only, and only if no pending observation from them) */}
              {canContribute && !control.myObservationId && (
                <div>
                  <textarea
                    value={newObsText}
                    onChange={(e) => setNewObsText(e.target.value)}
                    placeholder="Ajouter une observation (optionnelle)..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100 resize-none"
                  />
                  <p className="text-[10px] text-gray-400 mt-1.5">
                    Votre observation sera envoy{'é'}e {'à'} l{'’'}{'é'}quipe d{'’'}audit qui pourra y r{'é'}pondre.
                  </p>
                </div>
              )}

              {!canContribute && (
                <p className="text-[11px] text-gray-400 italic">
                  Seuls les contributeurs peuvent ajouter des observations.
                </p>
              )}

              {control.myObservationId && !observations.find((o) => o.id === control.myObservationId)?.response_text && (
                <div className="p-2.5 bg-forest-50 border border-forest-200 rounded-lg text-[11px] text-forest-700">
                  Vous avez d{'é'}j{'à'} post{'é'} une observation. L{'’'}auditeur r{'é'}pondra prochainement.
                </div>
              )}
            </div>
          )}

          {/* Pas d'assessment = contrôle pas encore évalué */}
          {!control.assessmentId && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center text-[12px] text-gray-400">
              Ce contr{'ô'}le n{'’'}a pas encore {'é'}t{'é'} {'é'}valu{'é'} par l{'’'}auditeur.
            </div>
          )}
        </div>

        {/* Footer */}
        {canContribute && control.assessmentId && !control.myObservationId && (
          <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[12px] font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-white transition-colors"
            >
              Fermer
            </button>
            <button
              onClick={handleSubmit}
              disabled={!newObsText.trim() || submitting}
              className="flex items-center gap-1.5 px-4 py-2 bg-forest-700 text-white text-[12px] font-semibold rounded-lg hover:bg-forest-900 disabled:opacity-50 transition-colors"
            >
              <Send size={12} />
              {submitting ? 'Envoi...' : 'Envoyer l’observation'}
            </button>
          </div>
        )}
      </aside>
    </>
  )
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}
