import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

/**
 * Co-branding compact pour le SaaS auditeur (sidebar). Charge le branding du
 * cabinet de l'utilisateur courant (organization_branding via organization_id)
 * et affiche le logo cabinet + mention « Powered by Gestu » dans le bas de la
 * sidebar quand un logo est configuré.
 *
 * Différent de useBranding() qui résout via hostname — ici on regarde l'identité
 * authentifiée. Les deux peuvent coexister sans conflit.
 */

interface OwnBranding {
  logo_dark_url: string | null
  logo_light_url: string | null
  cabinet_name: string
}

export function CoBrandingFooter({ collapsed = false }: { collapsed?: boolean }): JSX.Element | null {
  const { profile } = useAuth()
  const [own, setOwn] = useState<OwnBranding | null>(null)

  useEffect(() => {
    if (!profile?.organization_id) {
      setOwn(null)
      return
    }
    let cancelled = false

    void (async () => {
      const [{ data: branding }, { data: org }] = await Promise.all([
        supabase
          .from('organization_branding')
          .select('logo_dark_url, logo_light_url')
          .eq('organization_id', profile.organization_id)
          .maybeSingle(),
        supabase
          .from('organizations')
          .select('name')
          .eq('id', profile.organization_id)
          .single(),
      ])
      if (cancelled) return
      const b = branding as { logo_dark_url: string | null; logo_light_url: string | null } | null
      const o = org as { name: string } | null
      if (!b || (!b.logo_dark_url && !b.logo_light_url)) {
        setOwn(null)
        return
      }
      setOwn({
        logo_dark_url: b.logo_dark_url,
        logo_light_url: b.logo_light_url,
        cabinet_name: o?.name ?? 'Cabinet',
      })
    })()

    return () => { cancelled = true }
  }, [profile?.organization_id])

  if (!own) return null

  // Pour la sidebar Gestu (fond foncé), on privilégie logo_dark, fallback logo_light en pastille
  const logoUrl = own.logo_dark_url ?? own.logo_light_url
  if (!logoUrl) return null

  if (collapsed) {
    return (
      <div className="border-t border-white/10 py-2 flex justify-center" title={`${own.cabinet_name} · Powered by Gestu`}>
        <div className={`w-7 h-7 rounded-md flex items-center justify-center overflow-hidden ${own.logo_dark_url ? '' : 'bg-white p-0.5'}`}>
          <img src={logoUrl} alt={own.cabinet_name} className="max-w-full max-h-full object-contain" />
        </div>
      </div>
    )
  }

  return (
    <div className="border-t border-white/10 px-4 py-2.5">
      <div className="flex items-center gap-2.5">
        <div className={`w-7 h-7 rounded-md flex items-center justify-center overflow-hidden shrink-0 ${own.logo_dark_url ? '' : 'bg-white p-0.5'}`}>
          <img src={logoUrl} alt={own.cabinet_name} className="max-w-full max-h-full object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-white/80 truncate">{own.cabinet_name}</p>
          <p className="text-[9px] text-white/40 tracking-wide uppercase">Powered by Gëstu</p>
        </div>
      </div>
    </div>
  )
}
