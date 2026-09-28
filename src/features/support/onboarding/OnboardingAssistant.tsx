import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'
import { OnboardingPanel } from './OnboardingPanel'
import { GestuFingerprint } from './GestuFingerprint'

// Widget flottant d'onboarding — « Doudou de Gëstu » (RFC 0011). Monté une fois dans
// AppLayout (shell cabinet = staff). Visibilité : kill-switch global
// support_agent_onboarding (même gate que l'Edge Function) + rôle non-client.

const MODULE_LABELS: Record<string, string> = {
  missions: 'Missions', clients: 'Clients', organization: 'Organisation', frameworks: 'Référentiels',
  dashboard: 'Tableau de bord', supervision: 'Supervision', hub: 'Hub', account: 'Mon compte', admin: 'Administration',
}

function moduleFromPath(pathname: string): string {
  const seg = pathname.split('/').filter(Boolean)[0] ?? ''
  return MODULE_LABELS[seg] ?? 'Général'
}

export function OnboardingAssistant(): JSX.Element | null {
  const { profile } = useAuth()
  const location = useLocation()
  const [enabled, setEnabled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const abort = new AbortController()
    void (async () => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('is_globally_enabled')
        .eq('slug', 'support_agent_onboarding')
        .abortSignal(abort.signal)
        .maybeSingle()
      if (error) { if (!abort.signal.aborted) console.warn('[onboarding] flag:', error.message); return }
      if (!abort.signal.aborted) setEnabled(!!(data as { is_globally_enabled: boolean } | null)?.is_globally_enabled)
    })()
    return () => abort.abort()
  }, [])

  if (!enabled || profile?.role === 'client') return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3" data-onboarding-widget>
      {open && (
        <OnboardingPanel route={location.pathname} module={moduleFromPath(location.pathname)} onClose={() => setOpen(false)} />
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Fermer Doudou' : "Ouvrir Doudou, l'assistant Gëstu"}
        data-tour="onboarding-bubble"
        className="relative grid h-14 w-14 place-items-center rounded-[20px] bg-gradient-to-br from-forest-700 to-forest-900 text-gold-500 shadow-[0_10px_24px_-6px_rgba(27,67,50,0.5)] outline outline-2 outline-offset-2 outline-gold-500/60 transition hover:-translate-y-0.5"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" className="text-white"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
        ) : (
          <>
            <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-gold-500 ring-[3px] ring-page-bg" aria-hidden="true" />
            <GestuFingerprint size={30} />
          </>
        )}
      </button>
    </div>
  )
}
