import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useUpdateProfile } from '../features/profile/useUpdateProfile'
import { useChangePassword } from '../features/profile/useChangePassword'
import { SplitForm } from '../components/ui/SplitForm'
import { SplitFormSection } from '../components/ui/SplitFormSection'
import { FormField } from '../components/ui/FormField'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { Badge } from '../components/ui/Badge'
import { useFieldValidation, required, phone as phoneValidator, minLength } from '../hooks/useFieldValidation'
import { EmailPreferencesSection } from '../features/profile/EmailPreferencesSection'

export function ProfilePage() {
  const { profile, session, signOut } = useAuth()

  // Profile form state
  const firstName = useFieldValidation(profile?.first_name ?? '', required('Le prénom est requis.'))
  const lastName = useFieldValidation(profile?.last_name ?? '', required('Le nom est requis.'))
  const phone = useFieldValidation(profile?.phone ?? '', phoneValidator())
  const [jobTitle, setJobTitle] = useState(profile?.job_title ?? '')
  const [profileSuccess, setProfileSuccess] = useState(false)

  const { updateProfile, updating, error: profileError } = useUpdateProfile(() => {
    setProfileSuccess(true)
  })

  // Password form state
  const newPassword = useFieldValidation('', minLength(8, 'Le mot de passe doit contenir au moins 8 caractères.'))
  const confirmPassword = useFieldValidation('', () => null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  // Cross-field check : confirm = newPassword
  const confirmError = confirmPassword.touched && confirmPassword.value !== newPassword.value
    ? 'Les mots de passe ne correspondent pas.'
    : null

  const { changePassword, changing, error: passwordError } = useChangePassword()

  if (!profile) return null

  const initials = `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`

  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setProfileSuccess(false)
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

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setPasswordSuccess(false)
    newPassword.forceShow()
    confirmPassword.forceShow()
    if (!newPassword.isValid) return
    if (confirmPassword.value !== newPassword.value) return

    const ok = await changePassword(newPassword.value)
    if (ok) {
      setPasswordSuccess(true)
      newPassword.reset('')
      confirmPassword.reset('')
    }
  }

  const lastSignIn = profile.last_sign_in_at
    ? new Date(profile.last_sign_in_at).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900">Mon profil</h2>
      <p className="mt-1 text-[13px] text-gray-500">G&eacute;rez vos informations personnelles et votre s&eacute;curit&eacute;.</p>

      {/* Avatar + nom */}
      <div className="mt-6 mb-6 flex items-center gap-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-forest-100 text-forest-700 text-xl font-bold">
          {initials}
        </div>
        <div>
          <div className="text-lg font-bold text-gray-900">{profile.first_name} {profile.last_name}</div>
          <div className="text-[13px] text-gray-500">{profile.email}</div>
          <div className="mt-1 flex gap-2">
            {profile.job_title && <Badge label={profile.job_title} variant="gold" />}
            <Badge label={profile.is_active ? 'Actif' : 'Inactif'} variant={profile.is_active ? 'green' : 'gray'} />
          </div>
        </div>
      </div>

      {/* Informations personnelles */}
      <div className="max-w-3xl space-y-6">
        {profileError && <ErrorAlert message={profileError} />}
        {profileSuccess && (
          <div className="rounded-lg bg-green-50 p-3 text-[13px] text-green-700">
            Profil mis &agrave; jour.
          </div>
        )}

        <SplitForm onSubmit={handleProfileSubmit} submitting={updating} submitLabel="Mettre &agrave; jour">
          <SplitFormSection title="Informations" description="Votre nom et vos coordonn&eacute;es">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField id="prof-first" label="Pr&eacute;nom" value={firstName.value} onChange={firstName.onChange} onBlur={firstName.onBlur} error={firstName.error} required disabled={updating} />
                <FormField id="prof-last" label="Nom" value={lastName.value} onChange={lastName.onChange} onBlur={lastName.onBlur} error={lastName.error} required disabled={updating} />
              </div>
              <div>
                <FormField id="prof-email" label="Email" value={profile.email} onChange={() => {}} disabled hint="L'email ne peut pas être modifié. Contactez un administrateur." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField id="prof-phone" label="T&eacute;l&eacute;phone" type="tel" value={phone.value} onChange={phone.onChange} onBlur={phone.onBlur} error={phone.error} disabled={updating} placeholder="+221 77 123 45 67" />
                <FormField id="prof-job" label="Poste / Fonction" value={jobTitle} onChange={setJobTitle} disabled={updating} placeholder="Ex : Associ&eacute;, Manager..." />
              </div>
            </div>
          </SplitFormSection>
        </SplitForm>

        {/* Securite */}
        {passwordError && <ErrorAlert message={passwordError} />}
        {passwordSuccess && (
          <div className="rounded-lg bg-green-50 p-3 text-[13px] text-green-700">
            Mot de passe modifi&eacute;.
          </div>
        )}

        <SplitForm onSubmit={handlePasswordSubmit} submitting={changing} submitLabel="Changer le mot de passe">
          <SplitFormSection title="S&eacute;curit&eacute;" description="Modifiez votre mot de passe">
            <div className="space-y-4">
              <FormField id="prof-newpw" label="Nouveau mot de passe" type="password" value={newPassword.value} onChange={newPassword.onChange} onBlur={newPassword.onBlur} error={newPassword.error} required disabled={changing} placeholder="8 caract&egrave;res minimum" />
              <FormField id="prof-confirm" label="Confirmer le mot de passe" type="password" value={confirmPassword.value} onChange={confirmPassword.onChange} onBlur={confirmPassword.onBlur} error={confirmError} required disabled={changing} />
            </div>
          </SplitFormSection>
        </SplitForm>

        {/* Préférences email */}
        <EmailPreferencesSection userId={profile.id} />

        {/* Session */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="grid grid-cols-[240px_1fr]">
            <div className="bg-page-bg border-r border-gray-200 p-6">
              <h4 className="text-[14px] font-semibold text-gray-900">Session</h4>
              <p className="mt-1 text-[12px] leading-relaxed text-gray-500">Informations sur votre connexion</p>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-gray-500">Email de connexion</span>
                <span className="text-[13px] font-medium text-gray-900">{session?.user?.email}</span>
              </div>
              {lastSignIn && (
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-gray-500">Derni&egrave;re connexion</span>
                  <span className="text-[13px] font-medium text-gray-900">{lastSignIn}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-gray-500">Statut</span>
                <Badge label="Connect&eacute;" variant="green" />
              </div>
              <div className="pt-3 border-t border-gray-100">
                <button
                  onClick={signOut}
                  className="rounded-lg border border-red-200 px-4 py-2 text-[13px] font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  Se d&eacute;connecter de cette session
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
