interface PlanLimitsTabProps {
  maxUsers: string
  setMaxUsers: (v: string) => void
  maxMissions: string
  setMaxMissions: (v: string) => void
  disabled?: boolean
}

export function PlanLimitsTab({ maxUsers, setMaxUsers, maxMissions, setMaxMissions, disabled }: PlanLimitsTabProps): JSX.Element {
  return (
    <div className="px-6 py-5 space-y-4">
      <p className="text-[12px] text-gray-500 leading-relaxed">
        Définit les quotas appliqués aux cabinets sur ce plan. Laisser vide pour aucune limite (∞).
      </p>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Max utilisateurs">
          <input
            type="number" min="1" value={maxUsers} onChange={(e) => setMaxUsers(e.target.value)}
            placeholder="∞" disabled={disabled}
            className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-300"
          />
          <Hint>Nombre maximum d&apos;utilisateurs actifs</Hint>
        </Field>
        <Field label="Max missions actives">
          <input
            type="number" min="1" value={maxMissions} onChange={(e) => setMaxMissions(e.target.value)}
            placeholder="∞" disabled={disabled}
            className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-300"
          />
          <Hint>Nombre maximum de missions ouvertes simultanément</Hint>
        </Field>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <p className="text-[11px] text-gray-600 leading-relaxed">
          ℹ️ L&apos;application des quotas côté backend reste à implémenter côté Edge Functions et triggers.
          Cette configuration sert à documenter l&apos;offre commerciale et préparer la mise en application.
        </p>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function Hint({ children }: { children: React.ReactNode }): JSX.Element {
  return <p className="text-[10.5px] text-gray-400 mt-1">{children}</p>
}
