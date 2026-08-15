import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useFeatureFlag } from '../../hooks/useFeatureFlag'
import {
  SCORE_DIMENSION_KEYS, SCORE_DIMENSION_KIND, type ScoreDimensionKey,
  SCORE_FACTOR_WEIGHTS, SCORE_COEFFICIENT_FLOOR, ASSURANCE_FRESHNESS_MONTHS,
  SEAL_STAGE_WEIGHTS, type ScoreFactorKey,
  RISK_MASTERY_WEIGHT, riskExposure,
} from '../../lib/constants'

// Score de confiance par dimension pour l'organisation courante (Phase B).
// Meme perimetre que le score composite actuel (missions du cabinet), mais
// ventile par dimension via la jointure control_assessments -> controls.dimension.
// 6 axes (moyennes dans le composite) + facteurs transverses qui TEMPERENT le
// composite (penalite seule, jamais de bonus) :
//   composite_posture = moyenne(axes mesures)
//   coefficient       = produit(1 - w * (1 - score/100)) sur facteurs mesures, borne
//   composite         = round(composite_posture * coefficient)
// Facteurs : human_factor + third_party (mappes) + assurance (calcule sur la
// fraicheur/documentation des preuves). Degradation gracieuse : une dimension
// ou un facteur sans mesure reste `null` (non compte, neutre).

export interface DimScore {
  key: ScoreDimensionKey
  score: number | null
  total: number
  approved: number
}

export interface FactorScore {
  key: ScoreFactorKey
  score: number | null
  // Detail lisible : "12/40 controles" (mappe) ou "8/12 preuves fiables" (assurance).
  total: number
  covered: number
  // Points de composite retires par ce facteur (>= 0), pour l'affichage.
  penaltyPts: number
}

/** Exposition inhérente / résiduelle par dimension (Gëstu Risk, RFC 0004). */
export interface RiskDimScore {
  inherent: number | null   // 0..100, agrégat des scénarios de la dimension
  residual: number | null   // inherent × (1 − efficacité posture)
}

export interface SelfDimensionData {
  loading: boolean
  axes: DimScore[]
  factors: FactorScore[]
  compositePosture: number | null
  composite: number | null
  coefficient: number
  /** Coefficient des facteurs SANS le risque (pour le simulateur). */
  coefficientBase: number
  measuredAxes: number
  totalAxes: number
  // Gëstu Risk (RFC 0004) : exposition + maîtrise du risque.
  residualByDim: Partial<Record<ScoreDimensionKey, RiskDimScore>>
  /** Facteur de maîtrise du risque (100 = tout traité). null = pas de scénario. */
  riskMastery: { score: number | null; penaltyPts: number } | null
  /** Le facteur pèse-t-il réellement sur le composite (flag org actif) ? */
  riskImpactActive: boolean
}

const AXIS_KEYS = SCORE_DIMENSION_KEYS.filter((k) => SCORE_DIMENSION_KIND[k] === 'axis')
const MAPPED_FACTOR_KEYS = SCORE_DIMENSION_KEYS.filter(
  (k) => SCORE_DIMENSION_KIND[k] === 'factor',
) as ReadonlyArray<Extract<ScoreFactorKey, ScoreDimensionKey>>

const EMPTY: SelfDimensionData = {
  loading: false, axes: [], factors: [], compositePosture: null, composite: null,
  coefficient: 1, coefficientBase: 1, measuredAxes: 0, totalAxes: AXIS_KEYS.length,
  residualByDim: {}, riskMastery: null, riskImpactActive: false,
}

function toDimScore(key: ScoreDimensionKey, agg: { total: number; approved: number } | undefined): DimScore {
  const total = agg?.total ?? 0
  const approved = agg?.approved ?? 0
  return { key, total, approved, score: total > 0 ? Math.round((approved / total) * 100) : null }
}

interface AssessmentRow {
  id: string
  status: string
  control_id: string
  updated_at: string
  evidence_notes: string | null
}

// Assurance : qualite ponderee des preuves des controles approuves, sur 3 signaux
//   - fraicheur   : updated_at dans la fenetre d'un cycle
//   - documentation: evidence_notes non vide
//   - scellement  : validation independante approuvee dans la chaine probante
// Mesure la confiance dans la mesure elle-meme ; plafonnee a 100 par nature.
// Le scellement est *gradue* : profondeur ∈ {0 ; 0,5 ; 0,8 ; 1} selon l'etape de
// revue la plus profonde atteinte (SEAL_STAGE_WEIGHTS). `sealedDepth` = null ->
// scellement indisponible (RLS) : degradation gracieuse vers le modele 2 signaux
// (frais/documente), l'assurance n'est jamais cassee.
function computeAssurance(
  rows: AssessmentRow[],
  freshCutoffMs: number,
  sealedDepth: Map<string, number> | null,
): { score: number | null; total: number; covered: number } {
  const approved = rows.filter((r) => r.status === 'approved')
  if (approved.length === 0) return { score: null, total: 0, covered: 0 }
  const withSeal = sealedDepth !== null
  const wFresh = withSeal ? 0.3 : 0.5
  const wDoc = withSeal ? 0.3 : 0.5
  const wSeal = withSeal ? 0.4 : 0
  let qualitySum = 0
  let covered = 0
  for (const r of approved) {
    const fresh = new Date(r.updated_at).getTime() >= freshCutoffMs ? 1 : 0
    const documented = (r.evidence_notes ?? '').trim().length > 0 ? 1 : 0
    const depth = withSeal ? (sealedDepth.get(r.id) ?? 0) : 0
    qualitySum += wFresh * fresh + wDoc * documented + wSeal * depth
    if (withSeal ? depth > 0 : fresh && documented) covered += 1
  }
  return { score: Math.round((qualitySum / approved.length) * 100), total: approved.length, covered }
}

