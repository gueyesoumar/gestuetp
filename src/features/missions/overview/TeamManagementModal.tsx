import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { Modal } from '../../../components/ui/Modal'
import { Badge } from '../../../components/ui/Badge'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'
import { ROLE_LABELS } from '../mission-constants'
import { useMembers } from '../../members/useMembers'
import type { MissionMemberRow } from '../useMissionDetail'
import type { MissionRole } from '../../../types/database.types'

interface TeamManagementModalProps {
  missionId: string
  members: MissionMemberRow[]
  onClose: () => void
  onRefetch: () => void
}

export function TeamManagementModal({ missionId, members, onClose, onRefetch }: TeamManagementModalProps) {
  const { members: allOrgMembers, loading: orgLoading } = useMembers()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Members already in the mission
  const missionMemberIds = new Set(members.map((m) => m.user_id))

  // Available to add (org members not already in mission)
  const available = allOrgMembers.filter((m) => !missionMemberIds.has(m.id))

  const [addUserId, setAddUserId] = useState('')
  const [addRole, setAddRole] = useState<MissionRole>('auditor')

  const handleAdd = async () => {
    if (!addUserId) return
    setSaving(true)
    setError(null)
    setSuccess(null)

    const { data, error: fnError } = await supabase.functions.invoke('manage-team', {
      body: { action: 'add', mission_id: missionId, user_id: addUserId, role: addRole },
    })

    if (fnError || data?.error) {
      console.error('Add member:', fnError?.message ?? data?.error)
      setError('Erreur lors de l\u2019ajout du membre.')
    } else {
      const added = allOrgMembers.find((m) => m.id === addUserId)
      setSuccess(`${added?.first_name} ${added?.last_name} ajout\u00e9 comme ${ROLE_LABELS[addRole]}.`)
      setAddUserId('')
      onRefetch()
    }
    setSaving(false)
  }

  const handleRemove = async (memberRowId: string, userName: string) => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    const { data, error: fnError } = await supabase.functions.invoke('manage-team', {
      body: { action: 'remove', mission_id: missionId, member_id: memberRowId },
    })

    if (fnError || data?.error) {
      console.error('Remove member:', fnError?.message ?? data?.error)
      setError('Erreur lors du retrait du membre.')
    } else {
      setSuccess(`${userName} retir\u00e9 de la mission.`)
      onRefetch()
    }
    setSaving(false)
  }

  return (
    <Modal open onClose={onClose} title={'G\u00e9rer l\u2019\u00e9quipe'}>
      <div className="space-y-4">
        {error && <ErrorAlert message={error} />}
        {success && <div className="p-2.5 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">{'\u2713'} {success}</div>}

        {/* Current members */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Membres actuels ({members.length})</p>
          <div className="border border-gray-200 rounded-lg divide-y divide-gray-50">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-2.5 px-3 py-2.5">
                <Avatar name={`${m.user.first_name} ${m.user.last_name}`} role={m.role} />
                <div className="flex-1 min-w-0">
                  <span className="text-[13px] text-gray-900 font-medium">{m.user.first_name} {m.user.last_name}</span>
                  {m.user.email && <span className="text-[10px] text-gray-300 ml-2">{m.user.email}</span>}
                </div>
                <Badge label={ROLE_LABELS[m.role] ?? m.role} variant={m.role === 'associate' ? 'green' : m.role === 'lead_auditor' ? 'blue' : 'gray'} />
                {m.role === 'auditor' && (
                  <button onClick={() => handleRemove(m.id, `${m.user.first_name} ${m.user.last_name}`)} disabled={saving}
                    className="text-[10px] text-gray-300 hover:text-red-500 disabled:opacity-30" title="Retirer">
                    {'\u2715'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Add member */}
        <div className="border-t border-gray-200 pt-4">
          <p className="text-xs font-medium text-gray-700 mb-2">Ajouter un membre</p>
          {orgLoading ? (
            <p className="text-xs text-gray-300">Chargement...</p>
          ) : available.length === 0 ? (
            <p className="text-xs text-gray-300">Tous les membres de l&apos;organisation sont d&eacute;j&agrave; dans la mission.</p>
          ) : (
            <div className="space-y-2">
              <select value={addUserId} onChange={(e) => setAddUserId(e.target.value)} disabled={saving}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-forest-500">
                <option value="">S{'\u00e9'}lectionner un membre...</option>
                {available.map((m) => (
                  <option key={m.id} value={m.id}>{m.first_name} {m.last_name}{m.job_title ? ` (${m.job_title})` : ''}</option>
                ))}
              </select>
              <div className="flex gap-2">
              <select value={addRole} onChange={(e) => setAddRole(e.target.value as MissionRole)} disabled={saving}
                className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-forest-500">
                <option value="auditor">Auditeur</option>
                <option value="lead_auditor">Chef de mission</option>
                <option value="associate">Associ&eacute;</option>
              </select>
              <button onClick={handleAdd} disabled={saving || !addUserId}
                className="px-4 py-2.5 bg-forest-700 text-white rounded-lg text-[13px] font-semibold hover:bg-forest-900 disabled:opacity-50 transition-colors shrink-0">
                Ajouter
              </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

function Avatar({ name, role }: { name: string; role: string }) {
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  const bg = role === 'associate' ? 'bg-forest-700' : role === 'lead_auditor' ? 'bg-blue-500' : 'bg-gray-500'
  return (
    <div className={`w-7 h-7 rounded-full ${bg} text-white flex items-center justify-center text-[11px] font-semibold shrink-0`}>
      {initials}
    </div>
  )
}
