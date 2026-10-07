import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'
import type { AssessmentFinding } from './findings/useAssessmentFindings'

// Lot 2 — intelligence inter-contrôles : cohérence (contrôles équivalents divergents) et
// constat systémique (réplique d'un constat sur plusieurs contrôles liés via control_mappings).
// Les comparaisons se limitent aux assessments DE L'AUDITEUR courant (ce que la RLS lui laisse lire).

export interface CoherenceIssue { code: string; name: string; relationship: string; otherLevel: string }
export interface LinkedTarget { controlId: string; code: string; name: string; relationship: string; assessmentId: string; conformityLevel: string | null }

export interface InterControlApi {
  loading: boolean
  coherenceIssues: (controlId: string, level: string | null) => CoherenceIssue[]
  linkedTargets: (controlId: string) => LinkedTarget[]
  /** Cibles de propagation d'un constat lié à une preuve mutualisée (contrôles partageant l'evidence_item). */
  evidenceTargets: (evidenceItemId: string, currentControlId: string) => LinkedTarget[]
  groupCount: (groupId: string | null) => number
  createSystemic: (origin: AssessmentFinding, targetAssessmentIds: string[], groupId: string) => Promise<boolean>
  refetch: () => void
}

interface Mapping { source_control_id: string; target_control_id: string; relationship: string }
interface EvidenceLink { control_id: string; evidence_item_id: string }
interface MiniAssessment { id: string; control_id: string; conformity_level: string | null; status: string; code: string; name: string }
interface MiniFinding { systemic_group_id: string | null }

const InterControlContext = createContext<InterControlApi | null>(null)

export function useInterControlCtx(): InterControlApi | null {
  return useContext(InterControlContext)
}

