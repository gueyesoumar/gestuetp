import { describe, it, expect } from 'vitest'
import { computeBowtieModel } from './scenarioBowtieModel'
import { scenarioCompleteness } from './scenarioCompleteness'

describe('computeBowtieModel', () => {
  it('sans barrière : résiduel = inhérent', () => {
    const m = computeBowtieModel({ inherent_likelihood: 4, inherent_impact: 4 }, [], [], 0)
    expect(m.inherentExp).toBe(100)
    expect(m.residual).toBe(100)
    expect(m.hasBarriers).toBe(false)
    expect(m.effPrev).toBeNull()
  })

  it('barrière préventive efficace : abaisse le résiduel via la vraisemblance', () => {
    const m = computeBowtieModel({ inherent_likelihood: 4, inherent_impact: 4 }, [{ kind: 'preventive', effectiveness: 0.5 }], [], 0)
    expect(m.hasBarriers).toBe(true)
    expect(m.effPrev).toBe(0.5)
    expect(m.residual).toBe(50) // riskExposure(2, 4)
  })

  it('incident (bump) aggrave la vraisemblance, plafonnée à 4', () => {
    const m = computeBowtieModel({ inherent_likelihood: 3, inherent_impact: 2 }, [], [], 2)
    expect(m.effL).toBe(4) // min(4, 3+2)
    expect(m.inherentExp).toBe(50) // riskExposure(4, 2)
  })

  it('combine barrières contrôles et politiques', () => {
    const m = computeBowtieModel({ inherent_likelihood: 4, inherent_impact: 4 },
      [{ kind: 'preventive', effectiveness: 0.5 }], [{ kind: 'corrective', effectiveness: 0.5 }], 0)
    expect(m.residual).toBe(25) // riskExposure(2, 2)
  })
})

describe('scenarioCompleteness', () => {
  it('scénario vide : 0 %', () => {
    const c = scenarioCompleteness({
      threat_ref: null, feared_event_ref: null, asset_name: null, vulnerability: null,
      inherent_likelihood: 0, inherent_impact: 0, treatment: 'untreated', next_review_at: null,
    })
    expect(c.filled).toBe(0)
    expect(c.pct).toBe(0)
    expect(c.total).toBe(5)
  })

  it('scénario complet : 100 %', () => {
    const c = scenarioCompleteness({
      threat_ref: 't', feared_event_ref: 'f', asset_name: null, vulnerability: 'faille',
      inherent_likelihood: 2, inherent_impact: 2, treatment: 'reduce', next_review_at: '2026-01-01',
    })
    expect(c.filled).toBe(5)
    expect(c.pct).toBe(100)
  })

  it('coté + vulnérabilité seuls : complétude partielle', () => {
    const c = scenarioCompleteness({
      threat_ref: null, feared_event_ref: null, asset_name: null, vulnerability: 'faille',
      inherent_likelihood: 3, inherent_impact: 3, treatment: 'untreated', next_review_at: null,
    })
    expect(c.filled).toBe(2) // vulnérabilité + cotation
  })
})
