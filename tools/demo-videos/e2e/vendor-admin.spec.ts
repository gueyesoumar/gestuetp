import { test, expect } from './fixtures'
import { open, text } from './helpers'
import { tokenFrom, rest, edge, rpc, SUPABASE_URL } from './api'

// J3 - Vendor côté régulateur (REGA). Registre des tiers + fiche fournisseur, puis
// chaîne de qualification TPRM complète (approche HYBRIDE : tout le cœur Vendor est en
// RPC SECURITY DEFINER + 2 edges ; on pilote le vrai backend et on assère l'UI).

type Json = Record<string, unknown>

test.describe('Régulateur - registre des tiers (Vendor)', () => {
  test('Fournisseur F présent et ouverture de sa fiche', async ({ page }) => {
    test.skip(!(await open(page, '/fournisseurs')), 'Module Vendor inaccessible')
    await expect(text(page, /Registre des tiers/)).toBeVisible()
    await expect(text(page, /Fournisseur Test F/)).toBeVisible()
    await page.getByText(/Fournisseur Test F/).first().click()
    await page.waitForTimeout(800)
    await expect(text(page, /PASI|Référentiel|Nouvelle évaluation|Évaluation|Qualification|Inviter/i)).toBeVisible()
  })
})

test.describe.serial('Régulateur - qualification Vendor (chaîne complète)', () => {
  test('qualifie un fournisseur de bout en bout : create -> évaluation -> constat -> verdict -> registre', async ({ page }) => {
    const rega = tokenFrom('.auth/rega.json')
    test.skip(!rega || !SUPABASE_URL, 'Token REGA / .env indisponible')

    // 1. Créer un fournisseur (edge create-vendor) -> nœud org + arête supplier + profil prospect.
    const name = `E2E Vendor ${Date.now()}`
    const cv = await edge(rega!, 'create-vendor', { vendor_name: name, data_access_level: 'etendu', criticality: 'eleve', sector: 'IT', country: 'Sénégal' })
    expect(cv.status).toBe(200)
    const rel = (cv.body as { relationship_id: string }).relationship_id

    // 2. Ouvrir une évaluation PASI (RPC create_vendor_assessment -> profil en_evaluation).
    const pasi = ((await rest(rega!, 'frameworks?slug=eq.pasi&select=id')).body as { id: string }[])[0].id
    const ca = await rpc(rega!, 'create_vendor_assessment', { p_relationship: rel, p_framework: pasi })
    expect(ca.status).toBe(200)
    const asmt = ca.body as string

    // 3. Coter 10 contrôles (1 non conforme + 9 conformes -> score 90).
    const evals = (await rest(rega!, `vendor_control_evaluation?vendor_assessment_id=eq.${asmt}&select=control_id&order=id&limit=10`)).body as { control_id: string }[]
    expect(evals.length).toBeGreaterThan(0)
    for (let i = 0; i < evals.length; i++) {
      await rpc(rega!, 'set_vendor_evaluation', { p_assessment: asmt, p_control: evals[i].control_id, p_level: i === 0 ? 'nc' : 'c' })
    }

    // 4. Constat vendor (add_vendor_finding).
    const af = await rpc(rega!, 'add_vendor_finding', { p_assessment: asmt, p_classification: 'minor_nc', p_description: 'E2E constat vendor', p_recommendation: 'Corriger', p_priority: 'medium' })
    expect(af.status).toBe(200)

    // 5. Verdict / clôture (close_vendor_assessment -> >=80 => qualifie + valid_until).
    const cl = await rpc(rega!, 'close_vendor_assessment', { p_assessment: asmt, p_valid_months: 12 })
    expect(cl.status).toBe(200)
    const va = (await rest(rega!, `vendor_assessment?id=eq.${asmt}&select=status,score,verdict,valid_until`)).body as Json[]
    expect(va[0].verdict).toBe('qualifie')
    expect(va[0].valid_until).toBeTruthy()

    // 6. Registre des qualifiés : le profil d'arête porte la qualification + l'échéance.
    const vendors = (await rpc(rega!, 'get_my_vendors', {})).body as Json[]
    const mine = vendors.find((v) => (v.vendor_name ?? v.name) === name)
    expect(mine?.qualification_status).toBe('qualifie')
    expect(mine?.next_assessment_at).toBeTruthy()

    // 7. UI : le fournisseur qualifié apparaît dans le registre des tiers.
    test.skip(!(await open(page, '/fournisseurs')), 'Registre inaccessible')
    await expect(page.getByText(name)).toBeVisible({ timeout: 15000 })
  })

  test('parcours candidat : auto-évaluation cotée et soumise (VEN) puis clôturée (REGA)', async ({ page }) => {
    const rega = tokenFrom('.auth/rega.json')
    const ven = tokenFrom('.auth/ven.json')
    test.skip(!rega || !ven || !SUPABASE_URL, 'Tokens REGA/VEN indisponibles')

    // Relation Fournisseur F (le candidat VEN y est rattaché).
    const vendors = (await rpc(rega!, 'get_my_vendors', {})).body as Json[]
    const fourn = vendors.find((v) => /Fournisseur Test F/.test(String(v.vendor_name ?? v.name ?? '')))
    test.skip(!fourn, 'Fournisseur Test F absent')
    const pasi = ((await rest(rega!, 'frameworks?slug=eq.pasi&select=id')).body as { id: string }[])[0].id

    // REGA ouvre une auto-évaluation candidat (request_vendor_self_assessment).
    const asmt = (await rpc(rega!, 'create_vendor_assessment', { p_relationship: fourn!.relationship_id, p_framework: pasi })).body as string
    const req = await rpc(rega!, 'request_vendor_self_assessment', { p_assessment: asmt })
    expect([200, 204]).toContain(req.status)

    // VEN (candidat portail) cote ses contrôles et soumet à l'autorité.
    const det = (await rpc(ven!, 'get_my_vendor_self_assessment_detail', { p_assessment: asmt })).body as { control_id: string }[]
    expect(Array.isArray(det) && det.length > 0).toBe(true)
    for (const c of det.slice(0, 5)) {
      await rpc(ven!, 'set_vendor_self_evaluation', { p_assessment: asmt, p_control: c.control_id, p_level: 'c' })
    }
    const sub = await rpc(ven!, 'submit_vendor_self_assessment', { p_assessment: asmt })
    expect([200, 204]).toContain(sub.status)
    const soumise = (await rest(rega!, `vendor_assessment?id=eq.${asmt}&select=status`)).body as Json[]
    expect(soumise[0].status).toBe('soumise')

    // REGA clôture l'auto-évaluation soumise -> cloturee + verdict.
    const cl = await rpc(rega!, 'close_vendor_assessment', { p_assessment: asmt, p_valid_months: 12 })
    expect(cl.status).toBe(200)
    const closed = (await rest(rega!, `vendor_assessment?id=eq.${asmt}&select=status,verdict`)).body as Json[]
    expect(closed[0].status).toBe('cloturee')

    // UI : la fiche Fournisseur F reste accessible côté régulateur.
    test.skip(!(await open(page, '/fournisseurs')), 'Registre inaccessible')
    await expect(text(page, /Fournisseur Test F/)).toBeVisible()
  })
})
