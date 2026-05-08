import { Download, Trash2 } from 'lucide-react'
import { useCabinetHealth } from './useCabinetHealth'
import { CabinetKpiStrip } from './CabinetKpiStrip'
import { CabinetActivityCard } from './CabinetActivityCard'
import { CabinetConsumptionCard } from './CabinetConsumptionCard'
import { CabinetErrorsCard } from './CabinetErrorsCard'
import { CabinetConfigCard } from './CabinetConfigCard'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'
import { labelOrganizationType } from '../cabinetLabels'

interface OverviewCabinet {
  id: string
  name: string
  slug: string
  is_active: boolean
  created_at: string
  plan_name: string | null
  plan_price: number | null
  types: string[]
  members: { id: string }[]
  missions: { id: string }[]
}

interface CabinetOverviewTabProps {
  cabinet: OverviewCabinet
  onSuspend: () => void
  onReactivate: () => void
  onExport: () => void
  onDelete: () => void
  onEditTypes: () => void
}

export function CabinetOverviewTab(props: CabinetOverviewTabProps): JSX.Element {
  const { cabinet, onSuspend, onReactivate, onExport, onDelete, onEditTypes } = props
  const health = useCabinetHealth(cabinet.id)

  if (health.loading) return <LoadingSpinner />
  if (health.error) return <ErrorAlert message={health.error} />

  return (
    <div className="space-y-5">
      <CabinetKpiStrip health={health} />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
        <div className="space-y-4 min-w-0">
          <CabinetActivityCard data={health.activity} />
          <CabinetConsumptionCard data={health.consumption} />
          <CabinetErrorsCard data={health.errors} />
        </div>

        <div className="space-y-4">
          <IdentityCard cabinet={cabinet} onEditTypes={onEditTypes} />
          <CabinetConfigCard data={health.config} />
          <SensitiveZone
            isActive={cabinet.is_active}
            onSuspend={onSuspend}
            onReactivate={onReactivate}
            onExport={onExport}
            onDelete={onDelete}
          />
        </div>
      </div>
    </div>
  )
}

function IdentityCard({ cabinet, onEditTypes }: { cabinet: OverviewCabinet; onEditTypes: () => void }): JSX.Element {
  const planLabel = cabinet.plan_name
    ? `${cabinet.plan_name}${cabinet.plan_price && cabinet.plan_price > 0 ? ` · ${cabinet.plan_price} €/mois` : ''}`
    : '—'
  const onboarded = new Date(cabinet.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <header className="px-4 py-3 border-b border-gray-100">
        <span className="text-[12.5px] font-bold text-gray-900">Identité</span>
      </header>
      <div className="px-4 py-3">
        <dl className="space-y-2 text-[12px]">
          <Pair label="Nom" value={cabinet.name} />
          <Pair label="Slug" value={cabinet.slug} mono />
          <Pair label="Plan" value={planLabel} />
          <Pair label="Onboardé" value={onboarded} />
          <div className="flex justify-between items-center">
            <dt className="text-gray-500">Types</dt>
            <dd className="text-gray-900 flex items-center gap-1.5">
              <span>{labelOrganizationType(cabinet.types)}</span>
              {!cabinet.types.includes('platform') && (
                <button
                  type="button"
                  onClick={onEditTypes}
                  className="text-[10.5px] text-forest-700 font-semibold hover:text-forest-900"
                >
                  Modifier
                </button>
              )}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  )
}

function Pair({ label, value, mono }: { label: string; value: string; mono?: boolean }): JSX.Element {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-gray-500 shrink-0">{label}</dt>
      <dd className={`text-gray-900 text-right truncate ${mono ? 'font-mono text-[11.5px]' : ''}`}>{value}</dd>
    </div>
  )
}

function SensitiveZone({ isActive, onSuspend, onReactivate, onExport, onDelete }: {
  isActive: boolean; onSuspend: () => void; onReactivate: () => void; onExport: () => void; onDelete: () => void
}): JSX.Element {
  return (
    <section className="bg-red-50 border border-red-200 rounded-xl p-4">
      <h4 className="text-[11.5px] uppercase tracking-wider text-red-700 font-bold mb-1.5">Zone sensible</h4>
      <p className="text-[11px] text-red-700 leading-relaxed mb-3">
        Toute action est tracée dans l&apos;audit log avec le motif que vous saisirez.
      </p>
      <div className="flex flex-col gap-2">
        {isActive ? (
          <button type="button" onClick={onSuspend} className="px-3 py-2 border border-red-400 bg-white text-red-700 rounded-lg text-[12px] font-semibold hover:bg-red-50 text-left">
            Suspendre
          </button>
        ) : (
          <button type="button" onClick={onReactivate} className="px-3 py-2 border border-green-400 bg-white text-green-700 rounded-lg text-[12px] font-semibold hover:bg-green-50 text-left">
            Réactiver
          </button>
        )}
        <button type="button" onClick={onExport} className="px-3 py-2 border border-red-200 bg-white text-red-700 rounded-lg text-[12px] font-semibold hover:bg-red-50 inline-flex items-center gap-1.5">
          <Download size={12} /> Exporter CSV
        </button>
        <button type="button" onClick={onDelete} className="px-3 py-2 bg-red-600 text-white rounded-lg text-[12px] font-semibold hover:bg-red-700 inline-flex items-center gap-1.5">
          <Trash2 size={12} /> Supprimer définitivement
        </button>
      </div>
    </section>
  )
}

