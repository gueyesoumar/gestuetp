import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { MissionStatusBadge } from './MissionStatusBadge'
import { Modal } from '../../components/ui/Modal'
import type { MissionDetail } from './useMissionDetail'
import type { MissionProgress } from './useMissionProgress'

interface MissionDetailHeaderProps {
  mission: MissionDetail
  progress: MissionProgress
  onCtaClick: () => void
}

export function MissionDetailHeader({ mission, progress, onCtaClick }: MissionDetailHeaderProps) {
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const period = mission.start_date && mission.end_date
    ? `${formatDate(mission.start_date)} \u2192 ${formatDate(mission.end_date)}`
    : null

  const handleDelete = async () => {
    setDeleting(true)
    const { error } = await supabase.functions.invoke('delete-mission', {
      body: { mission_id: mission.id },
    })

    if (error) {
      // Fallback: essayer suppression directe via REST
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/missions?id=eq.${mission.id}`, {
        method: 'DELETE',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
          'Prefer': 'return=minimal',
        },
      })
      if (!res.ok) {
        console.error('Delete mission failed:', await res.text())
        setDeleting(false)
        return
      }
    }

    navigate('/missions')
  }

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="px-7 pt-5 pb-0">
        <Link to="/missions" className="inline-flex items-center gap-1.5 text-[13px] text-forest-700 hover:text-forest-900 mb-3">
          &larr; Missions
        </Link>

        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{mission.name}</h2>
            <div className="flex items-center gap-4 mt-1.5 text-[13px] text-gray-500">
              {mission.framework?.name && <span>&#128196; {mission.framework.name}</span>}
              <Dot />
              {mission.client?.name && <span>&#127970; {mission.client.name}</span>}
              {period && <><Dot /><span>&#128197; {period}</span></>}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {progress.daysRemaining !== null && progress.daysRemaining <= 30 && (
              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full">
                &#9202; {progress.daysRemaining}j restants
              </span>
            )}
            <MissionStatusBadge status={mission.status} />
            {progress.nextAction && (
              <button
                onClick={onCtaClick}
                className="bg-forest-700 text-white px-5 py-2 rounded-lg text-[13px] font-semibold hover:bg-forest-900 transition-colors flex items-center gap-1.5"
              >
                &#9654; {progress.nextAction.ctaLabel}
              </button>
            )}

            {/* Menu contextuel */}
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors">
                &#8942;
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-10 z-20 w-52 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5">
                    <button onClick={() => { setShowMenu(false); setShowDeleteConfirm(true) }}
                      className="w-full text-left px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2">
                      &#128465; Supprimer la mission
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-[3px] bg-gray-200 -mx-7">
          <div
            className="h-[3px] rounded-r-sm transition-all duration-500"
            style={{
              width: `${progress.overallPercent}%`,
              background: 'linear-gradient(90deg, #40916C, #D4A843)',
            }}
          />
        </div>
      </div>

      {/* Modal de confirmation */}
      {showDeleteConfirm && (
        <Modal open onClose={() => setShowDeleteConfirm(false)} title="Supprimer cette mission ?">
          <div className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-600 leading-relaxed">
                <strong>Attention :</strong> cette action est irr&eacute;versible. Toutes les donn&eacute;es de la mission seront supprim&eacute;es :
                contr&ocirc;les, travaux, validations, documents, questionnaires et rapports.
              </p>
            </div>
            <p className="text-[13px] text-gray-700">
              Confirmer la suppression de <strong>{mission.name}</strong> ?
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-500 hover:bg-gray-50 transition-colors">
                Annuler
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-[13px] font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors">
                {deleting ? 'Suppression...' : 'Supprimer d\u00e9finitivement'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Dot(){
  return <span className="w-1 h-1 rounded-full bg-gray-300" />
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
