import type { SurfaceOverride } from '../../branding/surface'

const OPTS: { value: SurfaceOverride; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'light', label: 'Clair' },
  { value: 'dark', label: 'Sombre' },
]
const SCREENS: { key: 'login' | 'hub' | 'portal'; label: string }[] = [
  { key: 'login', label: 'Connexion' },
  { key: 'hub', label: 'Hub' },
  { key: 'portal', label: 'Portail client' },
]

interface Props {
  login: SurfaceOverride
  hub: SurfaceOverride
  portal: SurfaceOverride
  onChange: (screen: 'login' | 'hub' | 'portal', value: SurfaceOverride) => void
}

// Section admin : polarité surchargeable par écran. Les couleurs restent globales.
export function PerScreenSurface({ login, hub, portal, onChange }: Props): JSX.Element {
  const valueOf = (k: 'login' | 'hub' | 'portal'): SurfaceOverride => (k === 'login' ? login : k === 'hub' ? hub : portal)
  return (
    <div className="col-span-2">
      <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">Polarité par écran</label>
      <div className="space-y-1.5">
        {SCREENS.map((s) => (
          <div key={s.key} className="flex items-center gap-3">
            <span className="w-28 text-[12px] text-gray-600">{s.label}</span>
            <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
              {OPTS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => onChange(s.key, o.value)}
                  className={`px-3 py-1 text-[11.5px] font-semibold ${valueOf(s.key) === o.value ? 'bg-forest-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-gray-400 mt-1.5">Auto = polarité globale ci-dessus. Surcharge par écran si besoin (ex : connexion claire pour un logo foncé, hub sombre).</p>
    </div>
  )
}
