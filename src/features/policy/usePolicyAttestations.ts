import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { PolicyEffectivenessAttestation, PolicyEffectivenessStatus } from '../../types/database.types'

interface AttestInput { status: PolicyEffectivenessStatus; note: string; file: File | null; reviewMonths: number }

/** Double attestation d'une politique : adoption (lecture) + application effective. */
export function usePolicyAttestations(policyId: string, versionId: string | null): {
  acked: boolean
  ackCount: number
  eligible: number
  latestEffective: PolicyEffectivenessAttestation | null
  applied: boolean
  loading: boolean
  acknowledge: () => Promise<void>
  attestEffective: (input: AttestInput) => Promise<void>
} {
  const { profile } = useAuth()
  const orgId = profile?.organization_id
  const [acked, setAcked] = useState(false)
  const [ackCount, setAckCount] = useState(0)
  const [eligible, setEligible] = useState(0)
  const [latestEffective, setLatestEffective] = useState<PolicyEffectivenessAttestation | null>(null)
  const [loading, setLoading] = useState(true)
  const [key, setKey] = useState(0)

  useEffect(() => {
    if (!orgId) { setLoading(false); return }
    const ac = new AbortController()
    setLoading(true)
    void (async () => {
      const [acksRes, elig, effRes] = await Promise.all([
        versionId
          ? supabase.from('policy_acknowledgements').select('user_id').eq('policy_version_id', versionId).abortSignal(ac.signal)
          : Promise.resolve({ data: [] as Array<{ user_id: string }> }),
        supabase.from('users').select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId).eq('is_active', true).neq('role', 'client').abortSignal(ac.signal),
        supabase.from('policy_effectiveness_attestations').select('*')
          .eq('policy_id', policyId).order('attested_at', { ascending: false }).limit(1).abortSignal(ac.signal),
      ])
      if (ac.signal.aborted) return
      const acks = ((acksRes as { data: Array<{ user_id: string }> | null }).data ?? [])
      setAckCount(acks.length)
      setAcked(acks.some((a) => a.user_id === profile?.id))
      setEligible((elig as { count: number | null }).count ?? 0)
      setLatestEffective(((effRes.data ?? [])[0] as PolicyEffectivenessAttestation | undefined) ?? null)
      setLoading(false)
    })()
    return () => ac.abort()
  }, [orgId, policyId, versionId, profile?.id, key])

  const acknowledge = useCallback(async (): Promise<void> => {
    if (!orgId || !versionId) return
    const { error } = await supabase.from('policy_acknowledgements').insert({
      organization_id: orgId, policy_id: policyId, policy_version_id: versionId, user_id: profile?.id,
    } as never)
    if (error) { console.error('[acknowledge]', error.message); return }
    setKey((k) => k + 1)
  }, [orgId, policyId, versionId, profile?.id])

  const attestEffective = useCallback(async (input: AttestInput): Promise<void> => {
    if (!orgId) return
    let evidence_path: string | null = null
    if (input.file) {
      const safe = input.file.name.replace(/[^\w.-]+/g, '_')
      const path = `${orgId}/${policyId}/att_${Date.now()}_${safe}`
      const { error: upErr } = await supabase.storage.from('policy-documents').upload(path, input.file)
      if (upErr) { console.error('[attest upload]', upErr.message) } else { evidence_path = path }
    }
    const next = new Date()
    next.setMonth(next.getMonth() + input.reviewMonths)
    const nextDue = next.toISOString().slice(0, 10)
    const { error } = await supabase.from('policy_effectiveness_attestations').insert({
      organization_id: orgId, policy_id: policyId, policy_version_id: versionId, attested_by: profile?.id,
      status: input.status, evidence_note: input.note || null, evidence_path, next_due: nextDue,
    } as never)
    if (error) { console.error('[attestEffective]', error.message); return }
    await supabase.from('policies').update({ next_review_at: nextDue } as never).eq('id', policyId)
    setKey((k) => k + 1)
  }, [orgId, policyId, versionId, profile?.id])

  const applied = latestEffective?.status === 'applied'
  return { acked, ackCount, eligible, latestEffective, applied, loading, acknowledge, attestEffective }
}
