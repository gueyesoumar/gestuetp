import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'
import { OnboardingPanel } from './OnboardingPanel'

// Widget flottant d'onboarding (RFC 0011, Lot 2). Monté une fois dans AppLayout (shell
// cabinet = staff). Visibilité : kill-switch global support_agent_onboarding (même gate
// que l'Edge Function) + rôle non-client. OFF par défaut → rien ne s'affiche.

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
        aria-label="Assistant d'onboarding"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-forest-900 text-xl text-white shadow-lg ring-2 ring-gold-500 transition hover:bg-forest-700"
      >
        {open ? '✕' : '🧭'}
      </button>
    </div>
  )
}
