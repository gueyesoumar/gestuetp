import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { ShieldCheck, Building2, RefreshCw, ListChecks, ClipboardCheck, AlertTriangle, Siren, ScrollText, ShieldAlert, LayoutDashboard, FileText } from 'lucide-react'
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
  /** Force une correspondance exacte pour l'état actif (index d'un workspace). */
  end?: boolean
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
  const { pathname } = useLocation()

  // Workspace dédié Gëstu Risk : sous /risque, la barre latérale bascule sur la
  // sous-nav du module (le lien « Hub ETP » du shell assure le retour à l'écosystème).
  if (pathname.startsWith('/risque') && hasCapability('risk')) {
    return {
      mainItems: [
        { to: '/risque', label: "Vue d'ensemble", icon: <LayoutDashboard size={20} strokeWidth={1.5} />, end: true },
        { to: '/risque/registre', label: 'Registre', icon: <ClipboardCheck size={20} strokeWidth={1.5} /> },
      ],
      groupItems: [],
    }
  }

  // Workspace dédié Gëstu Policy : sous /politiques, sous-nav du module.
  if (pathname.startsWith('/politiques') && hasCapability('policy')) {
    return {
      mainItems: [
        { to: '/politiques', label: 'Registre', icon: <FileText size={20} strokeWidth={1.5} />, end: true },
        { to: '/politiques/couverture', label: 'Couverture', icon: <LayoutDashboard size={20} strokeWidth={1.5} /> },
      ],
      groupItems: [],
    }
  }

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

  // Gëstu Risk (RFC 0004) — registre de risques alimentant le score de confiance.
  // Gated par la capacité `risk` (module activable par client, RFC 0002).
  if (hasCapability('risk')) {
    mainItems.push({ to: '/risque', label: 'Risque', icon: <ShieldAlert size={20} strokeWidth={1.5} /> })
  }

  // Gëstu Policy (RFC 0005) — gouvernance documentaire. Gated par la capacité `policy`.
  if (hasCapability('policy')) {
    mainItems.push({ to: '/politiques', label: 'Politiques', icon: <FileText size={20} strokeWidth={1.5} /> })
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
