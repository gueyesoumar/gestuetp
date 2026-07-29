import type { HubPerspective } from './useHubPerspectives'

const LABELS: Record<HubPerspective, string> = {
  self: 'Mon organisation',
  clients: 'Portefeuille clients',
  group: 'Groupe / filiales',
}

// Bascule de perspective. N'affiche que les perspectives réellement présentes
// dans le graphe (rendu masqué s'il n'y en a qu'une).
export function PerspectiveToggle({
  perspectives, value, onChange,
}: {
  perspectives: HubPerspective[]
  value: HubPerspective
  onChange: (p: HubPerspective) => void
}): JSX.Element | null {
  if (perspectives.length < 2) return null
  return (
    <div className="inline-flex rounded-full border border-white/12 bg-white/[0.05] p-1 gap-1">
      {perspectives.map((p) => {
        const active = p === value
        return (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={`rounded-full px-4 py-1.5 text-[12.5px] font-semibold transition-colors ${
              active ? 'text-white' : 'text-white/55 hover:text-white/80'
            }`}
            style={active ? { backgroundColor: 'rgba(212,168,67,0.18)', boxShadow: 'inset 0 0 0 1px rgba(212,168,67,0.35)' } : undefined}
          >
            {LABELS[p]}
          </button>
        )
      })}
    </div>
  )
}
