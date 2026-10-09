import { useLocation } from 'react-router-dom'
import { ClipboardCheck, LayoutDashboard, FileText } from 'lucide-react'
import { useEdition } from '../../features/edition/EditionContext'
import { useVocab } from '../../features/edition/useVocab'
import { useGroupPermissions } from '../../hooks/useGroupPermissions'
import { useOrganizationHierarchy } from '../../hooks/useOrganizationHierarchy'
import { APP_MODULES, type ModuleCtx, type NavItem } from '../../features/edition/moduleRegistry'

export type { NavItem }

/**
 * Nav du shell unifié, dérivée AU RUNTIME des capacités via le registre de modules
 * (`moduleRegistry`, RFC 0013 C1) — plus de binaire `isRegul`. Le dashboard d'accueil
 * et les items de nav de chaque monde sont fournis par les modules activés.
 * Les workspaces dédiés Risk / Policy gardent leur sous-nav propre (ci-dessous).
 */
export function useSidebarNavItems(
  organizationId: string | null | undefined,
): { mainItems: NavItem[]; groupItems: NavItem[] } {
  const { hasCapability } = useEdition()
  const vocab = useVocab()
  const { canViewSupervision } = useGroupPermissions()
  const { isGroup } = useOrganizationHierarchy(organizationId ?? undefined)
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

  const ctx: ModuleCtx = { has: hasCapability, vocab, canViewSupervision, isGroup }
  const active = APP_MODULES.filter((m) => m.enabled(hasCapability))

  const mainItems: NavItem[] = [
    { to: '/', label: 'Tableau de bord', icon: <LayoutDashboard size={20} strokeWidth={1.5} /> },
    ...active.flatMap((m) => m.nav?.(ctx) ?? []),
  ]
  const groupItems: NavItem[] = active.flatMap((m) => m.group?.(ctx) ?? [])

  return { mainItems, groupItems }
}
