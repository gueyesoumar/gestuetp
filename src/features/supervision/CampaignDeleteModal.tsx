import { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import type { CampaignSummary } from './useAuditCampaigns'

interface CampaignDeleteModalProps {
  campaign: CampaignSummary
  onClose: () => void
  onConfirm: (deleteMissions: boolean) => Promise<boolean>
  deleting: boolean
}

export function CampaignDeleteModal({ campaign, onClose, onConfirm, deleting }: CampaignDeleteModalProps): JSX.Element {
  const [deleteMissions, setDeleteMissions] = useState(false)
  const [confirmName, setConfirmName] = useState('')

  const canConfirm = confirmName.trim() === campaign.name

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
              <AlertTriangle size={16} className="text-red-500" />
            </div>
            <h2 className="text-[15px] font-bold text-gray-900">Supprimer la campagne</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-4">
          <p className="text-[13px] text-gray-700">
            Vous {'ê'}tes sur le point de supprimer la campagne <b>{campaign.name}</b>.
          </p>

          {/* Mission deletion option */}
          <div className="border border-gray-200 rounded-lg p-3.5 bg-gray-50">
            <p className="text-[12px] font-semibold text-gray-700 mb-2">
              Que faire des {campaign.totalEntities} mission{campaign.totalEntities > 1 ? 's' : ''} li{'é'}e{campaign.totalEntities > 1 ? 's' : ''} ?
            </p>
            <div className="space-y-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="deleteMissions"
                  checked={!deleteMissions}
                  onChange={() => setDeleteMissions(false)}
                  className="mt-0.5"
                />
                <div>
                  <span className="text-[12px] font-medium text-gray-700">Conserver les missions</span>
                  <p className="text-[10px] text-gray-400">Les missions seront d{'é'}tach{'é'}es de la campagne mais reste autonomes.</p>
                </div>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="deleteMissions"
                  checked={deleteMissions}
                  onChange={() => setDeleteMissions(true)}
                  className="mt-0.5"
                />
                <div>
                  <span className="text-[12px] font-medium text-red-600">Supprimer aussi les missions</span>
                  <p className="text-[10px] text-gray-400">Les {campaign.totalEntities} missions et leurs donn{'é'}es (constats, validations, CARs) seront supprim{'é'}es.</p>
                </div>
              </label>
            </div>
          </div>

          {/* Confirmation */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Tapez le nom de la campagne pour confirmer
            </label>
            <input
              type="text"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={campaign.name}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-red-500"
            />
          </div>

          {deleteMissions && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-[11px] text-red-700">
                Cette action est <b>irr{'é'}versible</b>. Toutes les donn{'é'}es des missions seront perdues.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[12px] font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-white"
          >
            Annuler
          </button>
          <button
            onClick={() => onConfirm(deleteMissions)}
            disabled={!canConfirm || deleting}
            className="px-4 py-2 text-[12px] font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? 'Suppression...' : 'Supprimer la campagne'}
          </button>
        </div>
      </div>
    </div>
  )
}
