import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export interface FwOption { id: string; name: string }
export interface RequiredPolicy { evidenceId: string; name: string; controlId: string; controlCode: string; covered: boolean }

/** Couverture framework-driven : jeu de politiques requises (evidence_catalog.kind=policy)
 *  vs politiques approuvées liées aux contrôles. */
export function usePolicyCoverage(): {
  frameworks: FwOption[]
  selected: string | null
  select: (id: string) => void
  required: RequiredPolicy[]
  coverage: number
  loading: boolean
  refresh: () => void
} {
  const { profile } = useAuth()
  const orgId = profile?.organization_id
  const [frameworks, setFrameworks] = useState<FwOption[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [required, setRequired] = useState<RequiredPolicy[]>([])
  const [loading, setLoading] = useState(true)
  const [key, setKey] = useState(0)

  // Référentiels de l'org (via ses missions).
  useEffect(() => {
    if (!orgId) return
    const ac = new AbortController()
    supabase.from('missions').select('framework_id, framework:frameworks(name)')
      .or(`cabinet_id.eq.${orgId},client_id.eq.${orgId}`).abortSignal(ac.signal)
      .then(({ data }) => {
        if (ac.signal.aborted) return
        const map = new Map<string, string>()
        for (const m of (data ?? []) as unknown as Array<{ framework_id: string; framework: { name: string } | null }>) {
          if (m.framework_id) map.set(m.framework_id, m.framework?.name ?? '—')
        }
        const list = [...map].map(([id, name]) => ({ id, name }))
        setFrameworks(list)
        setSelected((s) => s ?? list[0]?.id ?? null)
      })
    return () => ac.abort()
  }, [orgId])

  // Jeu requis + couverture pour le référentiel sélectionné. Le filtrage par
  // référentiel se fait côté serveur via jointure (évite un .in() sur des centaines
  // de contrôles → URL trop longue). try/finally garantit la fin du chargement.
  useEffect(() => {
    if (!selected) { setRequired([]); setLoading(false); return }
    const ac = new AbortController()
    setLoading(true)
    void (async () => {
      try {
        // Preuves attendues de type « politique » du référentiel (via controls→domains).
        const { data: ev, error: eErr } = await supabase.from('evidence_catalog')
          .select('id, name, control_id, control:controls!inner(code, domain:domains!inner(framework_id))')
          .eq('control.domain.framework_id', selected).eq('kind', 'policy').abortSignal(ac.signal)
        if (eErr) console.error('[coverage evidence]', eErr.message)
        // Liens politique↔contrôle de l'org (peu nombreux → pas de .in).
        const { data: links, error: lErr } = await supabase.from('policy_control_links')
          .select('control_id, policy:policies(status)').abortSignal(ac.signal)
        if (lErr) console.error('[coverage links]', lErr.message)
        if (ac.signal.aborted) return
        const coveredCtrls = new Set<string>()
        for (const l of (links ?? []) as unknown as Array<{ control_id: string; policy: { status: string } | null }>) {
          if (l.policy && (l.policy.status === 'approved' || l.policy.status === 'published')) coveredCtrls.add(l.control_id)
        }
        setRequired(((ev ?? []) as unknown as Array<{ id: string; name: string; control_id: string; control: { code: string } | null }>).map((e) => ({
          evidenceId: e.id, name: e.name, controlId: e.control_id,
          controlCode: e.control?.code ?? '—', covered: coveredCtrls.has(e.control_id),
        })))
      } catch (err) {
        if (!ac.signal.aborted) console.error('[coverage]', err)
      } finally {
        if (!ac.signal.aborted) setLoading(false)
      }
    })()
    return () => ac.abort()
  }, [selected, key])

  const coverage = required.length ? Math.round((required.filter((r) => r.covered).length / required.length) * 100) : 0
  return { frameworks, selected, select: setSelected, required, coverage, loading, refresh: useCallback(() => setKey((k) => k + 1), []) }
}
