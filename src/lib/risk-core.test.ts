import { describe, it, expect } from 'vitest'
import {
  riskExposure, barrierSide, splitBarrierEfficacies, riskResidualSplit,
  RISK_TREATMENT_LEVERS, RISK_CONTROL_LINK_KINDS, PUBLIC_SECTORS, SCORE_DIMENSION_LABELS,
} from './constants'

describe('riskExposure', () => {
  it('normalise la cotation 4x4 sur 100', () => {
    expect(riskExposure(4, 4)).toBe(100)
    expect(riskExposure(1, 1)).toBe(6)   // 6.25 -> 6
    expect(riskExposure(2, 2)).toBe(25)
    expect(riskExposure(3, 3)).toBe(56)  // 56.25 -> 56
    expect(riskExposure(3, 4)).toBe(75)
    expect(riskExposure(2, 1)).toBe(13)  // 12.5 -> 13
  })
})

describe('barrierSide', () => {
  it('préventive agit sur la vraisemblance, le reste sur l\'impact', () => {
    expect(barrierSide('preventive')).toBe('likelihood')
    expect(barrierSide('corrective')).toBe('impact')
    expect(barrierSide('detective')).toBe('impact')
  })
})

describe('splitBarrierEfficacies', () => {
  it('moyenne par côté, null si aucune barrière de ce côté', () => {
    expect(splitBarrierEfficacies([])).toEqual({ effPrev: null, effCorr: null })
    expect(splitBarrierEfficacies([
      { kind: 'preventive', effectiveness: 0.5 },
      { kind: 'preventive', effectiveness: 0.7 },
    ])).toEqual({ effPrev: 0.6, effCorr: null })
    expect(splitBarrierEfficacies([{ kind: 'corrective', effectiveness: 0.8 }]))
      .toEqual({ effPrev: null, effCorr: 0.8 })
  })
})

describe('riskResidualSplit', () => {
  it('réduit vraisemblance (préventif) et impact (correctif)', () => {
    expect(riskResidualSplit(4, 4, null, null)).toBe(100)
    expect(riskResidualSplit(4, 4, 0.5, null)).toBe(riskExposure(2, 4)) // 50
    expect(riskResidualSplit(4, 4, 0.5, 0.5)).toBe(25)
  })
})

describe('RISK_TREATMENT_LEVERS', () => {
  const kinds = RISK_CONTROL_LINK_KINDS.map((k) => k.value)
  it('couvre les 8 dimensions + le repli, avec des leviers valides', () => {
    for (const dim of Object.keys(SCORE_DIMENSION_LABELS)) {
      expect(RISK_TREATMENT_LEVERS[dim], `dimension ${dim}`).toBeTruthy()
    }
    expect(RISK_TREATMENT_LEVERS._).toBeTruthy()
    for (const list of Object.values(RISK_TREATMENT_LEVERS)) {
      expect(list.length).toBeGreaterThan(0)
      for (const lv of list) {
        expect(lv.label.trim().length).toBeGreaterThan(0)
        expect(kinds).toContain(lv.kind)
        expect(lv.eff).toBeGreaterThan(0)
        expect(lv.eff).toBeLessThanOrEqual(1)
      }
    }
  })
})

describe('PUBLIC_SECTORS', () => {
  it('inclut les secteurs publics déjà présents sur les assujettis', () => {
    for (const s of ['Fiscalité', 'Douanes', 'Santé publique', 'Administration publique',
      "Infrastructure numérique de l'État", 'Protection sociale', 'Statistique nationale']) {
      expect(PUBLIC_SECTORS).toContain(s)
    }
  })
})
