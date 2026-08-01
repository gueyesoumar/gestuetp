-- Migration 00158 (UP) : primitive de traversée du graphe — RFC 0001, étape 3
-- Fonction ADDITIVE et NON branchée (aucune policy ne l'utilise) → zéro
-- changement de comportement. Deviendra l'API partagée du Hub puis des policies.
--
-- Retourne les organisations cibles des arêtes ACTIVES SORTANTES de l'org courante,
-- filtrables par nature. Grâce aux arêtes 'self' backfillées :
--   my_related_org_ids('self')                  -> ma propre org
--   my_related_org_ids('audit_engagement')      -> mes clients
--   my_related_org_ids('group_ownership')       -> mes filiales
--   my_related_org_ids('regulatory_supervision')-> mes assujettis
--   my_related_org_ids(null)                    -> tout
--
-- Auto-scopée (aucun paramètre "viewer") → pas d'IDOR. SECURITY DEFINER pour lire
-- le graphe hors RLS ; n'est PAS utilisée dans une policy de organization_relationships
-- → pas de récursion. role=client -> get_my_organization_id() NULL -> ensemble vide
-- (accès client au graphe traité à l'étape portail).

create or replace function public.my_related_org_ids(p_nature public.relationship_nature default null)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select r.target_org_id
  from public.organization_relationships r
  where r.actor_org_id = public.get_my_organization_id()
    and r.status = 'active'
    and (p_nature is null or r.nature = p_nature)
$$;

comment on function public.my_related_org_ids(public.relationship_nature) is
  'RFC 0001 — cibles des aretes actives sortantes de l''org courante, filtrables par nature. Auto-scopee (pas d''IDOR).';

-- Hygiène : pas de grant PUBLIC par défaut ; execute réservé à authenticated.
revoke execute on function public.my_related_org_ids(public.relationship_nature) from public;
grant execute on function public.my_related_org_ids(public.relationship_nature) to authenticated;
