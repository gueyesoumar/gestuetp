import { useState } from 'react'
import { ShieldAlert, ShieldCheck, Shield, EyeOff } from 'lucide-react'

type Sensitivity = 'faible' | 'moyenne' | 'elevee' | 'non_inspecte' | null

interface Counts {
  pii?: number | null
  financial?: number | null
  secret?: number | null
}

interface SensitivityBadgeProps {
  level: Sensitivity
  counts?: Counts
  /** Détail par catégorie (comptes only) — RFC 0012 P2. */
  categories?: Record<string, number> | null
}

const STYLES: Record<Exclude<Sensitivity, null>, { label: string; cls: string; Icon: typeof Shield }> = {
  elevee: { label: 'Sensibilité élevée', cls: 'bg-red-50 text-red-700 border-red-200', Icon: ShieldAlert },
  moyenne: { label: 'Sensibilité moyenne', cls: 'bg-amber-50 text-amber-700 border-amber-200', Icon: Shield },
  faible: { label: 'Sensibilité faible', cls: 'bg-forest-50 text-forest-700 border-forest-200', Icon: ShieldCheck },
  non_inspecte: { label: 'Non inspecté', cls: 'bg-gray-50 text-gray-500 border-gray-200', Icon: EyeOff },
}

const CATEGORY_LABELS: Record<string, string> = {
  email: 'Emails', phone_sn: 'Téléphones', ip: 'Adresses IP', ninea: 'NINEA', cni_nin_sn: 'CNI / NIN',
  iban: 'IBAN', card: 'Cartes bancaires', private_key: 'Clés privées', api_key: 'Clés API',
  secret_assignment: 'Secrets / mots de passe',
}

/** Pastille de sensibilité IA (détection déterministe). Cliquable → raison du classement. */
export function SensitivityBadge({ level, counts, categories }: SensitivityBadgeProps): JSX.Element | null {
  const [open, setOpen] = useState(false)
  if (!level) return null
  const s = STYLES[level]
  const secret = counts?.secret ?? 0
  const financial = counts?.financial ?? 0
  const pii = counts?.pii ?? 0
  const score = Math.min(100, secret * 40 + financial * 10 + pii * 3)

  const why = level === 'non_inspecte'
    ? 'Contenu non analysable côté serveur (image, ou PDF illisible).'
    : secret > 0
      ? 'Niveau élevé : au moins un secret a été détecté (blocage systématique).'
      : level === 'elevee'
        ? `Niveau élevé : score ${score} (seuil 60).`
        : level === 'moyenne'
          ? `Niveau moyen : score ${score} (seuil 25).`
          : 'Niveau faible : peu ou pas de données sensibles détectées.'

  // Détail par catégorie si disponible, sinon repli sur les comptes par groupe.
  const catEntries = Object.entries(categories ?? {}).filter(([, n]) => n > 0)
  const groupEntries: [string, number][] = [
    ['Données personnelles', pii], ['Données financières', financial], ['Secrets', secret],
  ].filter(([, n]) => (n as number) > 0) as [string, number][]

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${s.cls}`}
        title="Voir la raison du classement"
      >
        <s.Icon size={12} /> {s.label}
      </button>

      {open && (
        <>
          <span className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-lg border border-gray-200 bg-white p-3 text-left shadow-lg">
            <p className="text-[12px] font-semibold text-gray-900">{s.label}</p>
            <p className="mt-1 text-[11px] text-gray-500">{why}</p>

            {level !== 'non_inspecte' && (
              <div className="mt-2 border-t border-gray-100 pt-2">
                {catEntries.length > 0 ? (
                  <ul className="space-y-0.5">
                    {catEntries.map(([cat, n]) => (
                      <li key={cat} className="flex justify-between text-[11px] text-gray-700">
                        <span>{CATEGORY_LABELS[cat] ?? cat}</span>
                        <span className="font-semibold tabular-nums">{n}</span>
                      </li>
                    ))}
                  </ul>
                ) : groupEntries.length > 0 ? (
                  <ul className="space-y-0.5">
                    {groupEntries.map(([label, n]) => (
                      <li key={label} className="flex justify-between text-[11px] text-gray-700">
                        <span>{label}</span>
                        <span className="font-semibold tabular-nums">{n}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-gray-400">Aucune donnée sensible détectée.</p>
                )}
                <p className="mt-2 text-[10px] text-gray-400">
                  Comptes uniquement — aucune valeur n&rsquo;est conservée.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </span>
  )
}
