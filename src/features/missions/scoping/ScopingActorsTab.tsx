import { useState } from 'react'
import { Plus, Pencil, Trash2, Star, X, Check, UserCircle2, Sparkles } from 'lucide-react'
import { useMissionActors } from './useMissionActors'
import { OrgChartImportModal } from './OrgChartImportModal'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'
import type { ClientContact, ClientContactInsert } from '../../../types/database.types'

interface ScopingActorsTabProps {
  missionId: string
}

interface DraftActor {
  id?: string
  name: string
  job_title: string
  department: string
  email: string
  phone: string
  is_primary: boolean
}

const EMPTY_DRAFT: DraftActor = {
  name: '', job_title: '', department: '', email: '', phone: '', is_primary: false,
}

function fromActor(a: ClientContact): DraftActor {
  return {
    id: a.id,
    name: a.name,
    job_title: a.job_title ?? '',
    department: a.department ?? '',
    email: a.email ?? '',
    phone: a.phone ?? '',
    is_primary: a.is_primary,
  }
}

export function ScopingActorsTab({ missionId }: ScopingActorsTabProps) {
  const { actors, loading, error, saving, add, update, remove } = useMissionActors(missionId)
  const [draft, setDraft] = useState<DraftActor | null>(null)
  const [showImport, setShowImport] = useState(false)

  const handleSave = async (): Promise<void> => {
    if (!draft || draft.name.trim().length === 0) return
    const payload = {
      name: draft.name.trim(),
      job_title: draft.job_title.trim() || null,
      department: draft.department.trim() || null,
      email: draft.email.trim() || null,
      phone: draft.phone.trim() || null,
      is_primary: draft.is_primary,
    }
    const ok = draft.id
      ? await update(draft.id, payload)
      : (await add(payload)) !== null
    if (ok) setDraft(null)
  }

  if (loading) return <div className="p-6"><LoadingSpinner /></div>

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-[14px] font-bold text-gray-900 mb-1">Acteurs SI à rencontrer</h3>
          <p className="text-[12px] text-gray-500">
            Identifiez les interlocuteurs côté client : RSSI, DSI, DPO, responsables métiers… Ils seront affectés aux entretiens en phase de planification.
          </p>
        </div>
        {!draft && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowImport(true)}
              className="border border-forest-300 text-forest-700 px-3 py-1.5 rounded-lg text-[12px] font-semibold hover:bg-forest-50 inline-flex items-center gap-1.5"
            >
              <Sparkles size={13} /> Importer organigramme
            </button>
            <button
              type="button"
              onClick={() => setDraft({ ...EMPTY_DRAFT })}
              className="bg-forest-700 text-white px-3 py-1.5 rounded-lg text-[12px] font-semibold hover:bg-forest-900 inline-flex items-center gap-1.5"
            >
              <Plus size={13} /> Ajouter
            </button>
          </div>
        )}
      </div>

      {error && <div className="mb-3"><ErrorAlert message={error} /></div>}

      {draft && (
        <div className="border-2 border-dashed border-forest-300 rounded-lg p-3 bg-forest-50/40 mb-4">
          <p className="text-[11px] font-bold text-forest-700 uppercase tracking-wide mb-2">
            {draft.id ? 'Modifier l’acteur' : 'Nouvel acteur SI'}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Nom complet *"
              className="px-2.5 py-1.5 border border-gray-200 rounded text-[12px] outline-none focus:border-forest-500 col-span-2"
            />
            <input
              type="text"
              value={draft.job_title}
              onChange={(e) => setDraft({ ...draft, job_title: e.target.value })}
              placeholder="Fonction (RSSI, DPO…)"
              className="px-2.5 py-1.5 border border-gray-200 rounded text-[12px] outline-none focus:border-forest-500"
            />
            <input
              type="text"
              value={draft.department}
              onChange={(e) => setDraft({ ...draft, department: e.target.value })}
              placeholder="Direction / service"
              className="px-2.5 py-1.5 border border-gray-200 rounded text-[12px] outline-none focus:border-forest-500"
            />
            <input
              type="email"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              placeholder="Email"
              className="px-2.5 py-1.5 border border-gray-200 rounded text-[12px] outline-none focus:border-forest-500"
            />
            <input
              type="tel"
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              placeholder="Téléphone"
              className="px-2.5 py-1.5 border border-gray-200 rounded text-[12px] outline-none focus:border-forest-500"
            />
          </div>
          <label className="text-[11px] inline-flex items-center gap-1 text-gray-700 mt-2">
            <input
              type="checkbox"
              checked={draft.is_primary}
              onChange={(e) => setDraft({ ...draft, is_primary: e.target.checked })}
            />
            <Star size={11} className="text-gold-500" /> Interlocuteur principal
          </label>
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || draft.name.trim().length === 0}
              className="text-[11px] font-semibold px-3 py-1 bg-forest-700 text-white rounded hover:bg-forest-900 disabled:opacity-50 inline-flex items-center gap-1"
            >
              <Check size={11} /> {draft.id ? 'Enregistrer' : 'Ajouter'}
            </button>
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="text-[11px] text-gray-500 px-3 py-1 hover:text-gray-700 inline-flex items-center gap-1"
            >
              <X size={11} /> Annuler
            </button>
          </div>
        </div>
      )}

      {actors.length === 0 && !draft ? (
        <div className="border border-dashed border-gray-200 rounded-lg p-8 text-center">
          <UserCircle2 size={28} className="mx-auto text-gray-300 mb-2" />
          <p className="text-[12px] text-gray-500 mb-3">Aucun acteur identifié pour le moment.</p>
          <button
            type="button"
            onClick={() => setDraft({ ...EMPTY_DRAFT })}
            className="text-[12px] font-semibold text-forest-700 hover:text-forest-900 inline-flex items-center gap-1"
          >
            <Plus size={12} /> Ajouter un premier acteur
          </button>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
          {actors.map((a) => (
            <ActorRow
              key={a.id}
              actor={a}
              onEdit={() => setDraft(fromActor(a))}
              onRemove={() => void remove(a.id)}
              disabled={!!draft || saving}
            />
          ))}
        </div>
      )}

      {showImport && (
        <OrgChartImportModal
          missionId={missionId}
          onAdd={async (newActors: Omit<ClientContactInsert, 'mission_id'>[]) => {
            for (const a of newActors) {
              await add(a)
            }
            setShowImport(false)
          }}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  )
}

