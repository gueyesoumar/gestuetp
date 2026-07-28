-- Migration 00155 (DOWN) : retrait de l'exigence AAL2 en lecture
-- Supprime les policies restrictives et le helper.

drop policy if exists "require_aal2_select" on public.probative_log;
drop policy if exists "require_aal2_select" on public.regulatory_measures;
drop policy if exists "require_aal2_select" on public.incidents;

drop function if exists public.is_aal2();
