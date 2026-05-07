import { useState } from 'react'
import { X, ChevronDown, Loader2 } from 'lucide-react'
import type { RiskLevel, AuditTechnique } from '../../../types/database.types'
import type { MissionMemberRow } from '../useMissionDetail'

interface WorkProgramBulkToolbarProps {
  selectedCount: number
  auditors: MissionMemberRow[]
  saving: boolean
  onClear: () => void
  onAssignAuditor: (auditorId: string) => Promise<void>
  onSetRisk: (risk: RiskLevel) => Promise<void>
  onSetTechniques: (techniques: AuditTechnique[]) => Promise<void>
}

const RISKS: { value: RiskLevel; label: string; cls: string }[] = [
  { value: 'critical', label: 'Critique', cls: 'bg-red-600 text-white' },
  { value: 'high', label: 'Élevé', cls: 'bg-amber-500 text-white' },
  { value: 'medium', label: 'Moyen', cls: 'bg-yellow-400 text-yellow-900' },
  { value: 'low', label: 'Faible', cls: 'bg-gray-300 text-gray-700' },
]

const TECHNIQUES: { value: AuditTechnique; label: string }[] = [
  { value: 'inspection', label: 'Inspection' },
  { value: 'entretien', label: 'Entretien' },
  { value: 'observation', label: 'Observation' },
  { value: 'reexecution', label: 'Re-exécution' },
  { value: 'echantillon', label: 'Échantillon' },
  { value: 'analytique', label: 'Analytique' },
]

export function WorkProgramBulkToolbar({
  selectedCount,
  auditors,
  saving,
  onClear,
  onAssignAuditor,
  onSetRisk,
  onSetTechniques,
}: WorkProgramBulkToolbarProps) {
  const [techniquesOpen, setTechniquesOpen] = useState(false)
  const [pickedTechniques, setPickedTechniques] = useState<Set<AuditTechnique>>(new Set())

  const toggleTechnique = (t: AuditTechnique): void => {
    setPickedTechniques((prev) => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t); else next.add(t)
      return next
    })
  }

  const applyTechniques = async (): Promise<void> => {
    await onSetTechniques([...pickedTechniques])
    setPickedTechniques(new Set())
    setTechniquesOpen(false)
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-forest-700 text-white border-b border-forest-900 sticky top-0 z-[2]">
      <button
        type="button"
        onClick={onClear}
        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-forest-900 transition-colors"
        aria-label="D&eacute;s&eacute;lectionner tout"
      >
        <X size={14} />
      </button>
      <span className="text-xs font-semibold mr-2">
        {selectedCount} contr&ocirc;le{selectedCount > 1 ? 's' : ''} s&eacute;lectionn&eacute;{selectedCount > 1 ? 's' : ''}
      </span>

      {saving && <Loader2 size={13} className="animate-spin text-gold-300 mr-1" />}

      {/* Assign auditor */}
      <select
        defaultValue=""
        disabled={saving}
        onChange={(e) => {
          if (e.target.value) {
            void onAssignAuditor(e.target.value)
            e.target.value = ''
          }
        }}
        className="text-[11px] bg-forest-900/40 border border-forest-900 rounded-lg px-2 py-1 text-white outline-none disabled:opacity-50"
      >
        <option value="" className="text-gray-700">Affecter &agrave;...</option>
        {auditors.map((a) => (
          <option key={a.user_id} value={a.user_id} className="text-gray-700">
            {a.user.first_name[0]}. {a.user.last_name}
          </option>
        ))}
      </select>

      {/* Set risk */}
      <div className="flex items-center gap-1 bg-forest-900/40 rounded-lg px-1.5 py-0.5 border border-forest-900">
        <span className="text-[10px] uppercase tracking-wide opacity-70 mr-1">Risque</span>
        {RISKS.map((r) => (
          <button
            key={r.value}
            type="button"
            disabled={saving}
            onClick={() => void onSetRisk(r.value)}
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${r.cls} hover:opacity-80 disabled:opacity-50`}
            title={r.label}
          >
            {r.label[0]}
          </button>
        ))}
      </div>

      {/* Set techniques (multi) */}
      <div className="relative">
        <button
          type="button"
          disabled={saving}
          onClick={() => setTechniquesOpen(!techniquesOpen)}
          className="text-[11px] bg-forest-900/40 border border-forest-900 rounded-lg px-2 py-1 text-white inline-flex items-center gap-1 hover:bg-forest-900/60 disabled:opacity-50"
        >
          Techniques <ChevronDown size={11} />
        </button>
        {techniquesOpen && (
          <>
            <div className="fixed inset-0 z-[5]" onClick={() => setTechniquesOpen(false)} />
            <div className="absolute right-0 top-9 z-10 w-52 bg-white border border-gray-200 rounded-xl shadow-lg p-2 text-gray-700">
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1.5 px-1">
                Techniques &agrave; appliquer
              </p>
              {TECHNIQUES.map((t) => (
                <label key={t.value} className="flex items-center gap-2 px-1.5 py-1 hover:bg-forest-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pickedTechniques.has(t.value)}
                    onChange={() => toggleTechnique(t.value)}
                    className="w-3.5 h-3.5 accent-forest-700"
                  />
                  <span className="text-[12px]">{t.label}</span>
                </label>
              ))}
              <div className="border-t border-gray-100 mt-1.5 pt-1.5 flex justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setPickedTechniques(new Set())}
                  className="text-[11px] text-gray-500 hover:text-gray-700 px-2 py-1"
                >
                  R&eacute;init.
                </button>
                <button
                  type="button"
                  onClick={() => void applyTechniques()}
                  disabled={pickedTechniques.size === 0}
                  className="text-[11px] font-semibold text-white bg-forest-700 hover:bg-forest-900 px-2.5 py-1 rounded-lg disabled:opacity-40"
                >
                  Appliquer
                </button>
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed mt-1.5 px-1">
                Remplace les techniques actuelles des contr&ocirc;les s&eacute;lectionn&eacute;s.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
