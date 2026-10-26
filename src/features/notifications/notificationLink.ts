// Résout le lien d'une notification selon l'édition courante. Le détail de mission
// est routé sur /controles/:id en édition Regul (capacité supervision) et sur
// /missions/:id en édition Comply (cf. App.tsx + moduleRegistry). Les notifications
// sont créées côté serveur avec le lien canonique /missions/:id ; on le réécrit ici.
export function resolveNotificationLink(link: string, isSupervision: boolean): string {
  if (isSupervision && link.startsWith('/missions/')) {
    return '/controles/' + link.slice('/missions/'.length)
  }
  return link
}
