import { useState } from 'react'
import { X, Upload, Loader2, Sparkles, Check, AlertCircle, FileImage } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'
import type { ClientContactInsert } from '../../../types/database.types'

interface ExtractedActor {
  name: string
  job_title: string | null
  department: string | null
  email: string | null
  phone: string | null
}

interface OrgChartImportModalProps {
  missionId: string
  onAdd: (actors: Omit<ClientContactInsert, 'mission_id'>[]) => Promise<void>
  onClose: () => void
}

const MAX_FILE_SIZE = 10 * 1024 * 1024

export function OrgChartImportModal({ missionId, onAdd, onClose }: OrgChartImportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<ExtractedActor[]>([])
  const [picked, setPicked] = useState<Set<number>>(new Set())
  const [edits, setEdits] = useState<Record<number, Partial<ExtractedActor>>>({})
  const [adding, setAdding] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const f = e.target.files?.[0] ?? null
    if (f && f.size > MAX_FILE_SIZE) {
      setError('Fichier trop volumineux (max 10 Mo)')
      return
    }
    setFile(f)
    setError(null)
    setSuggestions([])
    setPicked(new Set())
    setEdits({})
  }

  const handleExtract = async (): Promise<void> => {
    if (!file) return
    setExtracting(true)
    setError(null)

    const fd = new FormData()
    fd.append('mission_id', missionId)
    fd.append('file', file)

    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    const baseUrl = import.meta.env.VITE_SUPABASE_URL

    let result: { actors?: ExtractedActor[]; error?: string }
    try {
      const res = await fetch(`${baseUrl}/functions/v1/extract-org-chart-actors`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      result = await res.json() as { actors?: ExtractedActor[]; error?: string }
      if (!res.ok) {
        setError(result.error ?? 'Erreur d’extraction')
        setExtracting(false)
        return
      }
    } catch (err) {
      console.error('extract-org-chart-actors:', err)
      setError('Erreur réseau ou serveur')
      setExtracting(false)
      return
    }

    const actors = result.actors ?? []
    setSuggestions(actors)
    setPicked(new Set(actors.map((_, i) => i)))
    setExtracting(false)
  }

  const togglePick = (idx: number): void => {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx); else next.add(idx)
      return next
    })
  }

  const updateField = (idx: number, field: keyof ExtractedActor, value: string): void => {
    setEdits((prev) => ({
      ...prev,
      [idx]: { ...(prev[idx] ?? {}), [field]: value === '' ? null : value },
    }))
  }

  const getMerged = (idx: number): ExtractedActor => {
    return { ...suggestions[idx], ...(edits[idx] ?? {}) } as ExtractedActor
  }

  const handleAdd = async (): Promise<void> => {
    setAdding(true)
    const final = [...picked]
      .map((idx) => getMerged(idx))
      .filter((a) => a.name.trim().length > 0)
      .map<Omit<ClientContactInsert, 'mission_id'>>((a) => ({
        name: a.name.trim(),
        job_title: a.job_title?.trim() || null,
        department: a.department?.trim() || null,
        email: a.email?.trim() || null,
        phone: a.phone?.trim() || null,
      }))
    await onAdd(final)
    setAdding(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-5 py-3 border-b border-gray-200 bg-forest-50 flex items-center gap-3">
          <Sparkles size={16} className="text-forest-700" />
          <div className="flex-1">
            <p className="text-[14px] font-bold text-forest-900">Importer l&rsquo;organigramme</p>
            <p className="text-[11px] text-forest-700 mt-0.5">
              L&rsquo;IA extrait automatiquement les acteurs SI (RSSI, DSI, DPO&hellip;) du document.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Fermer">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1">
          {error && <div className="mb-3"><ErrorAlert message={error} /></div>}

          {/* Upload zone */}
          {suggestions.length === 0 && (
            <div className="mb-4">
              <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wide block mb-1.5">
                Document organigramme (PDF ou image, max 10 Mo)
              </label>
              <label className="flex items-center gap-3 px-4 py-6 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-forest-300 hover:bg-forest-50/30 transition-colors">
                <Upload size={20} className="text-gray-400" />
                <div className="flex-1 min-w-0">
                  {file ? (
                    <>
                      <p className="text-[13px] font-semibold text-gray-900 truncate">{file.name}</p>
                      <p className="text-[11px] text-gray-400">{(file.size / 1024).toFixed(0)} Ko · {file.type || 'type inconnu'}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-[13px] font-semibold text-gray-700">Sélectionnez un fichier</p>
                      <p className="text-[11px] text-gray-400">Glissez-déposez ou cliquez pour parcourir</p>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <div className="flex items-center justify-end mt-3">
                <button
                  onClick={() => void handleExtract()}
                  disabled={!file || extracting}
                  className="bg-forest-700 text-white px-4 py-2 rounded-lg text-[12px] font-semibold hover:bg-forest-900 disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {extracting ? <><Loader2 size={12} className="animate-spin" /> Extraction…</> : <><Sparkles size={12} /> Extraire les acteurs</>}
                </button>
              </div>
            </div>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-700">
                  {suggestions.length} acteur{suggestions.length > 1 ? 's' : ''} détecté{suggestions.length > 1 ? 's' : ''} · {picked.size} sélectionné{picked.size > 1 ? 's' : ''}
                </p>
                <button
                  onClick={() => { setSuggestions([]); setFile(null); setEdits({}); setPicked(new Set()) }}
                  className="text-[11px] text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
                >
                  <FileImage size={11} /> Recommencer avec un autre fichier
                </button>
              </div>

              {suggestions.map((_, idx) => {
                const isPicked = picked.has(idx)
                const merged = getMerged(idx)
                return (
                  <div key={idx} className={`border rounded-lg p-3 transition-colors ${isPicked ? 'border-forest-300 bg-forest-50/30' : 'border-gray-200 bg-white opacity-60'}`}>
                    <div className="flex items-start gap-2.5">
                      <button
                        type="button"
                        onClick={() => togglePick(idx)}
                        className={`mt-0.5 w-4 h-4 rounded border-1.5 flex items-center justify-center shrink-0 ${
                          isPicked ? 'bg-forest-700 border-forest-700' : 'border-gray-300 bg-white'
                        }`}
                        aria-label={isPicked ? 'Désélectionner' : 'Sélectionner'}
                      >
                        {isPicked && <Check size={11} className="text-white" />}
                      </button>
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={merged.name}
                          onChange={(e) => updateField(idx, 'name', e.target.value)}
                          disabled={!isPicked}
                          placeholder="Nom"
                          className="col-span-2 px-2 py-1 border border-gray-200 rounded text-[12px] outline-none focus:border-forest-500 disabled:opacity-50 disabled:bg-gray-50"
                        />
                        <input
                          type="text"
                          value={merged.job_title ?? ''}
                          onChange={(e) => updateField(idx, 'job_title', e.target.value)}
                          disabled={!isPicked}
                          placeholder="Fonction"
                          className="px-2 py-1 border border-gray-200 rounded text-[11px] outline-none focus:border-forest-500 disabled:opacity-50 disabled:bg-gray-50"
                        />
                        <input
                          type="text"
                          value={merged.department ?? ''}
                          onChange={(e) => updateField(idx, 'department', e.target.value)}
                          disabled={!isPicked}
                          placeholder="Direction"
                          className="px-2 py-1 border border-gray-200 rounded text-[11px] outline-none focus:border-forest-500 disabled:opacity-50 disabled:bg-gray-50"
                        />
                        <input
                          type="email"
                          value={merged.email ?? ''}
                          onChange={(e) => updateField(idx, 'email', e.target.value)}
                          disabled={!isPicked}
                          placeholder="Email"
                          className="px-2 py-1 border border-gray-200 rounded text-[11px] outline-none focus:border-forest-500 disabled:opacity-50 disabled:bg-gray-50"
                        />
                        <input
                          type="tel"
                          value={merged.phone ?? ''}
                          onChange={(e) => updateField(idx, 'phone', e.target.value)}
                          disabled={!isPicked}
                          placeholder="Téléphone"
                          className="px-2 py-1 border border-gray-200 rounded text-[11px] outline-none focus:border-forest-500 disabled:opacity-50 disabled:bg-gray-50"
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {!extracting && suggestions.length === 0 && !file && (
            <div className="mt-3 flex items-start gap-2 p-3 bg-gold-50 border border-gold-200 rounded-lg text-[11px] text-gold-700">
              <AlertCircle size={13} className="mt-0.5 shrink-0" />
              <p>
                <strong>Astuce :</strong> un PDF haute qualité ou une image nette donne de meilleurs résultats. L&rsquo;IA cible RSSI, DSI, DPO, AQSSI, responsables infra/réseau, RH SSI et continuité.
              </p>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-200 bg-[#FAFAFA] flex items-center gap-2">
          <button onClick={onClose} className="text-[12px] text-gray-500 hover:text-gray-700 px-3 py-2">
            Annuler
          </button>
          {suggestions.length > 0 && (
            <button
              onClick={() => void handleAdd()}
              disabled={picked.size === 0 || adding}
              className="ml-auto bg-gold-500 text-forest-900 px-4 py-2 rounded-lg text-[12px] font-semibold hover:bg-gold-600 disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {adding ? <><Loader2 size={12} className="animate-spin" /> Ajout…</> : <><Check size={12} /> Ajouter {picked.size} acteur{picked.size > 1 ? 's' : ''}</>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
