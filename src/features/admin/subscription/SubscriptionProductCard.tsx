import type { Product, ProductFeature, OrgSubscriptionStateEntry } from '../../../types/database.types'
import type { SubscriptionAction } from './useOrgSubscription'

const STATUS: Record<string, { label: string; cls: string }> = {
  active: { label: 'Actif', cls: 'bg-green-50 text-green-700' },
  trial: { label: 'Essai', cls: 'bg-amber-50 text-amber-700' },
  suspended: { label: 'Suspendu', cls: 'bg-red-50 text-red-600' },
}

interface Props {
  product: Product
  features: ProductFeature[]
  entry: OrgSubscriptionStateEntry | undefined
  isHome: boolean
  busy: boolean
  onAct: (a: SubscriptionAction) => void
  format: (xof: number) => string
}

export function SubscriptionProductCard({ product, features, entry, isHome, busy, onAct, format }: Props): JSX.Element {
  const p = product.key
  const abbr = product.name.slice(0, 2)
  const on = Boolean(entry)
  const suspended = entry?.status === 'suspended'

  return (
    <div className={`rounded-xl border border-gray-200 bg-white overflow-hidden ${!product.is_published ? 'opacity-60' : ''} ${suspended ? 'bg-gray-50' : ''}`}>
      <div className="flex items-center gap-3 p-4">
        <div className="w-9 h-9 rounded-lg grid place-items-center text-white text-[13px] font-extrabold shrink-0" style={{ background: product.accent_color }}>{abbr}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-bold text-gray-900">{product.name}</span>
            {product.is_home_eligible && on && (
              <button type="button" disabled={busy} onClick={() => onAct({ action: 'set_home', product_key: p })}
                className={`text-[9px] font-bold uppercase tracking-wide rounded-full px-1.5 py-0.5 border ${isHome ? 'bg-gold-500 text-white border-transparent' : 'text-gold-600 border-gold-200'}`}>
                &#9733; Accueil
              </button>
            )}
          </div>
          <div className="text-[11px] text-gray-500">{product.title}</div>
        </div>
        {!product.is_published
          ? <span className="text-[10px] font-bold uppercase rounded-full px-2 py-0.5 bg-gray-100 text-gray-500">Bient&ocirc;t</span>
          : entry
            ? <span className={`text-[10px] font-bold uppercase rounded-full px-2 py-0.5 ${STATUS[entry.status].cls}`}>{STATUS[entry.status].label}</span>
            : <span className="text-[10px] font-bold uppercase rounded-full px-2 py-0.5 bg-gray-100 text-gray-500">Non souscrit</span>}
      </div>

      {product.is_published && (
        <div className="flex items-center justify-end gap-2 px-4 pb-3">
          {!entry ? (
            <>
              <button type="button" disabled={busy} onClick={() => onAct({ action: 'subscribe', product_key: p })}
                className="text-[12px] font-semibold rounded-lg px-3 py-1.5 bg-forest-700 text-white hover:bg-forest-900 disabled:opacity-50">Souscrire</button>
              <button type="button" disabled={busy} onClick={() => onAct({ action: 'trial', product_key: p })}
                className="text-[12px] font-semibold rounded-lg px-3 py-1.5 border border-forest-300 text-forest-700 disabled:opacity-50">Essai</button>
            </>
          ) : (
            <>
              <select value={entry.status} disabled={busy}
                onChange={(e) => onAct({ action: 'set_status', product_key: p, status: e.target.value })}
                className="text-[12px] font-semibold border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700">
                <option value="active">Actif</option>
                <option value="trial">Essai</option>
                <option value="suspended">Suspendu</option>
              </select>
              <button type="button" disabled={busy} title="Retirer" onClick={() => onAct({ action: 'remove', product_key: p })}
                className="w-7 h-7 rounded-lg border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-600 disabled:opacity-50">&#10005;</button>
            </>
          )}
        </div>
      )}

      {on && features.length > 0 && (
        <div className="border-t border-gray-200 px-4 py-2">
          {features.map((f) => {
            const active = f.is_core || (entry?.features ?? []).includes(f.key)
            return (
              <label key={f.key} className="flex items-center gap-3 py-1.5 border-b border-dashed border-gray-100 last:border-0">
                <input type="checkbox" checked={active} disabled={busy || f.is_core}
                  onChange={(e) => onAct({ action: 'toggle_feature', product_key: p, feature_key: f.key, enabled: e.target.checked })}
                  className="w-4 h-4 accent-forest-700 disabled:opacity-50" />
                <span className="flex-1 text-[12.5px] text-gray-700">{f.label}</span>
                {f.is_core
                  ? <span className="text-[9.5px] font-mono uppercase text-gray-300">inclus</span>
                  : <span className="text-[11px] font-mono text-gray-500">+ {format(f.monthly_price)}</span>}
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}
