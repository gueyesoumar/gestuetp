-- Migration: require_aal2_all_tables (UP)
-- Sévérité : ÉLEVÉ (audit OWASP 2026-08-11, constats E2 + M3 / A07).
--
-- Problème : l'exigence MFA (AAL2) n'était appliquée qu'au frontend (MfaGate,
-- contournable) et dans les Edge Functions sous flag. Un JWT AAL1 (mot de passe
-- seul, ou issu d'un reset password) accédait aux données tenant via l'API
-- PostgREST directe. Correctif : porter l'exigence AAL2 au niveau DONNÉES (RLS),
-- choke point unique et non contournable.
--
-- Stratégie A (stricte) : prérequis = 100% des comptes actifs enrôlés MFA (vérifié
-- hors migration). Les comptes non enrôlés seraient sinon verrouillés hors données.
--
-- Mécanisme : policy RESTRICTIVE `is_aal2()` FOR ALL. Les policies restrictives
-- s'AJOUTENT en AND aux policies permissives existantes (scoping tenant) sans les
-- réécrire. `to authenticated` uniquement -> service_role (Edge Functions) NON
-- affecté. is_aal2() lit le claim `aal` du JWT signé (non falsifiable).
--
-- Périmètre FAIL-SECURE : AAL2 sur TOUTES les tables public avec RLS, SAUF une
-- allowlist explicite de tables non-sensibles lues AVANT le challenge MFA
-- (routage/profil, référentiels globaux, config, branding/thème). Ainsi aucune
-- table sensible n'est oubliée. organization_capabilities/vocab sont en AAL2 :
-- l'édition les lit via my_capabilities()/my_vocab() (SECURITY DEFINER -> bypass RLS).

do $$
declare
  t text;
  keep text[] := array[
    -- Routage / profil (lus avant le challenge, hors MfaGate)
    'users', 'organizations',
    -- Référentiels globaux (données de référence, non tenant)
    'frameworks', 'domains', 'controls', 'control_mappings', 'question_controls',
    'topic_controls', 'evidence_catalog', 'regulatory_catalog', 'questions',
    'questionnaire_templates',
    -- Configuration / plans / flags (globaux ou lus tôt)
    'editions', 'plans', 'plan_features', 'feature_flags', 'feature_flag_overrides',
    'incident_notification_rules', 'tenant_configs',
    -- Branding / thème / résolution de domaine (lus tôt)
    'organization_branding', 'cabinet_domains',
    -- Préférences email (flux public de désinscription par token)
    'email_preferences'
  ];
begin
  for t in
    select tablename from pg_tables
    where schemaname = 'public'
      and rowsecurity = true
      and tablename <> all(keep)
  loop
    execute format('drop policy if exists "require_aal2" on public.%I', t);
    execute format(
      'create policy "require_aal2" on public.%I as restrictive for all to authenticated '
      || 'using (public.is_aal2()) with check (public.is_aal2())', t);
  end loop;

  -- Remplace les policies SELECT-only de 00155 (probative_log/regulatory_measures/
  -- incidents) : la nouvelle "require_aal2" FOR ALL couvre aussi l'écriture (M3).
  drop policy if exists "require_aal2_select" on public.probative_log;
  drop policy if exists "require_aal2_select" on public.regulatory_measures;
  drop policy if exists "require_aal2_select" on public.incidents;
end $$;