// Coefficient conservateur : chaque facteur mesure retire une part, borne au plancher.
function toFactorScore(
  key: ScoreFactorKey,
  score: number | null,
  total: number,
  covered: number,
  posture: number | null,
): FactorScore {
  const weight = SCORE_FACTOR_WEIGHTS[key]
  const penaltyFrac = score === null ? 0 : weight * (1 - score / 100)
  const penaltyPts = posture === null ? 0 : Math.round(posture * penaltyFrac)
  return { key, score, total, covered, penaltyPts }
}

export function useSelfDimensionScores(): SelfDimensionData {
  const { profile } = useAuth()
  const { enabled: riskImpact } = useFeatureFlag('risk_score_impact')
  const [data, setData] = useState<SelfDimensionData>({ ...EMPTY, loading: true })

  useEffect(() => {
    const orgId = profile?.organization_id
    if (!orgId) { setData(EMPTY); return }
    const ctrl = new AbortController()

    void (async () => {
      // Finalise le calcul : charge le registre de risque, calcule résiduel +
      // risk_mastery, plie dans le coefficient si le flag est actif, puis setData.
      // Appelé par TOUS les chemins (y compris org sans mission Comply) → le risque
      // est toujours pris en compte.
      const finalize = async (
        axes: DimScore[], factors: FactorScore[], compositePosture: number | null, measuredLen: number,
      ): Promise<void> => {
        const { data: scenarios } = await supabase
          .from('risk_scenarios')
          .select('dimension, inherent_likelihood, inherent_impact')
          .eq('organization_id', orgId).abortSignal(ctrl.signal)
        if (ctrl.signal.aborted) return
        const postureByDim = new Map(axes.map((a) => [a.key, a.score]))
        const inherentAgg = new Map<ScoreDimensionKey, number[]>()
        for (const s of (scenarios ?? []) as Array<{ dimension: ScoreDimensionKey | null; inherent_likelihood: number; inherent_impact: number }>) {
          if (!s.dimension) continue
          const arr = inherentAgg.get(s.dimension) ?? []
          arr.push(riskExposure(s.inherent_likelihood, s.inherent_impact))
          inherentAgg.set(s.dimension, arr)
        }
        const residualByDim: Partial<Record<ScoreDimensionKey, RiskDimScore>> = {}
        const residuals: number[] = []
        for (const [dim, exps] of inherentAgg) {
          const inherent = Math.round(exps.reduce((s, x) => s + x, 0) / exps.length)
          const eff = postureByDim.get(dim) ?? null   // efficacité = posture Comply (0..100)
          const residual = eff == null ? inherent : Math.round(inherent * (1 - eff / 100))
          residualByDim[dim] = { inherent, residual }
          residuals.push(residual)
        }
        const riskMasteryScore = residuals.length > 0
          ? Math.max(0, 100 - Math.round(residuals.reduce((s, x) => s + x, 0) / residuals.length))
          : null
        const riskPenaltyFrac = riskMasteryScore === null ? 0 : RISK_MASTERY_WEIGHT * (1 - riskMasteryScore / 100)
        const coefficientBase = factors.reduce((acc, f) => {
          if (f.score === null) return acc
          return acc * (1 - SCORE_FACTOR_WEIGHTS[f.key] * (1 - f.score / 100))
        }, 1)
        let coefficient = coefficientBase
        if (riskImpact && riskMasteryScore !== null) coefficient *= (1 - riskPenaltyFrac)
        coefficient = Math.max(SCORE_COEFFICIENT_FLOOR, coefficient)
        const composite = compositePosture === null ? null : Math.round(compositePosture * coefficient)
        const riskPenaltyPts = compositePosture === null ? 0 : Math.round(compositePosture * riskPenaltyFrac)
        setData({
          loading: false, axes, factors, compositePosture, composite, coefficient, coefficientBase,
          measuredAxes: measuredLen, totalAxes: AXIS_KEYS.length,
          residualByDim,
          riskMastery: riskMasteryScore === null ? null : { score: riskMasteryScore, penaltyPts: riskPenaltyPts },
          riskImpactActive: riskImpact,
        })
      }

      const { data: missions, error: mErr } = await supabase
        .from('missions').select('id').eq('cabinet_id', orgId).eq('is_active', true).abortSignal(ctrl.signal)
      if (ctrl.signal.aborted) return
      if (mErr) { console.error('dimension scores missions:', mErr.message); setData(EMPTY); return }

      const missionIds = (missions ?? []).map((m: { id: string }) => m.id)
      const emptyMeasured: SelfDimensionData = {
        ...EMPTY,
        axes: AXIS_KEYS.map((k) => toDimScore(k, undefined)),
        factors: (['human_factor', 'third_party', 'assurance'] as ScoreFactorKey[]).map(
          (k) => toFactorScore(k, null, 0, 0, null),
        ),
      }
      if (missionIds.length === 0) { await finalize(emptyMeasured.axes, emptyMeasured.factors, null, 0); return }

      const { data: assessments, error: aErr } = await supabase
        .from('control_assessments')
        .select('id, status, control_id, updated_at, evidence_notes')
        .in('mission_id', missionIds).abortSignal(ctrl.signal)
      if (ctrl.signal.aborted) return
      if (aErr) { console.error('dimension scores assessments:', aErr.message); setData(EMPTY); return }

      const rows = (assessments ?? []) as AssessmentRow[]
      const controlIds = [...new Set(rows.map((r) => r.control_id))]
      if (controlIds.length === 0) { await finalize(emptyMeasured.axes, emptyMeasured.factors, null, 0); return }

      const { data: controls, error: cErr } = await supabase
        .from('controls').select('id, dimension').in('id', controlIds).abortSignal(ctrl.signal)
      if (ctrl.signal.aborted) return
      if (cErr) { console.error('dimension scores controls:', cErr.message); setData(EMPTY); return }

      const dimByControl = new Map<string, ScoreDimensionKey | null>()
      for (const c of (controls ?? []) as Array<{ id: string; dimension: ScoreDimensionKey | null }>) {
        dimByControl.set(c.id, c.dimension)
      }

      const agg = new Map<ScoreDimensionKey, { total: number; approved: number }>()
      for (const r of rows) {
        const dim = dimByControl.get(r.control_id)
        if (!dim) continue
        const cur = agg.get(dim) ?? { total: 0, approved: 0 }
        cur.total += 1
        if (r.status === 'approved') cur.approved += 1
        agg.set(dim, cur)
      }

      const axes = AXIS_KEYS.map((k) => toDimScore(k, agg.get(k)))
      const measured = axes.filter((a) => a.score !== null)
      const compositePosture = measured.length > 0
        ? Math.round(measured.reduce((s, a) => s + (a.score ?? 0), 0) / measured.length)
        : null

      // Scellement : validations independantes approuvees sur mes assessments
      // approuves. Perimetre deja restreint (assessment_id in mes controles).
      const approvedIds = rows.filter((r) => r.status === 'approved').map((r) => r.id)
      let sealedDepth: Map<string, number> | null = new Map()
      if (approvedIds.length > 0) {
        const { data: validations, error: vErr } = await supabase
          .from('assessment_validations')
          .select('assessment_id, stage')
          .in('assessment_id', approvedIds)
          .eq('decision', 'approved')
          .in('stage', ['lead_review', 'associate_review', 'client_review'])
          .abortSignal(ctrl.signal)
        if (ctrl.signal.aborted) return
        if (vErr) {
          console.error('dimension scores validations:', vErr.message)
          sealedDepth = null // degradation gracieuse -> modele 2 signaux
        } else {
          const depth = new Map<string, number>()
          for (const v of (validations ?? []) as Array<{ assessment_id: string; stage: string }>) {
            const tier = SEAL_STAGE_WEIGHTS[v.stage as keyof typeof SEAL_STAGE_WEIGHTS] ?? 0
            depth.set(v.assessment_id, Math.max(depth.get(v.assessment_id) ?? 0, tier))
          }
          sealedDepth = depth
        }
      }

      const cutoff = new Date()
      cutoff.setMonth(cutoff.getMonth() - ASSURANCE_FRESHNESS_MONTHS)
      const assurance = computeAssurance(rows, cutoff.getTime(), sealedDepth)

      const factors: FactorScore[] = [
        ...MAPPED_FACTOR_KEYS.map((k) => {
          const a = agg.get(k)
          const dim = toDimScore(k, a)
          return toFactorScore(k, dim.score, dim.total, dim.approved, compositePosture)
        }),
        toFactorScore('assurance', assurance.score, assurance.total, assurance.covered, compositePosture),
      ]

      await finalize(axes, factors, compositePosture, measured.length)
    })()

    return () => ctrl.abort()
  }, [profile?.organization_id, riskImpact])

  return data
}
