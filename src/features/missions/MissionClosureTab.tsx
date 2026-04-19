import { useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { Badge } from '../../components/ui/Badge'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import type { MissionDetail } from './useMissionDetail'

interface DomainScore {
  domain_code: string
  domain_name: string
  total: number
  approved: number
  score: number
}

interface ScoringData {
  conformity_score: number
  total_controls: number
  approved_controls: number
  rejected_controls: number
  pending_controls: number
  domain_scores: DomainScore[]
  closed_at: string
}

interface MissionClosureTabProps {
  mission: MissionDetail
  onRefetch: () => void
}

export function MissionClosureTab({ mission, onRefetch }: MissionClosureTabProps) {
  const [closing, setClosing] = useState(false)
  const [closeError, setCloseError] = useState<string | null>(null)
  const [scoring, setScoring] = useState<ScoringData | null>(null)

  const isClosed = mission.status === 'closure'

  const handleClose = useCallback(async () => {
    setClosing(true)
    setCloseError(null)

    const { data, error: fnError } = await supabase.functions.invoke('close-mission', {
      body: { mission_id: mission.id },
    })

    if (fnError) {
      let detail = fnError.message
      try {
        const context = (fnError as unknown as { context: { json: () => Promise<{ error?: string }> } }).context
        if (context?.json) {
          const body = await context.json()
          if (body?.error) detail = body.error
        }
      } catch { /* */ }
      setCloseError(detail)
      setClosing(false)
      return
    }

    if (data?.error) {
      setCloseError(data.error)
      setClosing(false)
      return
    }

    if (data?.scoring) {
      setScoring(data.scoring)
    }

    setClosing(false)
    onRefetch()
  }, [mission.id, onRefetch])

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-gray-900">Cl&ocirc;ture &amp; livraison</h3>
        <p className="text-sm text-gray-600">
          {isClosed
            ? 'Cette mission est cl&ocirc;tur&eacute;e.'
            : 'Cl&ocirc;turez la mission pour g&eacute;n&eacute;rer le scoring de conformit&eacute;.'}
        </p>
      </div>

      {closeError && <ErrorAlert message={closeError} />}

      {!isClosed && !scoring && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-amber-800">
              Pr&ecirc;t &agrave; cl&ocirc;turer la mission ?
            </p>
            <p className="text-xs text-amber-600">
              Le scoring de conformit&eacute; sera calcul&eacute; et la mission passera en statut cl&ocirc;tur&eacute;.
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={closing}
            className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {closing ? 'Cl&ocirc;ture...' : 'Cl&ocirc;turer la mission'}
          </button>
        </div>
      )}

      {(isClosed || scoring) && (
        <ScoringDisplay scoring={scoring} missionId={mission.id} />
      )}
    </div>
  )
}

function ScoringDisplay({ scoring, missionId }: { scoring: ScoringData | null; missionId: string }) {
  const [loadedScoring, setLoadedScoring] = useState<ScoringData | null>(scoring)
  const [loading, setLoading] = useState(!scoring)

  // Si pas de scoring en props, le recalculer
  if (!loadedScoring && loading) {
    supabase.functions.invoke('close-mission', {
      body: { mission_id: missionId },
    }).then(({ data }) => {
      if (data?.scoring) setLoadedScoring(data.scoring)
      setLoading(false)
    })
  }

  const s = loadedScoring
  if (!s) return null

  const scoreColor = s.conformity_score >= 80 ? 'text-green-600' : s.conformity_score >= 50 ? 'text-amber-600' : 'text-red-600'
  const scoreBg = s.conformity_score >= 80 ? 'bg-green-50 border-green-200' : s.conformity_score >= 50 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'

  return (
    <div className="space-y-6">
      {/* Score global */}
      <div className={`rounded-lg border p-6 text-center ${scoreBg}`}>
        <p className="text-sm font-medium text-gray-600">Score de conformit&eacute;</p>
        <p className={`mt-2 text-5xl font-bold ${scoreColor}`}>{s.conformity_score}%</p>
        <p className="mt-2 text-sm text-gray-500">
          {s.approved_controls}/{s.total_controls} contr&ocirc;les conformes
        </p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Conformes" value={s.approved_controls} variant="green" />
        <StatCard label="Non conformes" value={s.rejected_controls} variant="red" />
        <StatCard label="En attente" value={s.pending_controls} variant="gray" />
      </div>

      {/* Score par domaine */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-3">
          <h4 className="text-sm font-semibold text-gray-900">Score par domaine</h4>
        </div>
        <div className="divide-y divide-gray-50">
          {s.domain_scores.map((ds) => (
            <div key={ds.domain_code} className="flex items-center gap-4 px-5 py-3">
              <span className="w-12 text-sm font-mono font-semibold text-forest-700">{ds.domain_code}</span>
              <span className="flex-1 text-sm text-gray-900">{ds.domain_name}</span>
              <div className="w-32">
                <div className="h-2 rounded-full bg-gray-200">
                  <div
                    className={`h-2 rounded-full ${ds.score >= 80 ? 'bg-green-500' : ds.score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${ds.score}%` }}
                  />
                </div>
              </div>
              <span className="w-16 text-right text-sm font-medium text-gray-700">{ds.score}%</span>
              <Badge label={`${ds.approved}/${ds.total}`} variant={ds.score === 100 ? 'green' : 'gray'} />
            </div>
          ))}
        </div>
      </div>

      {/* Placeholder pour le rapport et le plan d'action (module IA) */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center">
          <p className="text-sm font-medium text-gray-500">Rapport PDF / PowerPoint</p>
          <p className="mt-1 text-xs text-gray-400">Module IA &mdash; bient&ocirc;t disponible</p>
        </div>
        <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center">
          <p className="text-sm font-medium text-gray-500">Plan d&apos;action</p>
          <p className="mt-1 text-xs text-gray-400">Module IA &mdash; bient&ocirc;t disponible</p>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, variant }: { label: string; value: number; variant: 'green' | 'red' | 'gray' }) {
  const colors = {
    green: 'border-green-200 bg-green-50 text-green-700',
    red: 'border-red-200 bg-red-50 text-red-700',
    gray: 'border-gray-200 bg-gray-50 text-gray-700',
  }
  return (
    <div className={`rounded-lg border p-4 text-center ${colors[variant]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs font-medium">{label}</p>
    </div>
  )
}
