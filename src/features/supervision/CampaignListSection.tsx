import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Calendar, ChevronRight, Target, Trash2 } from 'lucide-react'
import { useAuditCampaigns } from './useAuditCampaigns'
import { CampaignCreateModal } from './CampaignCreateModal'
import { CampaignDeleteModal } from './CampaignDeleteModal'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import type { Framework } from '../../types/database.types'
import type { CampaignSummary } from './useAuditCampaigns'

interface CampaignListSectionProps {
  frameworks: Framework[]
  isGroup: boolean
  canCreate?: boolean
}

const STATUS_STYLES: Record<string, { label: string; style: string }> = {
  draft: { label: 'Brouillon', style: 'bg-gray-100 text-gray-500' },
  active: { label: 'Active', style: 'bg-forest-50 text-forest-700' },
  completed: { label: 'Termin\u00e9e', style: 'bg-green-50 text-green-600' },
}

export function CampaignListSection({ frameworks, isGroup, canCreate = true }: CampaignListSectionProps): JSX.Element {
  const { campaigns, loading, createCampaign, creating, deleteCampaign, deleting, refetch } = useAuditCampaigns()
  const [showCreate, setShowCreate] = useState(false)
  const [campaignToDelete, setCampaignToDelete] = useState<CampaignSummary | null>(null)

  if (loading) return <LoadingSpinner />

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] text-gray-500">
          {campaigns.length > 0
            ? `${campaigns.length} campagne${campaigns.length > 1 ? 's' : ''} d\u2019audit`
            : 'Aucune campagne cr\u00e9\u00e9e'}
        </p>
        {isGroup && canCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-forest-700 text-white rounded-lg text-[12px] font-semibold hover:bg-forest-900 transition-colors"
          >
            <Plus size={14} />
            Nouvelle campagne
          </button>
        )}
      </div>

      {/* Campaign cards */}
      {campaigns.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <Target size={32} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Lancez votre premi{'\u00e8'}re campagne d{'\u2019'}audit pour suivre la conformit{'\u00e9'} de vos entit{'\u00e9'}s.</p>
          {isGroup && canCreate && (
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 px-4 py-2 bg-forest-700 text-white rounded-lg text-[12px] font-semibold hover:bg-forest-900 transition-colors"
            >
              Cr{'\u00e9'}er une campagne
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaigns.map((c) => {
            const status = STATUS_STYLES[c.status] ?? STATUS_STYLES.draft
            const pct = c.totalEntities > 0 ? Math.round((c.completedEntities / c.totalEntities) * 100) : 0

            return (
              <div key={c.id} className="relative group">
                {isGroup && canCreate && (
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCampaignToDelete(c) }}
                    className="absolute top-3 right-3 z-10 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                    title="Supprimer la campagne"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                <Link
                  to={`/supervision/campagnes/${c.id}`}
                  className="block bg-white border border-gray-200 rounded-xl p-5 hover:border-forest-300 hover:shadow-md transition-all"
                >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-[14px] font-bold text-gray-900 group-hover:text-forest-700 transition-colors">{c.name}</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">{c.frameworkName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${status.style}`}>{status.label}</span>
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-forest-500 transition-colors" />
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-[11px] text-gray-500 mb-3">
                  <span className="flex items-center gap-1"><Calendar size={12} />{c.period_label}</span>
                  <span>{c.completedEntities}/{c.totalEntities} entit{'\u00e9'}s</span>
                  {c.avgScore > 0 && (
                    <span className={`font-bold ${c.avgScore >= 80 ? 'text-green-600' : c.avgScore >= 60 ? 'text-forest-700' : 'text-gold-600'}`}>
                      {c.avgScore}% moy.
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-forest-500 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                </Link>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete modal */}
      {campaignToDelete && (
        <CampaignDeleteModal
          campaign={campaignToDelete}
          onClose={() => setCampaignToDelete(null)}
          onConfirm={async (deleteMissions) => {
            const ok = await deleteCampaign(campaignToDelete.id, deleteMissions)
            if (ok) setCampaignToDelete(null)
            return ok
          }}
          deleting={deleting}
        />
      )}

      {/* Create modal */}
      {showCreate && (
        <CampaignCreateModal
          frameworks={frameworks}
          onCreate={createCampaign}
          creating={creating}
          onClose={() => { setShowCreate(false); refetch() }}
        />
      )}
    </div>
  )
}
