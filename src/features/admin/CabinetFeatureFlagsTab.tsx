import { useMemo, useState } from 'react'
import { Tag, Sparkles, Lock, ShoppingBag } from 'lucide-react'
import { useCabinetFeatureFlags, type CabinetFlag } from './useCabinetFeatureFlags'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { useToast } from '../../hooks/useToast'
import { FlagCard } from './cabinetFlags/FlagCard'
import { FlagActionModal, type FlagAction } from './cabinetFlags/FlagActionModal'

interface Props {
  cabinetId: string
}

export function CabinetFeatureFlagsTab({ cabinetId }: Props): JSX.Element {
  const { flags, plan, loading, error, setOverride, resetOverride } = useCabinetFeatureFlags(cabinetId)
  const [pending, setPending] = useState<{ flag: CabinetFlag; action: FlagAction } | null>(null)
  const toast = useToast()

  const grouped = useMemo(() => ({
    planIncluded: flags.filter((f) => f.state === 'plan_included'),
    overrides: flags.filter((f) => f.state === 'override_on' || f.state === 'override_off'),
    available: flags.filter((f) => f.state === 'available'),
    unavailable: flags.filter((f) => f.state === 'unavailable'),
  }), [flags])

  const totalActive = grouped.planIncluded.length + grouped.overrides.filter((f) => f.state === 'override_on').length
  const totalOff = grouped.overrides.filter((f) => f.state === 'override_off').length

  const handleConfirm = async (reason: string): Promise<boolean> => {
    if (!pending) return false
    let ok = false
    if (pending.action === 'reset') ok = await resetOverride(pending.flag.slug, reason)
    else ok = await setOverride(pending.flag.slug, pending.action === 'unlock', reason)
    if (ok) {
      const verb = pending.action === 'lock' ? 'désactivée' : pending.action === 'unlock' ? 'débloquée' : 'réinitialisée'
      toast.success(`Fonctionnalité ${verb}`, { description: pending.flag.name })
    } else {
      toast.error('Action impossible')
    }
    return ok
  }

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />

  return (
    <div className="space-y-5">
      <KpiStrip total={flags.length} active={totalActive} overrides={grouped.overrides.length} off={totalOff} available={grouped.available.length} />

      <Section
        icon={<Tag size={14} />}
        iconBg="bg-emerald-50 text-emerald-700"
        title={plan.name ? `Inclus dans le plan « ${plan.name} »` : 'Inclus dans le plan'}
        subtitle="Fonctionnalités actives par défaut grâce au plan du cabinet."
        emptyMessage={plan.name ? 'Aucune fonctionnalité incluse dans ce plan.' : 'Aucun plan associé à ce cabinet.'}
        flags={grouped.planIncluded}
        onAction={(flag, action) => setPending({ flag, action })}
      />

      <Section
        icon={<Sparkles size={14} />}
        iconBg="bg-gold-100 text-gold-700"
        title="Personnalisations"
        subtitle="Overrides spécifiques à ce cabinet (forcés ON ou OFF)."
        emptyMessage="Aucune personnalisation pour ce cabinet."
        flags={grouped.overrides}
        onAction={(flag, action) => setPending({ flag, action })}
      />

      <Section
        icon={<ShoppingBag size={14} />}
        iconBg="bg-blue-50 text-blue-700"
        title="Hors plan disponibles"
        subtitle="Fonctionnalités non incluses dans le plan, mais débloquables manuellement."
        emptyMessage="Aucune fonctionnalité hors plan disponible."
        flags={grouped.available}
        onAction={(flag, action) => setPending({ flag, action })}
      />

      {grouped.unavailable.length > 0 && (
        <Section
          icon={<Lock size={14} />}
          iconBg="bg-gray-100 text-gray-500"
          title="Indisponibles globalement"
          subtitle="Désactivées au niveau plateforme (kill switch). Aucune action possible côté cabinet."
          emptyMessage=""
          flags={grouped.unavailable}
          onAction={() => undefined}
          collapsibleByDefault
        />
      )}

      {pending && (
        <FlagActionModal
          flag={pending.flag}
          action={pending.action}
          onClose={() => setPending(null)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  )
}

interface SectionProps {
  icon: JSX.Element
  iconBg: string
  title: string
  subtitle: string
  emptyMessage: string
  flags: CabinetFlag[]
  onAction: (flag: CabinetFlag, action: FlagAction) => void
  collapsibleByDefault?: boolean
}

function Section({ icon, iconBg, title, subtitle, emptyMessage, flags, onAction, collapsibleByDefault }: SectionProps): JSX.Element {
  const [open, setOpen] = useState(!collapsibleByDefault)

  return (
    <section>
      <header className="flex items-center gap-2.5 mb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>{icon}</div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[14px] font-bold text-gray-900 flex items-center gap-2">
            {title}
            <span className="text-[11px] font-mono font-semibold text-gray-400">{flags.length}</span>
          </h2>
          <p className="text-[11.5px] text-gray-500">{subtitle}</p>
        </div>
        {collapsibleByDefault && (
          <button type="button" onClick={() => setOpen((o) => !o)} className="text-[11px] text-forest-700 font-semibold hover:text-forest-900">
            {open ? 'Masquer' : 'Afficher'}
          </button>
        )}
      </header>
      {open && (flags.length === 0 ? (
        emptyMessage && <p className="text-[12px] text-gray-400 italic px-1">{emptyMessage}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {flags.map((f) => <FlagCard key={f.flag_id} flag={f} onAction={(a) => onAction(f, a)} />)}
        </div>
      ))}
    </section>
  )
}

interface KpiStripProps { total: number; active: number; overrides: number; off: number; available: number }

function KpiStrip({ total, active, overrides, available }: KpiStripProps): JSX.Element {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Kpi label="Total" value={total} hint="fonctionnalités déployées" />
      <Kpi label="Actives ici" value={active} hint="utilisables aujourd'hui" accent="text-emerald-700" />
      <Kpi label="Personnalisées" value={overrides} hint="overrides spécifiques" accent="text-gold-700" />
      <Kpi label="Hors plan" value={available} hint="débloquables" accent="text-gray-700" />
    </div>
  )
}

function Kpi({ label, value, hint, accent }: { label: string; value: number; hint: string; accent?: string }): JSX.Element {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3.5">
      <p className="text-[10.5px] uppercase tracking-wider text-gray-500 font-bold mb-0.5">{label}</p>
      <p className={`text-[22px] font-extrabold ${accent ?? 'text-gray-900'}`}>{value}</p>
      <p className="text-[11px] text-gray-500">{hint}</p>
    </div>
  )
}
