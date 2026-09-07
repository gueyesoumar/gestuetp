import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useUpdateProfile } from '../profile/useUpdateProfile'
import { SplitForm } from '../../components/ui/SplitForm'
import { SplitFormSection } from '../../components/ui/SplitFormSection'
import { FormField } from '../../components/ui/FormField'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { useFieldValidation, required, phone as phoneValidator } from '../../hooks/useFieldValidation'

/** Onglet Profil : identité et coordonnées de l'utilisateur connecté. */
export function ProfileTab(): JSX.Element | null {
  const { profile } = useAuth()

  const firstName = useFieldValidation(profile?.first_name ?? '', required('Le prénom est requis.'))
  const lastName = useFieldValidation(profile?.last_name ?? '', required('Le nom est requis.'))
  const phone = useFieldValidation(profile?.phone ?? '', phoneValidator())
  const [jobTitle, setJobTitle] = useState(profile?.job_title ?? '')
  const [success, setSuccess] = useState(false)

  const { updateProfile, updating, error } = useUpdateProfile(() => setSuccess(true))

  if (!profile) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSuccess(false)
    firstName.forceShow()
    lastName.forceShow()
    phone.forceShow()
    if (!firstName.isValid || !lastName.isValid || !phone.isValid) return
    await updateProfile(profile.id, {
      first_name: firstName.value,
      last_name: lastName.value,
      phone: phone.value || null,
      job_title: jobTitle || null,
    })
  }

  return (
    <div className="space-y-6">
      {error && <ErrorAlert message={error} />}
      {success && <div className="rounded-lg bg-green-50 p-3 text-[13px] text-green-700">Profil mis à jour.</div>}

      <SplitForm onSubmit={handleSubmit} submitting={updating} submitLabel="Mettre à jour">
        <SplitFormSection title="Informations" description="Votre nom et vos coordonnées">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField id="prof-first" label="Prénom" value={firstName.value} onChange={firstName.onChange} onBlur={firstName.onBlur} error={firstName.error} required disabled={updating} />
              <FormField id="prof-last" label="Nom" value={lastName.value} onChange={lastName.onChange} onBlur={lastName.onBlur} error={lastName.error} required disabled={updating} />
            </div>
            <FormField id="prof-email" label="Email" value={profile.email} onChange={() => {}} disabled hint="L'email ne peut pas être modifié. Contactez un administrateur." />
            <div className="grid grid-cols-2 gap-4">
              <FormField id="prof-phone" label="Téléphone" type="tel" value={phone.value} onChange={phone.onChange} onBlur={phone.onBlur} error={phone.error} disabled={updating} placeholder="+221 77 123 45 67" />
              <FormField id="prof-job" label="Poste / Fonction" value={jobTitle} onChange={setJobTitle} disabled={updating} placeholder="Ex : Associé, Manager..." />
            </div>
          </div>
        </SplitFormSection>
      </SplitForm>
    </div>
  )
}
