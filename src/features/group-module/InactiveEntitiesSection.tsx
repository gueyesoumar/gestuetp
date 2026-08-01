import { useState, useCallback } from 'react'
import { ChevronDown, ChevronRight, RotateCcw } from 'lucide-react'
import { useManageEntity, type EntityRow } from './useManageEntity'
import { useToast } from '../../hooks/useToast'
import { ENTITY_TYPE_LABELS } from '../../lib/constants'
import { useVocab } from '../edition/useVocab'

interface Props {
  /** Rafraîchit la liste principale des entités actives après réactivation. */
  onReactivated: () => void
  canManage: boolean
}

/** Section repliable listant les entités désactivées (chargée à la demande). */
export function InactiveEntitiesSection({ onReactivated, canManage }: Props): JSX.Element | null {
  const vocab = useVocab()
  const toast = useToast()
  const { busy, listInactive, reactivateEntity } = useManageEntity()
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [rows, setRows] = useState<EntityRow[]>([])

  const load = useCallback(async (): Promise<void> => {
    const inactive = await listInactive()
    setRows(inactive)
    setLoaded(true)
  }, [listInactive])

  const toggle = (): void => {
    const next = !open
    setOpen(next)
    if (next && !loaded) void load()
  }

  const reactivate = async (id: string): Promise<void> => {
    const res = await reactivateEntity(id)
    if (!res.ok) { toast.error(res.error ?? 'Réactivation impossible'); return }
    toast.success('Entité réactivée')
    setRows((r) => r.filter((e) => e.id !== id))
    onReactivated()
  }

  if (!canManage) return null

  return (
    <div className="border border-gray-200 rounded-xl">
      <button onClick={toggle} className="w-full flex items-center gap-2 px-4 py-3 text-[13px] font-medium text-gray-600 hover:bg-gray-50 rounded-xl">
        {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        {vocab.entitiesTitle} d&eacute;sactiv&eacute;{vocab.entitySingular.endsWith('e') ? 'e' : ''}s
        {loaded && <span className="text-gray-400">({rows.length})</span>}
      </button>
      {open && (
        <div className="px-4 pb-3">
          {!loaded ? (
            <p className="text-[12px] text-gray-400 py-2">Chargement&hellip;</p>
          ) : rows.length === 0 ? (
            <p className="text-[12px] text-gray-400 py-2">Aucun{vocab.entitySingular.endsWith('e') ? 'e' : ''} {vocab.entitySingular} d&eacute;sactiv&eacute;{vocab.entitySingular.endsWith('e') ? 'e' : ''}.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {rows.map((e) => (
                <li key={e.id} className="flex items-center justify-between py-2">
                  <div>
                    <span className="text-[13px] font-medium text-gray-700">{e.name}</span>
                    {e.entity_type && <span className="ml-2 text-[10px] uppercase tracking-wide text-gray-400">{ENTITY_TYPE_LABELS[e.entity_type]}</span>}
                  </div>
                  <button onClick={() => void reactivate(e.id)} disabled={busy} className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-forest-700 hover:bg-forest-50 rounded-lg disabled:opacity-50">
                    <RotateCcw size={12} /> R&eacute;activer
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
