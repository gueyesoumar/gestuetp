-- Migration: require_aal2_all_tables (DOWN)
-- Rollback complet de l'exigence AAL2 au niveau données. ATTENTION : rétablit
-- l'accès AAL1 aux tables tenant via PostgREST (rouvre E2). Restaure aussi les
-- policies SELECT-only de 00155 sur les 3 tables Regul.

do $$
declare t text;
begin
  for t in
    select tablename from pg_tables
    where schemaname = 'public' and rowsecurity = true
  loop
    execute format('drop policy if exists "require_aal2" on public.%I', t);
  end loop;
end $$;

-- Restaure l'état 00155 (SELECT-only AAL2 sur les tables Regul).
create policy "require_aal2_select" on public.probative_log
  as restrictive for select to authenticated using (public.is_aal2());
create policy "require_aal2_select" on public.regulatory_measures
  as restrictive for select to authenticated using (public.is_aal2());
create policy "require_aal2_select" on public.incidents
  as restrictive for select to authenticated using (public.is_aal2());
