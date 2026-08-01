import { ClipboardCheck, RefreshCw } from 'lucide-react'
import type { MissionKind } from '../../../types/database.types'

interface MissionEngagementStepProps {
  kind: MissionKind
  onChange: (kind: MissionKind) => void
  /** Vrai si l'organisation est un groupe (a le type "group") */
  groupAvailable: boolean
}

export function MissionEngagementStep({ kind, onChange, groupAvailable }: MissionEngagementStepProps): JSX.Element {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-gray-900">Type d&apos;engagement</h3>
        <p className="text-[13px] text-gray-500 mt-0.5">
          Ce choix configure le cycle de vie, les livrables attendus et la facturation.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card
          active={kind === 'audit'}
          onClick={() => onChange('audit')}
          icon={<ClipboardCheck size={20} />}
          accent="forest"
          title="Audit ponctuel"
          subtitle="Cabinet → Client externe"
          description="Cycle classique d'audit avec rapport signé et clôture. Pour une prestation contractuelle facturée à un client tiers."
          features={[
            "Cycle 6 phases : Cadrage → Travaux → Validation client → Clôture",
            'Livrable : rapport PDF signé',
            'Validation client requise',
            'Mission archivée à la clôture',
          ]}
          example="Audit ISO 27001 annuel, audit blanc, mission de conseil ponctuelle."
        />

        <Card
          active={kind === 'continuous_supervision'}
          onClick={() => onChange('continuous_supervision')}
          disabled={!groupAvailable}
          icon={<RefreshCw size={20} />}
          accent="gold"
          title="Supervision continue"
          subtitle="Groupe → Filiale interne"
          badge={groupAvailable ? 'Module Groupe' : 'Réservé aux groupes'}
          description="Suivi continu de conformité d'une filiale, organisé en cycles trimestriels. Pas de clôture définitive — la supervision se prolonge année après année."
          features={[
            'Cycles trimestriels (Q1, Q2, Q3, Q4) renouvelés en continu',
            'Pas de validation client (supervision interne)',
            "Plans d'action transverses persistants",
            'Dashboard temps réel avec KPI consolidés',
          ]}
          example="Supervision permanente d'une filiale bancaire, suivi continu PSSI-ES sur un établissement de santé."
        />
      </div>

      {!groupAvailable && (
        <p className="text-xs text-gray-400 italic">
          Le mode &laquo;&nbsp;Supervision continue&nbsp;&raquo; est r&eacute;serv&eacute; aux organisations de type groupe. Contactez votre administrateur si vous pensez devoir y avoir acc&egrave;s.
        </p>
      )}
    </div>
  )
}

interface CardProps {
  active: boolean
  disabled?: boolean
  onClick: () => void
  icon: JSX.Element
  accent: 'forest' | 'gold'
  title: string
  subtitle: string
  badge?: string
  description: string
  features: string[]
  example: string
}

function Card({ active, disabled, onClick, icon, accent, title, subtitle, badge, description, features, example }: CardProps): JSX.Element {
  const accentBg = accent === 'gold' ? 'bg-amber-50 text-amber-700' : 'bg-forest-50 text-forest-700'
  const ring = active
    ? (accent === 'gold' ? 'border-amber-500 bg-amber-50/40' : 'border-forest-700 bg-forest-50/40')
    : 'border-gray-200'
  const featureIcon = accent === 'gold' ? '↻' : '✓'
  const featureColor = accent === 'gold' ? 'text-amber-700' : 'text-forest-500'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`text-left border-2 rounded-xl p-5 transition-all ${ring} ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md cursor-pointer'
      }`}
    >
      {badge && (
        <span className={`inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded mb-2 ${
          accent === 'gold' ? 'bg-amber-500 text-white' : 'bg-forest-700 text-white'
        }`}>
          {badge}
        </span>
      )}
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${accentBg}`}>
          {icon}
        </div>
        <div>
          <p className="font-bold text-gray-900">{title}</p>
          <p className="text-[11px] text-gray-500">{subtitle}</p>
        </div>
      </div>
      <p className="text-[13px] text-gray-700 mb-3">{description}</p>
      <ul className="text-xs text-gray-600 space-y-1.5 mb-3">
        {features.map((f, i) => (
          <li key={i} className="flex gap-2">
            <span className={`shrink-0 ${featureColor}`}>{featureIcon}</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-gray-400">{example}</p>
    </button>
  )
}
