import { useState, useCallback } from 'react'
import { Send, XCircle, CheckCircle, AlertTriangle, FileText, Eye } from 'lucide-react'
import { Badge } from '../../../components/ui/Badge'
import { InfoPopover } from '../../../components/ui/InfoPopover'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'
import { useInternalReviewData } from './useInternalReviewData'
import type { MissionDetail } from '../useMissionDetail'
import type { DomainScore, MajorNC } from './useInternalReviewData'

interface MissionInternalReviewTabProps {
  mission: MissionDetail
  onStatusChange?: () => void
}

export function MissionInternalReviewTab({ mission, onStatusChange }: MissionInternalReviewTabProps) {
  const { profile } = useAuth()
  const review = useInternalReviewData(mission.id, mission.framework_id)
  const [comment, setComment] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  const isAssociate = profile?.id === mission.associate_user?.id
  const isLead = profile?.id === mission.lead_auditor_user?.id
  const canDecide = isAssociate || isLead
  const allApproved = review.approvedControls === review.totalControls && review.totalControls > 0

  const handleSendToClient = useCallback(async () => {
    setSending(true)
    setSendError(null)

    const { error } = await supabase.functions.invoke('send-to-client-review', {
      body: { mission_id: mission.id, comment: comment || null },
    })

    if (error) {
      console.error('send-to-client-review:', error.message)
      setSendError("Erreur lors de l'envoi au client.")
      setSending(false)
      return
    }

    setSending(false)
    onStatusChange?.()
  }, [mission.id, comment, onStatusChange])

  const handleReject = useCallback(async () => {
    if (!comment.trim()) {
      setSendError('Un commentaire est obligatoire pour renvoyer en revue.')
      return
    }
    setSending(true)
    setSendError(null)

    // Revert mission status to fieldwork
    const { error } = await supabase
      .from('missions')
      .update({ status: 'fieldwork' })
      .eq('id', mission.id)

    if (error) {
      setSendError('Erreur lors du renvoi.')
      setSending(false)
      return
    }

    setSending(false)
    onStatusChange?.()
  }, [mission.id, comment, onStatusChange])

  if (review.loading) return <LoadingSpinner />
  if (review.error) return <ErrorAlert message={review.error} />

  if (!allApproved) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle size={32} className="text-gold-500 mx-auto mb-3" />
        <h3 className="text-[15px] font-semibold text-gray-900 mb-1">Revue interne non disponible</h3>
        <p className="text-[13px] text-gray-500">
          {review.approvedControls}/{review.totalControls} contr&ocirc;les valid&eacute;s.
          Tous les contr&ocirc;les doivent &ecirc;tre approuv&eacute;s individuellement avant la revue d&rsquo;ensemble.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Banner */}
      <div className="flex items-center gap-4 rounded-xl border border-gold-200 bg-gold-50 px-5 py-4 mb-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gold-500 flex-shrink-0">
          <CheckCircle size={20} className="text-white" />
        </div>
        <div>
          <div className="text-[15px] font-bold text-gray-900">Tous les contr&ocirc;les sont valid&eacute;s individuellement</div>
          <div className="text-[13px] text-gray-500">V&eacute;rifiez la coh&eacute;rence d&rsquo;ensemble avant d&rsquo;envoyer au client.</div>
        </div>
      </div>

      <div className="grid grid-cols-[2fr_1fr] gap-6">
        {/* Left column */}
        <div className="space-y-5">
          {/* Score */}
          <ScoreSection score={review.globalScore} domains={review.domainScores} />

          {/* Findings summary */}
          <FindingsSection summary={review.findingSummary} majorNCs={review.majorNCs} />

          {/* Report preview */}
          <ReportPreview mission={mission} review={review} />
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Checklist */}
          <Checklist review={review} />

          {/* Comment */}
          {canDecide && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-[14px] font-bold text-gray-900 mb-2">Commentaire</h3>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100 resize-none"
                placeholder="Observations sur la coh&eacute;rence d'ensemble, points d'attention pour le client..."
                disabled={sending}
              />
            </div>
          )}

          {/* Decision */}
          {canDecide && (
            <div className="rounded-xl border-2 border-forest-700 bg-forest-50 p-5">
              <h3 className="text-[14px] font-bold text-forest-900 mb-1">D&eacute;cision</h3>
              <p className="text-[12px] text-gray-500 mb-4">Validez l&rsquo;ensemble de la mission avant envoi au client.</p>

              {sendError && <ErrorAlert message={sendError} />}

              <div className="space-y-2">
                <button
                  onClick={handleSendToClient}
                  disabled={sending}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-forest-700 px-4 py-3 text-[14px] font-semibold text-white hover:bg-forest-900 disabled:opacity-50 transition-colors"
                >
                  <Send size={15} />
                  {sending ? 'Envoi...' : 'Valider et envoyer au client'}
                </button>
                <button
                  onClick={handleReject}
                  disabled={sending || !comment.trim()}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  <XCircle size={14} />
                  Renvoyer en revue
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Score Section ── */
function ScoreSection({ score, domains }: { score: number; domains: DomainScore[] }) {
  const scoreColor = score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-gold-600' : 'text-red-600'
  const ringColor = score >= 80 ? '#27AE60' : score >= 60 ? '#D4A843' : '#C0392B'
  const degrees = Math.round((score / 100) * 360)

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14px] font-bold text-gray-900">Score de conformit&eacute;</h3>
        <InfoPopover text="Pourcentage de contr&ocirc;les approuv&eacute;s par rapport au total." />
      </div>
      <div className="flex items-center gap-8">
        {/* Ring */}
        <div
          className="w-[120px] h-[120px] rounded-full grid place-items-center relative flex-shrink-0"
          style={{ background: `conic-gradient(${ringColor} 0deg ${degrees}deg, #E5E7EB ${degrees}deg 360deg)` }}
        >
          <div className="absolute w-[86px] h-[86px] rounded-full bg-white" />
          <span className={`absolute font-mono text-[26px] font-bold ${scoreColor}`}>{score}%</span>
        </div>

        {/* Domain bars */}
        <div className="flex-1 space-y-2.5">
          {domains.map((d) => {
            const barColor = d.score >= 80 ? 'bg-emerald-500' : d.score >= 60 ? 'bg-gold-500' : 'bg-red-400'
            return (
              <div key={d.code}>
                <div className="flex justify-between text-[12px] mb-1">
                  <span className="font-medium text-gray-700">{d.name} ({d.code})</span>
                  <span className="font-mono text-gray-400">{d.score}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className={`h-full rounded-full ${barColor}`} style={{ width: `${d.score}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ── Findings Section ── */
function FindingsSection({ summary, majorNCs }: { summary: { conformes: number; observations: number; ncMinor: number; ncMajor: number; strengths: number }; majorNCs: MajorNC[] }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h3 className="text-[14px] font-bold text-gray-900 mb-4">Synth&egrave;se des constats</h3>

      <div className="grid grid-cols-4 gap-3 mb-5">
        <StatCard value={summary.conformes} label="Conformes" bg="bg-forest-50" color="text-forest-700" />
        <StatCard value={summary.observations} label="Observations" bg="bg-gold-50" color="text-gold-600" />
        <StatCard value={summary.ncMinor} label="NC mineures" bg="bg-red-50" color="text-red-600" />
        <StatCard value={summary.ncMajor} label="NC majeures" bg="bg-red-100" color="text-red-700" />
      </div>

      {majorNCs.length > 0 && (
        <>
          <div className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Non-conformit&eacute;s majeures</div>
          <div className="space-y-1.5">
            {majorNCs.slice(0, 6).map((nc) => (
              <div key={nc.controlCode} className="flex items-center gap-3 rounded-lg bg-red-50 px-3 py-2.5 text-[12px]">
                <span className="font-mono font-bold text-forest-700 min-w-[50px]">{nc.controlCode}</span>
                <span className="flex-1 text-gray-700 truncate">{nc.controlName}</span>
                <Badge label="NC majeure" variant="red" />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ value, label, bg, color }: { value: number; label: string; bg: string; color: string }) {
  return (
    <div className={`text-center rounded-lg ${bg} py-3`}>
      <div className={`font-mono text-[22px] font-bold ${color}`}>{value}</div>
      <div className={`text-[10px] font-medium ${color} mt-0.5`}>{label}</div>
    </div>
  )
}

/* ── Report Preview ── */
function ReportPreview({ mission, review }: { mission: MissionDetail; review: ReturnType<typeof useInternalReviewData> }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14px] font-bold text-gray-900">Aper&ccedil;u du rapport</h3>
        <button className="flex items-center gap-1.5 text-[12px] font-semibold text-forest-700 hover:text-forest-900">
          <Eye size={14} /> Pr&eacute;visualiser
        </button>
      </div>
      <div className="rounded-lg border border-gray-200 bg-page-bg p-5 text-[12px] text-gray-500 leading-relaxed space-y-1">
        <div className="text-[14px] font-bold text-gray-900 mb-2">
          Rapport d&rsquo;audit {mission.framework.name} &mdash; {mission.client.name}
        </div>
        <div><strong>Client :</strong> {mission.client.name}</div>
        <div><strong>R&eacute;f&eacute;rentiel :</strong> {mission.framework.name} {mission.framework.version ? `v${mission.framework.version}` : ''}</div>
        <div><strong>Score global :</strong> <span className={`font-mono font-bold ${review.globalScore >= 80 ? 'text-emerald-600' : review.globalScore >= 60 ? 'text-gold-600' : 'text-red-600'}`}>{review.globalScore}%</span></div>
        <div><strong>Contr&ocirc;les &eacute;valu&eacute;s :</strong> {review.approvedControls} / {review.totalControls}</div>
        <div><strong>NC majeures :</strong> <span className="text-red-600 font-semibold">{review.findingSummary.ncMajor}</span></div>
        <div><strong>NC mineures :</strong> <span className="text-amber-600 font-semibold">{review.findingSummary.ncMinor}</span></div>
        <div className="pt-2 border-t border-gray-200 text-gray-300 italic mt-2">
          Le rapport complet sera g&eacute;n&eacute;r&eacute; &agrave; la cl&ocirc;ture de la mission.
        </div>
      </div>
    </div>
  )
}

/* ── Checklist ── */
function Checklist({ review }: { review: ReturnType<typeof useInternalReviewData> }) {
  const items = [
    { label: 'Contr\u00f4les valid\u00e9s', value: `${review.approvedControls}/${review.totalControls}`, ok: review.approvedControls === review.totalControls },
    { label: 'Constats renseign\u00e9s', value: `${review.withFindings}/${review.totalControls}`, ok: review.withFindings === review.totalControls },
    { label: 'NC majeures identifi\u00e9es', value: String(review.findingSummary.ncMajor), ok: true },
    { label: 'Preuves jointes', value: `${review.withEvidence} docs`, ok: review.withEvidence > 0 },
    { label: 'Score global', value: `${review.globalScore}%`, ok: true },
  ]

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <h3 className="text-[14px] font-bold text-gray-900">Checklist de revue</h3>
        <p className="text-[11px] text-gray-400 mt-0.5">Points &agrave; v&eacute;rifier avant envoi au client</p>
      </div>
      {items.map((item, i) => (
        <div key={i} className="flex items-center justify-between px-5 py-3 border-b border-gray-50 last:border-b-0">
          <div className="flex items-center gap-2.5">
            <div className={`w-5 h-5 rounded-md flex items-center justify-center ${item.ok ? 'bg-forest-100' : 'bg-gold-100'}`}>
              {item.ok ? (
                <CheckCircle size={12} className="text-forest-600" />
              ) : (
                <AlertTriangle size={12} className="text-gold-600" />
              )}
            </div>
            <span className="text-[12px] font-medium text-gray-700">{item.label}</span>
          </div>
          <span className={`text-[11px] font-semibold ${item.ok ? 'text-emerald-600' : 'text-amber-600'}`}>{item.value}</span>
        </div>
      ))}
    </div>
  )
}
