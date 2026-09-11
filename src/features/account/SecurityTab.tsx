import { useState } from 'react'
import type { FormEvent } from 'react'
import { useChangePassword } from '../profile/useChangePassword'
import { SplitForm } from '../../components/ui/SplitForm'
import { SplitFormSection } from '../../components/ui/SplitFormSection'
import { FormField } from '../../components/ui/FormField'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { PasswordCriteria } from '../../components/ui/PasswordCriteria'
import { usePasswordPolicy } from '../../hooks/usePasswordPolicy'
import { passwordMeetsPolicy } from '../../lib/passwordPolicy'
import { useFieldValidation } from '../../hooks/useFieldValidation'
import { TwoFactorSection } from './mfa/TwoFactorSection'

/**
 * Onglet Sécurité : gestion du mot de passe. La gestion self-service du 2FA
 * (TOTP : voir / ajouter / retirer un authentificateur) viendra s'ajouter ici.
 */
export function SecurityTab(): JSX.Element {
  const newPassword = useFieldValidation('', () => null)
  const confirmPassword = useFieldValidation('', () => null)
  const [success, setSuccess] = useState(false)
  const { policy } = usePasswordPolicy()

  const { changePassword, changing, error } = useChangePassword()

  const meetsPolicy = passwordMeetsPolicy(newPassword.value, policy)
  const confirmMatches = confirmPassword.value.length > 0 && confirmPassword.value === newPassword.value
  const confirmError = confirmPassword.touched && !confirmMatches && confirmPassword.value.length > 0
    ? 'Les mots de passe ne correspondent pas.'
    : null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSuccess(false)
    if (!meetsPolicy || !confirmMatches) return
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

      <SplitForm onSubmit={handleSubmit} submitting={changing} submitDisabled={!meetsPolicy || !confirmMatches} submitLabel="Changer le mot de passe">
        <SplitFormSection title="Mot de passe" description="Modifiez votre mot de passe">
          <div className="space-y-4">
            <FormField id="prof-newpw" label="Nouveau mot de passe" type="password" value={newPassword.value} onChange={newPassword.onChange} onBlur={newPassword.onBlur} required disabled={changing} placeholder="Nouveau mot de passe" />
            <PasswordCriteria password={newPassword.value} policy={policy} tone="light" />
            <FormField id="prof-confirm" label="Confirmer le mot de passe" type="password" value={confirmPassword.value} onChange={confirmPassword.onChange} onBlur={confirmPassword.onBlur} error={confirmError} required disabled={changing} />
          </div>
        </SplitFormSection>
      </SplitForm>

      <TwoFactorSection />
    </div>
  )
}
