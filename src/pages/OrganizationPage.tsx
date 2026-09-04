import { useSearchParams } from 'react-router-dom'
import type { ReactNode } from 'react'
import { OrganizationInfoTab } from '../features/organization-settings/OrganizationInfoTab'
import { WorkflowSettingsTab } from '../features/organization-settings/WorkflowSettingsTab'
import { TerminologyEditor } from '../features/organization-settings/TerminologyEditor'
import { MembersPage } from './MembersPage'
import { RolesTab } from '../features/members/RolesTab'
import { AuditTrailPage } from '../features/audit/AuditTrailPage'
import { useCabinetPermissions } from '../hooks/useCabinetPermissions'

type TabKey = 'general' | 'membres' | 'roles' | 'parametres' | 'terminologie' | 'piste-audit'

/**
 * Hub Organisation tout-en-onglets : Général, Membres, Rôles & permissions,
 * Paramètres, Terminologie et Piste d'audit. Les onglets sensibles sont masqués
 * selon la permission (le masquage reste cosmétique — la sécurité vient des RLS
 * et des gardes internes de chaque surface). L'onglet actif est reflété dans
 * l'URL (?tab=) pour le lien direct et les redirections depuis /membres, /piste-audit.
 */
export function OrganizationPage(): JSX.Element {
  const { canManageMembers, canManageRoles, canEditOrganization, canViewAuditTrail } = useCabinetPermissions()
  const [searchParams, setSearchParams] = useSearchParams()

  const tabs: { key: TabKey; label: string; render: () => ReactNode }[] = [
    { key: 'general', label: 'Général', render: () => <OrganizationInfoTab /> },
    ...((canManageMembers || canManageRoles) ? [{ key: 'membres' as TabKey, label: 'Membres', render: () => <MembersPage /> }] : []),
    ...(canManageRoles ? [{ key: 'roles' as TabKey, label: 'Rôles & permissions', render: () => <RolesTab /> }] : []),
    { key: 'parametres', label: 'Paramètres', render: () => <WorkflowSettingsTab /> },
    ...(canEditOrganization ? [{ key: 'terminologie' as TabKey, label: 'Terminologie', render: () => <TerminologyEditor /> }] : []),
    ...(canViewAuditTrail ? [{ key: 'piste-audit' as TabKey, label: "Piste d'audit", render: () => <AuditTrailPage /> }] : []),
  ]

  const param = searchParams.get('tab')
  const active = tabs.find((t) => t.key === param) ?? tabs[0]

  const selectTab = (key: TabKey) =>
    setSearchParams(key === 'general' ? {} : { tab: key }, { replace: true })

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Organisation</h2>
        <p className="mt-1 text-[13px] text-gray-500">Gérez votre cabinet, ses membres et ses paramètres.</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-6 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => selectTab(tab.key)}
            className={`pb-3 text-[13px] font-medium border-b-2 transition-colors ${
              active.key === tab.key
                ? 'border-forest-600 text-forest-700'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active.render()}
    </div>
  )
}
