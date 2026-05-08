import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, AlertTriangle, ShieldAlert } from 'lucide-react'
import type { AssessmentDetail, FindingClassification } from './useInternalReviewData'

interface ReviewQualityCalloutProps {
  assessments: AssessmentDetail[]
}

interface QualityIssue {
  key: string
  severity: 'critical' | 'high' | 'medium'
  label: string
  detail: string
  controls: { code: string; name: string }[]
}

const SEV_DOT: Record<QualityIssue['severity'], string> = {
  critical: 'bg-red-500',
  high: 'bg-amber-500',
  medium: 'bg-yellow-500',
}

const SEV_TEXT: Record<QualityIssue['severity'], string> = {
  critical: 'text-red-700',
  high: 'text-amber-700',
  medium: 'text-yellow-700',
}

export function ReviewQualityCallout({ assessments }: ReviewQualityCalloutProps) {
  const [open, setOpen] = useState(true)

  const issues = useMemo<QualityIssue[]>(() => {
    const out: QualityIssue[] = []

    // 1. Approuvés sans constat
    const noFinding = assessments
      .filter((a) => a.status === 'approved' && a.findingsCount === 0)
      .map((a) => ({ code: a.controlCode, name: a.controlName }))
    if (noFinding.length > 0) {
      out.push({
        key: 'no-finding',
        severity: 'high',
        label: `${noFinding.length} contrôle${noFinding.length > 1 ? 's' : ''} approuvé${noFinding.length > 1 ? 's' : ''} sans constat`,
        detail: 'Un contrôle approuvé doit avoir au moins un constat (positif ou négatif) pour justifier la décision.',
        controls: noFinding,
      })
    }

    // 2. Conformity_level manquant
    const noConformity = assessments
      .filter((a) => a.status === 'approved' && !a.conformityLevel)
      .map((a) => ({ code: a.controlCode, name: a.controlName }))
    if (noConformity.length > 0) {
      out.push({
        key: 'no-conformity',
        severity: 'high',
        label: `${noConformity.length} contrôle${noConformity.length > 1 ? 's' : ''} sans niveau de conformité`,
        detail: 'Le niveau (Conforme / Largement / Partiellement / Non / NA) doit être défini pour calculer le score.',
        controls: noConformity,
      })
    }

    // 3. NC sans recommandation
    const ncNoReco = assessments
      .filter((a) => a.hasMissingRecommendation)
      .map((a) => ({ code: a.controlCode, name: a.controlName }))
    if (ncNoReco.length > 0) {
      out.push({
        key: 'nc-no-reco',
        severity: 'critical',
        label: `${ncNoReco.length} non-conformité${ncNoReco.length > 1 ? 's' : ''} sans recommandation`,
        detail: 'Toute NC majeure ou mineure doit être accompagnée d’une recommandation actionnable.',
        controls: ncNoReco,
      })
    }

    // 4. NC sans priorité
    const ncNoPriority = assessments
      .filter((a) => a.hasMissingPriority)
      .map((a) => ({ code: a.controlCode, name: a.controlName }))
    if (ncNoPriority.length > 0) {
      out.push({
        key: 'nc-no-priority',
        severity: 'medium',
        label: `${ncNoPriority.length} non-conformité${ncNoPriority.length > 1 ? 's' : ''} sans priorité`,
        detail: 'Définir la priorité (haute/moyenne/basse) aide le client à planifier les corrections.',
        controls: ncNoPriority,
      })
    }

    // 5. Observations vides mais conformity_level défini (suspect)
    const conformityNoObs = assessments
      .filter((a) => a.conformityLevel && (!a.observations || a.observations.trim().length === 0))
      .map((a) => ({ code: a.controlCode, name: a.controlName }))
    if (conformityNoObs.length > 0) {
      out.push({
        key: 'conformity-no-obs',
        severity: 'medium',
        label: `${conformityNoObs.length} évaluation${conformityNoObs.length > 1 ? 's' : ''} sans observation`,
        detail: 'Niveau de conformité décidé sans observation terrain — qualité du jugement à vérifier.',
        controls: conformityNoObs,
      })
    }

    // 6. Distribution suspecte par domaine
    const byDomain = new Map<string, { code: string; total: number; classifications: Map<FindingClassification | 'none', number> }>()
    for (const a of assessments) {
      if (!a.domainCode || a.status !== 'approved') continue
      if (!byDomain.has(a.domainCode)) {
        byDomain.set(a.domainCode, { code: a.domainCode, total: 0, classifications: new Map() })
      }
      const d = byDomain.get(a.domainCode)!
      d.total++
      const key: FindingClassification | 'none' = a.topClassification ?? 'none'
      d.classifications.set(key, (d.classifications.get(key) ?? 0) + 1)
    }
    const skewedDomains: { code: string; name: string }[] = []
    for (const [code, d] of byDomain) {
      if (d.total < 3) continue
      const ncMajor = d.classifications.get('major_nc') ?? 0
      if (ncMajor / d.total > 0.7) skewedDomains.push({ code, name: `100% NC majeures (${ncMajor}/${d.total})` })
    }
    if (skewedDomains.length > 0) {
      out.push({
        key: 'domain-skew',
        severity: 'medium',
        label: `${skewedDomains.length} domaine${skewedDomains.length > 1 ? 's' : ''} avec distribution NC suspecte`,
        detail: 'Plus de 70% de NC majeures sur un domaine — vérifier la pondération du jugement.',
        controls: skewedDomains,
      })
    }

    return out
  }, [assessments])

  if (issues.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
          <ShieldAlert size={16} />
        </div>
        <div>
          <p className="text-[13px] font-bold text-emerald-900">Aucune anomalie de cohérence détectée</p>
          <p className="text-[11px] text-emerald-700 mt-0.5">La revue passe les vérifications qualité automatiques.</p>
        </div>
      </div>
    )
  }

  const totalControls = issues.reduce((acc, iss) => acc + iss.controls.length, 0)
  const containerCls = issues.some((i) => i.severity === 'critical') ? 'border-red-300 bg-red-50/40' : 'border-amber-300 bg-amber-50/40'

  return (
    <div className={`rounded-xl border ${containerCls} overflow-hidden`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-amber-100/30 transition-colors text-left"
        aria-expanded={open}
      >
        {open ? <ChevronDown size={14} className="text-amber-700 shrink-0" /> : <ChevronRight size={14} className="text-amber-700 shrink-0" />}
        <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
          <AlertTriangle size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-gray-900">
            {issues.length} anomalie{issues.length > 1 ? 's' : ''} qualité à vérifier
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {totalControls} contrôle{totalControls > 1 ? 's' : ''} concerné{totalControls > 1 ? 's' : ''}
          </p>
        </div>
      </button>
      {open && (
        <ul className="divide-y divide-amber-200/50 border-t border-amber-200/50">
          {issues.map((iss) => (
            <IssueRow key={iss.key} issue={iss} />
          ))}
        </ul>
      )}
    </div>
  )
}

function IssueRow({ issue }: { issue: QualityIssue }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <li className="px-4 py-2.5 hover:bg-amber-50/30">
      <div className="flex items-start gap-3">
        <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${SEV_DOT[issue.severity]}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-[12px] font-semibold ${SEV_TEXT[issue.severity]}`}>{issue.label}</p>
          <p className="text-[11px] text-gray-600 leading-snug">{issue.detail}</p>
          {expanded && (
            <ul className="mt-1.5 space-y-0.5">
              {issue.controls.slice(0, 12).map((c, i) => (
                <li key={i} className="text-[11px] text-gray-700 flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold text-forest-700">{c.code}</span>
                  <span className="truncate">{c.name}</span>
                </li>
              ))}
              {issue.controls.length > 12 && (
                <li className="text-[10px] text-gray-400 italic">… et {issue.controls.length - 12} autre{issue.controls.length - 12 > 1 ? 's' : ''}</li>
              )}
            </ul>
          )}
        </div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-[11px] font-semibold text-forest-700 hover:text-forest-900 shrink-0"
        >
          {expanded ? 'Masquer' : 'Voir'}
        </button>
      </div>
    </li>
  )
}
