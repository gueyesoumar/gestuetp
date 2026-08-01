-- Rollback 00139 : supprime les mesures réglementaires.
-- ATTENTION : perd les actes gradués du régulateur (les entrées probative_log
-- correspondantes subsistent, par conception append-only).

drop trigger if exists trg_rm_updated_at on public.regulatory_measures;
drop table if exists public.regulatory_measures;
