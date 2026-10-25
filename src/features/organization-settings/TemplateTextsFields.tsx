import type { SectionCatalogEntry } from '../reports/report-kit/catalog'
import { getSampleBody } from '../reports/sampleBodies'

const GLOBALS: { key: string; label: string; def: string }[] = [
  { key: 'cover.eyebrow', label: 'Couverture - en-tête', def: 'RAPPORT D’AUDIT' },
  { key: 'cover.confidentiality', label: 'Couverture - mention de confidentialité', def: 'Confidentiel - Diffusion restreinte' },
  { key: 'letter.closing', label: 'Lettre - formule de clôture', def: 'L’équipe d’audit' },
]

const inp = 'w-full px-2.5 py-1.5 text-[12px] border border-gray-200 rounded-md focus:border-forest-700 focus:ring-1 focus:ring-forest-700'

/** Surcharges de libellés et de corps d'un template (B1 / B1.2). Placeholder = défaut ;
 *  un champ vide = on garde le défaut (ou le texte généré pour le corps). */
export function TemplateTextsFields({ catalog, documentType, texts, onChange }: { catalog: SectionCatalogEntry[]; documentType: string; texts: Record<string, string>; onChange: (key: string, value: string) => void }): JSX.Element {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[12px] font-semibold text-gray-700 mb-1.5">Textes globaux</p>
        <div className="space-y-2">
          {GLOBALS.map((g) => (
            <div key={g.key}>
              <label className="block text-[11px] text-gray-500 mb-0.5">{g.label}</label>
              <input className={inp} value={texts[g.key] ?? ''} placeholder={g.def} onChange={(e) => onChange(g.key, e.target.value)} />
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[12px] font-semibold text-gray-700 mb-1.5">Libellés des sections</p>
        <div className="space-y-3">
          {catalog.map((c) => (
            <div key={c.key} className="border border-gray-100 rounded-md p-2 space-y-1.5">
              <input className={inp} value={texts[`${c.key}.title`] ?? ''} placeholder={`Titre : ${c.title}`} onChange={(e) => onChange(`${c.key}.title`, e.target.value)} />
              <input className={inp} value={texts[`${c.key}.lead`] ?? ''} placeholder={`Chapeau : ${c.lead}`} onChange={(e) => onChange(`${c.key}.lead`, e.target.value)} />
              {c.overridable && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-500">Corps du texte</span>
                    <button type="button" onClick={() => onChange(`${c.key}.body`, getSampleBody(documentType, c.key))}
                      className="text-[11px] font-medium text-forest-700 hover:underline">Charger le texte proposé</button>
                  </div>
                  <textarea className={`${inp} resize-y`} rows={4} value={texts[`${c.key}.body`] ?? ''}
                    placeholder="Laisser vide pour le texte généré automatiquement, ou « Charger le texte proposé » puis adapter."
                    onChange={(e) => onChange(`${c.key}.body`, e.target.value)} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
