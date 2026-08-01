-- Migration 00155 (UP) : exiger AAL2 (MFA) en lecture des tables sensibles
-- Défense en profondeur MFA (phase 1d). Ferme la lecture directe (PostgREST)
-- des données les plus sensibles par un jeton AAL1 (mot de passe sans 2e facteur).
--
-- INSTANCE REGUL uniquement (tables probative_log / regulatory_measures /
-- incidents propres au produit régulateur).
--
-- Mécanisme : policies RESTRICTIVES → s'ajoutent en AND aux policies permissives
-- existantes, sans les réécrire (réversible en supprimant ces seules policies).
-- service_role contourne la RLS : les Edge Functions ne sont pas affectées.
-- On ne touche PAS la table users : le profil doit rester lisible en AAL1 pour
-- que la barrière MFA et le routage fonctionnent.

create or replace function public.is_aal2()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
$$;

drop policy if exists "require_aal2_select" on public.probative_log;
create policy "require_aal2_select" on public.probative_log
  as restrictive for select to authenticated
  using (public.is_aal2());

drop policy if exists "require_aal2_select" on public.regulatory_measures;
create policy "require_aal2_select" on public.regulatory_measures
  as restrictive for select to authenticated
  using (public.is_aal2());

drop policy if exists "require_aal2_select" on public.incidents;
create policy "require_aal2_select" on public.incidents
  as restrictive for select to authenticated
  using (public.is_aal2());
