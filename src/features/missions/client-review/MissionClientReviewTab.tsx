import { useState } from 'react'
import { MessageSquare, CheckCircle2, Clock, Send, FileEdit } from 'lucide-react'
import { useAssessmentObservations } from '../observations/useAssessmentObservations'
import { supabase } from '../../../lib/supabase'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'
import { FindingsList } from '../fieldwork/findings/FindingsList'
import type { MissionDetail } from '../useMissionDetail'
import type { ObservationWithAuthor } from '../observations/useAssessmentObservations'
import type { AssessmentFinding } from '../../../types/database.types'

interface MissionClientReviewTabProps {
  mission: MissionDetail
}

type FilterKey = 'pending' | 'responded' | 'all'

interface AssessmentContext {
  controlCode: string
  controlName: string
  findings: AssessmentFinding[]
}

export function MissionClientReviewTab({ mission }: MissionClientReviewTabProps): JSX.Element {
  const { observations, loading, error, submitResponse, submitting, refetch } = useAssessmentObservations(mission.id)
  const [filter, setFilter] = useState<FilterKey>('pending')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />

  const pending = observations.filter((o) => o.response_text === null)
  const responded = observations.filter((o) => o.response_text !== null)

  const filtered = filter === 'pending' ? pending : filter === 'responded' ? responded : observations

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-900">Observations du client</h3>
          <p className="text-[13px] text-gray-500 mt-0.5">
            Les observations du client sont non-bloquantes. Vous pouvez y r{'é'}pondre et d{'é'}cider de modifier ou conserver le constat.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <FilterBtn active={filter === 'pending'} onClick={() => setFilter('pending')} label="En attente" count={pending.length} highlight />
        <FilterBtn active={filter === 'responded'} onClick={() => setFilter('responded')} label="R{'é'}pondues" count={responded.length} />
        <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')} label="Toutes" count={observations.length} />
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <MessageSquare size={28} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">
            {filter === 'pending' && 'Aucune observation en attente.'}
            {filter === 'responded' && 'Aucune observation répondue.'}
            {filter === 'all' && 'Le client n’a pas encore posté d’observation.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((obs) => (
            <ObservationRow
              key={obs.id}
              observation={obs}
              expanded={expandedId === obs.id}
              onToggle={() => setExpandedId(expandedId === obs.id ? null : obs.id)}
              onSubmit={async (responseText, action) => {
                const ok = await submitResponse(obs.id, responseText, action)
                if (ok) {
                  setExpandedId(null)
                  refetch()
                }
                return ok
              }}
              submitting={submitting}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function FilterBtn({ active, onClick, label, count, highlight }: {
  active: boolean; onClick: () => void; label: string; count: number; highlight?: boolean
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-lg border transition-colors ${
        active
          ? 'bg-forest-700 text-white border-forest-700'
          : 'bg-white text-gray-700 border-gray-200 hover:border-forest-300'
      }`}
    >
      {label}
      <span className={`text-[10px] px-1.5 rounded-full ${
        active ? 'bg-white/20' : highlight && count > 0 ? 'bg-gold-100 text-gold-600' : 'bg-gray-100 text-gray-500'
      }`}>
        {count}
      </span>
    </button>
  )
}

function ObservationRow({ observation, expanded, onToggle, onSubmit, submitting }: {
  observation: ObservationWithAuthor
  expanded: boolean
  onToggle: () => void
  onSubmit: (text: string, action: 'modified' | 'kept') => Promise<boolean>
  submitting: boolean
}): JSX.Element {
  const [assessment, setAssessment] = useState<AssessmentContext | null>(null)
  const [responseText, setResponseText] = useState('')

  // Fetch assessment context when expanded
  const loadAssessment = async (): Promise<void> => {
    if (assessment) return
    const { data } = await supabase
      .from('control_assessments')
      .select(`
        id,
        control:controls(code, name)
      `)
      .eq('id', observation.assessment_id)
      .single()

    if (!data) return
    const ctrl = (data.control as unknown as { code: string; name: string } | null)

    const { data: findingsRows } = await supabase
      .from('assessment_findings')
      .select('*')
      .eq('assessment_id', observation.assessment_id)
      .order('ord', { ascending: true })

    setAssessment({
      controlCode: ctrl?.code ?? '',
      controlName: ctrl?.name ?? '',
      findings: (findingsRows ?? []) as AssessmentFinding[],
    })
  }

  const isResponded = observation.response_text !== null

  return (
    <div className={`bg-white border rounded-xl overflow-hidden ${
      isResponded ? 'border-gray-200' : 'border-gold-200 border-l-[3px] border-l-gold-500'
    }`}>
      {/* Header */}
      <button
        onClick={() => {
          onToggle()
          if (!expanded) loadAssessment()
        }}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="w-7 h-7 rounded-full bg-forest-700 text-white flex items-center justify-center text-[10px] font-semibold shrink-0">
          {(observation.authorName ?? 'C').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[12px] font-semibold text-gray-900">{observation.authorName ?? 'Client'}</span>
            <span className="text-[10px] text-gray-400">{formatRelative(observation.observation_at)}</span>
          </div>
          <p className="text-[12px] text-gray-600 line-clamp-1">{observation.observation_text}</p>
        </div>
        {isResponded ? (
          observation.response_action === 'modified' ? (
            <span className="text-[10px] font-medium text-forest-700 bg-forest-50 px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0">
              <FileEdit size={10} /> Modifi{'é'}
            </span>
          ) : (
            <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0">
              <CheckCircle2 size={10} /> Conserv{'é'}
            </span>
          )
        ) : (
          <span className="text-[10px] font-medium text-gold-600 bg-gold-50 px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0">
            <Clock size={10} /> En attente
          </span>
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-200 bg-gray-50">
          {/* Assessment context */}
          {assessment && (
            <div className="px-4 py-3 border-b border-gray-200 bg-white">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-[11px] font-semibold text-forest-700 bg-forest-50 px-1.5 py-0.5 rounded">
                  {assessment.controlCode}
                </span>
                <span className="text-[13px] font-semibold">{assessment.controlName}</span>
              </div>
              <FindingsList
                findings={assessment.findings}
                emptyMessage="Aucun constat enregistr&eacute; sur ce contr&ocirc;le."
                density="compact"
              />
            </div>
          )}

          {/* Full observation */}
          <div className="px-4 py-3 bg-forest-50 border-b border-forest-100">
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Observation du client</div>
            <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">{observation.observation_text}</p>
          </div>

          {/* Response */}
          {isResponded ? (
            <div className="px-4 py-3 bg-gold-50">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-full bg-gold-500 text-white flex items-center justify-center text-[9px] font-semibold">
                  {(observation.responderName ?? 'A').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <span className="text-[11px] font-semibold">{observation.responderName ?? 'Auditeur'}</span>
                <span className="text-[10px] text-gray-400">{observation.response_at ? formatRelative(observation.response_at) : ''}</span>
                <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                  style={{
                    background: observation.response_action === 'modified' ? '#D1FAE5' : '#F3F4F6',
                    color: observation.response_action === 'modified' ? '#059669' : '#6B7280',
                  }}
                >
                  {observation.response_action === 'modified' ? <><FileEdit size={10} /> Constat modifi{'é'}</> : <><CheckCircle2 size={10} /> Constat conserv{'é'}</>}
                </span>
              </div>
              <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">{observation.response_text}</p>
            </div>
          ) : (
            <div className="px-4 py-3">
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Votre r{'é'}ponse</div>
              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="R{'é'}pondre au client et expliquer votre d{'é'}cision..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100 resize-none bg-white"
              />
              <div className="flex items-center justify-between mt-3">
                <p className="text-[10px] text-gray-400">Votre r{'é'}ponse sera visible imm{'é'}diatement par le client.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => onSubmit(responseText, 'kept')}
                    disabled={!responseText.trim() || submitting}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-[12px] font-medium text-gray-700 hover:bg-white disabled:opacity-50 transition-colors"
                  >
                    <CheckCircle2 size={12} />
                    Conserver le constat
                  </button>
                  <button
                    onClick={() => onSubmit(responseText, 'modified')}
                    disabled={!responseText.trim() || submitting}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-forest-700 text-white rounded-lg text-[12px] font-semibold hover:bg-forest-900 disabled:opacity-50 transition-colors"
                  >
                    <Send size={12} />
                    Modifier le constat
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function formatRelative(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diff = (now - then) / 1000
  if (diff < 60) return 'maintenant'
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`
  if (diff < 86400 * 7) return `il y a ${Math.floor(diff / 86400)} j`
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
