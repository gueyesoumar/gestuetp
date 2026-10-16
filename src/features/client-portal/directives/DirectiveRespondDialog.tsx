import { useEffect, useState, useCallback } from 'react'
import { X, Paperclip, Download, Loader2 } from 'lucide-react'
import type { ClientDirective, DirectiveEvidence } from './useClientDirectives'

interface Props {
  directive: ClientDirective
  onClose: () => void
  respond: (id: string, status: 'in_progress' | 'done', note: string) => Promise<{ ok: boolean; error?: string }>
  listEvidence: (id: string) => Promise<DirectiveEvidence[]>
  uploadEvidence: (id: string, file: File) => Promise<{ ok: boolean; error?: string }>
  signedUrl: (path: string) => Promise<string | null>
  onDone: () => void
}

/** Réponse de l'assujetti à une directive : statut + note + preuves. */
export function DirectiveRespondDialog({ directive, onClose, respond, listEvidence, uploadEvidence, signedUrl, onDone }: Props): JSX.Element {
  const [status, setStatus] = useState<'in_progress' | 'done'>(directive.status === 'done' ? 'done' : 'in_progress')
  const [note, setNote] = useState(directive.client_response ?? '')
  const [evidence, setEvidence] = useState<DirectiveEvidence[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const canRespond = directive.verification_status === 'pending' || directive.verification_status === 'rejected'

  const reload = useCallback(() => { void listEvidence(directive.id).then(setEvidence) }, [listEvidence, directive.id])
  useEffect(() => { reload() }, [reload])

  async function onFile(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true); setErr(null)
    const res = await uploadEvidence(directive.id, file)
    setBusy(false)
    e.target.value = ''
    if (!res.ok) { setErr(res.error ?? 'Téléversement impossible.'); return }
    reload()
  }

  async function submit(): Promise<void> {
    setBusy(true); setErr(null)
    const res = await respond(directive.id, status, note)
    setBusy(false)
    if (!res.ok) { setErr(res.error ?? 'Réponse impossible.'); return }
    onDone(); onClose()
  }

  async function open(path: string): Promise<void> {
    const url = await signedUrl(path)
    if (url) window.open(url, '_blank', 'noopener')
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Répondre à la directive</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <p className="text-[13px] text-gray-700">{directive.description}</p>
          {directive.due_date && <p className="text-[12px] text-gray-500">Échéance : {directive.due_date}</p>}

          {canRespond ? (
            <>
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1">Statut</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as 'in_progress' | 'done')} className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded-lg">
                  <option value="in_progress">En cours</option>
                  <option value="done">Traité</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1">Note de réponse</label>
                <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Décrivez ce qui a été fait..." className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded-lg" />
              </div>
            </>
          ) : (
            <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-[12px] text-gray-600">
              Cette directive est <b>vérifiée</b> : elle n&rsquo;est plus modifiable.
            </div>
          )}

          <div>
            <p className="text-[12px] font-medium text-gray-600 mb-1">Preuves</p>
            <div className="space-y-1">
              {evidence.map((ev) => (
                <button key={ev.id} onClick={() => open(ev.file_path)} className="flex w-full items-center gap-2 rounded-lg border border-gray-100 px-2.5 py-1.5 text-[12px] text-gray-700 hover:bg-gray-50">
                  <Paperclip size={13} className="text-gray-400" /> <span className="flex-1 truncate text-left">{ev.file_name}</span> <Download size={13} className="text-gray-400" />
                </button>
              ))}
              {evidence.length === 0 && <p className="text-[12px] text-gray-400">Aucune preuve jointe.</p>}
            </div>
            {canRespond && (
              <label className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] text-gray-700 hover:bg-gray-50 cursor-pointer">
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />} Joindre un fichier
                <input type="file" className="hidden" onChange={onFile} disabled={busy} />
              </label>
            )}
          </div>

          {err && <p className="text-[12px] text-red-600">{err}</p>}
        </div>
        {canRespond && (
          <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
            <button onClick={onClose} className="px-3 py-2 text-[13px] text-gray-600 hover:text-gray-800">Annuler</button>
            <button onClick={submit} disabled={busy} className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900 disabled:opacity-50">
              {busy && <Loader2 size={14} className="animate-spin" />} Envoyer la réponse
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
