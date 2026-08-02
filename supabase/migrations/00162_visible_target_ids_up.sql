-- Migration 00162 (UP) : primitive de cloisonnement par ARÊTE (RFC 0001 §8-9, P3a étape « compat »).
--
-- Crée `visible_target_ids()` À CÔTÉ des helpers existants — AUCUNE policy n'est
-- modifiée ici. Zéro changement de comportement : rien ne l'utilise encore.
-- But : la vérifier STRICTEMENT ÉQUIVALENTE à get_subsidiary_ids(get_my_organization_id())
-- avant de basculer les policies (vague suivante).
--
-- Équivalence visée (get_subsidiary_ids, 00136:25-44) : les DESCENDANTS actifs de
-- mon org, RÉCURSIF, SANS l'org racine elle-même.
--
-- Design (dérivé de l'audit RLS) :
--   - AUTO-SCOPÉE : part de get_my_organization_id() -> PAS de paramètre viewer
--     (évite la régression IDOR ; cf. my_related_org_ids 00158).
--   - RÉCURSIVE (WITH RECURSIVE) : ferme le sous-arbre multi-niveaux.
--   - active-only sur l'org cible (comme get_subsidiary_ids).
--   - FILTRE role=client HÉRITÉ : get_my_organization_id() renvoie NULL pour un
--     client (00134) -> `actor_org_id = NULL` ne matche jamais -> ensemble vide
--     -> la fuite multi-tenant 00133-135 ne rouvre pas.
--   - SECURITY DEFINER : bypass la RLS de organization_relationships (pas de
--     récursion RLS).
--   - Natures group_ownership ET regulatory_supervision : équivaut au sous-arbre
--     parent_org_id (source du backfill 00157), robuste à l'ambiguïté de nature.
--
-- NB : couvre le SOUS-ARBRE (supervision/possession), PAS audit_engagement (clients
-- de cabinet) -> périmètre des policies « staff sortant » de la vague 1
-- (regulatory_measures, incidents régulateur, entity_regulatory_profile, groupe).

create or replace function public.visible_target_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  with recursive tree(org_id) as (
    -- enfants DIRECTS de mon org via arête active (l'org racine n'est PAS incluse)
    select r.target_org_id
    from public.organization_relationships r
    join public.organizations o on o.id = r.target_org_id and o.is_active
    where r.actor_org_id = public.get_my_organization_id()
      and r.status = 'active'
      and r.nature in ('group_ownership', 'regulatory_supervision')
    union
    -- descendants récursifs
    select r.target_org_id
    from public.organization_relationships r
    join tree t on r.actor_org_id = t.org_id
    join public.organizations o on o.id = r.target_org_id and o.is_active
    where r.status = 'active'
      and r.nature in ('group_ownership', 'regulatory_supervision')
  )
  select org_id from tree
$$;

comment on function public.visible_target_ids() is
  'RFC 0001 §8 : descendants actifs (récursif) de l''org staff courante via arêtes supervision/possession — équivalent graphe de get_subsidiary_ids(get_my_organization_id()). Auto-scopée (anti-IDOR), filtre client hérité. Destinée à remplacer get_subsidiary_ids dans les policies après vérif d''équivalence.';
