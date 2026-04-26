import { CreditCard, Info } from 'lucide-react'
import type { CabinetDetail } from './useAdminCabinetDetail'

interface Props {
  cabinet: CabinetDetail
}

/**
 * Onglet Facturation — placeholder en attendant Stripe.
 * Affiche le plan, le tarif mensuel, l'estimation MRR (1 cabinet × tarif),
 * et un avertissement sur l'absence d'intégration paiement.
 */
export function CabinetBillingTab({ cabinet }: Props) {
  const monthlyPrice = cabinet.plan_price ?? 0
  const planName = cabinet.plan_name ?? 'Aucun plan'
  const annualPrice = monthlyPrice * 12

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-2.5">
        <Info size={14} className="text-amber-700 flex-shrink-0 mt-0.5" />
        <div className="text-[12px] text-amber-800 leading-relaxed">
          <b className="font-semibold">Stripe non intégré</b> — les chiffres ci-dessous sont calculés depuis la table <code className="font-mono text-[11px] bg-amber-100 px-1 py-0.5 rounded">plans</code> et reflètent le tarif théorique du plan attribué.
          Pas de suivi de facture, de paiement ni de churn pour l&apos;instant.
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Plan actuel" value={planName} sub={cabinet.plan_price === 0 ? 'Gratuit' : `${monthlyPrice} €/mois`} />
        <KpiCard label="MRR estimé" value={`${monthlyPrice.toLocaleString('fr-FR')} €`} sub="placeholder, pas Stripe" />
        <KpiCard label="ARR estimé" value={`${annualPrice.toLocaleString('fr-FR')} €`} sub="× 12 mois" />
      </div>

      <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <header className="px-4 py-3 border-b border-gray-200">
          <span className="text-[13px] font-bold text-gray-900">Détail du plan</span>
        </header>
        <div className="px-5 py-4">
          <dl className="grid grid-cols-[180px_1fr] gap-y-2.5 gap-x-5 text-[13px]">
            <Row k="Plan">{planName}</Row>
            <Row k="Tarif mensuel">{monthlyPrice === 0 ? <Em>Gratuit</Em> : `${monthlyPrice} €`}</Row>
            <Row k="Onboardé le">{new Date(cabinet.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</Row>
            <Row k="Membres / sièges">{cabinet.members.length} {cabinet.members.length === 1 ? 'membre' : 'membres'}</Row>
            <Row k="Date de renouvellement"><Em>Phase 2 — non géré sans Stripe</Em></Row>
            <Row k="Statut paiement"><Em>Phase 2 — non géré sans Stripe</Em></Row>
            <Row k="Dernière facture"><Em>Phase 2 — non géré sans Stripe</Em></Row>
          </dl>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <header className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
          <CreditCard size={14} className="text-gray-400" />
          <span className="text-[13px] font-bold text-gray-900">Intégration Stripe</span>
          <span className="ml-auto text-[10px] uppercase tracking-wider font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Phase 3</span>
        </header>
        <div className="px-5 py-4 text-[12.5px] text-gray-500 leading-relaxed">
          <p className="mb-2">L&apos;intégration Stripe activera ici :</p>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>Suivi des factures et des paiements (facture #X-YYYY-NNN, état)</li>
            <li>MRR réel basé sur les abonnements actifs</li>
            <li>Détection des paiements en échec et relance auto</li>
            <li>Changement de plan en self-service côté cabinet</li>
            <li>Métriques business : churn, LTV, NPS</li>
          </ul>
          <p className="mt-3 text-[11.5px] text-gray-400 italic">À planifier quand le besoin commercial sera cadré (combien de cabinets, abonnement mensuel/annuel, paliers de prix).</p>
        </div>
      </section>
    </div>
  )
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gold-500" />
      <div className="text-[10.5px] uppercase tracking-wider text-gray-300 font-semibold">{label}</div>
      <div className="text-[20px] font-extrabold text-gray-900 mt-1 tracking-tight">{value}</div>
      <div className="text-[11px] text-gray-500 mt-0.5">{sub}</div>
    </div>
  )
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-gray-500 text-[12px]">{k}</dt>
      <dd className="text-gray-900 font-medium">{children}</dd>
    </>
  )
}

function Em({ children }: { children: React.ReactNode }) {
  return <span className="text-gray-300 italic text-[12px]">{children}</span>
}