export function InterControlProvider({ missionId, children }: { missionId: string; children: React.ReactNode }): JSX.Element {
  const { profile } = useAuth()
  const [assessments, setAssessments] = useState<MiniAssessment[]>([])
  const [mappings, setMappings] = useState<Mapping[]>([])
  const [evidenceLinks, setEvidenceLinks] = useState<EvidenceLink[]>([])
  const [groupCounts, setGroupCounts] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (!missionId || !profile) { setLoading(false); return }
    const ctrl = new AbortController()
    setLoading(true)

    const load = async (): Promise<void> => {
      const { data: aData, error: aErr } = await supabase
        .from('control_assessments')
        .select('id, control_id, conformity_level, status, control:controls(code, name)')
        .eq('mission_id', missionId)
        .eq('auditor_id', profile.id)
        .abortSignal(ctrl.signal)
      if (ctrl.signal.aborted) return
      if (aErr) { console.error('interControl assessments:', aErr.message); setLoading(false); return }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- embed PostgREST non typé localement
      const minis: MiniAssessment[] = (aData ?? []).map((a: any) => ({
        id: a.id, control_id: a.control_id, conformity_level: a.conformity_level, status: a.status,
        code: a.control?.code ?? '', name: a.control?.name ?? '',
      }))
      setAssessments(minis)

      const { data: mData, error: mErr } = await supabase
        .from('control_mappings')
        .select('source_control_id, target_control_id, relationship')
        .abortSignal(ctrl.signal)
      if (ctrl.signal.aborted) return
      if (mErr) { console.error('interControl mappings:', mErr.message) }
      else setMappings((mData ?? []) as Mapping[])

      // Liens preuve mutualisée ↔ contrôle, pour propager un constat sur une preuve partagée.
      const controlIds = [...new Set(minis.map((a) => a.control_id))]
      if (controlIds.length > 0) {
        const { data: eData, error: eErr } = await supabase
          .from('evidence_catalog')
          .select('control_id, evidence_item_id')
          .in('control_id', controlIds)
          .not('evidence_item_id', 'is', null)
          .abortSignal(ctrl.signal)
        if (ctrl.signal.aborted) return
        if (eErr) { console.error('interControl evidence links:', eErr.message) }
        else setEvidenceLinks((eData ?? []).filter((e): e is EvidenceLink => !!e.evidence_item_id))
      } else {
        setEvidenceLinks([])
      }

      const ids = minis.map((a) => a.id)
      if (ids.length > 0) {
        const { data: fData, error: fErr } = await supabase
          .from('assessment_findings')
          .select('systemic_group_id')
          .in('assessment_id', ids)
          .not('systemic_group_id', 'is', null)
          .abortSignal(ctrl.signal)
        if (ctrl.signal.aborted) return
        if (fErr) { console.error('interControl findings:', fErr.message) }
        else {
          const counts = new Map<string, number>()
          for (const f of (fData ?? []) as MiniFinding[]) {
            if (f.systemic_group_id) counts.set(f.systemic_group_id, (counts.get(f.systemic_group_id) ?? 0) + 1)
          }
          setGroupCounts(counts)
        }
      } else {
        setGroupCounts(new Map())
      }
      setLoading(false)
    }
    void load()
    return () => ctrl.abort()
  }, [missionId, profile, refreshKey])

  const api = useMemo<InterControlApi>(() => {
    const byControl = new Map(assessments.map((a) => [a.control_id, a]))
    // Contrôles liés à controlId (dans les deux sens du crosswalk).
    const linksOf = (controlId: string): Array<{ otherId: string; relationship: string }> => {
      const out: Array<{ otherId: string; relationship: string }> = []
      for (const m of mappings) {
        if (m.source_control_id === controlId) out.push({ otherId: m.target_control_id, relationship: m.relationship })
        else if (m.target_control_id === controlId) out.push({ otherId: m.source_control_id, relationship: m.relationship })
      }
      return out
    }
    return {
      loading,
      coherenceIssues: (controlId, level) => {
        if (!level || level === 'na') return []
        const issues: CoherenceIssue[] = []
        for (const { otherId, relationship } of linksOf(controlId)) {
          if (relationship !== 'equivalent') continue
          const other = byControl.get(otherId)
          if (!other || !other.conformity_level || other.conformity_level === 'na') continue
          if (other.conformity_level !== level) {
            issues.push({ code: other.code, name: other.name, relationship, otherLevel: other.conformity_level })
          }
        }
        return issues
      },
      linkedTargets: (controlId) => {
        const out: LinkedTarget[] = []
        for (const { otherId, relationship } of linksOf(controlId)) {
          const other = byControl.get(otherId)
          if (!other) continue // pas d'assessment de l'auditeur sur ce contrôle → cible non éligible
          if (other.status !== 'draft' && other.status !== 'rejected') continue // seulement les assessments modifiables
          out.push({ controlId: otherId, code: other.code, name: other.name, relationship, assessmentId: other.id, conformityLevel: other.conformity_level })
        }
        return out
      },
      evidenceTargets: (evidenceItemId, currentControlId) => {
        const controlsWithItem = new Set(
          evidenceLinks.filter((e) => e.evidence_item_id === evidenceItemId).map((e) => e.control_id),
        )
        const out: LinkedTarget[] = []
        for (const cid of controlsWithItem) {
          if (cid === currentControlId) continue
          const other = byControl.get(cid)
          if (!other) continue // pas d'assessment de l'auditeur → cible non éligible
          if (other.status !== 'draft' && other.status !== 'rejected') continue // modifiable seulement
          out.push({ controlId: cid, code: other.code, name: other.name, relationship: 'evidence', assessmentId: other.id, conformityLevel: other.conformity_level })
        }
        return out
      },
      groupCount: (groupId) => (groupId ? (groupCounts.get(groupId) ?? 0) : 0),
      createSystemic: async (origin, targetAssessmentIds, groupId) => {
        if (targetAssessmentIds.length === 0) return false
        const rows = targetAssessmentIds.map((assessmentId, i) => ({
          assessment_id: assessmentId,
          ord: 100 + i,
          classification: origin.classification,
          description: origin.description,
          risk: origin.risk,
          recommendation: origin.recommendation,
          priority: origin.priority,
          ai_generated: false,
          systemic_group_id: groupId,
          is_systemic_origin: false,
          evidence_item_id: origin.evidence_item_id ?? null,
        }))
        const { error } = await supabase.from('assessment_findings').insert(rows)
        if (error) { console.error('interControl createSystemic:', error.message); return false }
        return true
      },
      refetch,
    }
  }, [assessments, mappings, evidenceLinks, groupCounts, loading, refetch])

  return <InterControlContext.Provider value={api}>{children}</InterControlContext.Provider>
}
