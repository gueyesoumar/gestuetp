import { useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { ScopingRiskCard } from './ScopingRiskCard'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'
import type { MissionRisk, RiskLevel } from '../../../types/database.types'

interface ScopingRisksTabProps {
  missionId: string
  risks: MissionRisk[]
  userId: string
  onAddRisk: (data: { mission_id: string; title: string; risk_level: RiskLevel; description: string; source: string; created_by: string }) => Promise<boolean>
  onRemoveRisk: (id: string) => Promise<boolean>
  saving: boolean
  error: string | null
}

export function ScopingRisksTab({ missionId, risks, userId, onAddRisk, onRemoveRisk, saving, error }: ScopingRisksTabProps) {
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [level, setLevel] = useState<RiskLevel>('medium')
  const [description, setDescription] = useState('')
  const [source, setSource] = useState('')
  const [generating, setGenerating] = useState(false)
  const [genSuccess, setGenSuccess] = useState<string | null>(null)

  const handleSubmit = async (): Promise<void> => {
    if (!title.trim()) return
    const ok = await onAddRisk({ mission_id: missionId, title, risk_level: level, description, source, created_by: userId })
    if (ok) { setTitle(''); setDescription(''); setSource(''); setShowForm(false) }
  }

  const handleGenerateFromQuestionnaire = useCallback(async (): Promise<void> => {
    setGenerating(true)
    setGenSuccess(null)

    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    if (!token) { setGenerating(false); return }

    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smart-risks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ mission_id: missionId }),
    })

    if (!res.ok) { setGenerating(false); return }
    const data = await res.json() as { risks: { title: string; risk_level: string; description: string; source: string }[] }

    let added = 0
    for (const risk of data.risks ?? []) {
      const ok = await onAddRisk({
        mission_id: missionId,
        title: risk.title,
        risk_level: risk.risk_level as RiskLevel,
        description: risk.description,
        source: risk.source,
        created_by: userId,
      })
      if (ok) added++
    }

    setGenerating(false)
    if (added > 0) {
      setGenSuccess(`${added} risque${added > 1 ? 's' : ''} g\u00e9n\u00e9r\u00e9${added > 1 ? 's' : ''} depuis le questionnaire`)
      setTimeout(() => setGenSuccess(null), 4000)
    }
  }, [missionId, userId, onAddRisk])

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] font-semibold text-gray-900">Risques initiaux identifi&eacute;s</span>
        <div className="flex gap-2">
          <button onClick={handleGenerateFromQuestionnaire} disabled={generating || saving}
            className="text-xs font-semibold text-white bg-gold-500 hover:bg-gold-600 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5">
            {generating ? (
              <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Analyse...</>
            ) : (
              <>&#10024; G&eacute;n&eacute;rer depuis le questionnaire</>
            )}
          </button>
          <button onClick={() => setShowForm(!showForm)}
            className="text-xs font-semibold text-white bg-purple-500 hover:bg-purple-600 px-3 py-1.5 rounded-lg transition-colors">
            {showForm ? 'Annuler' : '+ Ajouter manuellement'}
          </button>
        </div>
      </div>

      {genSuccess && (
        <div className="flex items-center gap-2 p-2.5 bg-green-50 border border-green-200 rounded-lg">
          <span className="text-green-600 text-sm">&#10003;</span>
          <p className="text-xs text-green-700 font-medium">{genSuccess}</p>
        </div>
      )}

      {error && <ErrorAlert message={error} />}

      {showForm && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-3">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre du risque..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-forest-500" />
          <div className="flex gap-2">
            <select value={level} onChange={(e) => setLevel(e.target.value as RiskLevel)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-2 outline-none">
              <option value="critical">Critique</option>
              <option value="high">&Eacute;lev&eacute;</option>
              <option value="medium">Moyen</option>
              <option value="low">Faible</option>
            </select>
            <input type="text" value={source} onChange={(e) => setSource(e.target.value)} placeholder="Source (ex: Questionnaire Q5)..."
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-forest-500" />
          </div>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description du risque..."
            rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs leading-relaxed outline-none focus:border-forest-500 resize-y" />
          <button onClick={handleSubmit} disabled={saving || !title.trim()}
            className="bg-forest-700 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-forest-900 disabled:opacity-50 transition-colors">
            Enregistrer le risque
          </button>
        </div>
      )}

      {risks.length === 0 && !showForm && (
        <EmptyState title="Aucun risque identifi&eacute;" description="Ajoutez les risques initiaux d&eacute;tect&eacute;s lors du cadrage." />
      )}

      {risks.map((risk) => (
        <ScopingRiskCard key={risk.id} risk={risk} onRemove={onRemoveRisk} saving={saving} />
      ))}
    </div>
  )
}
