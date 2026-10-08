import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Building2, Calendar, Clock, Play, MoreVertical, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { readInvokeError } from '../../lib/edgeError'
import { MissionStatusBadge } from './MissionStatusBadge'
import { Modal } from '../../components/ui/Modal'
import { useCabinetPermissions } from '../../hooks/useCabinetPermissions'
import type { MissionDetail } from './useMissionDetail'
import type { MissionProgress } from './useMissionProgress'

interface MissionDetailHeaderProps {
  mission: MissionDetail
  progress: MissionProgress
  onCtaClick: () => void
}

export function MissionDetailHeader({ mission, progress, onCtaClick }: MissionDetailHeaderProps) {
  const navigate = useNavigate()
  const { canDeleteMission } = useCabinetPermissions()
  const [showMenu, setShowMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const period = mission.start_date && mission.end_date
    ? `${formatDate(mission.start_date)} \u2192 ${formatDate(mission.end_date)}`
    : null

  const handleDelete = async () => {
    setDeleting(true)
    setDeleteError(null)
    const { data, error } = await supabase.functions.invoke('delete-mission', {
      body: { mission_id: mission.id },
    })

    setDeleting(false)
    if (error || data?.error) {
      const msg = await readInvokeError(error, data, 'Suppression impossible')
      console.error('delete-mission:', msg)
      setDeleteError(msg)
      return
    }
    navigate('/missions')
  }

  return (
    <div className="bg-white border-b border-gray-200">
      {/* En-tête fusionné sur une ligne : le nom de mission est déjà dans le fil
          d'Ariane global, donc on retire le retour « ← Missions » redondant et on
          met titre + méta à gauche, badge + CTA à droite. */}
      <div className="flex items-center gap-3 px-7 py-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-[15px] font-bold text-gray-900 truncate shrink-0 max-w-[32ch]" title={mission.name}>{mission.name}</h2>
          <div className="hidden lg:flex items-center gap-3 text-[12px] text-gray-500 min-w-0">
            {mission.framework?.name && <span className="inline-flex items-center gap-1 truncate"><FileText size={12} className="shrink-0" /> {mission.framework.name}</span>}
            {mission.client?.name && <><Dot /><span className="inline-flex items-center gap-1 truncate"><Building2 size={12} className="shrink-0" /> {mission.client.name}</span></>}
            {period && <><Dot /><span className="inline-flex items-center gap-1 whitespace-nowrap"><Calendar size={12} className="shrink-0" /> {period}</span></>}
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 ml-auto">
          {progress.daysRemaining !== null && progress.daysRemaining <= 30 && (
            <span className="text-[11px] font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full inline-flex items-center gap-1 whitespace-nowrap">
              <Clock size={11} /> {progress.daysRemaining}j restants
            </span>
          )}
          <MissionStatusBadge status={mission.status} />
          {progress.nextAction && (
            <button
              onClick={onCtaClick}
              className="bg-forest-700 text-white px-3.5 py-1.5 rounded-lg text-[12px] font-semibold hover:bg-forest-900 transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <Play size={12} /> {progress.nextAction.ctaLabel}
            </button>
          )}

          {/* Menu contextuel : visible uniquement si l'utilisateur peut faire au moins une action */}
          {canDeleteMission && (
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors">
                <MoreVertical size={15} />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-9 z-20 w-52 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5">
                    <button onClick={() => { setShowMenu(false); setShowDeleteConfirm(true) }}
                      className="w-full text-left px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2">
                      <Trash2 size={13} /> Supprimer la mission
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-[3px] bg-gray-200">
        <div
          className="h-[3px] rounded-r-sm transition-all duration-500"
          style={{
            width: `${progress.overallPercent}%`,
            background: 'linear-gradient(90deg, #40916C, #D4A843)',
          }}
        />
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
            {deleteError && (
              <p className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded p-2">{deleteError}</p>
            )}
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
