import { useState, useEffect } from 'react'
import { X, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { Framework, AuditCampaignInsert } from '../../types/database.types'

interface SubEntity {
  id: string
  name: string
  sector: string | null
}

interface CampaignCreateModalProps {
  frameworks: Framework[]
  onCreate: (data: AuditCampaignInsert, entityIds: string[]) => Promise<string | null>
  creating: boolean
  onClose: () => void
}

export function CampaignCreateModal({ frameworks, onCreate, creating, onClose }: CampaignCreateModalProps): JSX.Element {
  const { profile } = useAuth()
  const [step, setStep] = useState<1 | 2>(1)
  const [name, setName] = useState('')
  const [frameworkId, setFrameworkId] = useState(frameworks[0]?.id ?? '')
  const [periodLabel, setPeriodLabel] = useState(String(new Date().getFullYear()))
  const [periodStart, setPeriodStart] = useState(`${new Date().getFullYear()}-01-01`)
  const [periodEnd, setPeriodEnd] = useState(`${new Date().getFullYear()}-12-31`)
  const [entities, setEntities] = useState<SubEntity[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loadingEntities, setLoadingEntities] = useState(false)
  const [success, setSuccess] = useState(false)

  // Auto-generate name
  useEffect(() => {
    const fw = frameworks.find((f) => f.id === frameworkId)
    if (fw) setName(`Campagne ${fw.name} ${periodLabel}`)
  }, [frameworkId, periodLabel, frameworks])

  // Load subsidiaries
  useEffect(() => {
    if (!profile?.organization_id) return
    setLoadingEntities(true)

    supabase
      .rpc('get_subsidiary_ids', { parent_id: profile.organization_id })
      .then(async ({ data: subIds }) => {
        if (!subIds || (subIds as string[]).length === 0) {
          setEntities([])
          setLoadingEntities(false)
          return
        }
        const { data: orgs } = await supabase
          .from('organizations')
          .select('id, name, sector')
          .in('id', subIds as string[])
          .order('name')

        setEntities((orgs ?? []) as SubEntity[])
        setLoadingEntities(false)
      })
  }, [profile?.organization_id])

  const toggleEntity = (id: string): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = (): void => {
    setSelectedIds(new Set(entities.map((e) => e.id)))
  }

  const handleCreate = async (): Promise<void> => {
    if (!profile?.organization_id || selectedIds.size === 0) return

    const campaignData: AuditCampaignInsert = {
      organization_id: profile.organization_id,
      framework_id: frameworkId,
      name,
      period_label: periodLabel,
      period_start: periodStart,
      period_end: periodEnd,
    }

    const result = await onCreate(campaignData, Array.from(selectedIds))
    if (result) {
      setSuccess(true)
      setTimeout(onClose, 1500)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-[15px] font-bold text-gray-900">Nouvelle campagne d{'\u2019'}audit</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-100">
          <StepDot active={step === 1} done={step > 1} label={`1. Param\u00e8tres`} />
          <div className="flex-1 h-px bg-gray-200" />
          <StepDot active={step === 2} done={success} label={`2. Entit\u00e9s`} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {success ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                <Check size={24} className="text-green-600" />
              </div>
              <p className="text-sm font-semibold text-gray-900">Campagne cr{'\u00e9'}{'\u00e9'}e avec succ{'\u00e8'}s</p>
              <p className="text-xs text-gray-400 mt-1">{selectedIds.size} mission{selectedIds.size > 1 ? 's' : ''} cr{'\u00e9'}{'\u00e9'}{selectedIds.size > 1 ? 'es' : 'e'}</p>
            </div>
          ) : step === 1 ? (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">R{'\u00e9'}f{'\u00e9'}rentiel</label>
                <select
                  value={frameworkId}
                  onChange={(e) => setFrameworkId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] outline-none focus:border-forest-500"
                >
                  {frameworks.map((fw) => (
                    <option key={fw.id} value={fw.id}>{fw.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Nom de la campagne</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] outline-none focus:border-forest-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">P{'\u00e9'}riode</label>
                  <input
                    type="text"
                    value={periodLabel}
                    onChange={(e) => setPeriodLabel(e.target.value)}
                    placeholder="2026"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] outline-none focus:border-forest-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">D{'\u00e9'}but</label>
                  <input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] outline-none focus:border-forest-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Fin</label>
                  <input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] outline-none focus:border-forest-500"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[12px] text-gray-500">S{'\u00e9'}lectionnez les entit{'\u00e9'}s {'\u00e0'} auditer</p>
                <button onClick={selectAll} className="text-[11px] text-forest-700 font-medium hover:underline">
                  Tout s{'\u00e9'}lectionner ({entities.length})
                </button>
              </div>

              {loadingEntities ? (
                <p className="text-xs text-gray-400 text-center py-6">Chargement...</p>
              ) : entities.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">Aucune entit{'\u00e9'} supervis{'\u00e9'}e trouv{'\u00e9'}e.</p>
              ) : (
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                  {entities.map((e) => (
                    <label
                      key={e.id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                        selectedIds.has(e.id)
                          ? 'border-forest-300 bg-forest-50'
                          : 'border-gray-200 bg-white hover:border-forest-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(e.id)}
                        onChange={() => toggleEntity(e.id)}
                        className="rounded border-gray-300 text-forest-700 focus:ring-forest-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-gray-900">{e.name}</p>
                        {e.sector && <p className="text-[10px] text-gray-400">{e.sector}</p>}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            {step === 2 && (
              <button onClick={() => setStep(1)} className="text-[12px] text-gray-500 hover:text-gray-700">
                {'\u2190'} Retour
              </button>
            )}
            <div className="ml-auto flex gap-2">
              <button onClick={onClose} className="px-4 py-2 text-[12px] text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
                Annuler
              </button>
              {step === 1 ? (
                <button
                  onClick={() => setStep(2)}
                  disabled={!name.trim() || !frameworkId}
                  className="px-4 py-2 bg-forest-700 text-white rounded-lg text-[12px] font-semibold hover:bg-forest-900 disabled:opacity-50"
                >
                  Suivant {'\u2192'}
                </button>
              ) : (
                <button
                  onClick={handleCreate}
                  disabled={creating || selectedIds.size === 0}
                  className="px-4 py-2 bg-forest-700 text-white rounded-lg text-[12px] font-semibold hover:bg-forest-900 disabled:opacity-50"
                >
                  {creating ? 'Cr\u00e9ation...' : `Lancer la campagne (${selectedIds.size} entit\u00e9${selectedIds.size > 1 ? 's' : ''})`}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }): JSX.Element {
  return (
    <span className={`text-[11px] font-medium ${
      done ? 'text-green-600' : active ? 'text-forest-700' : 'text-gray-300'
    }`}>
      {label}
    </span>
  )
}
