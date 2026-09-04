import { useState } from 'react'
import type { FormEvent } from 'react'
import { useChangePassword } from '../profile/useChangePassword'
import { SplitForm } from '../../components/ui/SplitForm'
import { SplitFormSection } from '../../components/ui/SplitFormSection'
import { FormField } from '../../components/ui/FormField'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { useFieldValidation, minLength } from '../../hooks/useFieldValidation'
import { TwoFactorSection } from './mfa/TwoFactorSection'

/**
 * Onglet Sécurité : gestion du mot de passe. La gestion self-service du 2FA
 * (TOTP : voir / ajouter / retirer un authentificateur) viendra s'ajouter ici.
 */
export function SecurityTab(): JSX.Element {
  const newPassword = useFieldValidation('', minLength(8, 'Le mot de passe doit contenir au moins 8 caractères.'))
  const confirmPassword = useFieldValidation('', () => null)
  const [success, setSuccess] = useState(false)

  const { changePassword, changing, error } = useChangePassword()

  const confirmError = confirmPassword.touched && confirmPassword.value !== newPassword.value
    ? 'Les mots de passe ne correspondent pas.'
    : null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSuccess(false)
    newPassword.forceShow()
    confirmPassword.forceShow()
    if (!newPassword.isValid) return
    if (confirmPassword.value !== newPassword.value) return
    const ok = await changePassword(newPassword.value)
    if (ok) {
      setSuccess(true)
      newPassword.reset('')
      confirmPassword.reset('')
    }
  }

  return (
    <div className="space-y-6">
      {error && <ErrorAlert message={error} />}
      {success && <div className="rounded-lg bg-green-50 p-3 text-[13px] text-green-700">Mot de passe modifié.</div>}

      <SplitForm onSubmit={handleSubmit} submitting={changing} submitLabel="Changer le mot de passe">
        <SplitFormSection title="Mot de passe" description="Modifiez votre mot de passe">
          <div className="space-y-4">
            <FormField id="prof-newpw" label="Nouveau mot de passe" type="password" value={newPassword.value} onChange={newPassword.onChange} onBlur={newPassword.onBlur} error={newPassword.error} required disabled={changing} placeholder="8 caractères minimum" />
            <FormField id="prof-confirm" label="Confirmer le mot de passe" type="password" value={confirmPassword.value} onChange={confirmPassword.onChange} onBlur={confirmPassword.onBlur} error={confirmError} required disabled={changing} />
          </div>
        </SplitFormSection>
      </SplitForm>

      <TwoFactorSection />
    </div>
  )
}
