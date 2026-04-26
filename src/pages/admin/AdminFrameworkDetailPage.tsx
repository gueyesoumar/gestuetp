import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronDown, ChevronUp, Plus, Trash2, Sparkles, Save } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAdminFrameworkDetail, type AdminDomain, type AdminControl } from '../../features/admin/useAdminFrameworkDetail'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { useToast } from '../../hooks/useToast'

export function AdminFrameworkDetailPage() {
  const { slug } = useParams()
  const { framework, loading, error, refetch } = useAdminFrameworkDetail(slug)
  const toast = useToast()

  if (loading) return <div className="p-8"><LoadingSpinner /></div>
  if (error || !framework) return <div className="p-8"><ErrorAlert message={error ?? 'Référentiel introuvable'} /></div>

  return (
    <div className="px-7 py-6">
      <Link to="/admin/frameworks" className="text-[12px] text-forest-700 font-semibold hover:text-forest-900 inline-flex items-center gap-1 mb-3">
        <ChevronLeft size={14} /> Retour aux référentiels
      </Link>

      <div className="flex items-start gap-3 mb-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            {framework.name}
            {framework.was_ai_generated && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold bg-gold-50 text-gold-600 px-2 py-0.5 rounded">
                <Sparkles size={10} /> Brouillon IA
              </span>
            )}
          </h1>
          <p className="text-[11.5px] text-gray-500 mt-0.5">
            <code className="font-mono">{framework.slug}</code>
            {framework.version && <> · v{framework.version}</>}
            {framework.publisher && <> · {framework.publisher}</>}
            <> · {framework.domains.length} domaines · {framework.domains.reduce((s, d) => s + d.controls.length, 0)} contrôles</>
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {framework.is_active
            ? <span className="px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-[11px] font-semibold">Actif</span>
            : <span className="px-2.5 py-1 bg-gray-100 text-gray-500 rounded-full text-[11px] font-semibold">Désactivé</span>}
          {framework.missions_count > 0 && (
            <span className="text-[11.5px] text-gray-500">{framework.missions_count} mission(s) · {framework.assessments_count} assessment(s)</span>
          )}
        </div>
      </div>

      {framework.was_ai_generated && (
        <div className="mb-4 px-4 py-2.5 bg-gold-50 border border-gold-200 rounded-lg flex items-start gap-2.5 text-[12px] text-gold-700">
          <Sparkles size={14} className="text-gold-600 mt-0.5 flex-shrink-0" />
          <div>
            <b>Brouillon IA</b> — relisez et corrigez les contrôles avant publication. Une fois validé, désactivez le badge dans les métadonnées.
          </div>
        </div>
      )}

      <MetadataEditor framework={framework} onSaved={refetch} toast={toast} />

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[14px] font-bold text-gray-900">Domaines &amp; contrôles</h2>
        <AddDomainButton frameworkId={framework.id} onCreated={refetch} toast={toast} />
      </div>

      {framework.domains.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-6 py-12 text-center text-[12.5px] text-gray-300">
          Aucun domaine. Cliquez sur « Ajouter un domaine » pour commencer.
        </div>
      ) : (
        <div className="space-y-3">
          {framework.domains.map((d, idx) => (
            <DomainEditor
              key={d.id}
              domain={d}
              isFirst={idx === 0}
              isLast={idx === framework.domains.length - 1}
              onChanged={refetch}
              toast={toast}
              allDomainIds={framework.domains.map((dd) => dd.id)}
              currentIndex={idx}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Metadata editor (inline edit + save) ──────────────────────────────────

function MetadataEditor({ framework, onSaved, toast }: {
  framework: { id: string; name: string; slug: string; version: string | null; publisher: string | null; description: string | null; category: string; is_active: boolean; was_ai_generated: boolean }
  onSaved: () => void
  toast: ReturnType<typeof useToast>
}) {
  const [name, setName] = useState(framework.name)
  const [version, setVersion] = useState(framework.version ?? '')
  const [publisher, setPublisher] = useState(framework.publisher ?? '')
  const [description, setDescription] = useState(framework.description ?? '')
  const [category, setCategory] = useState(framework.category)
  const [saving, setSaving] = useState(false)

  const dirty = name !== framework.name
    || version !== (framework.version ?? '')
    || publisher !== (framework.publisher ?? '')
    || description !== (framework.description ?? '')
    || category !== framework.category

  const save = async () => {
    setSaving(true)
    const { data, error } = await supabase.functions.invoke('admin-framework', {
      body: { action: 'update_framework', id: framework.id, name, version, publisher, description, category },
    })
    setSaving(false)
    if (error || data?.error) { toast.error('Mise à jour impossible'); return }
    toast.success('Métadonnées sauvegardées')
    onSaved()
  }

  const toggleActive = async () => {
    const { data, error } = await supabase.functions.invoke('admin-framework', {
      body: { action: 'update_framework', id: framework.id, is_active: !framework.is_active, reason: `Bascule statut depuis admin` },
    })
    if (error || data?.error) { toast.error('Bascule impossible'); return }
    toast.success(framework.is_active ? 'Référentiel désactivé' : 'Référentiel activé')
    onSaved()
  }

  const dismissAiBadge = async () => {
    const { data, error } = await supabase.functions.invoke('admin-framework', {
      body: { action: 'update_framework', id: framework.id, was_ai_generated: false },
    })
    if (error || data?.error) { toast.error('Mise à jour impossible'); return }
    toast.success('Badge IA retiré — référentiel publié')
    onSaved()
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5 space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Lab>Nom</Lab>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={saving} />
        </div>
        <div>
          <Lab>Catégorie</Lab>
          <select value={category} onChange={(e) => setCategory(e.target.value)} disabled={saving}>
            <option value="conformite">Conformité</option>
            <option value="gouvernance">Gouvernance</option>
            <option value="evaluation">Évaluation</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Lab>Version</Lab>
          <input type="text" value={version} onChange={(e) => setVersion(e.target.value)} disabled={saving} />
        </div>
        <div>
          <Lab>Publisher</Lab>
          <input type="text" value={publisher} onChange={(e) => setPublisher(e.target.value)} disabled={saving} />
        </div>
      </div>
      <div>
        <Lab>Description</Lab>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} disabled={saving} />
      </div>
      <div className="flex items-center gap-2 pt-1">
        {dirty && (
          <button onClick={save} disabled={saving} className="px-3.5 py-2 text-[12px] font-semibold rounded-lg bg-forest-700 text-white hover:bg-forest-900 disabled:opacity-50 inline-flex items-center gap-1.5">
            <Save size={13} /> {saving ? 'Sauvegarde…' : 'Sauvegarder'}
          </button>
        )}
        {framework.was_ai_generated && (
          <button onClick={dismissAiBadge} className="px-3.5 py-2 text-[12px] font-semibold rounded-lg bg-gold-500 text-forest-900 hover:bg-gold-600 inline-flex items-center gap-1.5">
            ✓ Marquer comme publié (retirer le badge IA)
          </button>
        )}
        <div className="ml-auto">
          <button
            onClick={toggleActive}
            className={`px-3.5 py-2 text-[12px] font-semibold rounded-lg ${framework.is_active ? 'bg-white border border-gray-200 text-gray-700 hover:bg-red-50 hover:border-red-200 hover:text-red-700' : 'bg-green-50 border border-green-200 text-green-700 hover:bg-green-100'}`}
          >
            {framework.is_active ? 'Désactiver le référentiel' : 'Réactiver'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Domain editor (accordion + reorder + add control) ─────────────────────

function DomainEditor({ domain, onChanged, toast, allDomainIds, currentIndex }: {
  domain: AdminDomain; isFirst: boolean; isLast: boolean; onChanged: () => void; toast: ReturnType<typeof useToast>; allDomainIds: string[]; currentIndex: number
}) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [code, setCode] = useState(domain.code)
  const [name, setName] = useState(domain.name)
  const [description, setDescription] = useState(domain.description ?? '')

  const saveDomain = async () => {
    const { data, error } = await supabase.functions.invoke('admin-framework', {
      body: { action: 'update_domain', id: domain.id, code, name, description },
    })
    if (error || data?.error) { toast.error('Sauvegarde impossible'); return }
    setEditing(false)
    toast.success('Domaine mis à jour')
    onChanged()
  }

  const deleteDomain = async () => {
    if (!confirm(`Supprimer le domaine "${domain.name}" et ses ${domain.controls.length} contrôle(s) ?`)) return
    const reason = prompt('Motif (obligatoire) :') ?? ''
    if (!reason.trim()) return
    const { data, error } = await supabase.functions.invoke('admin-framework', {
      body: { action: 'delete_domain', id: domain.id, reason },
    })
    if (error) { toast.error('Suppression impossible', error); return }
    if (data?.error) { toast.error(data.error); return }
    toast.success('Domaine supprimé')
    onChanged()
  }

  const move = async (direction: 'up' | 'down') => {
    const newIds = [...allDomainIds]
    const swapWith = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (swapWith < 0 || swapWith >= newIds.length) return
    ;[newIds[currentIndex], newIds[swapWith]] = [newIds[swapWith], newIds[currentIndex]]
    await supabase.functions.invoke('admin-framework', { body: { action: 'reorder_domains', ordered_ids: newIds } })
    onChanged()
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-xl overflow-hidden ${!domain.is_active ? 'opacity-60' : ''}`}>
      <header className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
        <button onClick={() => setOpen((v) => !v)} className="text-gray-400 hover:text-gray-700 flex-shrink-0">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {editing ? (
          <div className="flex-1 grid grid-cols-[100px_1fr] gap-2">
            <input type="text" value={code} onChange={(e) => setCode(e.target.value)} className="font-mono text-[12px]" />
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        ) : (
          <div className="flex-1">
            <span className="font-mono text-[11.5px] text-forest-700 font-bold">{domain.code}</span>
            <span className="ml-2 font-semibold text-gray-900 text-[13px]">{domain.name}</span>
            <span className="ml-2 text-[11px] text-gray-300">{domain.controls.length} contrôle(s)</span>
            {!domain.is_active && <span className="ml-2 text-[10px] uppercase font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Désactivé</span>}
          </div>
        )}
        <div className="flex items-center gap-1">
          <button onClick={() => move('up')} disabled={currentIndex === 0} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"><ChevronUp size={14} /></button>
          <button onClick={() => move('down')} disabled={currentIndex === allDomainIds.length - 1} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"><ChevronDown size={14} /></button>
          {editing ? (
            <>
              <button onClick={saveDomain} className="text-[11.5px] text-forest-700 font-semibold px-2">Enregistrer</button>
              <button onClick={() => { setEditing(false); setCode(domain.code); setName(domain.name); setDescription(domain.description ?? '') }} className="text-[11.5px] text-gray-400 px-2">Annuler</button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="text-[11.5px] text-gray-500 hover:text-gray-700 font-semibold px-2">Éditer</button>
              <button onClick={deleteDomain} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={13} /></button>
            </>
          )}
        </div>
      </header>

      {editing && (
        <div className="px-4 py-3 border-b border-gray-100">
          <Lab>Description du domaine</Lab>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>
      )}

      {open && (
        <div className="px-4 py-3 space-y-2">
          {domain.controls.length === 0 ? (
            <p className="text-[12px] text-gray-300 text-center py-3">Aucun contrôle.</p>
          ) : (
            domain.controls.map((c, i) => (
              <ControlEditor
                key={c.id}
                control={c}
                onChanged={onChanged}
                toast={toast}
                allControlIds={domain.controls.map((cc) => cc.id)}
                currentIndex={i}
              />
            ))
          )}
          <AddControlButton domainId={domain.id} onCreated={onChanged} toast={toast} />
        </div>
      )}
    </div>
  )
}

// ── Control editor ──────────────────────────────────────────────────────

function ControlEditor({ control, onChanged, toast, allControlIds, currentIndex }: {
  control: AdminControl; onChanged: () => void; toast: ReturnType<typeof useToast>; allControlIds: string[]; currentIndex: number
}) {
  const [editing, setEditing] = useState(false)
  const [code, setCode] = useState(control.code)
  const [name, setName] = useState(control.name)
  const [description, setDescription] = useState(control.description ?? '')
  const [guidance, setGuidance] = useState(control.guidance ?? '')

  const save = async () => {
    const { data, error } = await supabase.functions.invoke('admin-framework', {
      body: { action: 'update_control', id: control.id, code, name, description, guidance },
    })
    if (error || data?.error) { toast.error('Sauvegarde impossible'); return }
    setEditing(false)
    toast.success('Contrôle mis à jour')
    onChanged()
  }

  const remove = async () => {
    if (!confirm(`Supprimer le contrôle "${control.code} — ${control.name}" ?`)) return
    const reason = prompt('Motif (obligatoire) :') ?? ''
    if (!reason.trim()) return
    const { data, error } = await supabase.functions.invoke('admin-framework', {
      body: { action: 'delete_control', id: control.id, reason },
    })
    if (error) { toast.error('Suppression impossible', error); return }
    if (data?.error) { toast.error(data.error); return }
    toast.success('Contrôle supprimé')
    onChanged()
  }

  const move = async (direction: 'up' | 'down') => {
    const newIds = [...allControlIds]
    const swapWith = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (swapWith < 0 || swapWith >= newIds.length) return
    ;[newIds[currentIndex], newIds[swapWith]] = [newIds[swapWith], newIds[currentIndex]]
    await supabase.functions.invoke('admin-framework', { body: { action: 'reorder_controls', ordered_ids: newIds } })
    onChanged()
  }

  if (editing) {
    return (
      <div className="bg-page-bg border border-gray-200 rounded-lg p-3 space-y-2">
        <div className="grid grid-cols-[120px_1fr] gap-2">
          <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="A.5.1" className="font-mono" />
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du contrôle" />
        </div>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Description" />
        <textarea value={guidance} onChange={(e) => setGuidance(e.target.value)} rows={2} placeholder="Guidance / conseils de mise en œuvre" />
        <div className="flex justify-end gap-2">
          <button onClick={() => { setEditing(false); setCode(control.code); setName(control.name); setDescription(control.description ?? ''); setGuidance(control.guidance ?? '') }} className="text-[12px] text-gray-500 px-3 py-1.5">Annuler</button>
          <button onClick={save} className="text-[12px] bg-forest-700 text-white rounded-lg px-3 py-1.5 hover:bg-forest-900">Enregistrer</button>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex items-start gap-2 px-3 py-2 border border-gray-100 rounded-lg hover:bg-page-bg ${!control.is_active ? 'opacity-60' : ''}`}>
      <div className="flex-shrink-0 flex flex-col gap-0.5 -mt-0.5">
        <button onClick={() => move('up')} disabled={currentIndex === 0} className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30"><ChevronUp size={11} /></button>
        <button onClick={() => move('down')} disabled={currentIndex === allControlIds.length - 1} className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30"><ChevronDown size={11} /></button>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[11px] text-forest-700 font-bold">{control.code}</span>
          <span className="text-[12.5px] font-semibold text-gray-900">{control.name}</span>
        </div>
        {control.description && <p className="text-[11.5px] text-gray-500 mt-0.5">{control.description}</p>}
        {control.guidance && <p className="text-[11px] text-gray-400 mt-0.5 italic">↳ {control.guidance}</p>}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={() => setEditing(true)} className="text-[11px] text-gray-500 font-semibold hover:text-gray-700 px-2">Éditer</button>
        <button onClick={remove} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={12} /></button>
      </div>
    </div>
  )
}

// ── Add buttons ───────────────────────────────────────────────────────────

function AddDomainButton({ frameworkId, onCreated, toast }: { frameworkId: string; onCreated: () => void; toast: ReturnType<typeof useToast> }) {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    setSubmitting(true)
    const { data, error } = await supabase.functions.invoke('admin-framework', {
      body: { action: 'create_domain', framework_id: frameworkId, code, name },
    })
    setSubmitting(false)
    if (error || data?.error) { toast.error(data?.error ?? 'Création impossible'); return }
    toast.success('Domaine ajouté')
    setCode(''); setName(''); setOpen(false); onCreated()
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-forest-700 text-white rounded-lg text-[12px] font-semibold hover:bg-forest-900">
        <Plus size={13} /> Ajouter un domaine
      </button>
    )
  }
  return (
    <div className="flex items-center gap-2 bg-white border border-forest-300 rounded-lg p-2">
      <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="A.5" className="font-mono w-20" disabled={submitting} />
      <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du domaine" className="flex-1" disabled={submitting} />
      <button onClick={submit} disabled={!code || !name || submitting} className="text-[11.5px] bg-forest-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-50">{submitting ? '…' : 'Ajouter'}</button>
      <button onClick={() => { setOpen(false); setCode(''); setName('') }} className="text-[11.5px] text-gray-500 px-2">Annuler</button>
    </div>
  )
}

function AddControlButton({ domainId, onCreated, toast }: { domainId: string; onCreated: () => void; toast: ReturnType<typeof useToast> }) {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    setSubmitting(true)
    const { data, error } = await supabase.functions.invoke('admin-framework', {
      body: { action: 'create_control', domain_id: domainId, code, name },
    })
    setSubmitting(false)
    if (error || data?.error) { toast.error(data?.error ?? 'Création impossible'); return }
    setCode(''); setName(''); setOpen(false); onCreated()
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-[11.5px] text-forest-700 font-semibold hover:text-forest-900 inline-flex items-center gap-1 mt-1">
        <Plus size={11} /> Ajouter un contrôle
      </button>
    )
  }
  return (
    <div className="flex items-center gap-2 bg-page-bg border border-gray-200 rounded-lg p-2">
      <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="A.5.1" className="font-mono w-24" disabled={submitting} />
      <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du contrôle" className="flex-1" disabled={submitting} />
      <button onClick={submit} disabled={!code || !name || submitting} className="text-[11.5px] bg-forest-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-50">{submitting ? '…' : 'Ajouter'}</button>
      <button onClick={() => { setOpen(false); setCode(''); setName('') }} className="text-[11.5px] text-gray-500 px-2">Annuler</button>
    </div>
  )
}

function Lab({ children }: { children: React.ReactNode }) {
  return <label className="block text-[10.5px] uppercase tracking-wider text-gray-500 font-semibold mb-1">{children}</label>
}
