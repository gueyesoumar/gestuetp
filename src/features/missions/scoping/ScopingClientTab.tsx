import { Badge } from '../../../components/ui/Badge'
import { ScopingClientContext } from './ScopingClientContext'
import type { CabinetClient, AuditHistoryEntry } from '../../../types/database.types'

interface ScopingClientTabProps {
  client: CabinetClient | null
  auditHistory: AuditHistoryEntry[]
}

export function ScopingClientTab({ client, auditHistory }: ScopingClientTabProps) {
  if (!client) return <p className="p-4 text-sm text-gray-400">Aucune fiche client rattach&eacute;e.</p>

  return (
    <div className="flex-1 overflow-y-auto py-4">
      {/* Identity card */}
      <div className="bg-white border border-gray-200 rounded-xl mx-4 mb-3 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-bold text-gray-900">&#127970; {client.client_name}</h3>
          {client.client_sector && <Badge label={client.client_sector} variant="blue" />}
        </div>
        <div className="grid grid-cols-2">
          <Field label="Secteur" value={client.client_sector} />
          <Field label="Effectif" value={client.effectifs} />
          <Field label="Chiffre d&rsquo;affaires" value={client.chiffre_affaires} />
          <Field label="Pays" value={client.client_country ?? 'S\u00e9n\u00e9gal'} />
          <Field label="Adresse" value={[client.client_address, client.client_city].filter(Boolean).join(', ') || null} />
          <Field label="Contact principal" value={client.parties_interessees.find((p) => p.type === 'interne')?.nom ?? null} />
        </div>
      </div>

      {/* Regulatory environment */}
      {client.exigences_reglementaires.length > 0 && (
        <ScopingClientContext
          icon="&#9878;"
          title="Environnement r&eacute;glementaire"
          description="Cadres r&eacute;glementaires applicables au client."
          tags={client.exigences_reglementaires.map((e) => ({ label: e.nom, variant: 'reg' as const }))}
        />
      )}

      {/* IT environment */}
      <ScopingClientContext
        icon="&#128187;"
        title="Environnement SI"
        description={client.it_environment ?? 'Non renseign\u00e9. Compl\u00e9tez la fiche client pour enrichir cette section.'}
        tags={(client.it_systems ?? []).map((s) => ({ label: s }))}
      />

      {/* Audit history */}
      {auditHistory.length > 0 && (
        <ScopingClientContext icon="&#128203;" title="Historique des audits">
          <div className="px-4 pb-3 space-y-2">
            {auditHistory.map((h) => (
              <div key={h.id} className="flex items-center gap-2">
                <Badge label={String(h.year)} variant={h.score && h.score >= 70 ? 'green' : 'gray'} />
                <span className="text-xs text-gray-700 flex-1">
                  {h.framework_name}
                  {h.score !== null && <> &mdash; Score {h.score}%</>}
                  {h.findings_count !== null && <> &mdash; {h.findings_count} NC</>}
                </span>
              </div>
            ))}
          </div>
        </ScopingClientContext>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="px-4 py-2.5 border-b border-gray-50 border-r border-r-gray-50 last:border-r-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">{label}</p>
      <p className="text-[13px] text-gray-900">{value || '\u2014'}</p>
    </div>
  )
}
