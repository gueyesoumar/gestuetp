import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'

interface Plan { id: string; slug: string; name: string; monthly_price_eur: number }

interface Props {
  onClose: () => void
  onCreated?: (cabinetId: string) => void
}

export function CreateCabinetWizard({ onClose, onCreated }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [plans, setPlans] = useState<Plan[]>([])
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [planSlug, setPlanSlug] = useState('decouverte')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerFirstName, setOwnerFirstName] = useState('')
  const [ownerLastName, setOwnerLastName] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()

  useEffect(() => {
    void supabase.from('plans').select('id, slug, name, monthly_price_eur').order('monthly_price_eur').then(({ data }) => {
      setPlans((data ?? []) as Plan[])
    })
  }, [])

  // Auto-slug depuis le nom (uniquement quand le slug n'a pas été touché manuellement)
  const [slugTouched, setSlugTouched] = useState(false)
  useEffect(() => {
    if (slugTouched) return
    setSlug(name.trim().toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50))
  }, [name, slugTouched])

  const step1Valid = name.trim().length >= 2 && /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/.test(slug) && planSlug
  const step2Valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail) && ownerFirstName.trim() && ownerLastName.trim()
  const step3Valid = reason.trim().length > 0

  const submit = async () => {
    setSubmitting(true)
    const { data, error } = await supabase.functions.invoke('admin-create-cabinet', {
      body: {
        name: name.trim(),
        slug: slug.trim(),
        plan_slug: planSlug,
        owner_email: ownerEmail.trim(),
        owner_first_name: ownerFirstName.trim(),
        owner_last_name: ownerLastName.trim(),
        reason: reason.trim(),
      },
    })
    setSubmitting(false)
    if (error) {
      toast.error('Création impossible', error)
      return
    }
    if (data?.error) {
      toast.error('Création impossible')
      console.error('admin-create-cabinet:', data.error)
      return
    }
    toast.success('Cabinet créé', {
      description: data?.invitation_sent ? 'L\'owner a reçu un lien de définition de mot de passe.' : 'Compte créé sans email — renvoyer le lien depuis Utilisateurs.',
    })
    onClose()
    onCreated?.(data.cabinet_id)
    navigate(`/admin/cabinets/${data.cabinet_id}`)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-xl w-full overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-3">
          <h3 className="text-[14.5px] font-bold text-gray-900">Onboarder un cabinet</h3>
          <span className="ml-auto text-[11px] text-gray-400 font-mono">Étape {step} / 3</span>
        </div>

        {step === 1 && (
          <div className="px-5 py-4 space-y-3">
            <Field label="Nom du cabinet *">
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Audit&Co Sénégal" disabled={submitting} />
            </Field>
            <Field label="Slug *" hint="Identifiant URL-safe — généré automatiquement depuis le nom, modifiable">
              <input type="text" value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true) }} placeholder="audit-co-senegal" disabled={submitting} />
            </Field>
            <Field label="Plan *">
              <select value={planSlug} onChange={(e) => setPlanSlug(e.target.value)} disabled={submitting}>
                {plans.map((p) => (
                  <option key={p.slug} value={p.slug}>{p.name} {p.monthly_price_eur > 0 ? `· ${p.monthly_price_eur} €/mois` : ''}</option>
                ))}
              </select>
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="px-5 py-4 space-y-3">
            <p className="text-[12px] text-gray-500 mb-2">Cette personne sera l&apos;owner du cabinet. Un lien de définition de mot de passe lui sera envoyé par email.</p>
            <Field label="Email *">
              <input type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="aissatou@auditco.sn" disabled={submitting} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prénom *">
                <input type="text" value={ownerFirstName} onChange={(e) => setOwnerFirstName(e.target.value)} disabled={submitting} />
              </Field>
              <Field label="Nom *">
                <input type="text" value={ownerLastName} onChange={(e) => setOwnerLastName(e.target.value)} disabled={submitting} />
              </Field>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="px-5 py-4 space-y-3">
            <div className="bg-page-bg border border-gray-200 rounded-lg px-4 py-3 text-[12.5px] space-y-1">
              <div><span className="text-gray-500">Cabinet :</span> <b>{name}</b> <span className="font-mono text-[11px] text-gray-400">{slug}</span></div>
              <div><span className="text-gray-500">Plan :</span> {plans.find((p) => p.slug === planSlug)?.name}</div>
              <div><span className="text-gray-500">Owner :</span> {ownerFirstName} {ownerLastName} &lt;{ownerEmail}&gt;</div>
            </div>
            <Field label="Motif * (audit)">
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Contrat signé le… / contact entrant via…" disabled={submitting} />
            </Field>
          </div>
        )}

        <div className="px-5 py-3 bg-page-bg border-t border-gray-200 flex justify-between gap-2">
          <button onClick={onClose} disabled={submitting} className="px-3.5 py-2 text-[12.5px] font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">Annuler</button>
          <div className="flex gap-2">
            {step > 1 && (
              <button onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)} disabled={submitting} className="px-3.5 py-2 text-[12.5px] font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">← Précédent</button>
            )}
            {step < 3 ? (
              <button
                onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
                disabled={(step === 1 && !step1Valid) || (step === 2 && !step2Valid)}
                className="px-3.5 py-2 text-[12.5px] font-semibold rounded-lg bg-forest-700 text-white hover:bg-forest-900 disabled:opacity-50"
              >
                Suivant →
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={submitting || !step3Valid}
                className="px-3.5 py-2 text-[12.5px] font-semibold rounded-lg bg-forest-700 text-white hover:bg-forest-900 disabled:opacity-50"
              >
                {submitting ? 'Création…' : 'Créer le cabinet'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[10.5px] text-gray-400">{hint}</p>}
    </div>
  )
}
