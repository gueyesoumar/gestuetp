import { useState } from 'react'
import { X, FileText, ShieldCheck, ExternalLink, Plus, Trash2, Link2 } from 'lucide-react'
import { usePolicyDetail } from './usePolicyDetail'
import { usePolicyControls, type ControlOption, type LinkedControl } from './usePolicyControls'
import {
  POLICY_STATUS, POLICY_PROVENANCE, SCORE_DIMENSION_LABELS, SCORE_DIMENSION_COLORS,
} from '../../lib/constants'
import type { Policy } from '../../types/database.types'

const label = (arr: ReadonlyArray<{ value: string; label: string }>, v: string): string => arr.find((x) => x.value === v)?.label ?? v
const fmt = (iso: string | null): string => iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'

export function PolicyDetailDrawer({ policy, onClose, onChanged }: { policy: Policy; onClose: () => void; onChanged: () => void }): JSX.Element {
  const { versions, loading, signedUrl, approveVersion } = usePolicyDetail(policy.id)
  const links = usePolicyControls(policy.id)
  const current = versions.find((v) => v.id === policy.current_version_id) ?? versions[0] ?? null
  const dimColor = policy.dimension ? SCORE_DIMENSION_COLORS[policy.dimension] : '#94A3B8'
  const canApprove = current && !current.approved_at && (policy.status === 'draft' || policy.status === 'in_review' || policy.status === 'revision')

  const openFile = async (path: string): Promise<void> => {
    const url = await signedUrl(path)
    if (url) window.open(url, '_blank', 'noopener')
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex justify-end" onClick={onClose}>
      <div className="bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <div className="flex items-center gap-2"><FileText size={18} className="text-[#6D5AE6]" /><h3 className="font-semibold text-gray-900">{policy.title}</h3></div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-gray-100 text-gray-600">{label(POLICY_STATUS, policy.status)}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border border-gray-200 text-gray-500">{label(POLICY_PROVENANCE, policy.provenance)}</span>
            {policy.dimension && <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded" style={{ background: `${dimColor}22`, color: dimColor }}>{SCORE_DIMENSION_LABELS[policy.dimension]}</span>}
          </div>
          {policy.summary && <p className="text-[13px] text-gray-500">{policy.summary}</p>}

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-gray-400">
            <div>Approuvée : <span className="text-gray-600">{fmt(policy.approved_at)}</span></div>
            <div>Publiée : <span className="text-gray-600">{fmt(policy.published_at)}</span></div>
            <div>Prochaine revue : <span className="text-gray-600">{fmt(policy.next_review_at)}</span></div>
            <div>Révision : <span className="text-gray-600">tous les {policy.review_period_months} mois</span></div>
          </div>

          {/* Contenu de la version courante */}
          <div className="rounded-xl border border-gray-200 p-4">
            <div className="text-[10px] font-mono uppercase tracking-wide text-gray-400 mb-2">Version courante {current ? `· ${current.version_label}` : ''}</div>
            {loading ? <p className="text-[12px] text-gray-400">Chargement…</p>
              : !current ? <p className="text-[12px] text-gray-400">Aucune version.</p>
              : current.file_path ? (
                <button onClick={() => void openFile(current.file_path as string)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#6D5AE6] hover:brightness-110">
                  <ExternalLink size={15} /> Ouvrir le document importé
                </button>
              ) : (
                <div className="text-[13px] text-gray-700 whitespace-pre-wrap leading-relaxed font-serif" style={{ fontFamily: 'Iowan Old Style, Palatino, Georgia, serif' }}>{current.content || '(vide)'}</div>
              )}
            {canApprove && (
              <button onClick={() => void approveVersion(current.id).then(onChanged)}
                className="mt-4 inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold text-white bg-[#B8891F] rounded-lg hover:brightness-110">
                <ShieldCheck size={15} /> Approuver &amp; sceller cette version
              </button>
            )}
          </div>

          {/* Historique des versions */}
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wide text-gray-400 mb-2">Historique</div>
            <ul className="space-y-1.5">
              {versions.map((v) => (
                <li key={v.id} className="flex items-center gap-2 text-[12px] text-gray-500 font-mono">
                  <span className={v.approved_at ? 'text-[#B8891F]' : 'text-gray-300'}>{v.approved_at ? '⬤' : '○'}</span>
                  <span className="font-semibold text-gray-700">{v.version_label}</span>
                  <span>· {v.file_path ? 'document importé' : 'contenu rédigé'}</span>
                  {v.approved_at && <span className="ml-auto">scellée {fmt(v.approved_at)}</span>}
                </li>
              ))}
            </ul>
          </div>

          {/* Contrôles satisfaits (Policy-as-Evidence) */}
          <div>
            <div className="flex items-center gap-1.5 mb-2"><Link2 size={13} className="text-[#6D5AE6]" />
              <span className="text-[10px] font-mono uppercase tracking-wide text-gray-400">Contrôles satisfaits (preuve)</span></div>
            {links.controls.length === 0
              ? <p className="text-[12px] text-gray-400 mb-2">Aucun contrôle lié. Reliez les contrôles que cette politique prouve.</p>
              : (
                <div className="flex flex-wrap gap-2 mb-2">
                  {links.controls.map((c) => (
                    <span key={c.linkId} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px]">
                      <span className="font-mono font-semibold text-forest-800">{c.code}</span>
                      <button onClick={() => void links.unlink(c.linkId)} className="text-gray-400 hover:text-red-600"><Trash2 size={11} /></button>
                    </span>
                  ))}
                </div>
              )}
            <ControlLinker existing={links.controls} onSearch={links.search} onLink={links.link} />
            <p className="text-[10px] text-gray-400 mt-2 leading-snug">La politique apparaît comme <b>preuve candidate</b> sur ces contrôles (force graduée selon son statut). L&apos;auditeur reste maître de la conformité.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function ControlLinker({ existing, onSearch, onLink }: {
  existing: LinkedControl[]
  onSearch: (q: string) => Promise<ControlOption[]>
  onLink: (id: string) => Promise<void>
}): JSX.Element {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<ControlOption[]>([])
  const linked = new Set(existing.map((c) => c.control_id))
  const run = async (v: string): Promise<void> => { setQ(v); setResults(await onSearch(v)) }
  return (
    <div className="rounded-lg border border-gray-200 p-2.5">
      <input value={q} onChange={(e) => void run(e.target.value)} placeholder="Rechercher un contrôle (code ou nom)…"
        className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded-lg focus:border-[#6D5AE6] focus:ring-1 focus:ring-[#6D5AE6]" />
      {results.length > 0 && (
        <ul className="mt-2 max-h-40 overflow-y-auto divide-y divide-gray-50">
          {results.map((c) => (
            <li key={c.id} className="flex items-center gap-2 py-1.5 text-[12px]">
              <span className="font-mono font-semibold text-forest-800 min-w-[54px]">{c.code}</span>
              <span className="flex-1 truncate text-gray-600">{c.name}</span>
              {linked.has(c.id)
                ? <span className="text-[10px] text-gray-400">lié</span>
                : <button onClick={() => { void onLink(c.id); setQ(''); setResults([]) }} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6D5AE6] hover:brightness-110"><Plus size={12} /> Lier</button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