interface ActorRowProps {
  actor: ClientContact
  onEdit: () => void
  onRemove: () => void
  disabled: boolean
}

function ActorRow({ actor, onEdit, onRemove, disabled }: ActorRowProps) {
  return (
    <div className="flex items-start gap-3 px-3 py-2.5 border-b border-gray-100 last:border-b-0 hover:bg-gray-50/60">
      <div className="w-8 h-8 rounded-full bg-forest-100 text-forest-700 flex items-center justify-center text-[11px] font-bold shrink-0">
        {actor.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[13px] font-semibold text-gray-900">{actor.name}</span>
          {actor.is_primary && (
            <span className="text-[9px] font-bold uppercase tracking-wide text-gold-700 bg-gold-50 border border-gold-200 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
              <Star size={9} /> Principal
            </span>
          )}
        </div>
        <div className="text-[11px] text-gray-500 truncate">
          {[actor.job_title, actor.department].filter(Boolean).join(' · ') || <em className="text-gray-300">Fonction non précisée</em>}
        </div>
        <div className="text-[10px] text-gray-400 mt-0.5">
          {[actor.email, actor.phone].filter(Boolean).join(' · ')}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onEdit} disabled={disabled} className="p-1.5 text-gray-400 hover:text-forest-700 disabled:opacity-30" title="Modifier">
          <Pencil size={13} />
        </button>
        <button onClick={onRemove} disabled={disabled} className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-30" title="Supprimer">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}
