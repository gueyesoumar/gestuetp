import { useState, useCallback } from 'react'
import { Save } from 'lucide-react'
import { supabase } from '../../../lib/supabase'

const OPTIONS = [
  { key: 'conformant', label: 'Conforme', color: 'border-green-500 bg-green-50 text-green-700' },
  { key: 'partially_conformant', label: 'Partiellement conforme', color: 'border-gold-500 bg-gold-50 text-gold-700' },
  { key: 'non_conformant', label: 'Non conforme', color: 'border-red-500 bg-red-50 text-red-700' },
] as const

interface Props {
  missionId: string
  initialConclusion: string | null
  initialComment: string | null
}

export function AuditConclusion({ missionId, initialConclusion, initialComment }: Props): JSX.Element {
  const [conclusion, setConclusion] = useState<string | null>(initialConclusion)
  const [comment, setComment] = useState(initialComment ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = useCallback(async () => {
    setSaving(true)
    setSaved(false)
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    if (!token) { setSaving(false); return }

    const baseUrl = import.meta.env.VITE_SUPABASE_URL
    const apikey = import.meta.env.VITE_SUPABASE_ANON_KEY

    const res = await fetch(`${baseUrl}/rest/v1/missions?id=eq.${missionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apikey,
        'Authorization': `Bearer ${token}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        audit_conclusion: conclusion,
        audit_conclusion_comment: comment || null,
      }),
    })

    if (!res.ok) console.error('AuditConclusion save failed', res.status)
    else setSaved(true)
    setSaving(false)
  }, [missionId, conclusion, comment])

  return (
    <div>
      <h4 className="text-sm font-bold text-gray-900 mb-3">Conclusion d&rsquo;audit</h4>
      <div className="flex gap-3 mb-4">
        {OPTIONS.map((opt) => (
          <button key={opt.key} type="button" onClick={() => setConclusion(opt.key)}
            className={`flex-1 py-3 border-2 rounded-xl text-[13px] font-semibold text-center transition-all ${
              conclusion === opt.key ? `${opt.color} ring-2 ring-forest-200` : 'border-gray-200 text-gray-400 hover:border-gray-300'
            }`}>
            {opt.label}
          </button>
        ))}
      </div>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3}
        placeholder="Commentaire de conclusion (optionnel)..."
        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[13px] text-gray-700 leading-relaxed outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100 resize-y mb-3" />
      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving || !conclusion}
          className="px-5 py-2.5 bg-forest-700 text-white rounded-lg text-[13px] font-semibold hover:bg-forest-900 disabled:opacity-50 transition-colors flex items-center gap-1.5">
          <Save size={14} /> {saving ? 'Enregistrement...' : 'Enregistrer la conclusion'}
        </button>
        {saved && <span className="text-xs text-green-600 font-medium">Enregistr&eacute;</span>}
      </div>
    </div>
  )
}
