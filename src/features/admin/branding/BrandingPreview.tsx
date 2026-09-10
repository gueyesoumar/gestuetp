/**
 * BrandingPreview — aperçu WYSIWYG multi-pages de la marque blanche. Un
 * sélecteur d'onglets montre chaque page (login split, hub, e-mail, portail)
 * telle qu'elle rend RÉELLEMENT, à partir du draft du formulaire (live) et des
 * logos sauvegardés. Objectif : ce que tu vois ici = ce qui est en ligne.
 */
import { useState } from 'react'
import { generatePalette } from '../../branding/colorUtils'
import type { CabinetBrandingRow } from './useCabinetBrandingAdmin'
import type { BrandingDraft } from './BrandingFormSection'
import { type PreviewCtx, isHex } from './previews/previewKit'
import { PreviewLogin } from './previews/PreviewLogin'
import { PreviewHub } from './previews/PreviewHub'
import { PreviewEmail } from './previews/PreviewEmail'
import { PreviewPortal } from './previews/PreviewPortal'

interface Props {
  cabinetName: string
  branding: CabinetBrandingRow | null
  draft: BrandingDraft
}

const DEFAULT_PRIMARY = '#1B4332'
const DEFAULT_ACCENT = '#D4A843'
type Tab = 'login' | 'hub' | 'email' | 'portail'
const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'login', label: 'Connexion' },
  { key: 'hub', label: 'Hub' },
  { key: 'email', label: 'E-mail' },
  { key: 'portail', label: 'Portail' },
]

export function BrandingPreview({ cabinetName, branding, draft }: Props): JSX.Element {
  const [tab, setTab] = useState<Tab>('login')
  const rawPrimary = isHex(draft.primary) ? draft.primary : DEFAULT_PRIMARY
  const accent = isHex(draft.accent) ? draft.accent : DEFAULT_ACCENT
  const palette = generatePalette(rawPrimary)

  const ctx: PreviewCtx = {
    cabinetName,
    primary: palette?.['700'] ?? rawPrimary,
    primaryDeep: palette?.['900'] ?? rawPrimary,
    lightSurface: palette?.['50'] ?? '#F5F5F4',
    accent,
    surfaceMode: draft.surfaceMode,
    treatment: draft.darkLogoTreatment,
    logoLight: branding?.logo_light_url ?? null,
    logoDark: branding?.logo_dark_url ?? null,
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl">
      <header className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
        <span className="text-[13px] font-bold text-gray-900">Aperçu</span>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>
      <div className="p-4">
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {tab === 'login' && <PreviewLogin {...ctx} />}
          {tab === 'hub' && <PreviewHub {...ctx} />}
          {tab === 'email' && (
            <PreviewEmail
              {...ctx}
              fromName={draft.emailFromName || `${cabinetName} via Gëstu`}
              supportEmail={draft.supportEmail || null}
              footer={draft.footerText || null}
            />
          )}
          {tab === 'portail' && <PreviewPortal {...ctx} />}
        </div>
        <p className="mt-2 text-[10.5px] text-gray-400">
          Aperçu du brouillon en cours — <span className="font-semibold text-gray-500">Enregistrer</span> pour appliquer au domaine live.
        </p>
      </div>
    </div>
  )
}
