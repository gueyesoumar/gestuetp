import { useLocation } from 'react-router-dom'
import { ClipboardCheck, LayoutDashboard, FileText, Activity, SlidersHorizontal, ListChecks, ShieldCheck, History, Network, Sparkles, UsersRound, LibraryBig, Gauge, Boxes, ClipboardList, Wrench, Eye, Settings } from 'lucide-react'
import { useEdition } from '../../features/edition/EditionContext'
import { useVocab } from '../../features/edition/useVocab'
import { useGroupPermissions } from '../../hooks/useGroupPermissions'
import { APP_MODULES, type ModuleCtx, type NavItem } from '../../features/edition/moduleRegistry'
import { riskOverviewEnabled } from '../../features/risk/riskOverviewFlag'

export type { NavItem }

/**
 * Nav du shell unifié, dérivée AU RUNTIME des capacités via le registre de modules
 * (`moduleRegistry`, RFC 0013 C1) - plus de binaire `isRegul`. Le dashboard d'accueil
 * et les items de nav de chaque monde sont fournis par les modules activés.
 * Les workspaces dédiés Risk / Policy gardent leur sous-nav propre (ci-dessous).
 */
/** Les flags de permission cabinet sont injectés par le parent (Sidebar) pour éviter
 *  un second appel à useCabinetPermissions dans le shell (dédupe perf P2). isGroup est
 *  lu depuis useGroupPermissions (qui résout déjà la hiérarchie) plutôt que via un
 *  second useOrganizationHierarchy. */
export function useSidebarNavItems(
  perms: { canManageSupervisionAssignments: boolean; canManageRiskCriteria: boolean },
): { mainItems: NavItem[]; groupItems: NavItem[] } {
  const { canManageSupervisionAssignments, canManageRiskCriteria } = perms
  const { hasCapability } = useEdition()
  const vocab = useVocab()
  const { canViewSupervision, isGroup } = useGroupPermissions()
  const { pathname } = useLocation()

  // Workspace dédié Gëstu Risk : sous /risque, la barre latérale bascule sur la
  // sous-nav du module (le lien « Hub ETP » du shell assure le retour à l'écosystème).
  if (pathname.startsWith('/risque') && hasCapability('risk')) {
    const supervises = hasCapability('supervision') || hasCapability('client_portal')
    const items: NavItem[] = []
    if (riskOverviewEnabled(hasCapability)) {
      items.push({ to: '/risque', label: "Vue d'ensemble", icon: <LayoutDashboard size={20} strokeWidth={1.5} />, end: true })
    }
    if (supervises) items.push({ to: '/risque/synthese', label: 'Synthèse', icon: <Gauge size={20} strokeWidth={1.5} /> })
    if (supervises) items.push({ to: '/risque/portefeuille', label: 'Portefeuille', icon: <Network size={20} strokeWidth={1.5} /> })
    const apprecier = <ClipboardList size={20} strokeWidth={1.5} />
    const traiter = <Wrench size={20} strokeWidth={1.5} />
    const surveiller = <Eye size={20} strokeWidth={1.5} />
    const parametrage = <Settings size={20} strokeWidth={1.5} />
    items.push(
      { to: '/risque/registre', label: 'Registre', icon: <ClipboardCheck size={20} strokeWidth={1.5} />, section: 'Apprécier', sectionIcon: apprecier },
      { to: '/risque/plan', label: 'Plan de traitement', icon: <ListChecks size={20} strokeWidth={1.5} />, section: 'Traiter', sectionIcon: traiter },
      { to: '/risque/acceptations', label: 'Acceptations', icon: <ShieldCheck size={20} strokeWidth={1.5} />, section: 'Traiter', sectionIcon: traiter },
      { to: '/risque/simulateur', label: 'Simulateur', icon: <Sparkles size={20} strokeWidth={1.5} />, section: 'Traiter', sectionIcon: traiter },
      { to: '/risque/revue', label: 'Revue & surveillance', icon: <History size={20} strokeWidth={1.5} />, section: 'Surveiller', sectionIcon: surveiller },
    )
    // Paramétrage (en bas) : critères, affectations et modèles regroupés.
    items.push({ to: '/risque/criteres', label: 'Critères', icon: <SlidersHorizontal size={20} strokeWidth={1.5} />, section: 'Paramétrage', sectionIcon: parametrage })
    if (supervises && canManageSupervisionAssignments) items.push({ to: '/risque/affectations', label: 'Affectations', icon: <UsersRound size={20} strokeWidth={1.5} />, section: 'Paramétrage', sectionIcon: parametrage })
    if (canManageRiskCriteria) items.push({ to: '/risque/modeles', label: 'Modèles', icon: <LibraryBig size={20} strokeWidth={1.5} />, section: 'Paramétrage', sectionIcon: parametrage })
    return { mainItems: items, groupItems: [] }
  }

  // Workspace dédié Gëstu Vendor : sous /fournisseurs, sous-nav du module (RFC 0020).
  if (pathname.startsWith('/fournisseurs') && hasCapability('vendor')) {
    return {
      mainItems: [
        { to: '/fournisseurs', label: 'Registre des tiers', icon: <Boxes size={20} strokeWidth={1.5} />, end: true },
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
  // Module transverse (toute édition) activé par capacité (RFC 0014).
  if (hasCapability('continuous_compliance')) {
    mainItems.push({ to: '/conformite-continue', label: 'Conformité continue', icon: <Activity size={20} strokeWidth={1.5} /> })
  }
  const groupItems: NavItem[] = active.flatMap((m) => m.group?.(ctx) ?? [])

  return { mainItems, groupItems }
}
