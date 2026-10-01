import { ShieldAlert, ShieldCheck, Shield, EyeOff } from 'lucide-react'

type Sensitivity = 'faible' | 'moyenne' | 'elevee' | 'non_inspecte' | null

interface Counts {
  pii?: number | null
  financial?: number | null
  secret?: number | null
}

/**
 * Pastille de sensibilité IA (détection déterministe, P1). Affiche le niveau calculé
 * avant tout envoi au modèle. Observe-only : purement informatif.
 */
const STYLES: Record<Exclude<Sensitivity, null>, { label: string; cls: string; Icon: typeof Shield }> = {
  elevee: { label: 'Sensibilité élevée', cls: 'bg-red-50 text-red-700 border-red-200', Icon: ShieldAlert },
  moyenne: { label: 'Sensibilité moyenne', cls: 'bg-amber-50 text-amber-700 border-amber-200', Icon: Shield },
  faible: { label: 'Sensibilité faible', cls: 'bg-forest-50 text-forest-700 border-forest-200', Icon: ShieldCheck },
  non_inspecte: { label: 'Non inspecté', cls: 'bg-gray-50 text-gray-500 border-gray-200', Icon: EyeOff },
}

export function SensitivityBadge({ level, counts }: { level: Sensitivity; counts?: Counts }): JSX.Element | null {
  if (!level) return null
  const s = STYLES[level]
  const detail = level === 'non_inspecte'
    ? 'Contenu PDF/image non analysable côté serveur'
    : [
        counts?.pii ? `${counts.pii} PII` : null,
        counts?.financial ? `${counts.financial} financier` : null,
        counts?.secret ? `${counts.secret} secret` : null,
      ].filter(Boolean).join(' · ') || 'Aucune donnée sensible détectée'
  return (
    <span
      title={`${s.label} — ${detail}`}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${s.cls}`}
    >
      <s.Icon size={12} /> {s.label}
    </span>
  )
}
