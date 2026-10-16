-- 00330 (DOWN) - retire le catalogue plateforme de modèles (nodes en cascade).
delete from public.risk_scenario_templates where owner_org_id is null;
