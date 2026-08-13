import type { ReactNode } from 'react'
import { ShieldCheck, Building2, RefreshCw, ListChecks, ClipboardCheck, AlertTriangle, Siren, ScrollText } from 'lucide-react'
import { DashboardIcon, ClientsIcon, FrameworksIcon, MissionsIcon } from '../icons/NavIcons'
import { useEdition } from '../../features/edition/EditionContext'
import { useVocab } from '../../features/edition/useVocab'
import { useGroupPermissions } from '../../hooks/useGroupPermissions'
import { useCabinetPermissions } from '../../hooks/useCabinetPermissions'
import { useOrganizationHierarchy } from '../../hooks/useOrganizationHierarchy'

export interface NavItem {
  to: string
  label: string
  icon: ReactNode
}

/**
 * Nav du shell unifié dérivée AU RUNTIME de l'édition + des capacités (RFC 0001).
 * - Comply : Supervision (perm groupe) / Clients / Référentiels / Missions — inchangé.
 * - Regul  : Assujettis / Contrôles / Constats & mesures / Incidents / Référentiels,
 *   chaque module gated par sa capacité (`measures`, `incidents`).
 * Le module Groupe (filiales/revues/plans) reste réservé à Comply-groupe.
 */
export function useSidebarNavItems(
  organizationId: string | null | undefined,
): { mainItems: NavItem[]; groupItems: NavItem[] } {
  const { hasCapability } = useEdition()
  const vocab = useVocab()
  const { canViewSupervision } = useGroupPermissions()
  const { canViewAuditTrail } = useCabinetPermissions()
  const { isGroup } = useOrganizationHierarchy(organizationId ?? undefined)
  const isRegul = hasCapability('supervision')

  const mainItems: NavItem[] = [
    { to: '/', label: 'Tableau de bord', icon: <DashboardIcon /> },
  ]

  if (isRegul) {
    mainItems.push({ to: '/assujettis', label: vocab.entitiesTitle, icon: <Building2 size={20} strokeWidth={1.5} /> })
    mainItems.push({ to: '/controles', label: vocab.missionTerm, icon: <ClipboardCheck size={20} strokeWidth={1.5} /> })
    if (hasCapability('measures')) {
      mainItems.push({ to: '/constats', label: 'Constats & mesures', icon: <AlertTriangle size={20} strokeWidth={1.5} /> })
    }
    if (hasCapability('incidents')) {
      mainItems.push({ to: '/incidents', label: 'Incidents', icon: <Siren size={20} strokeWidth={1.5} /> })
    }
    mainItems.push({ to: '/referentiels', label: 'Référentiels', icon: <FrameworksIcon /> })
  } else {
    if (canViewSupervision) {
      mainItems.push({ to: '/supervision', label: 'Supervision', icon: <ShieldCheck size={20} strokeWidth={1.5} /> })
    }
    mainItems.push({ to: '/clients', label: 'Clients', icon: <ClientsIcon /> })
    mainItems.push({ to: '/referentiels', label: 'Référentiels', icon: <FrameworksIcon /> })
    mainItems.push({ to: '/missions', label: vocab.missionTerm, icon: <MissionsIcon /> })
  }

  // Piste d'audit — réservée aux admins d'organisation (F6).
  if (canViewAuditTrail) {
    mainItems.push({ to: '/piste-audit', label: "Piste d'audit", icon: <ScrollText size={20} strokeWidth={1.5} /> })
  }

  const groupItems: NavItem[] = !isRegul && isGroup
    ? [
        { to: '/filiales', label: 'Filiales', icon: <Building2 size={20} strokeWidth={1.5} /> },
        { to: '/revues', label: 'Revues continues', icon: <RefreshCw size={20} strokeWidth={1.5} /> },
        { to: '/plans-transverses', label: "Plans d'action", icon: <ListChecks size={20} strokeWidth={1.5} /> },
      ]
    : []

  return { mainItems, groupItems }
}
