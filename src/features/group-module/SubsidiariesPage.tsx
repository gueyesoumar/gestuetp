import { useMemo, useState } from 'react'
import { Search, Plus } from 'lucide-react'
import { useSubsidiaries, type SubsidiaryRow } from './useSubsidiaries'
import { useManageEntity } from './useManageEntity'
import { SubsidiaryCard } from './SubsidiaryCard'
import { EntityFormModal, type EntityFormValue } from './EntityFormModal'
import { InactiveEntitiesSection } from './InactiveEntitiesSection'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { useAuth } from '../../hooks/useAuth'
import { useGroupPermissions } from '../../hooks/useGroupPermissions'
import { useToast } from '../../hooks/useToast'
import { isRegul } from '../../lib/product'
import { useVocab } from '../edition/useVocab'

export function SubsidiariesPage(): JSX.Element {
  const vocab = useVocab()
  const { profile } = useAuth()
  const { subsidiaries, loading, totalCount, averageScore, totalActiveMissions, totalOverdue, refresh } = useSubsidiaries()
  const { canManageSubsidiaries } = useGroupPermissions()
  const { deactivateEntity } = useManageEntity()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<{ initial: EntityFormValue | null } | null>(null)
  const groupId = profile?.organization_id ?? null

  const nameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of subsidiaries) m.set(s.id, s.name)
    return m
  }, [subsidiaries])

  // Descendants d'une entité (pour exclure les cycles du select "rattachée à").
  const descendantsOf = useMemo(() => {
    const children = new Map<string, string[]>()
    for (const s of subsidiaries) {
      if (!s.parentOrgId) continue
      const arr = children.get(s.parentOrgId) ?? []
      arr.push(s.id); children.set(s.parentOrgId, arr)
    }
    return (rootId: string): Set<string> => {
      const out = new Set<string>()
      const stack = [rootId]
      while (stack.length) {
        const id = stack.pop()!
        for (const c of children.get(id) ?? []) { if (!out.has(c)) { out.add(c); stack.push(c) } }
      }
      return out
    }
  }, [subsidiaries])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return subsidiaries
    return subsidiaries.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      (s.sector ?? '').toLowerCase().includes(q) ||
      (s.city ?? '').toLowerCase().includes(q))
  }, [subsidiaries, search])

  const openCreate = (): void => setModal({ initial: null })
  const openEdit = (s: SubsidiaryRow): void => setModal({ initial: {
    id: s.id, name: s.name, entity_type: s.entityType, parent_org_id: s.parentOrgId, sector: s.sector, city: s.city, country: null,
    regulatoryProfile: s.regulatoryProfile,
  } })

  const askDeactivate = (s: SubsidiaryRow): void => {
    toast.warn(`Désactiver ${s.name} ?`, { action: { label: 'Confirmer', onClick: () => void doDeactivate(s) } })
  }
  const doDeactivate = async (s: SubsidiaryRow): Promise<void> => {
    const res = await deactivateEntity(s.id)
    if (!res.ok) { toast.error(res.error ?? 'Désactivation impossible'); return }
    toast.success('Entité désactivée'); refresh()
  }

  // Options de parent pour la modale (exclut soi-même et ses descendants).
  const parentOptions = useMemo(() => {
    const excluded = modal?.initial?.id ? descendantsOf(modal.initial.id).add(modal.initial.id) : new Set<string>()
    return subsidiaries.filter((s) => !excluded.has(s.id)).map((s) => ({ id: s.id, name: s.name }))
  }, [subsidiaries, modal, descendantsOf])

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{vocab.entitiesTitle}</h2>
          <p className="mt-1 text-[13px] text-gray-500">
            {totalCount === 0
              ? `Aucun${vocab.entitySingular.endsWith('e') ? 'e' : ''} ${vocab.entitySingular} rattaché${vocab.entitySingular.endsWith('e') ? 'e' : ''}.`
              : `${totalCount} ${totalCount > 1 ? vocab.entityPlural : vocab.entitySingular} ${averageScore !== null ? `· score moyen ${averageScore}%` : ''} · ${totalActiveMissions} mission${totalActiveMissions !== 1 ? 's' : ''} active${totalActiveMissions !== 1 ? 's' : ''}${totalOverdue > 0 ? ` · ${totalOverdue} plan${totalOverdue > 1 ? 's' : ''} en retard` : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {totalCount > 0 && (
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher&hellip;" className="pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg w-64 focus:border-forest-700 focus:ring-1 focus:ring-forest-700" />
            </div>
          )}
          {canManageSubsidiaries && (
            <button onClick={openCreate} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900">
              <Plus size={16} /> Cr&eacute;er {vocab.entitySingular.endsWith('e') ? 'une' : 'un'} {vocab.entitySingular}
            </button>
          )}
        </div>
      </div>

      {totalCount === 0 ? (
        <EmptyState title={`Aucun${vocab.entitySingular.endsWith('e') ? 'e' : ''} ${vocab.entitySingular}`} description={canManageSubsidiaries ? `Créez votre premier${vocab.entitySingular.endsWith('e') ? 'e' : ''} ${vocab.entitySingular}${isRegul ? '' : ' (filiale, site, direction…)'} avec le bouton ci-dessus.` : `Aucun${vocab.entitySingular.endsWith('e') ? 'e' : ''} ${vocab.entitySingular} n’est encore rattaché${vocab.entitySingular.endsWith('e') ? 'e' : ''}.`} />
      ) : filtered.length === 0 ? (
        <EmptyState title="Aucun résultat" description={`Aucun${vocab.entitySingular.endsWith('e') ? 'e' : ''} ${vocab.entitySingular} ne correspond à votre recherche.`} />
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((s) => (
            <SubsidiaryCard
              key={s.id}
              subsidiary={s}
              parentName={s.parentOrgId && s.parentOrgId !== groupId ? nameById.get(s.parentOrgId) ?? null : null}
              onEdit={canManageSubsidiaries ? openEdit : undefined}
              onDeactivate={canManageSubsidiaries ? askDeactivate : undefined}
            />
          ))}
        </div>
      )}

      <InactiveEntitiesSection canManage={canManageSubsidiaries} onReactivated={refresh} />

      {modal && (
        <EntityFormModal
          initial={modal.initial}
          parentOptions={parentOptions}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); refresh() }}
        />
      )}
    </div>
  )
}
